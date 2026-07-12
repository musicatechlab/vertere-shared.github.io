/**
 * core/part-assignment.ts — パート自動割り当て・採番ロジック
 *
 * 合唱種別（混声/女声/男声）に応じて、MIDIトラックを声部へ配分し、
 * 同一声部に複数トラックがある場合は上（トラックの並び順）から 1,2,3… と採番する。
 * DOMやブラウザAPIに依存しない純粋ロジック。
 */

import type {
  ChoirType,
  ParsedTrack,
  PartRole,
  TrackConfig,
  VoiceRole,
} from './types.ts';
import { CHOIR_VOICES, DEFAULT_INSTRUMENT_FOR_ROLE } from './constants.ts';

function isPercussion(track: ParsedTrack): boolean {
  return track.channel === 9 || track.instrumentNumber === 115;
}

/** トラック名が伴奏（ピアノ等）を示すか。声部名が取れたトラックには使わない。 */
function isAccompanimentName(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('piano') || n.includes('伴奏') || n.includes('accomp');
}



/** トラック名から声部を推定（判別できなければ null） */
function detectVoice(name: string): VoiceRole | null {
  const n = name.toLowerCase();
  // mezzo は soprano を含むので先に判定する
  if (n.includes('mezzo')) return 'MezzoSoprano';
  if (n.includes('soprano') || n.includes('sop')) return 'Soprano';
  if (n.includes('alto') || n.includes('alt')) return 'Alto';
  if (n.includes('baritone') || n.includes('bariton')) return 'Baritone';
  if (n.includes('tenor') || n.includes('ten')) return 'Tenor';
  if (n.includes('bass') || n.includes('bas')) return 'Bass';
  return null;
}

/** items を buckets 個のグループへ、先頭（上）優先で均等配分する */
function distribute<T>(items: readonly T[], buckets: number): T[][] {
  const result: T[][] = Array.from({ length: buckets }, () => []);
  if (buckets <= 0) return result;
  const base = Math.floor(items.length / buckets);
  let remainder = items.length % buckets;
  let index = 0;
  for (let b = 0; b < buckets; b++) {
    const size = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    for (let k = 0; k < size; k++) {
      result[b].push(items[index++]);
    }
  }
  return result;
}

/**
 * ロール（声部/伴奏/打楽器/除外）を尊重したまま、パート名を採番し直す。
 * 同一ロールが複数なら上（トラックの並び順）から 1,2,3… を付与し、単独ならロール名のみ。
 * 手動でロールを変えた後の再採番に使う。
 */
export function renumberByRole(
  tracks: readonly ParsedTrack[],
  configs: readonly TrackConfig[]
): TrackConfig[] {
  const orderById = new Map<number, number>();
  tracks.forEach((track, index) => orderById.set(track.id, index));

  const byRole = new Map<PartRole, TrackConfig[]>();
  for (const config of configs) {
    if (config.role === 'Excluded') continue;
    const group = byRole.get(config.role);
    if (group) group.push(config);
    else byRole.set(config.role, [config]);
  }

  const nameByTrackId = new Map<number, string>();
  for (const [role, group] of byRole) {
    const sorted = [...group].sort(
      (a, b) => (orderById.get(a.trackId) ?? 0) - (orderById.get(b.trackId) ?? 0)
    );
    const multiple = sorted.length > 1;
    const isMen4 = byRole.has('Baritone') && byRole.has('Bass');

    sorted.forEach((config, index) => {
      let partName = multiple ? `${role}${index + 1}` : String(role);
      
      if (role === 'Tenor' && multiple && isMen4) {
        if (index === 0) partName = 'Top Tenor';
        else if (index === 1) partName = 'Second Tenor';
      }
      
      nameByTrackId.set(config.trackId, partName);
    });
  }

  return configs.map((config) =>
    config.role === 'Excluded'
      ? { ...config, partName: '' }
      : { ...config, partName: nameByTrackId.get(config.trackId) ?? String(config.role) }
  );
}

/**
 * 合唱種別に基づいてトラックへロール・楽器・パート名を自動割り当てする。
 *
 * - ノート無しは除外
 * - パーカッション（ch10 / GM 115）は打楽器（Percussion）
 * - ピアノ・伴奏はPianoロールでBGM扱い（声部名が取れたトラックは優先して声部へ）
 * - 声部の音色は MIDI の GM 番号に依らずロール既定（クラリネット）。ユーザーが後から変更可
 * - 残りの声部トラックはトラックの並び順（上→下）に声部へ配分
 *   （名前で全て判別できればそれを尊重）
 * - 採番は {@link renumberByRole} に委譲（上から 1,2,3…）
 */
export function assignParts(
  tracks: readonly ParsedTrack[],
  choirType: ChoirType
): TrackConfig[] {
  const voices = CHOIR_VOICES[choirType];
  const roleByTrackId = new Map<number, PartRole>();
  let voiceTracks: ParsedTrack[] = [];
  const pianoTracks: ParsedTrack[] = [];

  for (const track of tracks) {
    if (track.notes.length === 0) {
      roleByTrackId.set(track.id, 'Excluded');
    } else if (isPercussion(track)) {
      roleByTrackId.set(track.id, 'Percussion');
    } else if (isAccompanimentName(track.name)) {
      pianoTracks.push(track);
    } else {
      voiceTracks.push(track);
    }
  }

  // もし声部になり得るトラックが1つもなく、ピアノ（伴奏）トラックがある場合は、
  // DAWが全トラックを「Piano 1」等で書き出したとみなし、それらを声部として扱う
  if (voiceTracks.length === 0 && pianoTracks.length > 0) {
    voiceTracks = pianoTracks;
  } else {
    // 通常通りピアノトラックはPianoロールとする
    for (const track of pianoTracks) {
      roleByTrackId.set(track.id, 'Piano');
    }
  }

  // トラックの並び順（上→下）で扱う
  const detected = voiceTracks.map((track) => detectVoice(track.name));
  const allNamed =
    voiceTracks.length > 0 &&
    detected.every((voice) => voice !== null && voices.includes(voice));

  if (allNamed) {
    voiceTracks.forEach((track, i) => roleByTrackId.set(track.id, detected[i] as VoiceRole));
  } else {
    const buckets = distribute(voiceTracks, voices.length);
    buckets.forEach((bucket, b) => {
      for (const track of bucket) roleByTrackId.set(track.id, voices[b]);
    });
  }

  const configs: TrackConfig[] = tracks.map((track) => {
    const role = roleByTrackId.get(track.id) ?? 'Excluded';
    return {
      trackId: track.id,
      role,
      partName: '',
      instrument: DEFAULT_INSTRUMENT_FOR_ROLE[role],
    };
  });

  return renumberByRole(tracks, configs);
}
