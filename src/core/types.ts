/**
 * core/types.ts — 全型定義
 * ARCHITECTURE.md の型定義に基づく
 * このファイルがプロジェクト全体の型の Single Source of Truth
 */

// === MIDI解析結果 ===

/** MIDI解析結果の1ノート */
export interface ParsedNote {
  /** MIDI note number (0-127) */
  midi: number;
  /** 開始時刻（秒） */
  time: number;
  /** 長さ（秒） */
  duration: number;
  /** ベロシティ 0.0-1.0 */
  velocity: number;
}

/** MIDI解析結果の1トラック */
export interface ParsedTrack {
  /** トラック識別子（グローバル連番） */
  id: number;
  /** トラック名（MIDIメタデータ由来、空なら "Track {index}"） */
  name: string;
  /** MIDIチャンネル (0-15) */
  channel: number;
  /** ノート一覧 */
  notes: ParsedNote[];
  /** GM program number */
  instrumentNumber: number;
  /** 由来するMIDIファイル名 */
  sourceFileName: string;
}

/** MIDI解析結果全体（複数ファイル統合後） */
export interface ParsedMidi {
  /** 主ファイル名（ZIP名に使用、拡張子なし） */
  fileName: string;
  /** 全体の長さ（秒） */
  durationSeconds: number;
  /** 主テンポ (BPM) */
  bpm: number;
  /** 全トラック */
  tracks: ParsedTrack[];
}

// === ユーザー設定 ===

/** パート種別 */
export type PartRole =
  | 'Soprano'
  | 'MezzoSoprano'
  | 'Alto'
  | 'Tenor'
  | 'Baritone'
  | 'Bass'
  | 'Piano'
  | 'Percussion'
  | 'Excluded';

/** 声部（合唱の実声部。伴奏・打楽器・除外を除いたロール） */
export type VoiceRole = Exclude<PartRole, 'Piano' | 'Percussion' | 'Excluded'>;

/** 合唱編成の種別 */
export type ChoirType = 'mixed' | 'men3' | 'men4' | 'women3' | 'women4';

/** 楽器選択肢 */
export type InstrumentChoice = 'clarinet' | 'piano' | 'woodblock';

/** 1トラックのユーザー設定 */
export interface TrackConfig {
  /** 対応するParsedTrack.id */
  trackId: number;
  /** 割り当てパート */
  role: PartRole;
  /**
   * 出力・グルーピングに使うパート名（例: "Bass1", "Soprano", "Piano"）。
   * 同名の複数トラックは1つの出力にまとまる。Excludedのトラックは空文字。
   */
  partName: string;
  /** 使用楽器 */
  instrument: InstrumentChoice;
}

// === 生成パイプライン ===

/** 生成パイプライン設定 */
export interface GenerationConfig {
  /** 全トラック設定 */
  tracks: TrackConfig[];
  /** 主役以外のパートの音量割合 (0-100) */
  backgroundVolumePercent: number;
  /** サンプルレート */
  sampleRate: number;
  /** MP3ビットレート (kbps) */
  mp3Bitrate: number;
}

// === 進捗 ===

/** 処理フェーズ */
export type ProcessPhase = 'idle' | 'rendering' | 'encoding' | 'zipping' | 'done' | 'error';

/** 進捗状態 */
export interface ProgressState {
  /** 現在の処理フェーズ */
  phase: ProcessPhase;
  /** 処理中のパート名 */
  currentPartName: string;
  /** 現在のパートインデックス (0-based) */
  currentPartIndex: number;
  /** 全パート数 */
  totalParts: number;
  /** パート内進捗 (0-100) */
  partProgress: number;
  /** エラーメッセージ */
  errorMessage?: string;
}

// === 生成結果 ===

/** 生成された1パートのMP3 */
export interface GeneratedPart {
  /** パート名 */
  partName: string;
  /** MP3バイナリ */
  mp3Blob: Blob;
  /** ファイル名 "{midiFileName}_{partName}.mp3" */
  fileName: string;
}

// === アプリケーション状態 ===

/** アプリケーション全体の状態 */
export interface AppState {
  /** 解析済みMIDIデータ */
  parsedMidi: ParsedMidi | null;
  /** 合唱編成の種別（自動割り当ての基準） */
  choirType: ChoirType;
  /** 各トラックの設定 */
  trackConfigs: TrackConfig[];
  /** 主役以外の音量 (0-100) */
  backgroundVolumePercent: number;
  /** 進捗状態 */
  progress: ProgressState;
  /** 生成済みパート一覧 */
  generatedParts: GeneratedPart[];
}

// === Web Worker通信 ===

/** Main → Worker: エンコード要求 */
export interface EncodeRequest {
  type: 'encode';
  leftChannel: Float32Array;
  rightChannel: Float32Array;
  sampleRate: number;
  bitrate: number;
}

/** Worker → Main: 進捗報告 */
export interface EncodeProgress {
  type: 'progress';
  percent: number;
}

/** Worker → Main: 完了 */
export interface EncodeComplete {
  type: 'complete';
  mp3Data: Uint8Array;
}

/** Worker → Main: エラー */
export interface EncodeError {
  type: 'error';
  message: string;
}

/** Worker → Main の全メッセージ型 */
export type WorkerMessage = EncodeProgress | EncodeComplete | EncodeError;
