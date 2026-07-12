/**
 * core/audio-renderer.ts — 音声レンダリングモジュール
 * SPEC.md §2 準拠
 *
 * Tone.js の Offline + Sampler を使って MIDI ノートを AudioBuffer にレンダリングする
 * OfflineAudioContext はメインスレッドで動作（Web Worker非対応）
 */

import * as Tone from 'tone';
import type { ParsedMidi, ParsedNote, ParsedTrack, TrackConfig } from './types.ts';
import { SOUNDFONT_BASE_URL, SOUNDFONT_INSTRUMENT_NAMES } from './constants.ts';
import type { InstrumentChoice } from './types.ts';

// ノート番号 → 音名変換テーブル（Tone.js形式: "C4", "A#3" など）
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const note = NOTE_NAMES[midi % 12];
  return `${note}${octave}`;
}

/**
 * 楽器ごとのサンプルURL辞書を生成する
 * gleitz/midi-js-soundfonts から各オクターブのCノートを取得
 */
function getSampleUrls(instrument: InstrumentChoice): Record<string, string> {
  const dir = SOUNDFONT_INSTRUMENT_NAMES[instrument];
  const baseUrl = `${SOUNDFONT_BASE_URL}${dir}/`;

  switch (instrument) {
    case 'piano':
      return {
        'A0': `${baseUrl}A0.mp3`,
        'C1': `${baseUrl}C1.mp3`,
        'D#1': `${baseUrl}Ds1.mp3`,
        'F#1': `${baseUrl}Fs1.mp3`,
        'A1': `${baseUrl}A1.mp3`,
        'C2': `${baseUrl}C2.mp3`,
        'D#2': `${baseUrl}Ds2.mp3`,
        'F#2': `${baseUrl}Fs2.mp3`,
        'A2': `${baseUrl}A2.mp3`,
        'C3': `${baseUrl}C3.mp3`,
        'D#3': `${baseUrl}Ds3.mp3`,
        'F#3': `${baseUrl}Fs3.mp3`,
        'A3': `${baseUrl}A3.mp3`,
        'C4': `${baseUrl}C4.mp3`,
        'D#4': `${baseUrl}Ds4.mp3`,
        'F#4': `${baseUrl}Fs4.mp3`,
        'A4': `${baseUrl}A4.mp3`,
        'C5': `${baseUrl}C5.mp3`,
        'D#5': `${baseUrl}Ds5.mp3`,
        'F#5': `${baseUrl}Fs5.mp3`,
        'A5': `${baseUrl}A5.mp3`,
        'C6': `${baseUrl}C6.mp3`,
        'D#6': `${baseUrl}Ds6.mp3`,
        'F#6': `${baseUrl}Fs6.mp3`,
        'A6': `${baseUrl}A6.mp3`,
        'C7': `${baseUrl}C7.mp3`,
      };
    case 'clarinet':
      // クラリネットの実音域は D3 以上。それ未満のバス音は Tone.Sampler が
      // 実サンプルをリアルタイムにピッチシフトして鳴らす（人工的な低音サンプル・
      // 手動トリムは廃止）。
      return {
        'D3': `${baseUrl}D3.mp3`,
        'D4': `${baseUrl}D4.mp3`,
        'D5': `${baseUrl}D5.mp3`,
        'D6': `${baseUrl}D6.mp3`,
      };
    case 'woodblock':
      // MuseScoreのWood BlockはHigh/Low（GM打楽器 MIDI 76/77）の2音を使う。
      // gleitzの木魚は半音差だと音色差がほぼ出ないため、オクターブ離した
      // C6(High)/C5(Low)の実サンプルを用意して2音色として鳴らす。
      return {
        'C5': `${baseUrl}C5.mp3`,
        'C6': `${baseUrl}C6.mp3`,
      };
  }
}

