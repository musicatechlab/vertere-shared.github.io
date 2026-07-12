# ARCHITECTURE — 技術設計書

## 技術スタック

| 領域 | 技術 | バージョン | ライセンス | 採用理由 |
|---|---|---|---|---|
| ビルド | Vite | 8.x | MIT | 最速HMR、Worker組み込みサポート |
| 言語 | TypeScript (strict) | 5.x | Apache-2.0 | 型安全、any禁止 |
| MIDI解析 | @tonejs/midi | 2.0.x | MIT | 高レベルAPI、notes/velocity直接アクセス |
| 音声合成 | Tone.js | 15.x | MIT | Sampler + Offline で完結 |
| 楽器音源 | gleitz/midi-js-soundfonts | - | Free | CDN/自前ホスト可、個別MP3 |
| MP3エンコード | @breezystack/lamejs | 1.2.x | LGPL-3.0 | ESM対応、Web Worker動作可 |
| ZIP生成 | JSZip | 3.x | MIT | 定番、安定 |
| テスト | vitest | latest | MIT | Viteネイティブ |

## ディレクトリ構成

```
src/
├── main.ts                      # アプリケーション組み立て（main層）
├── core/                        # 純粋ロジック層（DOM禁止）
│   ├── types.ts                 # 全型定義
│   ├── constants.ts             # 定数・デフォルト値・楽器マッピング
│   ├── midi-parser.ts           # MIDI解析 → ParsedMidi変換
│   ├── part-assignment.ts       # 合唱種別に応じたパート自動割り当て・採番
│   ├── audio-renderer.ts        # Tone.Offline + Sampler 音声合成
│   ├── mp3-encoding-core.ts     # PCM→MP3変換ロジック（Worker非依存）
│   └── mp3-encoder.ts           # Web Worker通信ラッパー
├── state/                       # 状態管理層
│   └── app-state.ts             # アプリケーション状態（トラック設定・進捗）
├── ui/                          # UI層（DOM操作・イベント）
│   ├── components/
│   │   ├── file-upload.ts       # MIDIアップロード
│   │   ├── track-config.ts      # トラック↔パート紐付け
│   │   ├── volume-control.ts    # 音量スライダー
│   │   ├── progress-display.ts  # 進捗プログレスバー
│   │   └── download-button.ts   # 生成実行 & ダウンロード
│   └── renderer.ts              # UIレンダリング統括
├── workers/
│   └── mp3-encoder.worker.ts    # MP3エンコード Web Worker
└── styles/
    ├── tokens.css               # デザイントークン（CSS変数）
    └── main.css                 # コンポーネントスタイル

tests/
├── midi-parser.test.ts
├── audio-renderer.test.ts
├── mp3-encoder.test.ts
├── mp3-encoding-core.test.ts
├── app-state.test.ts
└── e2e/
    └── generation.spec.ts         # 生成フローE2Eスモーク

public/
└── sounds/                      # 楽器サンプルファイル
    ├── clarinet/                # clarinet note MP3s
    ├── piano/                   # acoustic_grand_piano note MP3s
    └── woodblock/               # woodblock note MP3s

docs/
├── ROADMAP.md                   # 進捗台帳
├── ARCHITECTURE.md              # 本ファイル
├── SPEC.md                      # 中核ロジック仕様
└── DESIGN.md                    # デザイン仕様

playwright.config.ts             # E2E実行設定（dev server自動起動）
```

## 層の依存規則

```
core（DOM禁止・依存最小・テスト容易）
  ↑ import
state（coreの型を使う・UI非依存）
  ↑ import
ui（state経由でcoreを使う・DOMアクセスはここだけ）
  ↑ import
main（全層を知る唯一の場所・組み立てのみ）
```

**禁止**: ui → core への直接import（state層を経由すること）
**例外**: core/audio-renderer.ts は `OfflineAudioContext` を使用（ブラウザAPI依存だがDOM非依存）

## 主要型定義

