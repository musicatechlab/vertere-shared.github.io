import fs from 'fs';

let content = fs.readFileSync('src/ui/renderer.ts', 'utf8');

content = content.replace(
  `    <header class="header">
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
    </header>`,
  `    <header class="header">
      <h1 class="header__title">Vertere<span class="header__title-ja">（うぇるてーれ）</span></h1>
      <p class="header__subtitle">\${t('app.subtitle')}</p>
    </header>`
);

content = content.replace(
  `    <footer class="footer">
      <p>\${t('app.footer1')}</p>
      <p>\${t('app.footer2')}</p>
    </footer>`,
  `    <footer class="footer">
      <div class="footer__lang">
        <select class="select select--small js-lang-select" aria-label="Language">
          <option value="ja" \${lang === 'ja' ? 'selected' : ''}>日本語</option>
          <option value="en" \${lang === 'en' ? 'selected' : ''}>English</option>
        </select>
      </div>
      <p>\${t('app.footer1')}</p>
      <p>\${t('app.footer2')}</p>
    </footer>`
);

fs.writeFileSync('src/ui/renderer.ts', content);

let css = fs.readFileSync('src/styles/main.css', 'utf8');
// remove header__top and header__lang
css = css.replace(
  /\.header__top \{[\s\S]*?\}\n\n\.header__lang \{[\s\S]*?\}\n/,
  ''
);

// add footer__lang
css = css.replace(
  /\/\* === Footer === \*\/\n/,
  `/* === Footer === */\n\n.footer__lang {\n  margin-bottom: var(--mtl-space-4);\n}\n`
);
fs.writeFileSync('src/styles/main.css', css);
