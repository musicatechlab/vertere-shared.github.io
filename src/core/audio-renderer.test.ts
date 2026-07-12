import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ParsedMidi, TrackConfig } from './types.ts';
import { renderAllPartsAudio, renderPartAudio } from './audio-renderer.ts';

const toneMockState = vi.hoisted(() => ({
  loadedCalls: 0,
  offlineArgs: null as null | { duration: number; channels: number; sampleRate: number },
  gainValues: [] as number[],
  samplerUrls: [] as Array<Record<string, string>>,
  triggerCalls: [] as Array<{ noteName: string; duration: number; time: number; velocity: number }>,
  throwOnNoteName: null as string | null,
  returnBuffer: { kind: 'mock-audio-buffer' } as unknown,
}));

vi.mock('tone', () => {
  class MockGain {
    constructor(value: number) {
      toneMockState.gainValues.push(value);
    }

    toDestination(): this {
      return this;
    }
  }

  class MockSampler {
    constructor(options: { urls: Record<string, string> }) {
      toneMockState.samplerUrls.push(options.urls);
    }

    connect(_gainNode: MockGain): this {
      return this;
    }

    triggerAttackRelease(
      noteName: string,
      duration: number,
      time: number,
      velocity: number
    ): void {
      if (toneMockState.throwOnNoteName === noteName) {
        throw new Error('out of range');
      }
      toneMockState.triggerCalls.push({ noteName, duration, time, velocity });
    }
  }

  return {
    Gain: MockGain,
    Sampler: MockSampler,
    loaded: vi.fn(async () => {
      toneMockState.loadedCalls += 1;
    }),
    Offline: vi.fn(async (
      callback: () => Promise<void> | void,
      duration: number,
      channels: number,
      sampleRate: number
    ) => {
      toneMockState.offlineArgs = { duration, channels, sampleRate };
      await callback();
      return {
        get: () => toneMockState.returnBuffer,
      };
    }),
  };
});

function makeParsedMidi(): ParsedMidi {
  return {
    fileName: 'demo',
    bpm: 120,
    durationSeconds: 10,
    tracks: [
      {
        id: 0,
        name: 'Soprano',
        channel: 0,
        instrumentNumber: 71,
        sourceFileName: 'demo.mid',
        notes: [
          { midi: 60, time: 1, duration: 0.01, velocity: 0.8 },
        ],
      },
      {
        id: 1,
        name: 'Alto',
        channel: 1,
        instrumentNumber: 71,
        sourceFileName: 'demo.mid',
        notes: [
          { midi: 62, time: 2, duration: 0.5, velocity: 0.7 },
        ],
      },
      {
        id: 2,
        name: 'Empty',
        channel: 2,
        instrumentNumber: 0,
        sourceFileName: 'demo.mid',
        notes: [],
      },
    ],
  };
}

