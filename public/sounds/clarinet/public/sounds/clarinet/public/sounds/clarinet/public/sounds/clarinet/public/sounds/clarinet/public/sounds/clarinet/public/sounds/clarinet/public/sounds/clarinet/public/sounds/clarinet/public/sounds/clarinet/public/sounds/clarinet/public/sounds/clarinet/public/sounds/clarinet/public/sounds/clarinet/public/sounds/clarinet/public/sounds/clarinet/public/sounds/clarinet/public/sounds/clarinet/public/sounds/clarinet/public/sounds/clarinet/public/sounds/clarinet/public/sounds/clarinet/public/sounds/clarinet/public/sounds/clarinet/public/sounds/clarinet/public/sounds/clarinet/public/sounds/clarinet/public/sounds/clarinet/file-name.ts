/** MIDIファイル名から拡張子を除去してsafe-string化 */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/\.(mid|midi)$/i, '')
    .replace(/[^a-zA-Z0-9_\-\u3000-\u9fff\u30a0-\u30ff\u3040-\u309f]/g, '_');
}
