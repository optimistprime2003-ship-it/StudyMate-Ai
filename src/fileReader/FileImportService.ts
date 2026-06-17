import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Document, DocumentType } from '../components/ModuleConnector';

const APP_STORAGE_DIR = `${FileSystem.documentDirectory}StudyMateDocs/`;

const SUPPORTED_EXTENSIONS: DocumentType[] = [
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

const MIME_MAP: Record<string, DocumentType> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'application/rtf': 'rtf',
  'text/rtf': 'rtf',
  'application/epub+zip': 'epub',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const ERROR_MESSAGES: Record<string, string> = {
  PICKER_CANCELLED: 'No file was selected.',
  UNSUPPORTED_TYPE: 'This file type is not supported. Please choose a supported format.',
  COPY_FAILED: 'Could not save the file to your device. Please try again.',
  NO_PERMISSION: 'Permission denied. Please allow file access in your device settings.',
  FILE_TOO_LARGE: 'This file is too large to import. Maximum size is 500 MB.',
  GENERAL: 'Something went wrong while importing the file. Please try again.',
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getExtensionFromName(fileName: string): string {
  const parts = fileName.split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1].toLowerCase();
}

function resolveDocumentType(
  mimeType: string | null,
  fileName: string
): DocumentType | null {
  if (mimeType && MIME_MAP[mimeType]) {
    return MIME_MAP[mimeType];
  }
  const ext = getExtensionFromName(fileName);
  if (SUPPORTED_EXTENSIONS.includes(ext as DocumentType)) {
    return ext as DocumentType;
  }
  return null;
}

async function ensureStorageDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(APP_STORAGE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(APP_STORAGE_DIR, { intermediates: true });
  }
}

function friendlyError(code: string): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.GENERAL;
}

export interface ImportResult {
  success: boolean;
  document?: Document;
  error?: string;
}

export async function importFile(): Promise<ImportResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'application/rtf',
        'text/rtf',
        'application/epub+zip',
        'image/*',
      ],
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return { success: false, error: friendlyError('PICKER_CANCELLED') };
    }

    const asset = result.assets[0];
    if (!asset) {
      return { success: false, error: friendlyError('GENERAL') };
    }

    const docType = resolveDocumentType(asset.mimeType ?? null, asset.name);
    if (!docType) {
      return { success: false, error: friendlyError('UNSUPPORTED_TYPE') };
    }

    if (asset.size && asset.size > 500 * 1024 * 1024) {
      return { success: false, error: friendlyError('FILE_TOO_LARGE') };
    }

    await ensureStorageDir();

    const safeName = asset.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const destPath = `${APP_STORAGE_DIR}${generateId()}_${safeName}`;

    const copyResult = await FileSystem.copyAsync({
      from: asset.uri,
      to: destPath,
    });

    if (!copyResult) {
      const destInfo = await FileSystem.getInfoAsync(destPath);
      if (!destInfo.exists) {
        return { success: false, error: friendlyError('COPY_FAILED') };
      }
    }

    const fileInfo = await FileSystem.getInfoAsync(destPath);
    const fileSize = fileInfo.exists && 'size' in fileInfo ? (fileInfo.size as number) : asset.size ?? 0;

    const document: Document = {
      id: generateId(),
      title: asset.name.replace(/\.[^/.]+$/, ''),
      type: docType,
      path: destPath,
      size: fileSize,
      createdAt: new Date().toISOString(),
    };

    return { success: true, document };
  } catch (err: any) {
    const msg = err?.message ?? '';
    if (msg.toLowerCase().includes('permission')) {
      return { success: false, error: friendlyError('NO_PERMISSION') };
    }
    return { success: false, error: friendlyError('GENERAL') };
  }
}

export async function importSharedFile(sharedUri: string, fileName: string): Promise<ImportResult> {
  try {
    const docType = resolveDocumentType(null, fileName);
    if (!docType) {
      return { success: false, error: friendlyError('UNSUPPORTED_TYPE') };
    }

    await ensureStorageDir();

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const destPath = `${APP_STORAGE_DIR}${generateId()}_${safeName}`;

    await FileSystem.copyAsync({
      from: sharedUri,
      to: destPath,
    });

    const fileInfo = await FileSystem.getInfoAsync(destPath);
    const fileSize = fileInfo.exists && 'size' in fileInfo ? (fileInfo.size as number) : 0;

    const document: Document = {
      id: generateId(),
      title: fileName.replace(/\.[^/.]+$/, ''),
      type: docType,
      path: destPath,
      size: fileSize,
      createdAt: new Date().toISOString(),
    };

    return { success: true, document };
  } catch {
    return { success: false, error: friendlyError('GENERAL') };
  }
}

export async function deleteFile(path: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      await FileSystem.deleteAsync(path);
    }
    return true;
  } catch {
    return false;
  }
}

export async function getFileSize(path: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    return info.exists && 'size' in info ? (info.size as number) : 0;
  } catch {
    return 0;
  }
}

export async function shareFile(path: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(path);
}

export { SUPPORTED_EXTENSIONS, APP_STORAGE_DIR };
