import fs from 'fs';

const content = fs.readFileSync('src/ui/renderer.ts', 'utf8');

let newContent = content.replace(
  `import { CHOIR_TYPES, CHOIR_TYPE_LABELS, INSTRUMENT_LABELS, PART_ROLES, ROLE_LABELS, PART_COLORS } from '../core/constants.ts';`,
  `import { CHOIR_TYPES, PART_ROLES, PART_COLORS } from '../core/constants.ts';\nimport { t, getLanguage, setLanguage, Language } from '../core/i18n.ts';`
);

newContent = newContent.replace(
  /export function renderAppShell\(root: HTMLDivElement\): void \{[\s\S]*?\}\n/,
  `export function renderAppShell(root: HTMLDivElement): void {
  const lang = getLanguage();
  root.innerHTML = \`
    <header class="header">
      <div class="header__top">
        <h1 class="header__title">Vertere<span class="header__title-ja">（うぇるてーれ）</span></h1>
        <div class="header__lang">
          <select class="select select--small js-lang-select" aria-label="Language">
            <option value="ja" \${lang === 'ja' ? 'selected' : ''}>日本語</option>
            <option value="en" \${lang === 'en' ? 'selected' : ''}>English</option>
          </select>
        </div>
      </div>
      <p class="header__subtitle">\${t('app.subtitle')}</p>
    </header>

    <section class="card" id="step-upload">
      <span class="card__label">\${t('step1.label')}</span>
      <h2 class="card__title">\${t('step1.title')}</h2>
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
        <p class="drop-zone__text">\${t('dropzone.text')}</p>
        <p class="drop-zone__hint">\${t('dropzone.hint')}</p>
      </div>
      <div class="file-tags" id="file-tags"></div>
      <p class="drop-zone__hint" id="upload-status" role="status" aria-live="polite"></p>
    </section>

    <section class="card card--disabled" id="step-config" aria-hidden="true">
      <span class="card__label">\${t('step2.label')}</span>
      <h2 class="card__title">\${t('step2.title')}</h2>
      <div id="track-config-container">
        <div class="empty-state">
          <p>\${t('step2.empty')}</p>
        </div>
      </div>
      <div class="volume-control">
        <label class="volume-control__label" for="volume-slider">\${t('volume.label')}</label>
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
      <span class="card__label">\${t('step3.label')}</span>
      <h2 class="card__title">\${t('step3.title')}</h2>
      <button class="btn btn--primary" id="generate-btn" disabled>
        \${t('btn.generate')}
      </button>
      <p class="step-hint">
        \${t('step3.hint')}
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
      <p>\${t('app.footer1')}</p>
      <p>\${t('app.footer2')}</p>
    </footer>
  \`;
}
`
);

newContent = newContent.replace(
  /function renderRoleOptions\(currentRole: PartRole\): string \{[\s\S]*?\}\n/,
  `function renderRoleOptions(currentRole: PartRole): string {
  return PART_ROLES.map((role) => {
    const isSelected = role === currentRole ? 'selected' : '';
    const label = t('role.' + role) || role;
    return \`<option value="\${role}" \${isSelected}>\${label}</option>\`;
  }).join('');
}
`
);

newContent = newContent.replace(
  /function renderChoirTypeSelector\(state: AppState\): string \{[\s\S]*?\}\n/,
  `function renderChoirTypeSelector(state: AppState): string {
  const options = CHOIR_TYPES.map((type) => {
    const isSelected = type === state.choirType ? 'selected' : '';
    const label = t('choir.type.' + type);
    return \`<option value="\${type}" \${isSelected}>\${label}</option>\`;
  }).join('');

  return \`
    <div class="choir-type">
      <label class="choir-type__label" for="choir-type-select">\${t('choir.type.label')}</label>
      <select id="choir-type-select" class="select select--inline js-choir-type-select">
        \${options}
      </select>
      <span class="choir-type__hint">\${t('choir.type.hint')}</span>
    </div>
  \`;
}
`
);

newContent = newContent.replace(
  /<td data-label="パート名">/g,
  `<td data-label="\${t('table.partName')}">`
);

newContent = newContent.replace(
  /<th scope="col">パート名<\/th>/g,
  `<th scope="col">\${t('table.partName')}</th>`
);

newContent = newContent.replace(
  /\$\{INSTRUMENT_LABELS\.clarinet\}/g,
  `\${t('instrument.clarinet')}`
);
newContent = newContent.replace(
  /\$\{INSTRUMENT_LABELS\.piano\}/g,
  `\${t('instrument.piano')}`
);
newContent = newContent.replace(
  /\$\{INSTRUMENT_LABELS\.woodblock\}/g,
  `\${t('instrument.woodblock')}`
);

newContent = newContent.replace(
  /generateBtn\.textContent = '処理中\.\.\.';/g,
  `generateBtn.textContent = t('btn.processing');`
);
newContent = newContent.replace(
  /generateBtn\.textContent = 'ZIPを再ダウンロード';/g,
  `generateBtn.textContent = t('btn.download');`
);
newContent = newContent.replace(
  /generateBtn\.textContent = '練習音源を生成';/g,
  `generateBtn.textContent = t('btn.generate');`
);

newContent = newContent.replace(
  /<div class="empty-state">[\s\S]*?<\/div>/g,
  `<div class="empty-state">\n        <p>\${t('step2.empty')}</p>\n      </div>`
);


fs.writeFileSync('src/ui/renderer.ts', newContent);
