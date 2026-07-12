import fs from 'fs';
let content = fs.readFileSync('src/main.ts', 'utf8');
content = content.replace(
  `import './styles/main.css';
import { createInitialAppState, resetGeneration, setBackgroundVolume, setChoirType, setLanguage as setAppStateLanguage, setParsedMidi, setTrackPartName, updateTrackConfig } from './state/app-state.ts';
import './styles/main.css';
import { createInitialAppState, resetGeneration, setBackgroundVolume, setChoirType, setLanguage as setAppStateLanguage, setParsedMidi, setTrackPartName, updateTrackConfig } from './state/app-state.ts';
import { setLanguage, t, getLanguage } from './core/i18n.ts';
import type { Language } from './core/i18n.ts';
import type { AppState } from './core/types.ts';
import type { AppState } from './core/types.ts';`,
  `import './styles/main.css';
import { createInitialAppState, resetGeneration, setBackgroundVolume, setChoirType, setLanguage as setAppStateLanguage, setParsedMidi, setTrackPartName, updateTrackConfig } from './state/app-state.ts';
import { setLanguage, t, getLanguage } from './core/i18n.ts';
import type { Language } from './core/i18n.ts';
import type { AppState } from './core/types.ts';`
);
fs.writeFileSync('src/main.ts', content);