```typescript
// === core/types.ts ===

/** MIDI解析結果の1ノート */
export interface ParsedNote {
  midi: number;        // MIDI note number (0-127)
  time: number;        // 開始時刻（秒）
  duration: number;    // 長さ（秒）
  velocity: number;    // 0.0-1.0
}

/** MIDI解析結果の1トラック */
export interface ParsedTrack {
  id: number;          // トラックインデックス
  name: string;        // トラック名（MIDIメタデータ由来）
  channel: number;     // MIDIチャンネル
  notes: ParsedNote[];
  instrumentNumber: number;   // GM program number
  sourceFileName: string;     // 由来するMIDIファイル名
}

/** MIDI解析結果全体（複数ファイル統合後） */
export interface ParsedMidi {
  fileName: string;           // 主ファイル名（ZIP名に使用）
  durationSeconds: number;    // 全体の長さ
  bpm: number;                // 主テンポ
  tracks: ParsedTrack[];
}

/** パート種別 */
export type PartRole =
  | 'Soprano' | 'MezzoSoprano' | 'Alto'
  | 'Tenor' | 'Baritone' | 'Bass'
  | 'Piano' | 'Percussion' | 'Excluded';

/** 声部（伴奏・打楽器・除外を除いたロール） */
export type VoiceRole = Exclude<PartRole, 'Piano' | 'Percussion' | 'Excluded'>;

/** 合唱編成の種別（混声4部 / 女声3・4部 / 男声3・4部） */
export type ChoirType = 'mixed' | 'men3' | 'men4' | 'women3' | 'women4';

/** 楽器選択肢 */
export type InstrumentChoice = 'clarinet' | 'piano' | 'woodblock';

/** 1トラックのユーザー設定 */
export interface TrackConfig {
  trackId: number;
  role: PartRole;
  partName: string;   // 出力・グルーピング単位の名前（例 "Bass1"）。Excludedは空文字
  instrument: InstrumentChoice;
}

/** 生成パイプライン設定 */
export interface GenerationConfig {
  tracks: TrackConfig[];
  backgroundVolumePercent: number;  // 0-100, default 50
  sampleRate: number;               // default 44100
  mp3Bitrate: number;               // default 128
}

/** 進捗状態 */
export interface ProgressState {
  phase: 'idle' | 'rendering' | 'encoding' | 'zipping' | 'done' | 'error';
  currentPartName: string;
  currentPartIndex: number;
  totalParts: number;
  partProgress: number;   // 0-100（パート内進捗）
  errorMessage?: string;
}

/** 生成結果 */
export interface GeneratedPart {
  partName: string;
  mp3Blob: Blob;
  fileName: string;       // "{midiFileName}_{partName}.mp3"
}

/** アプリケーション全体の状態 */
export interface AppState {
  parsedMidi: ParsedMidi | null;
  choirType: ChoirType;          // 自動割り当ての基準（混声/女声/男声）
  trackConfigs: TrackConfig[];   // パート名は各TrackConfig.partNameで持つ
  backgroundVolumePercent: number;
  progress: ProgressState;
  generatedParts: GeneratedPart[];
}
```

## パート自動割り当て（core/part-assignment.ts）

合唱種別に応じてトラックへロール・パート名を自動割り当てする純粋ロジック。

- 種別ごとの声部セット（上→下）:
  混声4部=S/A/T/B、女声3部=S/Mezzo/A、女声4部=S/S/A/A、男声3部=T/Bar/B、男声4部=T/T/Bar/B
  （同じロールを複数スロット持たせると採番で Tenor1/Tenor2 等になる）
- 分類: ノート無し→除外、パーカッション（ch10/GM115）→Percussion、ピアノ/伴奏→Piano、残りを声部候補に
- 配分: 声部トラックを**トラックの並び順（上→下）**に声部へ割り当て、トラック名で全て声部判別
  できればそれを尊重、できなければ声部数のバケットへ上優先で均等配分
- 採番: 同一ロールに複数トラックがあれば上から `1,2,3…`（`Bass1`, `Bass2`）。単独なら番号なし
- `renumberByRole()`: 手動でロールを変えた後、既存ロールを尊重したままパート名だけ再採番

打楽器（Percussion）は楽器 `woodblock` を使う。MuseScoreの High/Low Wood Block
（GM打楽器 MIDI 76/77）は、gleitzの木魚だと半音差で音色差がほぼ出ないため、
`woodblockNoteName()` で 76→C6 / 77→C5 とオクターブ離した2音に振り分け、
実サンプル（C5.mp3 / C6.mp3）で明確な2音色として鳴らす。

## 音量ミックス（core/audio-renderer.ts）

