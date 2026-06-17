import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Document, DocumentType } from '../components/ModuleConnector';

// Accepted file types
const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/rtf',
  'application/epub+zip',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const ACCEPTED_FILE_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'txt',
  'rtf',
  'epub',
  'jpg',
  'jpeg',
  'png',
  'webp',
];

const APP_LOCAL_STORAGE_DIR = `${FileSystem.documentDirectory}StudyMateDocuments/`;

/**
 * Determines the document type based on file extension or MIME type
 */
function getDocumentType(filename: string, mimeType?: string): DocumentType {
  const ext = filename.split('.').pop()?.toLowerCase();

  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  if (ext === 'pptx' || ext === 'ppt') return 'pptx';
  if (ext === 'txt') return 'txt';
  if (ext === 'epub') return 'epub';
  if (ext === 'rtf') return 'txt';
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) return 'image';

  // Fallback to MIME type detection
  if (mimeType?.includes('pdf')) return 'pdf';
  if (mimeType?.includes('word')) return 'docx';
  if (mimeType?.includes('powerpoint')) return 'pptx';
  if (mimeType?.includes('text')) return 'txt';
  if (mimeType?.includes('epub')) return 'epub';
  if (mimeType?.includes('image')) return 'image';

  throw new Error(`Unsupported file type: ${ext || 'unknown'}`);
}

/**
 * Validates file type
 */
function isValidFileType(filename: string, mimeType?: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ACCEPTED_FILE_EXTENSIONS.includes(ext || '') || ACCEPTED_MIME_TYPES.includes(mimeType || '');
}

/**
 * Initializes app local storage directory
 */
async function ensureStorageDirectory(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(APP_LOCAL_STORAGE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(APP_LOCAL_STORAGE_DIR, { intermediates: true });
    }
  } catch (error) {
    throw new Error(`Failed to initialize storage directory: ${error}`);
  }
}

/**
 * Generates a unique filename to avoid conflicts
 */
function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const ext = originalName.split('.').pop();
  const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
  return `${nameWithoutExt}_${timestamp}.${ext}`;
}

/**
 * Opens the file picker and imports selected file
 */
export async function pickAndImportFile(): Promise<Document> {
  try {
    await ensureStorageDirectory();

    // Open document picker
    const result = await DocumentPicker.getDocumentAsync({
      type: ACCEPTED_MIME_TYPES,
      copyToCacheDirectory: false,
    });

    if (result.canceled) {
      throw new Error('File selection was canceled');
    }

    const asset = result.assets[0];

    if (!asset) {
      throw new Error('No file selected');
    }

    // Validate file type
    if (!isValidFileType(asset.name, asset.mimeType)) {
      throw new Error(
        `File type not supported. Accepted: PDF, DOC, DOCX, PPT, PPTX, TXT, RTF, EPUB, JPG, JPEG, PNG, WEBP`
      );
    }

    // Get file info (size, etc.)
    const fileInfo = await FileSystem.getInfoAsync(asset.uri);

    if (!fileInfo.exists) {
      throw new Error('Selected file no longer exists');
    }

    // Generate unique filename and copy to app storage
    const uniqueFilename = generateUniqueFilename(asset.name);
    const destinationPath = `${APP_LOCAL_STORAGE_DIR}${uniqueFilename}`;

    await FileSystem.copyAsync({
      from: asset.uri,
      to: destinationPath,
    });

    // Create document object
    const documentType = getDocumentType(asset.name, asset.mimeType);
    const document: Document = {
      id: generateUniqueFilename(asset.name).split('.')[0],
      title: asset.name,
      type: documentType,
      path: destinationPath,
      size: fileInfo.size || 0,
      createdAt: Date.now(),
      lastOpened: Date.now(),
    };

    return document;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to import file: ${errorMessage}`);
  }
}

/**
 * Gets a list of all imported documents in app storage
 */
export async function getImportedDocuments(): Promise<Document[]> {
  try {
    await ensureStorageDirectory();

    const files = await FileSystem.readDirectoryAsync(APP_LOCAL_STORAGE_DIR);
    const documents: Document[] = [];

    for (const filename of files) {
      try {
        const fullPath = `${APP_LOCAL_STORAGE_DIR}${filename}`;
        const fileInfo = await FileSystem.getInfoAsync(fullPath);

        if (fileInfo.exists && !fileInfo.isDirectory) {
          const docType = getDocumentType(filename);
          const document: Document = {
            id: filename.split('.')[0],
            title: filename,
            type: docType,
            path: fullPath,
            size: fileInfo.size || 0,
            createdAt: fileInfo.modificationTime ? fileInfo.modificationTime * 1000 : Date.now(),
            lastOpened: fileInfo.modificationTime ? fileInfo.modificationTime * 1000 : Date.now(),
          };
          documents.push(document);
        }
      } catch (error) {
        console.warn(`Failed to process file ${filename}:`, error);
      }
    }

    return documents.sort((a, b) => b.lastOpened - a.lastOpened);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to retrieve documents: ${errorMessage}`);
  }
}

/**
 * Deletes a document from app storage
 */
export async function deleteDocument(path: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(path, { idempotent: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to delete document: ${errorMessage}`);
  }
}

/**
 * Gets file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
