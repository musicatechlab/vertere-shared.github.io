/**
 * main.ts — アプリケーションエントリーポイント
 * 全層を組み立てる唯一の場所
 */

import './styles/main.css';
import { createInitialAppState, resetGeneration, setBackgroundVolume, setChoirType, setParsedMidi, setTrackPartName, updateTrackConfig } from './state/app-state.ts';
import type { AppState } from './core/types.ts';
import { setupDownloadButton } from './ui/components/download-button.ts';
import { setupFileUpload } from './ui/components/file-upload.ts';
import { bindTrackConfigHandlers } from './ui/components/track-config.ts';
import { setupVolumeControl } from './ui/components/volume-control.ts';
import { renderAppShell, renderAppState, renderControls, setUploadStatus } from './ui/renderer.ts';

function initApp(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('Root element #app not found');

  renderAppShell(app);
  let state = createInitialAppState();
  const getState = (): AppState => state;

  const render = (): void => {
    renderAppState(state);
  };
  const updateState = (updater: (current: AppState) => AppState): void => {
    state = updater(state);
    render();
  };
  // トラック表を再構築せず、状態更新とコントロール表示のみ行う（入力中のフォーカス維持）
  const updateStateControlsOnly = (updater: (current: AppState) => AppState): void => {
    state = updater(state);
    renderControls(state);
  };

  const dropZone = document.querySelector<HTMLDivElement>('#drop-zone');
  const fileTags = document.querySelector<HTMLDivElement>('#file-tags');
  const volumeSlider = document.querySelector<HTMLInputElement>('#volume-slider');
  const trackConfigContainer = document.querySelector<HTMLDivElement>('#track-config-container');
  const generateButton = document.querySelector<HTMLButtonElement>('#generate-btn');

  if (!dropZone || !fileTags || !volumeSlider || !trackConfigContainer || !generateButton) {
    throw new Error('Required UI elements not found');
  }

  setupFileUpload({
    dropZone,
    fileTags,
    onValidationError: (message) => {
      setUploadStatus(`エラー: ${message}`, true);
    },
    onFilesChanged: async (files) => {
      if (files.length === 0) {
        updateState(() => createInitialAppState());
        setUploadStatus('', false);
        return;
      }

      setUploadStatus('MIDIを解析中...', false);
      try {
        const { parseMidiFiles } = await import('./core/midi-parser.ts');
        const buffers = await Promise.all(files.map(async (file) => ({
          name: file.name,
          buffer: await file.arrayBuffer(),
        })));
        const parsed = parseMidiFiles(buffers);
        updateState((current) => setParsedMidi(current, parsed));
        setUploadStatus(`${parsed.tracks.length}トラックを読み込みました`, false);

        // 初回生成ボタン押下時の待ちを減らすため、重い依存を先読みする
        void Promise.all([
          import('./core/audio-renderer.ts'),
          import('./core/mp3-encoder.ts'),
          import('jszip'),
        ]);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setUploadStatus(`エラー: ${message}`, true);
      }
    },
  });

  setupVolumeControl({
    slider: volumeSlider,
    onChange: (percent) => {
      updateState((current) => resetGeneration(setBackgroundVolume(current, percent)));
    },
  });

  bindTrackConfigHandlers(trackConfigContainer, {
    onChoirTypeChange: (choirType) => {
      updateState((current) => setChoirType(current, choirType));
    },
    onRoleChange: (trackId, role) => {
      updateState((current) => resetGeneration(updateTrackConfig(current, trackId, { role })));
    },
    onInstrumentChange: (trackId, instrument) => {
      updateState((current) => resetGeneration(updateTrackConfig(current, trackId, { instrument })));
    },
    onPartNameChange: (trackId, name) => {
      // 入力中はトラック表を再描画しない（フォーカス維持）。名前変更で生成結果は無効化する
      updateStateControlsOnly((current) => resetGeneration(setTrackPartName(current, trackId, name)));
    },
  });

  setupDownloadButton({
    button: generateButton,
    getState,
    updateState,
  });

  render();
}

// DOM読み込み完了後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