/** High Wood Block (MIDI 76) を割り当てる音程 */
const WOODBLOCK_HIGH_NOTE = 'C6';
/** Low Wood Block (MIDI 77) を割り当てる音程 */
const WOODBLOCK_LOW_NOTE = 'C5';

/**
 * ウッドブロック用のノート名変換。
 * MuseScoreの High Wood Block(76) / Low Wood Block(77) を、音程差を広げた
 * 2音（C6 / C5）に振り分けて明確な2音色にする。それ以外は実ピッチのまま。
 */
function woodblockNoteName(midi: number): string {
  if (midi === 76) return WOODBLOCK_HIGH_NOTE;
  if (midi === 77) return WOODBLOCK_LOW_NOTE;
  return midiToNoteName(midi);
}

/** ロール別の有効トラック本数 */
interface CategoryCounts {
  /** 声部（伴奏・打楽器以外）の本数 */
  voice: number;
  /** ピアノ（伴奏）の本数 */
  piano: number;
  /** ウッドブロック（打楽器）の本数 */
  woodblock: number;
}

/** Excluded以外のトラック設定を trackId で引ける Map にする */
function buildConfigMap(trackConfigs: TrackConfig[]): Map<number, TrackConfig> {
  const configMap = new Map<number, TrackConfig>();
  for (const config of trackConfigs) {
    if (config.role !== 'Excluded') {
      configMap.set(config.trackId, config);
    }
  }
  return configMap;
}

/**
 * ロール別に、音を鳴らす有効トラック本数を数える。
 * @param excludeIds - カウントから除くトラックID（ソロ主役など、別扱いするもの）
 */
function categoryCounts(
  parsedMidi: ParsedMidi,
  configMap: Map<number, TrackConfig>,
  excludeIds: Set<number>
): CategoryCounts {
  const counts: CategoryCounts = { voice: 0, piano: 0, woodblock: 0 };
  for (const track of parsedMidi.tracks) {
    const config = configMap.get(track.id);
    if (!config || track.notes.length === 0 || excludeIds.has(track.id)) continue;
    if (config.role === 'Piano') counts.piano++;
    else if (config.role === 'Percussion') counts.woodblock++;
    else counts.voice++;
  }
  return counts;
}

/** 1トラックごとのゲインを返す関数 */
type GainResolver = (track: ParsedTrack, config: TrackConfig) => number;

/**
 * gainResolver で決めたゲインで全トラックをミックスし、AudioBufferにレンダリングする。
 * renderPartAudio / renderAllPartsAudio 共通の描画本体。
 */
async function renderWithGains(
  parsedMidi: ParsedMidi,
  trackConfigs: TrackConfig[],
  gainResolver: GainResolver,
  sampleRate: number
): Promise<AudioBuffer> {
  const configMap = buildConfigMap(trackConfigs);
  // 末尾に0.5秒の余白を追加（最終ノートのリリースのため）
  const renderDuration = parsedMidi.durationSeconds + 0.5;

  const toneBuffer = await Tone.Offline(async () => {
    const samplers: Array<{
      sampler: Tone.Sampler;
      gainNode: Tone.Gain;
      notes: ParsedNote[];
      instrument: InstrumentChoice;
    }> = [];

    // 各トラックのSamplerを作成
    for (const track of parsedMidi.tracks) {
      const config = configMap.get(track.id);
      if (!config || track.notes.length === 0) continue;

      const gainValue = gainResolver(track, config);

      const gainNode = new Tone.Gain(gainValue).toDestination();
      const sampleUrls = getSampleUrls(config.instrument);

      const sampler = new Tone.Sampler({
        urls: sampleUrls,
      }).connect(gainNode);

      samplers.push({ sampler, gainNode, notes: track.notes, instrument: config.instrument });
    }

    // 全サンプルのロードを待つ
    await Tone.loaded();

    // ノートをスケジュール
    for (const { sampler, notes, instrument } of samplers) {
      for (const note of notes) {
        const noteName =
          instrument === 'woodblock' ? woodblockNoteName(note.midi) : midiToNoteName(note.midi);
        try {
          sampler.triggerAttackRelease(
            noteName,
            Math.max(note.duration, 0.05), // 最小デュレーションを保証
            note.time,
            note.velocity
          );
        } catch {
          // 音域外のノートは無視
        }
      }
    }
  }, renderDuration, 2, sampleRate);

  // ToneAudioBuffer → AudioBuffer
  return toneBuffer.get() as AudioBuffer;
}

