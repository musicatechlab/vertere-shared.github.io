const CHOIR_VOICES = { mixed: ['Soprano', 'Alto', 'Tenor', 'Bass'] };
function distribute(items, buckets) {
  const result = Array.from({ length: buckets }, () => []);
  if (buckets <= 0) return result;
  const base = Math.floor(items.length / buckets);
  let remainder = items.length % buckets;
  let index = 0;
  for (let b = 0; b < buckets; b++) {
    const size = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    for (let k = 0; k < size; k++) {
      result[b].push(items[index++]);
    }
  }
  return result;
}

const roleByTrackId = new Map();
let voiceTracks = [ { id: 1, name: "Piano" }, { id: 2, name: "Piano" } ];
const voices = CHOIR_VOICES['mixed'];

const buckets = distribute(voiceTracks, voices.length);
buckets.forEach((bucket, b) => {
  for (const track of bucket) roleByTrackId.set(track.id, voices[b]);
});
console.log(Array.from(roleByTrackId.entries()));
