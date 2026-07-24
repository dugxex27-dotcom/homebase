declare module 'exif-parser' {
  interface ExifTag {
    GPSLatitude?: number;
    GPSLongitude?: number;
    GPSLatitudeRef?: string;
    GPSLongitudeRef?: string;
    DateTimeOriginal?: number; // Unix timestamp
    DateTime?: number;
    Make?: string;
    Model?: string;
  }
  interface ExifResult {
    tags: ExifTag;
    hasThumbnail: boolean;
  }
  interface ExifParser {
    parse(): ExifResult;
  }
  function create(buffer: Buffer): ExifParser;
  export = { create };
}
