import fs from 'fs';

let i18n = fs.readFileSync('src/core/i18n.ts', 'utf8');
i18n = i18n.replace(
  `'phase.error': 'エラー',`,
  `'phase.error': 'エラー',\n  'error.noMidi': 'MIDIデータが見つかりません',`
);
i18n = i18n.replace(
  `'phase.error': 'Error',`,
  `'phase.error': 'Error',\n  'error.noMidi': 'MIDI data not found',`
);
fs.writeFileSync('src/core/i18n.ts', i18n);

let download = fs.readFileSync('src/ui/components/download-button.ts', 'utf8');
download = `import { t } from '../../core/i18n.ts';\n` + download;
download = download.replace(
  /throw new Error\('MIDIデータが見つかりません'\);/g,
  `throw new Error(t('error.noMidi'));`
);
download = download.replace(
  /currentPartName: '完了',/g,
  `currentPartName: t('phase.done'),`
);
fs.writeFileSync('src/ui/components/download-button.ts', download);
