import { CHOIR_TYPES, PART_COLORS, PART_ROLES } from '../core/constants.ts';
import { t, getLanguage } from '../core/i18n.ts';
import type { AppState, PartRole } from '../core/types.ts';
import { renderProgressDisplay } from './components/progress-display.ts';

/** innerHTML / 属性値へ差し込む前にHTML特殊文字をエスケープする */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function roleColor(role: PartRole): string {
  if (role === 'Excluded') return 'var(--mtl-ink-3)';
  return PART_COLORS[role];
}



function renderRoleOptions(currentRole: PartRole): string {
  return PART_ROLES.map((role) => {
    const isSelected = role === currentRole ? 'selected' : '';
    const label = t('role.' + role) || role;
    return `<option value="${role}" ${isSelected}>${label}</option>`;
  }).join('');
}

function renderChoirTypeSelector(state: AppState): string {
  const options = CHOIR_TYPES.map((type) => {
    const isSelected = type === state.choirType ? 'selected' : '';
    const label = t('choir.type.' + type);
    return `<option value="${type}" ${isSelected}>${label}</option>`;
  }).join('');

  return `
    <div class="choir-type">
      <label class="choir-type__label" for="choir-type-select">${t('choir.type.label')}</label>
      <select id="choir-type-select" class="select select--inline js-choir-type-select">
        ${options}
      </select>
      <span class="choir-type__hint">${t('choir.type.hint')}</span>
    </div>
  `;
}

export function renderAppShell(root: HTMLDivElement): void {
  const lang = getLanguage();
  root.innerHTML = `
    <header class="header">
      <h1 class="header__title">Vertere<span class="header__title-ja">（うぇるてーれ）</span></h1>
      <p class="header__subtitle">${t('app.subtitle')}</p>
    </header>

    <section class="card" id="step-upload">
      <span class="card__label">${t('step1.label')}</span>
      <h2 class="card__title">${t('step1.title')}</h2>
      <div
        class="drop-zone"
        id="drop-zone"
        role="button"
        tabindex="0"
        aria-label="MIDI"
      >
        <div class="drop-zone__icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <p class="drop-zone__text">${t('dropzone.text')}</p>
        <p class="drop-zone__hint">${t('dropzone.hint')}</p>
      </div>
      <div class="file-tags" id="file-tags"></div>
      <p class="drop-zone__hint" id="upload-status" role="status" aria-live="polite"></p>
    </section>

    <section class="card card--disabled" id="step-config" aria-hidden="true">
      <span class="card__label">${t('step2.label')}</span>
      <h2 class="card__title">${t('step2.title')}</h2>
      <div id="track-config-container">
        <div class="empty-state">
        <p>${t('step2.empty')}</p>
      </div>
      </div>
      <div class="volume-control">
        <label class="volume-control__label" for="volume-slider">${t('volume.label')}</label>
        <input
          type="range"
          id="volume-slider"
          class="volume-control__slider"
          min="0"
          max="100"
          step="5"
          value="50"
        />
        <span class="volume-control__value" id="volume-value">50%</span>
      </div>
    </section>

    <section class="card card--disabled" id="step-generate" aria-hidden="true">
      <span class="card__label">${t('step3.label')}</span>
      <h2 class="card__title">${t('step3.title')}</h2>
      <button class="btn btn--primary" id="generate-btn" disabled>
        ${t('btn.generate')}
      </button>
      <p class="step-hint">
        ${t('step3.hint')}
      </p>
      <div class="progress hidden" id="progress-container" role="status" aria-live="polite">
        <div class="progress__bar-container">
          <div class="progress__bar" id="progress-bar" style="transform: scaleX(0)"></div>
        </div>
        <div class="progress__text">
          <span id="progress-label"></span>
          <span class="progress__percent" id="progress-percent">0%</span>
        </div>
      </div>
    </section>

    <footer class="footer">
      <div class="footer__lang">
        <select class="select select--small js-lang-select" aria-label="Language">
          <option value="ja" ${lang === 'ja' ? 'selected' : ''}>日本語</option>
          <option value="en" ${lang === 'en' ? 'selected' : ''}>English</option>
        </select>
      </div>
      <p>${t('app.footer1')}</p>
      <p>${t('app.footer2')}</p>
      <p class="footer-license">${t('app.footer3')}</p>
    </footer>
  `;
}

