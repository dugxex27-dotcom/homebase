declare module 'pdf-parse' {
  export const VerbosityLevel: {
    ERRORS: number;
    WARNINGS: number;
    INFOS: number;
  };
  export class PDFParse {
    constructor(options: { data: Buffer; verbosity?: number });
    getText(): Promise<{ text: string | undefined }>;
  }
}
