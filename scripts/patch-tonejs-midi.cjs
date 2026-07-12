const fs = require('fs');
const path = require('path');

/**
 * @tonejs/midi ships two builds:
 * - dist/Midi.js  → requires patched midi-file (handled by patch-package)
 * - build/Midi.js → webpack bundle with inlined unpatched midi-file (package "main")
 *
 * Node / some bundlers resolve "main" (build/) and fail on Active Sensing (0xF6).
 */
function patchBundledMidiJs() {
  const file = path.join(__dirname, '../node_modules/@tonejs/midi/build/Midi.js');
  if (!fs.existsSync(file)) {
    console.log('build/Midi.js not found, skipping @tonejs/midi bundle patch.');
    return;
  }

  let content = fs.readFileSync(file, 'utf8');
  const target =
    'if(247==r)return t.type="endSysEx",a=n.readVarInt(),t.data=n.readBytes(a),t;throw"Unrecognised MIDI event type byte: "+r';
  const replacement =
    'if(247==r)return t.type="endSysEx",a=n.readVarInt(),t.data=n.readBytes(a),t;if(r>=241&&r<=246)return t.type="systemCommon",t.status=r,r===241||r===243?t.data=n.readBytes(1):242===r&&(t.data=n.readBytes(2)),t;throw"Unrecognised MIDI event type byte: "+r';

  if (!content.includes(target)) {
    if (content.includes('r>=241&&r<=246')) {
      console.log('build/Midi.js already patched for F1-F6.');
      return;
    }
    console.log('Target string not found in build/Midi.js, skipping (version mismatch?).');
    return;
  }

  content = content.replace(target, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Patched @tonejs/midi/build/Midi.js for Active Sensing (F1-F6).');
}

patchBundledMidiJs();
