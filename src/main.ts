/**
 * main.ts — アプリケーションエントリーポイント
 * 全層を組み立てる唯一の場所
 */

import './styles/main.css';
import { createInitialAppState, resetGeneration, setBackgroundVolume, setChoirType, setLanguage as setAppStateLanguage, setParsedMidi, setTrackPartName, updateTrackConfig } from './state/app-state.ts';
import { setLanguage, t, getLanguage } from './core/i18n.ts';
import type { Language } from './core/i18n.ts';
import type { AppState } from './core/types.ts';
import { setupDownloadButton } from './ui/components/download-button.ts';
import { setupFileUpload } from './ui/components/file-upload.ts';
import { bindTrackConfigHandlers } from './ui/components/track-config.ts';
import { setupVolumeControl } from './ui/components/volume-control.ts';
import { renderAppShell, renderAppState, renderControls, setUploadStatus } from './ui/renderer.ts';

function initApp(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('Root element #app not found');

  const browserLang = navigator.language.startsWith('ja') ? 'ja' : 'en';
  setLanguage(browserLang);
  let state = createInitialAppState(browserLang);
  renderAppShell(app);
  const getState = (): AppState => state;

  const render = (): void => {
    renderAppState(state);
  };
  const updateState = (updater: (current: AppState) => AppState): void => {
    state = updater(state);
    render();
  };

  app.addEventListener('change', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('js-lang-select')) {
      const newLang = (target as HTMLSelectElement).value as Language;
      setLanguage(newLang);
      renderAppShell(app); // Re-render shell strings
      // Re-bind listeners for the newly created shell DOM
      bindShellListeners();
      updateState((current) => setAppStateLanguage(current, newLang));
    }
  });
  // トラック表を再構築せず、状態更新とコントロール表示のみ行う（入力中のフォーカス維持）
  const updateStateControlsOnly = (updater: (current: AppState) => AppState): void => {
    state = updater(state);
    renderControls(state);
  };

  function bindShellListeners() {
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
        setUploadStatus(t('upload.status.error', message), true);
      },
      onFilesChanged: async (files) => {
        if (files.length === 0) {
          updateState(() => createInitialAppState(getLanguage()));
          setUploadStatus('', false);
          return;
        }

        setUploadStatus(t('upload.status.parsing'), false);
        try {
          const { parseMidiFiles } = await import('./core/midi-parser.ts');
          const buffers = await Promise.all(files.map(async (file) => ({
            name: file.name,
            buffer: await file.arrayBuffer(),
          })));
          const parsed = parseMidiFiles(buffers);
          updateState((current) => setParsedMidi(current, parsed));
          setUploadStatus(t('upload.status.parsed', parsed.tracks.length), false);

          // 初回生成ボタン押下時の待ちを減らすため、重い依存を先読みする
          void Promise.all([
            import('./core/audio-renderer.ts'),
            import('./core/mp3-encoder.ts'),
            import('jszip'),
          ]);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          setUploadStatus(t('upload.status.error', message), true);
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
  }

  bindShellListeners();
  render();
}

// DOM読み込み完了後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
