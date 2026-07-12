# CLAUDE.md — 次セッション向け指示書

> **このファイルは毎セッション最初に読むこと。**
> プロジェクトの魂と鉄則をここに記す。

## プロダクトの魂

「合唱練習者が、自分のパートだけ大きく聞こえる練習音源を、ブラウザだけで3クリックで手に入れる」

これがこのアプリのすべて。DAWも、サーバーも、アカウント登録も不要。MIDIを放り込んで、パートを選んで、ダウンロードするだけ。

## セッション開始手順

1. `docs/ROADMAP.md` で現在地を確認
2. `git log --oneline -15` で直前の作業を把握
3. 着手タスクの関連仕様（SPEC.md, ARCHITECTURE.md）を読む
4. `npm run test` が通ることを確認してから着手
5. `npm run dev` で開発サーバーを起動

## 技術スタック概要

- **Vite + vanilla TypeScript** — フレームワークなし
- **@tonejs/midi** — MIDI解析（Type 0/1 SMF対応）
- **Tone.js** — `Tone.Offline()` + `Tone.Sampler` でオフラインレンダリング
- **gleitz/midi-js-soundfonts** — フリー楽器サンプル（clarinet, piano, woodblock）
- **@breezystack/lamejs** — MP3エンコード（Web Worker内で実行）
- **JSZip** — ZIP生成
- **vitest** — テスト

## アーキテクチャ層（依存は一方向）

```
core（純粋ロジック・DOM禁止）
  ← state（アプリ状態管理）
    ← ui（DOM操作・イベント）
      ← main（組み立て）
```

core層は `import` でDOMやブラウザAPIに依存してはいけない（OfflineAudioContextはcore/audio-renderer.tsのみ例外）。

## 鉄則

1. **ドキュメント先行**: 実装と仕様がズレる変更をしたくなったら、先にドキュメントを直すコミットを作る
2. **テスト付きコミット**: core層の変更は必ずテストとセットでコミット
3. **動く状態を保つ**: セッション終了時に壊れた状態で終わらない。WIPは動く単位まで戻すか完成させる
4. **1タスク=1コミット**: conventional commits（`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`）
5. **うろ覚えAPIを書かない**: 公式ドキュメントか型定義を確認してから使う
6. **ショットガン修正禁止**: デバッグは仮説駆動。証拠なしに複数箇所を同時に変えない

## 主要な処理フロー

```
MIDIアップロード → @tonejs/midi解析 → トラック一覧表示
→ ユーザーがパート割り当て → 生成実行
→ パートごとにループ:
    → Tone.Offline()でレンダリング（主役100%, 他パート指定%）
    → AudioBuffer → Web Workerへ転送
    → lamejsでMP3エンコード
    → MP3 Blobを収集
→ JSZipでZIP化 → ブラウザダウンロード
```

## Web Worker設計

`OfflineAudioContext` はWeb Workerでは使えない（2026年時点）。
- 音声レンダリング: メインスレッド（Tone.Offline）
- MP3エンコード: Web Worker（@breezystack/lamejs）
- バッファ転送: `Transferable` を使ってコピー回避

## 楽器音源

gleitz/midi-js-soundfonts の pre-rendered MP3ファイルを使用:
- Piano: `acoustic_grand_piano`
- Clarinet: `clarinet`
- Woodblock: `woodblock`

`public/sounds/` に配置。Tone.Sampler のベースURLとして参照。

## 重要な設計判断の記録

| 判断 | 理由 |
|---|---|
| Tone.js採用（webaudiofontではなく） | Sampler + Offline の組み合わせがAPIとして完成度が高い。webaudiofontはAPIが古い |
| gleitz soundfonts採用 | CDN上に既に存在、個別ファイルで遅延ロード可能、サイズ合理的 |
| @breezystack/lamejs採用 | ESM + TypeScript対応。オリジナルlamesjはメンテ終了 |
| Web Worker でMP3エンコードのみ | OfflineAudioContextがWorker非対応のため |

## ファイル命名規則

- TypeScript: `kebab-case.ts`（例: `midi-parser.ts`）
- CSS: `kebab-case.css`（例: `tokens.css`）
- テスト: `{module-name}.test.ts`
- Worker: `{name}.worker.ts`
