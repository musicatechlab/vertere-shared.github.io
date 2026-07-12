# DESIGN — デザイン仕様

## デザインコンセプト

**キーワード**: 楽譜のような清潔感、プロフェッショナル、暗めの落ち着いたトーン

合唱の「練習ツール」として信頼感があり、音楽的な空気感を持つUI。
派手すぎず、地味すぎず、道具としての品格を持つダークテーマ。

---

## デザイントークン

### カラーパレット

```css
:root {
  /* === Base === */
  --color-bg-primary: #0f1117;           /* 最深背景 */
  --color-bg-secondary: #1a1d27;         /* カード背景 */
  --color-bg-tertiary: #252836;          /* 入力フィールド背景 */
  --color-bg-hover: #2e3142;             /* ホバー状態 */

  /* === Text === */
  --color-text-primary: #e8eaf0;         /* 主要テキスト */
  --color-text-secondary: #9ca3b4;       /* 補助テキスト */
  --color-text-muted: #6b7280;           /* ミュートテキスト */

  /* === Accent === */
  --color-accent: #6c8cff;              /* 主アクセント（音楽的な青紫） */
  --color-accent-hover: #8ba4ff;
  --color-accent-subtle: rgba(108, 140, 255, 0.12);

  /* === Status === */
  --color-success: #4ade80;
  --color-warning: #fbbf24;
  --color-error: #f87171;
  --color-info: #60a5fa;

  /* === Part Colors（パート識別用） === */
  --color-part-soprano: #f472b6;         /* ピンク */
  --color-part-alto: #a78bfa;            /* パープル */
  --color-part-tenor: #60a5fa;           /* ブルー */
  --color-part-bass: #34d399;            /* グリーン */
  --color-part-piano: #fbbf24;           /* ゴールド */

  /* === Border === */
  --color-border: #2e3142;
  --color-border-active: #6c8cff;
}
```

### タイポグラフィ

```css
:root {
  --font-family-sans: 'Inter', 'Noto Sans JP', system-ui, -apple-system, sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;

  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */
  --font-size-3xl: 2rem;      /* 32px */

  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
}
```

### スペーシング

```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
}
```

### ボーダー・シャドウ

```css
:root {
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5);
  --shadow-glow: 0 0 20px rgba(108, 140, 255, 0.15);
}
```

### モーション

```css
:root {
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  --easing-default: cubic-bezier(0.4, 0, 0.2, 1);
  --easing-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 0ms;
    --duration-normal: 0ms;
    --duration-slow: 0ms;
  }
}
```

---

## レイアウト

### 全体構成（デスクトップ）

```
┌─────────────────────────────────────────┐
│  Header（ロゴ + タイトル）                 │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Step 1: MIDIアップロード           │  │
│  │  [ドロップゾーン / ファイル選択]       │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Step 2: トラック設定               │  │
│  │  ┌──────┬──────┬────────┐        │  │
│  │  │Track │Part  │Instrument│        │  │
│  │  ├──────┼──────┼────────┤        │  │
│  │  │Tr.1  │ [▼]  │  [▼]   │        │  │
│  │  │Tr.2  │ [▼]  │  [▼]   │        │  │
│  │  └──────┴──────┴────────┘        │  │
│  │                                   │  │
│  │  音量: [====●=====] 50%           │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  [        生成実行 ▶       ]       │  │
│  │                                   │  │
│  │  [============================] 75% │  │
│  │  ♪ Soprano をレンダリング中...       │  │
│  └───────────────────────────────────┘  │
│                                         │
├─────────────────────────────────────────┤
│  Footer（クレジット）                     │
└─────────────────────────────────────────┘
```

### レスポンシブ

- **max-width**: 680px（カード型のシングルカラム）
- **モバイル**: パディング縮小、テーブルは横スクロール
- **ブレイクポイント**: 768px

---

## コンポーネント仕様

### 1. ファイルアップロード（file-upload）

- ドラッグ＆ドロップゾーン + クリックでファイル選択
- `.mid` ファイルのみ受け付け（accept=".mid,.midi"）
- 複数ファイル対応
- ドラッグ中はボーダーがアクセントカラーに変化（transform: scale(1.01)）
- アップロード済みファイル名をタグ表示（×で削除可能）

### 2. トラック設定テーブル（track-config）

- 各行: トラック名 | パートセレクト | 楽器セレクト
- パートセレクトの選択肢: Soprano / Alto / Tenor / Bass / Piano / 除外
- 楽器セレクトの選択肢: クラリネット / ピアノ / ウッドブロック
  - 合唱パート（S/A/T/B）のデフォルト: クラリネット
  - Pianoパートのデフォルト: ピアノ
- パート色（--color-part-*）でセレクト横にドットインジケーター表示
- トラック名にノート数を表示（例: "Soprano (245 notes)"）

### 3. 音量コントロール（volume-control）

- レンジスライダー（input[type="range"]）
- 0% 〜 100%、ステップ5
- 現在値をスライダー右にリアルタイム表示
- ラベル: 「主役以外のパート音量」

### 4. 進捗表示（progress-display）

- メインプログレスバー（全体進捗）
- サブテキスト: 「♪ {パート名} を{phase}中... ({n}/{total})」
- フェーズ別アイコン:
  - rendering: 🎵
  - encoding: 💿
  - zipping: 📦
  - done: ✅
  - error: ❌
- プログレスバーは `transform: scaleX()` でアニメーション（reflow回避）

### 5. 生成ボタン / ダウンロードボタン

- 生成前: 「🎵 練習音源を生成」（アクセントカラー、大きめ）
- 生成中: ディスエーブル + スピナー
- 完了後: 「📥 ZIPをダウンロード」（成功色）に変化

---

## モーション設計

| 要素 | トリガー | アニメーション | 意図 |
|---|---|---|---|
| ドロップゾーン | ドラッグ進入 | border-color変化 + scale(1.01) | 受容を示す |
| プログレスバー | 値更新 | scaleX遷移 duration-normal | 処理の進行を伝える |
| 生成ボタン | 完了 | 色変化 + 軽いbounce | 完了の喜びを伝える |
| カード | 初回表示 | opacity 0→1 + translateY(8px→0) | ステップの順序を示す |
| エラー | 発生時 | shake(translateX ±4px) | 問題の発生を伝える |

すべてのモーションは `transform` と `opacity` のみ使用。
`prefers-reduced-motion: reduce` 時はduration=0ms。
