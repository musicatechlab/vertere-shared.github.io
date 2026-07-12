import { describe, expect, it } from 'vitest';
import type { AppState, ParsedMidi } from '../core/types.ts';
import {
  addGeneratedPart,
  createDefaultTrackConfigs,
  createInitialAppState,
  resetGeneration,
  setBackgroundVolume,
  setChoirType,
  setParsedMidi,
  setProgress,
  setTrackPartName,
  updateTrackConfig,
} from './app-state.ts';

function makeParsedMidi(): ParsedMidi {
  return {
    fileName: 'demo',
    durationSeconds: 10,
    bpm: 120,
    tracks: [
      {
        id: 0,
        name: 'Soprano',
        channel: 0,
        notes: [{ midi: 60, time: 0, duration: 0.5, velocity: 0.8 }],
        instrumentNumber: 71,
        sourceFileName: 'demo.mid',
      },
      {
        id: 1,
        name: 'Piano',
        channel: 1,
        notes: [{ midi: 48, time: 0, duration: 1, velocity: 0.9 }],
        instrumentNumber: 0,
        sourceFileName: 'demo.mid',
      },
      {
        id: 2,
        name: 'Drums',
        channel: 9,
        notes: [{ midi: 35, time: 0, duration: 0.2, velocity: 1 }],
        instrumentNumber: 115,
        sourceFileName: 'demo.mid',
      },
    ],
  };
}

describe('app-state', () => {
  it('creates initial state', () => {
    const state = createInitialAppState();
    expect(state.parsedMidi).toBeNull();
    expect(state.trackConfigs).toEqual([]);
    expect(state.backgroundVolumePercent).toBe(50);
    expect(state.choirType).toBe('mixed');
    expect(state.progress.phase).toBe('idle');
    expect(state.generatedParts).toEqual([]);
  });

  it('infers default track configs from parsed midi tracks', () => {
    const parsedMidi = makeParsedMidi();
    const configs = createDefaultTrackConfigs(parsedMidi);

    expect(configs).toEqual([
      { trackId: 0, role: 'Soprano', partName: 'Soprano', instrument: 'clarinet' },
      { trackId: 1, role: 'Piano', partName: 'Piano', instrument: 'piano' },
      { trackId: 2, role: 'Percussion', partName: 'Percussion', instrument: 'woodblock' },
    ]);
  });

  it('sets parsed midi and resets generation state', () => {
    const initial = createInitialAppState();
    const withPart: AppState = {
      ...initial,
      generatedParts: [{ partName: 'Soprano', fileName: 'x.mp3', mp3Blob: new Blob() }],
      progress: { ...initial.progress, phase: 'done' },
    };

    const next = setParsedMidi(withPart, makeParsedMidi());

    expect(next.parsedMidi?.fileName).toBe('demo');
    expect(next.trackConfigs).toHaveLength(3);
    expect(next.generatedParts).toEqual([]);
    expect(next.progress.phase).toBe('idle');
  });

  it('updates one track config immutably', () => {
    const initial = setParsedMidi(createInitialAppState(), makeParsedMidi());
    const next = updateTrackConfig(initial, 0, { instrument: 'piano' });

    expect(next.trackConfigs[0]).toEqual({ trackId: 0, role: 'Soprano', partName: 'Soprano', instrument: 'piano' });
    expect(next.trackConfigs[1]).toEqual(initial.trackConfigs[1]);
  });

  it('renumbers part names within a role after a manual role change', () => {
    const initial = setParsedMidi(createInitialAppState(), makeParsedMidi());
    // move the Piano track (id 1) into the Soprano role -> two sopranos -> numbered
    const next = updateTrackConfig(initial, 1, { role: 'Soprano' });

    const soprano = next.trackConfigs.filter((c) => c.role === 'Soprano');
    expect(soprano.map((c) => c.partName).sort()).toEqual(['Soprano1', 'Soprano2']);
    expect(soprano.every((c) => c.instrument === 'clarinet')).toBe(true);
  });

  it('clamps background volume to 0-100', () => {
    const initial = createInitialAppState();
    const high = setBackgroundVolume(initial, 200);
    const low = setBackgroundVolume(initial, -10);

    expect(high.backgroundVolumePercent).toBe(100);
    expect(low.backgroundVolumePercent).toBe(0);
  });

  it('updates a single track part name and falls back to the role when cleared', () => {
    const initial = setParsedMidi(createInitialAppState(), makeParsedMidi());
    const renamed = setTrackPartName(initial, 0, 'ソプラノ（主旋律）');
    const fallback = setTrackPartName(renamed, 0, '   ');

    expect(renamed.trackConfigs[0].partName).toBe('ソプラノ（主旋律）');
    expect(fallback.trackConfigs[0].partName).toBe('Soprano');
  });

  it('reassigns tracks when the choir type changes', () => {
    const initial = setParsedMidi(createInitialAppState(), makeParsedMidi());
    const men = setChoirType(initial, 'men3');

    expect(men.choirType).toBe('men3');
    // the single soprano-named voice track gets redistributed into a men's voice
    const voiceRoles = men.trackConfigs
      .filter((c) => c.role !== 'Excluded' && c.role !== 'Piano' && c.role !== 'Percussion')
      .map((c) => c.role);
    expect(voiceRoles.every((r) => r === 'Tenor' || r === 'Baritone' || r === 'Bass')).toBe(true);
  });

  it('updates progress and manages generated parts', () => {
    let state = createInitialAppState();
    state = setProgress(state, { phase: 'encoding', partProgress: 25 });
    expect(state.progress.phase).toBe('encoding');
    expect(state.progress.partProgress).toBe(25);

    state = addGeneratedPart(state, {
      partName: 'Alto',
      fileName: 'alto.mp3',
      mp3Blob: new Blob([new Uint8Array([1, 2])]),
    });
    expect(state.generatedParts).toHaveLength(1);

    state = resetGeneration(state);
    expect(state.generatedParts).toEqual([]);
    expect(state.progress.phase).toBe('idle');
  });
});
