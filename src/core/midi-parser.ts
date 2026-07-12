/**
 * core/midi-parser.ts — MIDI解析モジュール
 * SPEC.md §1 準拠
 *
 * 入力: ArrayBuffer（.midファイル）× 1以上
 * 出力: ParsedMidi（全トラック統合）
 */

import { Midi } from '@tonejs/midi';
import type { ParsedMidi, ParsedNote, ParsedTrack } from './types.ts';
import { sanitizeFileName } from './file-name.ts';

export { sanitizeFileName };

/**
 * トラック名の文字化けを復元する。
 *
 * @tonejs/midi（内部の midi-file）はメタイベントのテキストをバイト単位で
 * そのまま char code 化するため、日本語などの UTF-8 バイト列が Latin-1 として
 * 読まれて mojibake（例: 「クラリネット」→「ã¯ã©ãªããã」）になる。
 * char code を生バイトとして解釈し直し、UTF-8 として再デコードして復元する。
 * ASCIIのみ／既に正しくデコードされている（>0xFF を含む）場合はそのまま返す。
 */
export function decodeTrackName(name: string): string {
  if (!name) return name;

  const bytes = new Uint8Array(name.length);
  let hasHighByte = false;
  for (let i = 0; i < name.length; i++) {
    const code = name.charCodeAt(i);
    // 既にマルチバイト文字が入っている＝正しくデコード済みとみなす
    if (code > 0xff) return name;
    if (code > 0x7f) hasHighByte = true;
    bytes[i] = code;
  }
  // 純粋なASCIIなら復元不要
  if (!hasHighByte) return name;

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    // 妥当なUTF-8でなければ元の文字列を維持
    return name;
  }
}

/**
 * 単一MIDIファイル（ArrayBuffer）を解析し、ParsedTrack[]を返す
 * Type 0 MIDIの場合はチャンネルごとに分割する
 */
function parseSingleMidi(
  buffer: ArrayBuffer,
  fileName: string,
  trackIdOffset: number
): { tracks: ParsedTrack[]; durationSeconds: number; bpm: number } {
  const midi = new Midi(buffer);

  // テンポ: 最初のテンポイベント（なければ120）
  const bpm = midi.header.tempos.length > 0 ? midi.header.tempos[0].bpm : 120;
  const durationSeconds = midi.duration;

  // @tonejs/midi 側で Type 0 のチャンネル分割は済んでいる
  const rawTracks = midi.tracks;
  const tracks: ParsedTrack[] = [];

  for (const [trackIndex, track] of rawTracks.entries()) {
    const fallbackName = `Track ${tracks.length + 1}`;
    const trackName = track.name ? decodeTrackName(track.name) : '';
    const channel = track.channel ?? 0;
    const instrumentNumber = channel === 9 ? 115 : (track.instrument?.number ?? 0);

    if (track.notes.length === 0) {
      // ノートが空のトラック（メタデータやテンポ専用など）はリストに含めない
      continue;
    }

    const notes: ParsedNote[] = track.notes.map((note) => ({
      midi: note.midi,
      time: note.time,
      duration: note.duration,
      velocity: note.velocity,
    }));

    const parsedTrack: ParsedTrack = {
      id: trackIdOffset + trackIndex,
      name: trackName || fallbackName,
      channel,
      notes,
      instrumentNumber,
      sourceFileName: fileName,
    };
    tracks.push(parsedTrack);
  }

  return { tracks, durationSeconds, bpm };
}

/**
 * 1つ以上のMIDIファイルを解析して統合したParsedMidiを返す
 *
 * @param files - { buffer: ArrayBuffer, name: string }[] のリスト
 * @throws 有効なトラック・ノートがまったくない場合
 */
export function parseMidiFiles(
  files: Array<{ buffer: ArrayBuffer; name: string }>
): ParsedMidi {
  if (files.length === 0) {
    throw new Error('MIDIファイルが選択されていません');
  }

  const allTracks: ParsedTrack[] = [];
  let maxDuration = 0;
  let primaryBpm = 120;
  const primaryFileName = sanitizeFileName(files[0].name);

  for (const file of files) {
    const { tracks, durationSeconds, bpm } = parseSingleMidi(
      file.buffer,
      file.name,
      allTracks.length
    );
    allTracks.push(...tracks);
    if (durationSeconds > maxDuration) {
      maxDuration = durationSeconds;
      primaryBpm = bpm;
    }
  }

  // 全トラックのIDを0からの連番に振り直す（既に parseSingleMidi でoffset付きで振っているので不要だが念のため）
  allTracks.forEach((t, i) => { t.id = i; });

  // ノートが1つもないMIDIは無効とみなす
  const hasAnyNote = allTracks.some((track) => track.notes.length > 0);
  if (!hasAnyNote) {
    throw new Error('有効なトラックがありません');
  }

  return {
    fileName: primaryFileName,
    durationSeconds: maxDuration,
    bpm: primaryBpm,
    tracks: allTracks,
  };
}
