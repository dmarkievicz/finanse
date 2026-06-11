import { strToU8, zipSync } from "fflate";

export function buildZipBuffer(files: { name: string; content: string }[]): Buffer {
  const entries: Record<string, Uint8Array> = {};
  for (const file of files) {
    entries[file.name] = strToU8(file.content);
  }
  return Buffer.from(zipSync(entries));
}
