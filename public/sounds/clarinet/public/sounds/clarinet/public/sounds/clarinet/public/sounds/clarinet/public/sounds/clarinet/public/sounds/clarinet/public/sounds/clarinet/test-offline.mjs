import * as Tone from 'tone';
import fs from 'fs';

(async () => {
  // Mock fetch for Tone.js in Node.js
  const toBuffer = (arrayBuffer) => {
    const buffer = Buffer.alloc(arrayBuffer.byteLength);
    const view = new Uint8Array(arrayBuffer);
    for (let i = 0; i < buffer.length; ++i) {
      buffer[i] = view[i];
    }
    return buffer;
  };

  // We cannot easily run Tone.js Offline context in Node without AudioBuffer polyfills.
  console.log("Tone.js Offline needs Web Audio API");
})();
