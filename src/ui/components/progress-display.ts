import { PHASE_ICONS, PHASE_LABELS } from '../../core/constants.ts';
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
  const phaseLabel = PHASE_LABELS[progress.phase] ?? progress.phase;
  const partName = progress.currentPartName || '処理';
  const totalParts = Math.max(progress.totalParts, 0);
  const partIndexText = totalParts > 0 ? ` (${progress.currentPartIndex + 1}/${totalParts})` : '';
  const overallPercent = computeOverallPercent(progress);

  if (progress.phase === 'done') {
    label.textContent = `${prefix}すべてのパート生成が完了しました`;
  } else if (progress.phase === 'error' && progress.errorMessage) {
    label.textContent = `${prefix}エラー: ${progress.errorMessage}`;
  } else {
    label.textContent = `${prefix}${partName} を${phaseLabel}...${partIndexText}`;
  }

  percent.textContent = `${overallPercent}%`;
  bar.style.transform = `scaleX(${overallPercent / 100})`;
}
