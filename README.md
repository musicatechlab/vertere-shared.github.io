# Vertere - MIDI to MP3 Converter — 合唱練習用音源自動生成ツール

合唱の各パート（Soprano / Alto / Tenor / Bass / Piano）が**強調された練習用MP3**を、MIDIファイルから自動生成するWebアプリケーションです。

## 特徴

- 🎵 **MIDIアップロード** — 総譜でもパート別でも対応
- 🎤 **パート割り当て** — トラックごとにパート名を設定
- 🎹 **楽器選択** — クラリネット・ピアノ・ウッドブロックから選択
- 🏷️ **パート名カスタマイズ** — 出力ファイル名・進捗表示に反映
- 🔊 **音量バランス** — 主役パート以外の音量を自由に調整
- 📦 **ZIP一括ダウンロード** — 全パートのMP3をまとめてダウンロード
- ♻️ **再ダウンロード導線** — 完了後はワンクリックで同一ZIPを再取得
- 🌐 **完全クライアントサイド** — サーバー不要、GitHub Pagesで動作

## 技術スタック

| 領域 | 技術 |
|---|---|
| ビルド | Vite + TypeScript |
| MIDI解析 | @tonejs/midi |
| 音声合成 | Tone.js + OfflineAudioContext |
| 楽器音源 | gleitz/midi-js-soundfonts (フリー) |
| MP3エンコード | @breezystack/lamejs (Web Worker) |
| ZIP生成 | JSZip |

## 開発

```bash
npm install
npm run dev      # 開発サーバー
npm run build    # プロダクションビルド
npm run test     # テスト実行
npm run test:e2e # E2Eスモークテスト（自動でdev server起動）
npm run check:prod # 公開URLヘルスチェック
```

## 使い方

1. `.mid` / `.midi` ファイルをドラッグ＆ドロップ（複数可）
2. トラックごとに Part / Instrument を確認
3. 必要ならパート名と背景音量を調整
4. `🎵 練習音源を生成` を押して ZIP をダウンロード

## ライセンス

MIT
