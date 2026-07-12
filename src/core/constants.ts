/**
 * core/constants.ts — 定数・デフォルト値・楽器マッピング
 */

import type { PartRole, VoiceRole, ChoirType, InstrumentChoice, ProgressState } from './types.ts';

// === デフォルト値 ===

/** 主役以外のパート音量デフォルト (%) */
export const DEFAULT_BACKGROUND_VOLUME = 50;

// === 合唱編成 ===

/** デフォルトの合唱種別 */
export const DEFAULT_CHOIR_TYPE: ChoirType = 'mixed';

/** 合唱種別の並び順（UIセレクトのoptions） */
export const CHOIR_TYPES: readonly ChoirType[] = ['mixed', 'women3', 'women4', 'men3', 'men4'] as const;

/** 合唱種別の日本語ラベル */
export const CHOIR_TYPE_LABELS: Record<ChoirType, string> = {
  mixed: '混声4部',
  women3: '女声3部',
  women4: '女声4部',
  men3: '男声3部',
  men4: '男声4部',
};

/**
 * 合唱種別ごとの声部セット（上→下の順）。
 * この順にトラックを配分し、同一ロールが複数あれば上から採番する。
 * men4/women4 のように同じロールを複数スロット持たせると自動で番号が付く。
 */
export const CHOIR_VOICES: Record<ChoirType, readonly VoiceRole[]> = {
  mixed: ['Soprano', 'Alto', 'Tenor', 'Bass'],
  women3: ['Soprano', 'MezzoSoprano', 'Alto'],
  women4: ['Soprano', 'Soprano', 'Alto', 'Alto'],
  men3: ['Tenor', 'Baritone', 'Bass'],
  men4: ['Tenor', 'Tenor', 'Baritone', 'Bass'],
};

/** MP3ビットレート (kbps) */
export const DEFAULT_MP3_BITRATE = 128;

/** サンプルレート (Hz) */
export const DEFAULT_SAMPLE_RATE = 44100;

/** MP3エンコードのチャンクサイズ（サンプル数） */
export const MP3_CHUNK_SIZE = 1152;

/**
 * 出力ピーク正規化のターゲット振幅（0〜1）。
 * 音源サンプル（gleitz soundfont）は -19dBFS 前後と低レベルで、
 * gain=1.0 でもピークが 0.1 程度にしかならず「かすかにしか聞こえない」ため、
 * エンコード直前に全体を一律スケールしてこのピークまで持ち上げる。
 * MP3のインターサンプルオーバー対策に少し余裕（≒-1dBFS）を残す。
 */
export const NORMALIZE_TARGET_PEAK = 0.89;

// === パート定義 ===

/** 利用可能なパートロール一覧（UIセレクトのoptions） */
export const PART_ROLES: readonly PartRole[] = [
  'Soprano',
  'MezzoSoprano',
  'Alto',
  'Tenor',
  'Baritone',
  'Bass',
  'Piano',
  'Percussion',
  'Excluded',
] as const;

/** ロールの表示ラベル（プルダウン用。英名と異なるもののみ上書き） */
export const ROLE_LABELS: Partial<Record<PartRole, string>> = {
  MezzoSoprano: 'Mezzo-Soprano',
  Percussion: '打楽器',
  Excluded: '除外',
};

/** パートのデフォルト楽器 */
export const DEFAULT_INSTRUMENT_FOR_ROLE: Record<PartRole, InstrumentChoice> = {
  Soprano: 'clarinet',
  MezzoSoprano: 'clarinet',
  Alto: 'clarinet',
  Tenor: 'clarinet',
  Baritone: 'bassoon',
  Bass: 'bassoon',
  Piano: 'piano',
  Percussion: 'woodblock',
  Excluded: 'piano', // 使われないが型を満たすため
};

// === 楽器定義 ===

/** 利用可能な楽器一覧 */
export const INSTRUMENT_CHOICES: readonly InstrumentChoice[] = [
  'clarinet',
  'piano',
  'woodblock',
] as const;

/** 楽器の日本語ラベル */
export const INSTRUMENT_LABELS: Record<InstrumentChoice, string> = {
  clarinet: 'クラリネット',
  piano: 'ピアノ',
  woodblock: 'ウッドブロック',
};

/** パートの表示色（CSSカスタムプロパティ名） */
export const PART_COLORS: Record<Exclude<PartRole, 'Excluded'>, string> = {
  Soprano: 'var(--color-part-soprano)',
  MezzoSoprano: 'var(--color-part-mezzosoprano)',
  Alto: 'var(--color-part-alto)',
  Tenor: 'var(--color-part-tenor)',
  Baritone: 'var(--color-part-baritone)',
  Bass: 'var(--color-part-bass)',
  Piano: 'var(--color-part-piano)',
  Percussion: 'var(--color-part-percussion)',
};

/**
 * Tone.Sampler用の楽器サンプルURL構成
 * public/sounds 配下に配置したサンプルを参照する
 * baseUrl + instrument名 + "/" でサンプルディレクトリにアクセス
 *
 * GitHub Pagesのプロジェクトサイトでは配信ルートが `/リポジトリ名/` になるため、
 * Viteの BASE_URL を前置きして絶対パスのズレ（/sounds/... の404）を防ぐ。
 */
export const SOUNDFONT_BASE_URL = `${import.meta.env.BASE_URL}sounds/`;

/** 楽器名 → SoundFont ディレクトリ名 */
export const SOUNDFONT_INSTRUMENT_NAMES: Record<InstrumentChoice, string> = {
  clarinet: 'clarinet',
  bassoon: 'bassoon',
  piano: 'piano',
  woodblock: 'woodblock',
};

// === フェーズ表示 ===

/** フェーズごとの表示アイコン（絵文字は使わない） */
export const PHASE_ICONS: Record<string, string> = {
  idle: '',
  rendering: '',
  encoding: '',
  zipping: '',
  done: '',
  error: '',
};

/** フェーズごとの日本語ラベル */
export const PHASE_LABELS: Record<string, string> = {
  idle: '待機中',
  rendering: 'レンダリング中',
  encoding: 'MP3エンコード中',
  zipping: 'ZIP作成中',
  done: '完了',
  error: 'エラー',
};

// === 初期状態 ===

/** 進捗の初期状態 */
export const INITIAL_PROGRESS: ProgressState = {
  phase: 'idle',
  currentPartName: '',
  currentPartIndex: 0,
  totalParts: 0,
  partProgress: 0,
};
