import fs from 'fs';

let content = fs.readFileSync('src/ui/components/progress-display.ts', 'utf8');

content = content.replace(
  `import { PHASE_ICONS, PHASE_LABELS } from '../../core/constants.ts';`,
  `import { PHASE_ICONS } from '../../core/constants.ts';\nimport { t } from '../../core/i18n.ts';`
);

content = content.replace(
  `const phaseLabel = PHASE_LABELS[state.phase] || state.phase;`,
  `const phaseLabel = t('phase.' + state.phase) || state.phase;`
);

content = content.replace(
  /let statusText = '';[\s\S]*?progressLabel\.textContent = statusText;/m,
  `let statusText = '';
  if (state.errorMessage) {
    statusText = t('progress.status.error', state.errorMessage);
  } else if (state.phase !== 'idle' && state.phase !== 'done') {
    if (state.currentPartName === 'All') {
      statusText = t('progress.status.all', phaseLabel);
    } else {
      statusText = t('progress.status', state.currentPartName, phaseLabel, state.currentPartIndex + 1, state.totalParts);
    }
  }

  if (state.phase === 'zipping') {
    statusText = phaseLabel;
  }

  progressLabel.textContent = statusText;`
);

fs.writeFileSync('src/ui/components/progress-display.ts', content);
