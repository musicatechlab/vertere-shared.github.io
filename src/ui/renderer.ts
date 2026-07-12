import { CHOIR_TYPES, CHOIR_TYPE_LABELS, INSTRUMENT_LABELS, PART_COLORS, PART_ROLES, ROLE_LABELS } from '../core/constants.ts';
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

function roleOptionLabel(role: PartRole): string {
  return ROLE_LABELS[role] ?? role;
}

function renderRoleOptions(selected: PartRole): string {
  return PART_ROLES.map((role) => `
    <option value="${role}" ${role === selected ? 'selected' : ''}>${roleOptionLabel(role)}</option>
  `).join('');
}

function renderChoirTypeSelector(state: AppState): string {
  const options = CHOIR_TYPES.map((type) => `
    <option value="${type}" ${state.choirType === type ? 'selected' : ''}>${CHOIR_TYPE_LABELS[type]}</option>
  `).join('');
  return `
    <div class="choir-type">
      <label class="choir-type__label" for="choir-type-select">合唱編成</label>
      <select class="select js-choir-type-select" id="choir-type-select">${options}</select>
      <span class="choir-type__hint">編成を選ぶとパートを自動で割り当てます</span>
    </div>
  `;
}

export function renderAppShell(root: HTMLDivElement): void {
  root.innerHTML = `
    <header class="header">
      <h1 class="header__title">Vertere<span class="header__title-ja">（うぇるてーれ）</span></h1>
      <p class="header__subtitle">MIDI to MP3 Converter — 合唱練習用音源自動生成ツール</p>
    </header>

    <section class="card" id="step-upload">
      <span class="card__label">Step 1</span>
      <h2 class="card__title">MIDIファイルをアップロード</h2>
      <div
        class="drop-zone"
        id="drop-zone"
        role="button"
        tabindex="0"
        aria-label="MIDIファイルを選択またはドロップ"
      >
        <div class="drop-zone__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 16V4" />
            <path d="M7 9l5-5 5 5" />
            <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
        </div>
        <p class="drop-zone__text">ここにMIDIファイルをドラッグ＆ドロップ</p>
        <p class="drop-zone__hint">または、クリックしてファイルを選択（.mid / .midi）</p>
      </div>
      <div class="file-tags" id="file-tags"></div>
      <p class="drop-zone__hint" id="upload-status" role="status" aria-live="polite"></p>
    </section>

    <section class="card card--disabled" id="step-config" aria-hidden="true">
      <span class="card__label">Step 2</span>
      <h2 class="card__title">トラック設定</h2>
      <div id="track-config-container">
        <div class="empty-state">
          <p>MIDIファイルをアップロードすると、ここに各トラックの楽器やパートの割り当て設定が表示されます。</p>
        </div>
      </div>
      <div class="volume-control">
        <label class="volume-control__label" for="volume-slider">主役以外の音量</label>
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
      <span class="card__label">Step 3</span>
      <h2 class="card__title">生成 & ダウンロード</h2>
      <button class="btn btn--primary" id="generate-btn" disabled>
        練習音源を生成
      </button>
      <p class="step-hint">
        ※ブラウザ内で高品質な音声波形を合成・エンコードするため、完了までに数十秒〜数分かかる場合があります。
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
      <p>Vertere（うぇるてーれ）- MIDI to MP3 Converter — 合唱練習用音源自動生成ツール</p>
      <p>すべての処理はブラウザ内で完結します。サーバーへのデータ送信はありません。</p>
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
        <td data-label="パート名">
          ${partNameCell}
        </td>
        <td data-label="Instrument">
          <select class="select js-instrument-select" data-track-id="${track.id}">
            <option value="clarinet" ${config.instrument === 'clarinet' ? 'selected' : ''}>${INSTRUMENT_LABELS.clarinet}</option>
            <option value="piano" ${config.instrument === 'piano' ? 'selected' : ''}>${INSTRUMENT_LABELS.piano}</option>
            <option value="woodblock" ${config.instrument === 'woodblock' ? 'selected' : ''}>${INSTRUMENT_LABELS.woodblock}</option>
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
            <th scope="col">パート名</th>
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
      generateBtn.textContent = '処理中...';
      generateBtn.classList.add('btn--primary');
    } else if (isDone) {
      generateBtn.textContent = 'ZIPを再ダウンロード';
      generateBtn.classList.add('btn--success');
    } else {
      generateBtn.textContent = '練習音源を生成';
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
        <p>MIDIファイルをアップロードすると、ここに各トラックの楽器やパートの割り当て設定が表示されます。</p>
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
