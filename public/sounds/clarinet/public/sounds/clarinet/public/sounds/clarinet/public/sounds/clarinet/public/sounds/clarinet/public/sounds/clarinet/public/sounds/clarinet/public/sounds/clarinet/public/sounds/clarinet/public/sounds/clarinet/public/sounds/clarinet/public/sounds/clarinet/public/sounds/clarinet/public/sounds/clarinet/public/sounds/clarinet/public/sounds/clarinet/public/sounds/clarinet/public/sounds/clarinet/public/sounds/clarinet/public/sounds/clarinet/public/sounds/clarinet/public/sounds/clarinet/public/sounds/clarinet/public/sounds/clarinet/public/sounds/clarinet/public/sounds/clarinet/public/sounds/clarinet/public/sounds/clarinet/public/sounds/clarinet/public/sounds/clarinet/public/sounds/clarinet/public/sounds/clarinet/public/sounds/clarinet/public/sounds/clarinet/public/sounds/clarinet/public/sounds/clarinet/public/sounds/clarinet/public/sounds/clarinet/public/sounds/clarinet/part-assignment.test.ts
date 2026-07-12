import { describe, expect, it } from 'vitest';
import type { ParsedNote, ParsedTrack } from './types.ts';
import { assignParts, renumberByRole } from './part-assignment.ts';

function note(midi: number): ParsedNote {
  return { midi, time: 0, duration: 0.5, velocity: 0.8 };
}

function track(
  id: number,
  name: string,
  midis: number[],
  extra: Partial<ParsedTrack> = {}
): ParsedTrack {
  return {
    id,
    name,
    channel: 0,
    instrumentNumber: 0,
    sourceFileName: 'demo.mid',
    notes: midis.map(note),
    ...extra,
  };
}

/** trackId -> {role, partName} の簡易ビュー */
function view(configs: ReturnType<typeof assignParts>) {
  return configs.map((c) => ({ trackId: c.trackId, role: c.role, partName: c.partName }));
}

describe('assignParts (mixed)', () => {
  it('maps 4 named SATB tracks 1:1 without numbering', () => {
    const tracks = [
      track(0, 'Soprano', [72]),
      track(1, 'Alto', [67]),
      track(2, 'Tenor', [55]),
      track(3, 'Bass', [43]),
    ];
    expect(view(assignParts(tracks, 'mixed'))).toEqual([
      { trackId: 0, role: 'Soprano', partName: 'Soprano' },
      { trackId: 1, role: 'Alto', partName: 'Alto' },
      { trackId: 2, role: 'Tenor', partName: 'Tenor' },
      { trackId: 3, role: 'Bass', partName: 'Bass' },
    ]);
  });

  it('numbers divisi voices from the top (SSAATTBB)', () => {
    const tracks = [
      track(0, 'Sop 1', [76]),
      track(1, 'Sop 2', [72]),
      track(2, 'Alto 1', [69]),
      track(3, 'Alto 2', [65]),
      track(4, 'Ten 1', [59]),
      track(5, 'Ten 2', [55]),
      track(6, 'Bass 1', [48]),
      track(7, 'Bass 2', [43]),
    ];
    expect(view(assignParts(tracks, 'mixed'))).toEqual([
      { trackId: 0, role: 'Soprano', partName: 'Soprano1' },
      { trackId: 1, role: 'Soprano', partName: 'Soprano2' },
      { trackId: 2, role: 'Alto', partName: 'Alto1' },
      { trackId: 3, role: 'Alto', partName: 'Alto2' },
      { trackId: 4, role: 'Tenor', partName: 'Tenor1' },
      { trackId: 5, role: 'Tenor', partName: 'Tenor2' },
      { trackId: 6, role: 'Bass', partName: 'Bass1' },
      { trackId: 7, role: 'Bass', partName: 'Bass2' },
    ]);
  });

  it('distributes unnamed tracks by track order (top to bottom), not by pitch', () => {
    // わざとピッチ順とトラック順を食い違わせても、トラックの並び順で割り当てる
    const tracks = [
      track(0, 'Track 0', [40]),
      track(1, 'Track 1', [90]),
      track(2, 'Track 2', [50]),
      track(3, 'Track 3', [80]),
    ];
    expect(view(assignParts(tracks, 'mixed'))).toEqual([
      { trackId: 0, role: 'Soprano', partName: 'Soprano' },
      { trackId: 1, role: 'Alto', partName: 'Alto' },
      { trackId: 2, role: 'Tenor', partName: 'Tenor' },
      { trackId: 3, role: 'Bass', partName: 'Bass' },
    ]);
  });

  it('classifies percussion as Percussion and empty tracks as Excluded', () => {
    const tracks = [
      track(0, 'Soprano', [72]),
      track(1, 'Piano', [48, 55]),
      track(2, 'Drums', [76, 77], { channel: 9, instrumentNumber: 115 }),
      track(3, 'Blank', []),
    ];
    const configs = assignParts(tracks, 'mixed');
    expect(view(configs)).toEqual([
      { trackId: 0, role: 'Soprano', partName: 'Soprano' },
      { trackId: 1, role: 'Piano', partName: 'Piano' },
      { trackId: 2, role: 'Percussion', partName: 'Percussion' },
      { trackId: 3, role: 'Excluded', partName: '' },
    ]);
    expect(configs[2].instrument).toBe('woodblock');
  });

  it('defaults voice parts to clarinet when MIDI GM program is piano (0)', () => {
    const tracks = [
      track(0, 'Soprano', [72], { instrumentNumber: 0 }),
      track(1, 'Alto', [67], { instrumentNumber: 0 }),
      track(2, 'Tenor', [55], { instrumentNumber: 0 }),
      track(3, 'Bass', [43], { instrumentNumber: 0 }),
    ];
    const configs = assignParts(tracks, 'mixed');
    expect(configs.map((c) => c.instrument)).toEqual([
      'clarinet',
      'clarinet',
      'clarinet',
      'clarinet',
    ]);
  });

  it('treats all-piano-labeled voice tracks as choir parts, not accompaniment', () => {
    const tracks = [
      track(0, 'Piano', [76], { instrumentNumber: 0 }),
      track(1, 'Piano', [72], { instrumentNumber: 0 }),
      track(2, 'Piano', [67], { instrumentNumber: 0 }),
      track(3, 'Piano', [55], { instrumentNumber: 0 }),
      track(4, 'Piano', [43], { instrumentNumber: 0 }),
    ];
    const configs = assignParts(tracks, 'mixed');
    expect(configs.map((c) => c.role)).toEqual([
      'Soprano',
      'Soprano',
      'Alto',
      'Tenor',
      'Bass',
    ]);
    expect(configs.filter((c) => c.role !== 'Excluded').every((c) => c.instrument === 'clarinet')).toBe(true);
  });

  it('keeps a single named Piano track as accompaniment when voices are present', () => {
    const tracks = [
      track(0, 'Soprano', [72]),
      track(1, 'Alto', [67]),
      track(2, 'Tenor', [55]),
      track(3, 'Bass', [43]),
      track(4, 'Piano', [48, 55], { instrumentNumber: 0 }),
    ];
    const configs = assignParts(tracks, 'mixed');
    expect(configs[4]).toMatchObject({ role: 'Piano', instrument: 'piano' });
    expect(configs.slice(0, 4).every((c) => c.instrument === 'clarinet')).toBe(true);
  });
});

