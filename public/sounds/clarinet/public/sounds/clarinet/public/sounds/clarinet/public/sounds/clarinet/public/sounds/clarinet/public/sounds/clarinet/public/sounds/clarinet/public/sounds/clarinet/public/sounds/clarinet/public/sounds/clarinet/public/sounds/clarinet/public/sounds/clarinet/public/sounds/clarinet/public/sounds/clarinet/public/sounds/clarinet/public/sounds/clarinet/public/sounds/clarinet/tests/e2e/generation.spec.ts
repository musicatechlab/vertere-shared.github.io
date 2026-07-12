import { expect, test } from '@playwright/test';
import midiPkg from '@tonejs/midi';

const { Midi } = midiPkg;

function addNamedTrack(midi: InstanceType<typeof Midi>, name: string, midiNote: number): void {
  const track = midi.addTrack();
  track.name = name;
  track.addNote({ midi: midiNote, time: 0, duration: 0.5, velocity: 0.8 });
}

/** Soprano + 分割された2つのBass を含むデモMIDI（採番の検証用） */
function createDivisiMidiBuffer(): Buffer {
  const midi = new Midi();
  addNamedTrack(midi, 'Soprano', 72);
  addNamedTrack(midi, 'Bass', 48);
  addNamedTrack(midi, 'Bass', 43);
  return Buffer.from(midi.toArray());
}

test('generation smoke: upload -> auto-assign -> generate -> complete', async ({ page }) => {
  test.setTimeout(180000);
  await page.goto('/');
  await page.setInputFiles('input[type="file"]', {
    name: 'demo.mid',
    mimeType: 'audio/midi',
    buffer: createDivisiMidiBuffer(),
  });

  await expect(page.locator('#step-config')).toBeVisible();

  // 混声がデフォルトで、2つのBassは上から Bass1 / Bass2 に採番される
  const partNames = page.locator('.js-part-name-input');
  await expect(partNames).toHaveCount(3);
  await expect(partNames.nth(0)).toHaveValue('Soprano');
  await expect(partNames.nth(1)).toHaveValue('Bass1');
  await expect(partNames.nth(2)).toHaveValue('Bass2');

  await expect(page.locator('#generate-btn')).toBeEnabled();
  await page.click('#generate-btn');
  await expect(page.locator('#generate-btn')).toHaveText('ZIPを再ダウンロード', {
    timeout: 120000,
  });
});

test('changing choir type reassigns parts', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('input[type="file"]', {
    name: 'demo.mid',
    mimeType: 'audio/midi',
    buffer: createDivisiMidiBuffer(),
  });

  await expect(page.locator('#step-config')).toBeVisible();
  // 男声3部へ切り替えると Soprano は Tenor/Baritone/Bass 側へ再割り当てされる
  await page.selectOption('.js-choir-type-select', 'men3');
  const roles = page.locator('.js-role-select');
  const count = await roles.count();
  for (let i = 0; i < count; i++) {
    await expect(roles.nth(i)).not.toHaveValue('Soprano');
  }
});
