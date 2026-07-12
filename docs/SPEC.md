# SPEC — 中核ロジック仕様

## 1. MIDI解析（midi-parser.ts）

### 入力
- 1つ以上のMIDIファイル（`.mid`、Standard MIDI File Type 0 or 1）
- 各ファイルは `ArrayBuffer` として渡される

### 処理
1. `@tonejs/midi` の `new Midi(arrayBuffer)` でパース
2. 各トラックから以下を抽出:
   - トラック名（`track.name`）— 空の場合は `"Track {index}"` を生成
   - チャンネル（`track.channel`）
   - ノート一覧（time, duration, midi, velocity）
   - 楽器番号（`track.instrument.number`）
3. ノートが0のトラックはフィルタリング（表示はするが警告付き）
4. 複数MIDIファイルの場合、トラックを統合して一つの `ParsedMidi` にまとめる
   - `id` はグローバルに連番を振り直す
   - `sourceFileName` で元ファイルを追跡

### 出力
- `ParsedMidi` オブジェクト

### エッジケース
- 空のMIDIファイル → エラーメッセージ「有効なトラックがありません」
- Type 0 MIDI（全チャンネルが1トラック） → チャンネルごとにトラックを分割
- パーカッションチャンネル（ch.10） → 通常トラックとして扱うが、デフォルト楽器をウッドブロックに
- テンポ変更が複数ある場合 → `@tonejs/midi` が自動的に秒単位に変換済み

### テスト仕様
```
TEST: 空のMIDIファイル → エラーを返す
TEST: 1トラック1ノートのMIDI → ParsedMidi.tracks.length === 1, tracks[0].notes.length === 1
TEST: 複数トラックのMIDI → 各トラックが正しくパースされる
TEST: トラック名が空 → "Track 0", "Track 1" ... が生成される
TEST: 複数ファイル統合 → トラックIDが連番、sourceFileNameが正しい
```

---

## 2. 音声レンダリング（audio-renderer.ts）

### 入力
- `ParsedMidi` — 解析済みMIDIデータ
- `TrackConfig[]` — 各トラックのパート・楽器設定
- `targetRole: PartRole` — 今回強調するパート
- `backgroundVolumePercent: number` — 主役以外の音量割合(0-100)

### 処理
1. `Tone.Offline(callback, durationSeconds)` でオフラインコンテキストを開始
2. callback内で、有効な各トラック（role !== 'Excluded'）に対して:
   a. トラックの楽器設定に基づいて `Tone.Sampler` を作成
   b. ゲインノードで音量を設定:
      - トラックのroleが `targetRole` と一致 → gain = 1.0（100%）
      - 一致しない → gain = `backgroundVolumePercent / 100`
   c. 全ノートをスケジュール: `sampler.triggerAttackRelease(noteName, duration, time, velocity)`
3. `Tone.Offline` が返す `ToneAudioBuffer` から `AudioBuffer` を取得

### 音量制御の詳細

ベロシティとゲインの組み合わせ:
- **主役パート**: ゲイン = 1.0、ベロシティ = 元のベロシティ
- **背景パート**: ゲイン = backgroundVolumePercent / 100、ベロシティ = 元のベロシティ

ゲインはトラック単位で適用する（ノートごとではない）。

### 出力
- `AudioBuffer`（2ch, 44100Hz）

### エッジケース
- 長い曲（5分超）→ メモリ使用量に注意。44100Hz × 2ch × 4bytes × 300sec ≈ 100MB
- サンプルのロードに時間がかかる → `await Tone.loaded()` で完了を待つ
- ノートが1つもないパート → 無音の `AudioBuffer` を返す（エラーにしない）

### 楽器→サンプルマッピング
```typescript
const INSTRUMENT_SAMPLE_MAP: Record<InstrumentChoice, Record<string, string>> = {
  clarinet: {
    'C3': 'C3.mp3',
    'C4': 'C4.mp3',
    'C5': 'C5.mp3',
    'C6': 'C6.mp3',
    // Tone.Sampler が中間音程を自動補間
  },
  piano: {
    'A0': 'A0.mp3',
    'C1': 'C1.mp3',
    // ... オクターブごとにサンプル
    'C7': 'C7.mp3',
  },
  woodblock: {
    'C5': 'C5.mp3',  // ウッドブロックは限定音域
  },
};
```

---

## 3. MP3エンコード（mp3-encoder.worker.ts）

### 入力（Web Worker postMessage経由）
- `leftChannel: Float32Array` — 左チャンネルPCM（-1.0〜1.0）
- `rightChannel: Float32Array` — 右チャンネルPCM（-1.0〜1.0）
- `sampleRate: number` — サンプルレート（44100）
- `bitrate: number` — MP3ビットレート（128）

### 処理
1. Float32Array → Int16Array に変換:
   ```
   int16[i] = clamp(float32[i] * 32767, -32768, 32767)
   ```
2. `@breezystack/lamejs` の `Mp3Encoder` でチャンクごとにエンコード:
   - チャンクサイズ: 1152サンプル（MP3フレームサイズ）
   - 各チャンクのエンコード後、進捗を `postMessage({ type: 'progress', percent })` で通知
3. `encoder.flush()` で残りをフラッシュ
4. 全チャンクを結合して `Uint8Array` として返す

### 出力
- `Uint8Array`（MP3バイナリデータ）
- 途中経過: `{ type: 'progress', percent: number }`

### エッジケース
- 無音バッファ → 有効なMP3ファイルが生成される（無音のMP3）
- 非常に短い音声（1秒未満） → 正常に処理される

---

## 4. ZIP生成 & ダウンロード

### 入力
- `GeneratedPart[]` — パート名とMP3 Blob

### 処理
1. `new JSZip()` でZIPコンテナ作成
2. 各パートを追加: `zip.file(part.fileName, part.mp3Blob)`
3. `zip.generateAsync({ type: 'blob' })` でZIP Blob生成
4. `URL.createObjectURL()` + `<a>` 要素で自動ダウンロード

### ファイル名規則
- MP3: `{midiFileName}_{partName}.mp3`
  - 例: `gloria_Soprano.mp3`
- ZIP: `{midiFileName}_parts.zip`
  - 例: `gloria_parts.zip`
- `midiFileName` からは拡張子（`.mid`）を除去

---

## 5. 全体パイプライン

```typescript
async function generateAllParts(
  parsedMidi: ParsedMidi,
  config: GenerationConfig,
  onProgress: (progress: ProgressState) => void
): Promise<Blob> {
  const activeRoles = getActiveRoles(config);  // Excluded以外のユニークなrole一覧
  const parts: GeneratedPart[] = [];

  for (let i = 0; i < activeRoles.length; i++) {
    const role = activeRoles[i];
    onProgress({ phase: 'rendering', currentPartName: role, currentPartIndex: i, totalParts: activeRoles.length, partProgress: 0 });

    // 1. レンダリング（メインスレッド）
    const audioBuffer = await renderPartAudio(parsedMidi, config, role);

    onProgress({ ...上記, phase: 'encoding', partProgress: 0 });

    // 2. MP3エンコード（Web Worker）
    const mp3Blob = await encodeMp3(audioBuffer, config.mp3Bitrate, (percent) => {
      onProgress({ ...上記, partProgress: percent });
    });

    parts.push({
      partName: role,
      mp3Blob,
      fileName: `${sanitizeFileName(parsedMidi.fileName)}_${role}.mp3`,
    });
  }

  // 3. ZIP生成
  onProgress({ phase: 'zipping', ... });
  const zipBlob = await createZip(parts);

  onProgress({ phase: 'done', ... });
  return zipBlob;
}
```
