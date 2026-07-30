declare module 'exifr' {
  interface GpsResult {
    latitude: number;
    longitude: number;
  }

  interface ParseOptions {
    DateTimeOriginal?: boolean;
    DateTime?: boolean;
    [tag: string]: boolean | undefined;
  }

  interface ParsedTags {
    DateTimeOriginal?: Date;
    DateTime?: Date;
    GPSLatitude?: number;
    GPSLongitude?: number;
    [tag: string]: unknown;
  }

  function gps(input: Buffer | ArrayBuffer | Uint8Array): Promise<GpsResult | undefined>;
  function parse(input: Buffer | ArrayBuffer | Uint8Array, options?: ParseOptions | string[] | boolean): Promise<ParsedTags | undefined>;
}
