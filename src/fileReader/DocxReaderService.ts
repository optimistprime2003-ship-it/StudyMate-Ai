import * as FileSystem from 'expo-file-system';

/**
 * Reads DOCX and DOC files and extracts plain text with paragraph structure
 */
export async function readDocxFile(filePath: string): Promise<string> {
  try {
    // Verify file exists
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      throw new Error('DOCX file not found');
    }

    // DOCX files are ZIP archives containing XML
    // This would typically use a library like docx-parser or similar
    // For now, returning a placeholder implementation
    
    // In a real implementation, you would:
    // 1. Unzip the DOCX file
    // 2. Parse the document.xml file
    // 3. Extract text from paragraphs and text runs
    // 4. Preserve formatting information

    console.warn('DOCX parsing requires external library - returning placeholder');
    return 'DOCX content would be extracted here';
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to read DOCX file: ${errorMessage}`);
  }
}

/**
 * Reads DOC files and extracts plain text
 */
export async function readDocFile(filePath: string): Promise<string> {
  try {
    // Verify file exists
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      throw new Error('DOC file not found');
    }

    // DOC files are binary Microsoft Word format
    // This requires a library that can parse OLE2 compound documents
    // For now, returning a placeholder implementation

    console.warn('DOC parsing requires external library - returning placeholder');
    return 'DOC content would be extracted here';
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to read DOC file: ${errorMessage}`);
  }
}

/**
 * Extracts text from either DOCX or DOC files based on file extension
 */
export async function extractDocumentText(filePath: string): Promise<{
  text: string;
  paragraphs: string[];
  wordCount: number;
}> {
  try {
    const filename = filePath.split('/').pop() || '';
    const extension = filename.split('.').pop()?.toLowerCase();

    let text = '';
    if (extension === 'docx') {
      text = await readDocxFile(filePath);
    } else if (extension === 'doc') {
      text = await readDocFile(filePath);
    } else {
      throw new Error(`Unsupported format: ${extension}`);
    }

    // Split into paragraphs
    const paragraphs = text
      .split('\n\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    // Count words
    const wordCount = text
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    return {
      text,
      paragraphs,
      wordCount,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to extract document text: ${errorMessage}`);
  }
}

/**
 * Gets document metadata (title, author, creation date, etc.)
 */
export async function getDocumentMetadata(
  filePath: string
): Promise<Record<string, string>> {
  try {
    // This would extract metadata from the document properties
    // Placeholder implementation
    return {
      title: '',
      author: '',
      createdDate: '',
      modifiedDate: '',
      subject: '',
      keywords: '',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to get document metadata: ${errorMessage}`);
  }
}