/**
 * 指定パートを強調したAudioBufferをレンダリングする
 *
 * 音量ミックス（既定 level=0.5）:
 *   ソロ（主役）: 各トラック 1.0
 *   他の声部パート合計 / ウッドブロック合計 / ピアノ合計: それぞれ合計が level
 * → 既定で ソロ : 他声部計 : WB : Piano = 2 : 1 : 1 : 1
 * 各カテゴリはトラック本数で等分し、「それぞれ50%」ではなく「合計が level」になるようにする
 *
 * @param parsedMidi - 解析済みMIDIデータ
 * @param trackConfigs - 各トラックの設定
 * @param targetTrackIds - 強調する（主役の）トラックID群。ここに含まれるトラックは音量100%
 * @param backgroundVolumePercent - 背景パートの音量 (0-100)
 * @param sampleRate - 出力サンプルレート
 * @returns レンダリング済みAudioBuffer
 */
export async function renderPartAudio(
  parsedMidi: ParsedMidi,
  trackConfigs: TrackConfig[],
  targetTrackIds: Iterable<number>,
  backgroundVolumePercent: number,
  sampleRate: number = 44100
): Promise<AudioBuffer> {
  const targetIds = new Set(targetTrackIds);
  const configMap = buildConfigMap(trackConfigs);
  const level = Math.max(0, backgroundVolumePercent) / 100;
  const counts = categoryCounts(parsedMidi, configMap, targetIds);

  const gainResolver: GainResolver = (track, config) => {
    if (targetIds.has(track.id)) return 1.0;
    if (config.role === 'Piano') return counts.piano > 0 ? level / counts.piano : 0;
    if (config.role === 'Percussion') return counts.woodblock > 0 ? level / counts.woodblock : 0;
    return counts.voice > 0 ? level / counts.voice : 0;
  };

  return renderWithGains(parsedMidi, trackConfigs, gainResolver, sampleRate);
}

/**
 * 全パートを含む「All」音源をレンダリングする。
 *
 * 主役なしの均等ミックスで、カテゴリ合計が 声 : ピアノ : ウッドブロック = 1 : 1 : 1 になる。
 * 各カテゴリはトラック本数で等分するため、同カテゴリ内の各トラックは合計が 1 になるよう配分される。
 * （最終音量は後段のピーク正規化で決まるため、ここでの絶対値ではなくカテゴリ間の比率が意味を持つ）
 *
 * @param parsedMidi - 解析済みMIDIデータ
 * @param trackConfigs - 各トラックの設定
 * @param sampleRate - 出力サンプルレート
 * @returns レンダリング済みAudioBuffer
 */
export async function renderAllPartsAudio(
  parsedMidi: ParsedMidi,
  trackConfigs: TrackConfig[],
  sampleRate: number = 44100
): Promise<AudioBuffer> {
  const configMap = buildConfigMap(trackConfigs);
  const counts = categoryCounts(parsedMidi, configMap, new Set());

  const gainResolver: GainResolver = (_track, config) => {
    if (config.role === 'Piano') return counts.piano > 0 ? 1 / counts.piano : 0;
    if (config.role === 'Percussion') return counts.woodblock > 0 ? 1 / counts.woodblock : 0;
    return counts.voice > 0 ? 1 / counts.voice : 0;
  };

  return renderWithGains(parsedMidi, trackConfigs, gainResolver, sampleRate);
}
