import * as FileSystem from 'expo-file-system';

export interface SlideContent {
  slideNumber: number;
  title: string;
  content: string;
  notes: string;
  hasImages: boolean;
}

/**
 * Reads PPTX files and extracts text from slides
 */
export async function readPptxFile(filePath: string): Promise<SlideContent[]> {
  try {
    // Verify file exists
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      throw new Error('PPTX file not found');
    }

    // PPTX files are ZIP archives containing XML
    // This would typically use a library to extract and parse the content
    // For now, returning a placeholder implementation

    // In a real implementation, you would:
    // 1. Unzip the PPTX file
    // 2. Parse slide[n].xml files
    // 3. Extract text from shapes, text boxes, and notes
    // 4. Detect images on slides

    console.warn('PPTX parsing requires external library - returning placeholder');
    return [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to read PPTX file: ${errorMessage}`);
  }
}

/**
 * Reads PPT files and extracts text from slides
 */
export async function readPptFile(filePath: string): Promise<SlideContent[]> {
  try {
    // Verify file exists
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      throw new Error('PPT file not found');
    }

    // PPT files are binary Microsoft PowerPoint format (OLE2 compound documents)
    // This requires a library that can parse OLE2 format
    // For now, returning a placeholder implementation

    console.warn('PPT parsing requires external library - returning placeholder');
    return [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to read PPT file: ${errorMessage}`);
  }
}

/**
 * Extracts text from either PPTX or PPT files based on file extension
 */
export async function extractPresentationSlides(
  filePath: string
): Promise<{
  slides: SlideContent[];
  totalSlides: number;
  totalTextLength: number;
}> {
  try {
    const filename = filePath.split('/').pop() || '';
    const extension = filename.split('.').pop()?.toLowerCase();

    let slides: SlideContent[] = [];
    if (extension === 'pptx') {
      slides = await readPptxFile(filePath);
    } else if (extension === 'ppt') {
      slides = await readPptFile(filePath);
    } else {
      throw new Error(`Unsupported format: ${extension}`);
    }

    // Calculate total text length
    const totalTextLength = slides.reduce((sum, slide) => {
      return sum + slide.title.length + slide.content.length + slide.notes.length;
    }, 0);

    return {
      slides,
      totalSlides: slides.length,
      totalTextLength,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to extract presentation slides: ${errorMessage}`);
  }
}

/**
 * Extracts text from a specific slide
 */
export async function extractSlideText(filePath: string, slideNumber: number): Promise<string> {
  try {
    const result = await extractPresentationSlides(filePath);
    const slide = result.slides[slideNumber - 1];

    if (!slide) {
      throw new Error(`Slide ${slideNumber} not found`);
    }

    return `${slide.title}\n\n${slide.content}\n\n${slide.notes}`;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to extract slide text: ${errorMessage}`);
  }
}

/**
 * Gets total number of slides in a presentation
 */
export async function getPresentationSlideCount(filePath: string): Promise<number> {
  try {
    const result = await extractPresentationSlides(filePath);
    return result.totalSlides;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to get slide count: ${errorMessage}`);
  }
}

/**
 * Extracts all text from all slides in a presentation
 */
export async function extractAllPresentationText(filePath: string): Promise<string> {
  try {
    const result = await extractPresentationSlides(filePath);
    const allText = result.slides
      .map((slide) => {
        return `--- Slide ${slide.slideNumber} ---\n${slide.title}\n\n${slide.content}\n\n${slide.notes}`;
      })
      .join('\n\n');

    return allText;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to extract all presentation text: ${errorMessage}`);
  }
}