describe('assignParts (men 3/4-part)', () => {
  it('men3 = Tenor / Baritone / Bass (unnamed → track order)', () => {
    const tracks = [track(0, 'A', [60]), track(1, 'B', [52]), track(2, 'C', [43])];
    expect(view(assignParts(tracks, 'men3'))).toEqual([
      { trackId: 0, role: 'Tenor', partName: 'Tenor' },
      { trackId: 1, role: 'Baritone', partName: 'Baritone' },
      { trackId: 2, role: 'Bass', partName: 'Bass' },
    ]);
  });

  it('men4 splits Tenor into Tenor1/Tenor2 (top/second)', () => {
    const tracks = [
      track(0, 'Top Tenor', [67]),
      track(1, 'Second Tenor', [62]),
      track(2, 'Baritone', [52]),
      track(3, 'Bass', [43]),
    ];
    expect(view(assignParts(tracks, 'men4'))).toEqual([
      { trackId: 0, role: 'Tenor', partName: 'Top Tenor' },
      { trackId: 1, role: 'Tenor', partName: 'Second Tenor' },
      { trackId: 2, role: 'Baritone', partName: 'Baritone' },
      { trackId: 3, role: 'Bass', partName: 'Bass' },
    ]);
  });
});

describe('assignParts (women 3/4-part)', () => {
  it('women3 = Soprano / MezzoSoprano / Alto (named)', () => {
    const tracks = [
      track(0, 'Soprano', [76]),
      track(1, 'Mezzo Soprano', [69]),
      track(2, 'Alto', [62]),
    ];
    expect(view(assignParts(tracks, 'women3'))).toEqual([
      { trackId: 0, role: 'Soprano', partName: 'Soprano' },
      { trackId: 1, role: 'MezzoSoprano', partName: 'MezzoSoprano' },
      { trackId: 2, role: 'Alto', partName: 'Alto' },
    ]);
  });

  it('women4 = Soprano1/Soprano2/Alto1/Alto2 (unnamed → track order)', () => {
    const tracks = [track(0, 'A', [79]), track(1, 'B', [74]), track(2, 'C', [67]), track(3, 'D', [60])];
    expect(view(assignParts(tracks, 'women4'))).toEqual([
      { trackId: 0, role: 'Soprano', partName: 'Soprano1' },
      { trackId: 1, role: 'Soprano', partName: 'Soprano2' },
      { trackId: 2, role: 'Alto', partName: 'Alto1' },
      { trackId: 3, role: 'Alto', partName: 'Alto2' },
    ]);
  });
});

describe('renumberByRole', () => {
  it('renumbers within a role by track order after a manual role change', () => {
    const tracks = [
      track(0, 'A', [48]),
      track(1, 'B', [60]),
      track(2, 'C', [72]),
    ];
    // user forced all three to Bass; numbering follows track order (top to bottom)
    const configs = tracks.map((t) => ({
      trackId: t.id,
      role: 'Bass' as const,
      partName: 'Bass',
      instrument: 'clarinet' as const,
    }));
    expect(view(renumberByRole(tracks, configs))).toEqual([
      { trackId: 0, role: 'Bass', partName: 'Bass1' },
      { trackId: 1, role: 'Bass', partName: 'Bass2' },
      { trackId: 2, role: 'Bass', partName: 'Bass3' },
    ]);
  });
});