describe('renderPartAudio', () => {
  beforeEach(() => {
    toneMockState.loadedCalls = 0;
    toneMockState.offlineArgs = null;
    toneMockState.gainValues = [];
    toneMockState.samplerUrls = [];
    toneMockState.triggerCalls = [];
    toneMockState.throwOnNoteName = null;
    toneMockState.returnBuffer = { kind: 'mock-audio-buffer' } as unknown;
  });

  it('renders target and background tracks with proper gain and note scheduling', async () => {
    const parsedMidi = makeParsedMidi();
    const trackConfigs: TrackConfig[] = [
      { trackId: 0, role: 'Soprano', partName: 'Soprano', instrument: 'clarinet' },
      { trackId: 1, role: 'Alto', partName: 'Alto', instrument: 'piano' },
      { trackId: 2, role: 'Excluded', partName: '', instrument: 'woodblock' },
    ];

    const result = await renderPartAudio(parsedMidi, trackConfigs, [0], 30, 48000);

    expect(result).toBe(toneMockState.returnBuffer);
    expect(toneMockState.offlineArgs).toEqual({
      duration: 10.5,
      channels: 2,
      sampleRate: 48000,
    });
    expect(toneMockState.loadedCalls).toBe(1);
    expect(toneMockState.gainValues).toEqual([1.0, 0.3]);
    expect(toneMockState.triggerCalls).toEqual([
      { noteName: 'C4', duration: 0.05, time: 1, velocity: 0.8 },
      { noteName: 'D4', duration: 0.5, time: 2, velocity: 0.7 },
    ]);
    expect(Object.keys(toneMockState.samplerUrls[0])).toContain('D3');
    // クラリネットは実音域 D3 以上のみ。低音バスは Sampler のピッチシフトで鳴らす。
    // 人工的な低音サンプル(D1/D2)は使わない（アタックが引き伸ばされ遅延の原因になるため）。
    expect(Object.keys(toneMockState.samplerUrls[0])).not.toContain('D1');
    expect(Object.keys(toneMockState.samplerUrls[0])).not.toContain('D2');
    expect(Object.keys(toneMockState.samplerUrls[1])).toContain('A0');
  });

  it('maps woodblock High(76)/Low(77) to two distinct pitches (C6 / C5)', async () => {
    const parsedMidi: ParsedMidi = {
      fileName: 'wb',
      bpm: 120,
      durationSeconds: 4,
      tracks: [
        {
          id: 0,
          name: 'Wood Block',
          channel: 9,
          instrumentNumber: 115,
          sourceFileName: 'wb.mid',
          notes: [
            { midi: 76, time: 0, duration: 0.1, velocity: 0.9 },
            { midi: 77, time: 0.5, duration: 0.1, velocity: 0.7 },
          ],
        },
      ],
    };
    const trackConfigs: TrackConfig[] = [
      { trackId: 0, role: 'Percussion', partName: 'Percussion', instrument: 'woodblock' },
    ];

    await renderPartAudio(parsedMidi, trackConfigs, [0], 50);

    expect(toneMockState.triggerCalls.map((c) => c.noteName)).toEqual(['C6', 'C5']);
    const wbUrls = Object.keys(toneMockState.samplerUrls[0]);
    expect(wbUrls).toEqual(expect.arrayContaining(['C5', 'C6']));
  });

  it('mixes so that other voices / woodblock / piano each total to the background level', async () => {
    const parsedMidi: ParsedMidi = {
      fileName: 'demo',
      bpm: 120,
      durationSeconds: 5,
      tracks: [
        { id: 0, name: 'Solo', channel: 0, instrumentNumber: 71, sourceFileName: 'd.mid', notes: [{ midi: 67, time: 0, duration: 0.5, velocity: 0.8 }] },
        { id: 1, name: 'Other A', channel: 1, instrumentNumber: 71, sourceFileName: 'd.mid', notes: [{ midi: 62, time: 0, duration: 0.5, velocity: 0.8 }] },
        { id: 2, name: 'Other B', channel: 2, instrumentNumber: 71, sourceFileName: 'd.mid', notes: [{ midi: 55, time: 0, duration: 0.5, velocity: 0.8 }] },
        { id: 3, name: 'Piano', channel: 3, instrumentNumber: 0, sourceFileName: 'd.mid', notes: [{ midi: 48, time: 0, duration: 0.5, velocity: 0.8 }] },
        { id: 4, name: 'WB', channel: 9, instrumentNumber: 115, sourceFileName: 'd.mid', notes: [{ midi: 76, time: 0, duration: 0.5, velocity: 0.8 }] },
      ],
    };
    const trackConfigs: TrackConfig[] = [
      { trackId: 0, role: 'Soprano', partName: 'Soprano', instrument: 'clarinet' },
      { trackId: 1, role: 'Alto', partName: 'Alto', instrument: 'clarinet' },
      { trackId: 2, role: 'Tenor', partName: 'Tenor', instrument: 'clarinet' },
      { trackId: 3, role: 'Piano', partName: 'Piano', instrument: 'piano' },
      { trackId: 4, role: 'Percussion', partName: 'Percussion', instrument: 'woodblock' },
    ];

    await renderPartAudio(parsedMidi, trackConfigs, [0], 50);

    // solo=1.0, 他声部2本=各0.25(合計0.5), piano=0.5, woodblock=0.5 → 2:1:1:1
    expect(toneMockState.gainValues).toEqual([1.0, 0.25, 0.25, 0.5, 0.5]);
  });

  it('renderAllPartsAudio mixes all parts with voice:piano:woodblock = 1:1:1', async () => {
    const parsedMidi: ParsedMidi = {
      fileName: 'demo',
      bpm: 120,
      durationSeconds: 5,
      tracks: [
        { id: 0, name: 'Sop', channel: 0, instrumentNumber: 71, sourceFileName: 'd.mid', notes: [{ midi: 67, time: 0, duration: 0.5, velocity: 0.8 }] },
        { id: 1, name: 'Alto', channel: 1, instrumentNumber: 71, sourceFileName: 'd.mid', notes: [{ midi: 62, time: 0, duration: 0.5, velocity: 0.8 }] },
        { id: 2, name: 'Piano', channel: 3, instrumentNumber: 0, sourceFileName: 'd.mid', notes: [{ midi: 48, time: 0, duration: 0.5, velocity: 0.8 }] },
        { id: 3, name: 'WB', channel: 9, instrumentNumber: 115, sourceFileName: 'd.mid', notes: [{ midi: 76, time: 0, duration: 0.5, velocity: 0.8 }] },
      ],
    };
    const trackConfigs: TrackConfig[] = [
      { trackId: 0, role: 'Soprano', partName: 'Soprano', instrument: 'clarinet' },
      { trackId: 1, role: 'Alto', partName: 'Alto', instrument: 'clarinet' },
      { trackId: 2, role: 'Piano', partName: 'Piano', instrument: 'piano' },
      { trackId: 3, role: 'Percussion', partName: 'Percussion', instrument: 'woodblock' },
    ];

    await renderAllPartsAudio(parsedMidi, trackConfigs);

    // 声2本=各0.5(合計1.0), piano=1.0, woodblock=1.0 → 1:1:1
    expect(toneMockState.gainValues).toEqual([0.5, 0.5, 1.0, 1.0]);
  });

  it('ignores tracks without config and continues when sampler rejects out-of-range notes', async () => {
    const parsedMidi = makeParsedMidi();
    const trackConfigs: TrackConfig[] = [
      { trackId: 0, role: 'Soprano', partName: 'Soprano', instrument: 'clarinet' },
    ];
    toneMockState.throwOnNoteName = 'C4';

    await expect(
      renderPartAudio(parsedMidi, trackConfigs, [0], 50)
    ).resolves.toBe(toneMockState.returnBuffer);

    expect(toneMockState.gainValues).toEqual([1.0]);
    expect(toneMockState.triggerCalls).toEqual([]);
  });
});