export function renderTrackConfigTable(state: AppState): string {
  if (!state.parsedMidi) return '';

  const configMap = new Map(state.trackConfigs.map((c) => [c.trackId, c]));
  const rows = state.parsedMidi.tracks.map((track) => {
    const config = configMap.get(track.id);
    if (!config) return '';
    const noteCount = track.notes.length;
    const isExcluded = config.role === 'Excluded';
    const partNameCell = isExcluded
      ? '<span class="track-name__notes">—</span>'
      : `<input
            type="text"
            class="part-name-input js-part-name-input"
            data-track-id="${track.id}"
            value="${escapeHtml(config.partName)}"
            aria-label="${escapeHtml(track.name)} のパート名"
          />`;
    return `
      <tr>
        <td data-label="Track">
          <div class="track-name">
            <span class="track-name__dot" style="background:${roleColor(config.role)}"></span>
            <span class="track-name__label">${escapeHtml(track.name)}</span>
            <span class="track-name__notes">(${noteCount} notes)</span>
          </div>
        </td>
        <td data-label="Part">
          <select class="select js-role-select" data-track-id="${track.id}">
            ${renderRoleOptions(config.role)}
          </select>
        </td>
        <td data-label="${t('table.partName')}">
          ${partNameCell}
        </td>
        <td data-label="Instrument">
          <select class="select js-instrument-select" data-track-id="${track.id}">
            <option value="clarinet" ${config.instrument === 'clarinet' ? 'selected' : ''}>${t('instrument.clarinet')}</option>
            <option value="piano" ${config.instrument === 'piano' ? 'selected' : ''}>${t('instrument.piano')}</option>
            <option value="woodblock" ${config.instrument === 'woodblock' ? 'selected' : ''}>${t('instrument.woodblock')}</option>
          </select>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="table-wrapper">
      <table class="track-table">
        <thead>
          <tr>
            <th scope="col">Track</th>
            <th scope="col">Part</th>
            <th scope="col">${t('table.partName')}</th>
            <th scope="col">Instrument</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/**
 * 生成ボタンと進捗表示だけを更新する。
 * トラック表のDOMには触れないため、パート名入力中でもフォーカスを失わない。
 */
export function renderControls(state: AppState): void {
  const generateBtn = document.querySelector<HTMLButtonElement>('#generate-btn');
  if (generateBtn) {
    const activePartCount = new Set(
      state.trackConfigs
        .filter((config) => config.role !== 'Excluded')
        .map((config) => config.partName || String(config.role))
    ).size;
    const isBusy = state.progress.phase === 'rendering'
      || state.progress.phase === 'encoding'
      || state.progress.phase === 'zipping';
    const isDone = state.progress.phase === 'done';
    generateBtn.disabled = activePartCount === 0 || isBusy;
    generateBtn.setAttribute('aria-busy', String(isBusy));
    generateBtn.classList.remove('btn--primary', 'btn--success');
    if (isBusy) {
      generateBtn.textContent = t('btn.processing');
      generateBtn.classList.add('btn--primary');
    } else if (isDone) {
      generateBtn.textContent = t('btn.download');
      generateBtn.classList.add('btn--success');
    } else {
      generateBtn.textContent = t('btn.generate');
      generateBtn.classList.add('btn--primary');
    }
  }

  renderProgressDisplay(state.progress);
}

export function renderAppState(state: AppState): void {
  const stepConfig = document.querySelector<HTMLElement>('#step-config');
  const stepGenerate = document.querySelector<HTMLElement>('#step-generate');
  const trackConfigContainer = document.querySelector<HTMLDivElement>('#track-config-container');
  const volumeSlider = document.querySelector<HTMLInputElement>('#volume-slider');
  const volumeValue = document.querySelector<HTMLSpanElement>('#volume-value');

  if (!stepConfig || !stepGenerate || !trackConfigContainer || !volumeSlider || !volumeValue) {
    return;
  }

  const hasMidi = state.parsedMidi !== null;
  stepConfig.classList.toggle('card--disabled', !hasMidi);
  stepGenerate.classList.toggle('card--disabled', !hasMidi);
  stepConfig.setAttribute('aria-hidden', String(!hasMidi));
  stepGenerate.setAttribute('aria-hidden', String(!hasMidi));

  if (hasMidi) {
    trackConfigContainer.innerHTML = renderChoirTypeSelector(state) + renderTrackConfigTable(state);
    volumeSlider.value = String(state.backgroundVolumePercent);
    volumeValue.textContent = `${state.backgroundVolumePercent}%`;
  } else {
    trackConfigContainer.innerHTML = `
      <div class="empty-state">
        <p>${t('step2.empty')}</p>
      </div>
    `;
  }

  renderControls(state);
}

export function setUploadStatus(message: string, isError = false): void {
  const status = document.querySelector<HTMLElement>('#upload-status');
  const dropZone = document.querySelector<HTMLElement>('#drop-zone');
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? 'var(--mtl-accent)' : '';

  if (dropZone && isError) {
    dropZone.classList.remove('shake');
    // restart animation
    void dropZone.offsetWidth;
    dropZone.classList.add('shake');
  }
}
