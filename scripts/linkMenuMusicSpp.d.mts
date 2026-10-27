export function linkMenuMusicSpp(source: Uint8Array, links: Record<string, string>, version: string): Promise<{
  bytes: Uint8Array;
  pieces: Array<{ label: string; mood: string; url: string; sourcePath: string; sourceSha256: string }>;
}>;
