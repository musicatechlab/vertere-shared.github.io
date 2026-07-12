import { PHASE_ICONS } from '../../core/constants.ts';
import { t } from '../../core/i18n.ts';
import type { ProgressState } from '../../core/types.ts';

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function computeOverallPercent(progress: ProgressState): number {
  if (progress.phase === 'done') return 100;
  if (progress.phase === 'idle') return 0;

  const total = Math.max(progress.totalParts, 1);
  const current = Math.max(progress.currentPartIndex, 0);
  const partProgress = clampPercent(progress.partProgress);

  if (progress.phase === 'zipping') {
    return clampPercent(95 + partProgress * 0.05);
  }
  return clampPercent(((current * 100) + partProgress) / total);
}

export function renderProgressDisplay(progress: ProgressState): void {
  const container = document.querySelector<HTMLDivElement>('#progress-container');
  const bar = document.querySelector<HTMLDivElement>('#progress-bar');
  const label = document.querySelector<HTMLSpanElement>('#progress-label');
  const percent = document.querySelector<HTMLSpanElement>('#progress-percent');

  if (!container || !bar || !label || !percent) return;

  const isVisible = progress.phase !== 'idle';
  container.classList.toggle('hidden', !isVisible);
  if (!isVisible) return;

  const icon = PHASE_ICONS[progress.phase] ?? '';
  const prefix = icon ? `${icon} ` : '';
  const phaseLabel = t('phase.' + progress.phase);
  const overallPercent = computeOverallPercent(progress);

  let statusText = '';
  if (progress.errorMessage) {
    statusText = t('progress.status.error', progress.errorMessage);
  } else if (progress.phase !== 'idle' && progress.phase !== 'done') {
    if (progress.currentPartName === 'All') {
      statusText = t('progress.status.all', phaseLabel);
    } else {
      const currentPartIndexStr = String(progress.currentPartIndex + 1);
      const totalPartsStr = String(progress.totalParts);
      statusText = t('progress.status', progress.currentPartName || 'Part', phaseLabel, currentPartIndexStr, totalPartsStr);
    }
  }

  if (progress.phase === 'zipping') {
    statusText = phaseLabel;
  } else if (progress.phase === 'done') {
    statusText = t('phase.done');
  }

  label.textContent = `${prefix}${statusText}`;

  percent.textContent = `${overallPercent}%`;
  bar.style.transform = `scaleX(${overallPercent / 100})`;
}
