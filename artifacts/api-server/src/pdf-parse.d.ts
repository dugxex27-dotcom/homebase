declare module 'pdf-parse' {
  export const VerbosityLevel: {
    ERRORS: number;
    WARNINGS: number;
    INFOS: number;
  };
  export class PDFParse {
    constructor(options: { data: Buffer; verbosity?: number });
    getText(): Promise<{ text: string | undefined }>;
    getScreenshot(options?: {
      first?: number;
      last?: number;
      desiredWidth?: number;
      imageDataUrl?: boolean;
      imageBuffer?: boolean;
    }): Promise<{ pages: Array<{ dataUrl: string }> }>;
    destroy(): Promise<void>;
  }
}
