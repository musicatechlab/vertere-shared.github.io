import { describe, expect, it } from 'vitest';
import type { AppState, TrackConfig } from '../../core/types.ts';
import { ALL_PART_NAME, getPartGroups } from './download-button.ts';

function makeState(trackConfigs: TrackConfig[]): AppState {
  // getPartGroups は state.trackConfigs のみ参照する
  return { trackConfigs } as unknown as AppState;
}

describe('getPartGroups', () => {
  it('groups same-named tracks and appends an All group when 2+ parts exist', () => {
    const groups = getPartGroups(makeState([
      { trackId: 0, role: 'Soprano', partName: 'Soprano', instrument: 'clarinet' },
      { trackId: 1, role: 'Bass', partName: 'Bass', instrument: 'clarinet' },
      { trackId: 2, role: 'Bass', partName: 'Bass', instrument: 'clarinet' },
      { trackId: 3, role: 'Piano', partName: 'Piano', instrument: 'piano' },
      { trackId: 4, role: 'Excluded', partName: '', instrument: 'piano' },
    ]));

    expect(groups).toEqual([
      { partName: 'Soprano', trackIds: [0], mode: 'solo' },
      { partName: 'Bass', trackIds: [1, 2], mode: 'solo' },
      { partName: 'Piano', trackIds: [3], mode: 'solo' },
      { partName: ALL_PART_NAME, trackIds: [0, 1, 2, 3], mode: 'all' },
    ]);
  });

  it('does not add an All group when there is only one part', () => {
    const groups = getPartGroups(makeState([
      { trackId: 0, role: 'Soprano', partName: 'Soprano', instrument: 'clarinet' },
      { trackId: 1, role: 'Excluded', partName: '', instrument: 'piano' },
    ]));

    expect(groups).toEqual([
      { partName: 'Soprano', trackIds: [0], mode: 'solo' },
    ]);
  });

  it('returns no groups when every track is excluded', () => {
    const groups = getPartGroups(makeState([
      { trackId: 0, role: 'Excluded', partName: '', instrument: 'piano' },
    ]));

    expect(groups).toEqual([]);
  });
});
