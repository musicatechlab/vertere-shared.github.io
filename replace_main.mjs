import fs from 'fs';

let content = fs.readFileSync('src/main.ts', 'utf8');

content = content.replace(
  `import { createInitialAppState, resetGeneration, setBackgroundVolume, setChoirType, setParsedMidi, setTrackPartName, updateTrackConfig } from './state/app-state.ts';`,
  `import { createInitialAppState, resetGeneration, setBackgroundVolume, setChoirType, setLanguage as setAppStateLanguage, setParsedMidi, setTrackPartName, updateTrackConfig } from './state/app-state.ts';\nimport { Language, setLanguage, t } from './core/i18n.ts';`
);

content = content.replace(
  `  renderAppShell(app);
  let state = createInitialAppState();`,
  `  const browserLang = navigator.language.startsWith('ja') ? 'ja' : 'en';
  setLanguage(browserLang);
  let state = createInitialAppState(browserLang);
  renderAppShell(app);`
);

content = content.replace(
  `const updateState = (updater: (current: AppState) => AppState): void => {
    state = updater(state);
    render();
  };`,
  `const updateState = (updater: (current: AppState) => AppState): void => {
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
  });`
);

// We need to move the logic that queries DOM elements into `bindShellListeners`
// Or just let's see how `dropZone` etc. are bound.
content = content.replace(
  `  const dropZone = document.querySelector<HTMLDivElement>('#drop-zone');
  const fileTags = document.querySelector<HTMLDivElement>('#file-tags');
  const volumeSlider = document.querySelector<HTMLInputElement>('#volume-slider');
  const trackConfigContainer = document.querySelector<HTMLDivElement>('#track-config-container');
  const generateButton = document.querySelector<HTMLButtonElement>('#generate-btn');

  if (!dropZone || !fileTags || !volumeSlider || !trackConfigContainer || !generateButton) {
    throw new Error('Required UI elements not found');
  }

  setupFileUpload({`,
  `  function bindShellListeners() {
    const dropZone = document.querySelector<HTMLDivElement>('#drop-zone');
    const fileTags = document.querySelector<HTMLDivElement>('#file-tags');
    const volumeSlider = document.querySelector<HTMLInputElement>('#volume-slider');
    const trackConfigContainer = document.querySelector<HTMLDivElement>('#track-config-container');
    const generateButton = document.querySelector<HTMLButtonElement>('#generate-btn');

    if (!dropZone || !fileTags || !volumeSlider || !trackConfigContainer || !generateButton) {
      throw new Error('Required UI elements not found');
    }

    setupFileUpload({`
);

content = content.replace(
  `  setupDownloadButton({
    button: generateButton,
    getState,
    updateState,
  });

  render();
}`,
  `    setupDownloadButton({
      button: generateButton,
      getState,
      updateState,
    });
  }

  bindShellListeners();
  render();
}`
);

content = content.replace(
  /setUploadStatus\(`エラー: \$\{message\}`/g,
  `setUploadStatus(t('upload.status.error', message))`
);
content = content.replace(
  /setUploadStatus\(`\$\{parsed.tracks.length\}トラックを読み込みました`/g,
  `setUploadStatus(t('upload.status.parsed', parsed.tracks.length))`
);
content = content.replace(
  /setUploadStatus\('MIDIを解析中\.\.\.'/g,
  `setUploadStatus(t('upload.status.parsing')`
);

fs.writeFileSync('src/main.ts', content);
