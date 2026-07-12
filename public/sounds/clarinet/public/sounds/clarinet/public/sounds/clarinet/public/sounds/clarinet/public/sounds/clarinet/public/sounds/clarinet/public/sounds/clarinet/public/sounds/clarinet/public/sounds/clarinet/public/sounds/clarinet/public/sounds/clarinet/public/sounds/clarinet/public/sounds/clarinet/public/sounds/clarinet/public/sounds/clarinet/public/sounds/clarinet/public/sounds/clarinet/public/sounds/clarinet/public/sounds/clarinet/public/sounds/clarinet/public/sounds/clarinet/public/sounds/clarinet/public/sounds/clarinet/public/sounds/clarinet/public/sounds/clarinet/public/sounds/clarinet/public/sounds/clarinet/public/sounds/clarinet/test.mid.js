import fs from 'fs';
import pkg from '@tonejs/midi';
const { Midi } = pkg;

const midi = new Midi();
const track = midi.addTrack();
track.addNote({
  midi: 60,
  time: 0,
  duration: 1
});
track.addNote({
  midi: 62,
  time: 1,
  duration: 1
});
fs.writeFileSync('test.mid', Buffer.from(midi.toArray()));