`level = backgroundVolumePercent / 100`（既定0.5）として、

- ソロ（主役）: 各トラック 1.0
- その他の声部パート合計 / ウッドブロック合計 / ピアノ合計: それぞれ合計が `level`

になるよう、各カテゴリ内のトラック本数で等分する（各トラック = `level / 本数`）。
「それぞれを level にする」のではなく「合計が level」にするのがポイント。
既定では **ソロ : 他声部計 : ウッドブロック : ピアノ = 2 : 1 : 1 : 1**。

出力（ZIP内のMP3）は `TrackConfig.partName` でグルーピングされ、同名トラックは1つにまとまる。

## データフロー図

```
[MIDIファイル(ArrayBuffer)]
    │
    ▼
┌─────────────────────┐
│ midi-parser.ts       │  @tonejs/midi で解析
│ parseMidiFile()      │  → ParsedMidi
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ app-state.ts         │  ユーザーがTrackConfig[]を設定
│ AppState             │
└─────────┬───────────┘
          │
          ▼  パートごとにループ
┌─────────────────────┐
│ audio-renderer.ts    │  Tone.Offline() + Sampler
│ renderPartAudio()    │  → AudioBuffer (Float32Array)
└─────────┬───────────┘
          │  Transferable
          ▼
┌─────────────────────┐
│ mp3-encoder.worker   │  @breezystack/lamejs
│ (Web Worker)         │  Float32 → Int16 → MP3
└─────────┬───────────┘
          │  MP3 Uint8Array
          ▼
┌─────────────────────┐
│ main.ts              │  JSZip でZIP化
│ downloadZip()        │  → Blob → download
└─────────────────────┘
```

## Web Worker通信プロトコル

```typescript
// Main → Worker
interface EncodeRequest {
  type: 'encode';
  leftChannel: Float32Array;     // Transferable
  rightChannel: Float32Array;    // Transferable
  sampleRate: number;
  bitrate: number;
}

// Worker → Main
interface EncodeProgress {
  type: 'progress';
  percent: number;  // 0-100
}

interface EncodeComplete {
  type: 'complete';
  mp3Data: Uint8Array;  // Transferable
}

interface EncodeError {
  type: 'error';
  message: string;
}
```

## 楽器サンプル戦略

gleitz/midi-js-soundfonts から以下を取得し `public/sounds/` に配置:

| 楽器 | GM# | ディレクトリ | ソース |
|---|---|---|---|
| Clarinet | 71 | `public/sounds/clarinet/` | FluidR3_GM/clarinet-mp3/ |
| Piano | 0 | `public/sounds/piano/` | FluidR3_GM/acoustic_grand_piano-mp3/ |
| Woodblock | 115 | `public/sounds/woodblock/` | FluidR3_GM/woodblock-mp3/ |

各ディレクトリには `A0.mp3` ～ `C8.mp3` のような個別音声ファイルが入る。
Tone.Sampler はスパースサンプリング対応なので、全鍵でなくオクターブごとのサンプルでも良い。

## ビルド設定の要点

### vite.config.ts
```typescript
import { defineConfig } from 'vite';

function resolveGithubPagesBase(): string {
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) return '/';

  const [owner, repoName = ''] = repository.split('/');
  if (repoName.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
    return '/';
  }
  return `/${repoName}/`;
}

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? resolveGithubPagesBase() : '/',
  worker: {
    format: 'es',
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
}));
```

### Web Worker インポートパターン
```typescript
const worker = new Worker(
  new URL('./workers/mp3-encoder.worker.ts', import.meta.url),
  { type: 'module' }
);
```
⚠️ `new URL()` の第1引数は**静的文字列リテラル**でなければならない（Viteの静的解析制約）

## テスト・運用自動化

- 単体テスト: `npm run test`（Vitest）
- E2Eスモーク: `npm run test:e2e`（Playwright、`playwright.config.ts` で dev server 自動起動）
- 本番ヘルスチェック: `npm run check:prod`（公開URLのHTTP応答と主要HTMLマーカー確認）

GitHub Actions:

- `ci.yml`: push / PR で unit + e2e + build を実行
- `deploy.yml`: main push で GitHub Pages へデプロイ
- `production-health.yml`: 6時間ごと + 手動実行で公開URLを監視
