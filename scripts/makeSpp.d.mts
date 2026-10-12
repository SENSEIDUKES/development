export declare const SPP_CONFIG_FILE: string;
export declare const SOUND_WORDS_FILE: string;
export declare const SOUND_WORDS_ASSET: string;
export declare const MEDIA_CATALOG_ASSET: string;
export declare function readSoundWords(text: string): { words: string[]; problems: string[] };
export declare function makeSpp(folderPath: string, options?: { now?: Date }): Promise<{
  path: string;
  version: string;
  previousVersion: string;
  newId: boolean;
  files: number;
}>;
