import fs from 'fs';

let i18n = fs.readFileSync('src/core/i18n.ts', 'utf8');
i18n = i18n.replace(
  `'upload.status.error': 'エラー: {0}',`,
  `'upload.status.error': 'エラー: {0}',\n  'upload.validation.ext': 'MIDIファイル（.mid / .midi）のみ選択できます',\n  'upload.validation.size': 'ファイルサイズ上限（10MB）を超えています: {0}',\n  'upload.remove': '{0}を削除',`
);

i18n = i18n.replace(
  `'upload.status.error': 'Error: {0}',`,
  `'upload.status.error': 'Error: {0}',\n  'upload.validation.ext': 'Only MIDI files (.mid / .midi) are supported',\n  'upload.validation.size': 'File size exceeds limit (10MB): {0}',\n  'upload.remove': 'Remove {0}',`
);
fs.writeFileSync('src/core/i18n.ts', i18n);

let upload = fs.readFileSync('src/ui/components/file-upload.ts', 'utf8');
upload = `import { t } from '../../core/i18n.ts';\n` + upload;
upload = upload.replace(
  /aria-label="\$\{file\.name\}を削除"/g,
  `aria-label="\${t('upload.remove', file.name)}"`
);
upload = upload.replace(
  /onValidationError\?\('MIDIファイル（\.mid \/ \.midi）のみ選択できます'\);/g,
  `onValidationError?.(t('upload.validation.ext'));`
);
upload = upload.replace(
  /onValidationError\?\(`ファイルサイズ上限（10MB）を超えています: \$\{oversized\.name\}`\);/g,
  `onValidationError?.(t('upload.validation.size', oversized.name));`
);
fs.writeFileSync('src/ui/components/file-upload.ts', upload);
