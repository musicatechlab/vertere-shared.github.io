# ROADMAP — フェーズ別進捗チェックリスト

> このファイルが唯一の進捗台帳。実装と同じコミットでチェックを更新すること。

## P1: 足場（Scaffolding） ✅

- [x] Git初期化
- [x] ドキュメント群作成（README, CLAUDE.md, docs/*）
- [x] Vite + vanilla-ts プロジェクト生成
- [x] npm依存インストール（@tonejs/midi, tone, @breezystack/lamejs, jszip, vitest）
- [x] vite.config.ts 設定（GitHub Pages base、Worker format）
- [x] tsconfig.json 調整（strict、パスエイリアス）
- [x] .gitignore 作成
- [x] デザイントークン定義（src/styles/tokens.css）
- [x] 空アプリがビルド ＆ `npm run dev` で表示されることを確認
- [x] GitHub Actions デプロイワークフロー作成
- [x] 初回コミット & push

## P2: コアロジック（UIなし）

- [x] `src/core/types.ts` — 全型定義
- [x] `src/core/constants.ts` — デフォルト値・楽器マッピング
- [x] `src/core/midi-parser.ts` — MIDI解析→内部データ変換 + テスト
- [x] 楽器サンプル取得・配置（public/sounds/）
- [x] `src/core/audio-renderer.ts` — Tone.Offline + Sampler合成 + 手動/E2Eスモークテスト
- [x] `src/workers/mp3-encoder.worker.ts` — MP3エンコードWorker + 単体テスト
- [x] `src/core/mp3-encoder.ts` — Worker通信ラッパー + 単体テスト

## P3: 最小の使えるアプリ（Walking Skeleton）

- [x] `src/state/app-state.ts` — 状態管理 + 単体テスト
- [x] `src/ui/components/file-upload.ts` — MIDIファイルアップロードUI
- [x] `src/ui/components/track-config.ts` — トラック↔パート紐付けUI
- [x] `src/ui/components/volume-control.ts` — 音量設定UI
- [x] `src/ui/components/progress-display.ts` — 進捗プログレスUI
- [x] `src/ui/components/download-button.ts` — ダウンロードボタン
- [x] `src/ui/renderer.ts` — UIレンダリング統括
- [x] `src/main.ts` — 全体接続
- [x] 入力→合成→MP3→ZIP→ダウンロードの縦一本を通す
- [x] デプロイして実環境確認

## P4: 機能拡充

- [x] 複数MIDIファイルアップロード対応
- [x] 楽器選択UI（クラリネット/ピアノ/ウッドブロック）トラックごと
- [x] エラーハンドリング（不正MIDI、0トラック、巨大ファイル）
- [x] パート名カスタマイズ

## P5: 磨き

- [x] アニメーション・トランジション・マイクロインタラクション
- [x] ダークモード対応
- [x] モバイルレスポンシブ
- [x] a11y（フォーカス順、ARIA、コントラスト、prefers-reduced-motion）
- [x] README更新
- [x] デモスクリーンショット
- [x] OGP・メタタグ

## P6: 合唱編成対応

- [x] 本番デプロイ不具合修正（音源404 / トラック名文字化け）
- [x] 合唱種別（混声/女声/男声）選択と声部の自動割り当て（core/part-assignment.ts）
- [x] 分割パートの自動採番（上から Bass1, Bass2 …）+ 単体/E2Eテスト
- [x] パート名をトラック単位に変更（同名は1出力にグルーピング）
- [x] トラック名の未エスケープ差し込み（HTMLインジェクション）を修正
- [x] 打楽器(Percussion)パート追加・ウッドブロック音源をE5/F5に修正
- [x] UIの絵文字を全廃・0ノートトラックを非表示
- [x] 音量ミックスを 2:1:1:1（ソロ:他声部計:WB:Piano）に
- [x] 編成に男声3/4部・女声3/4部を追加（Baritone/MezzoSoprano、ファイル名は英語）
