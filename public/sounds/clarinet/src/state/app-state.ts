import {
  DEFAULT_BACKGROUND_VOLUME,
  DEFAULT_CHOIR_TYPE,
  DEFAULT_INSTRUMENT_FOR_ROLE,
  INITIAL_PROGRESS,
} from '../core/constants.ts';
import { assignParts, renumberByRole } from '../core/part-assignment.ts';
import type { AppState, ChoirType, GeneratedPart, ParsedMidi, ProgressState, TrackConfig } from '../core/types.ts';
import type { Language } from '../core/i18n.ts';

export const INITIAL_APP_STATE: AppState = {
  language: 'ja',
  parsedMidi: null,
  choirType: DEFAULT_CHOIR_TYPE,
  trackConfigs: [],
  backgroundVolumePercent: DEFAULT_BACKGROUND_VOLUME,
  progress: { ...INITIAL_PROGRESS },
  generatedParts: [],
};

export function createDefaultTrackConfigs(parsedMidi: ParsedMidi, choirType: ChoirType = DEFAULT_CHOIR_TYPE): TrackConfig[] {
  return assignParts(parsedMidi.tracks, choirType);
}

export function createInitialAppState(language: Language = 'ja'): AppState {
  return { ...INITIAL_APP_STATE, language };
}

export function setLanguage(state: AppState, language: Language): AppState {
  return { ...state, language };
}

export function setParsedMidi(state: AppState, parsedMidi: ParsedMidi): AppState {
  return {
    ...state,
    parsedMidi,
    trackConfigs: createDefaultTrackConfigs(parsedMidi, state.choirType),
    progress: { ...INITIAL_PROGRESS },
    generatedParts: [],
  };
}

/** 合唱種別を変更し、トラック割り当てを再計算する */
export function setChoirType(state: AppState, choirType: ChoirType): AppState {
  if (!state.parsedMidi) {
    return { ...state, choirType };
  }
  return {
    ...state,
    choirType,
    trackConfigs: assignParts(state.parsedMidi.tracks, choirType),
    progress: { ...INITIAL_PROGRESS },
    generatedParts: [],
  };
}

export function updateTrackConfig(state: AppState, trackId: number, patch: Partial<Omit<TrackConfig, 'trackId'>>): AppState {
  const trackConfigs = state.trackConfigs.map((config) => {
    if (config.trackId !== trackId) return config;
    const next: TrackConfig = { ...config, ...patch, trackId: config.trackId };
    if (patch.role !== undefined) {
      next.instrument = DEFAULT_INSTRUMENT_FOR_ROLE[patch.role];
    }
    return next;
  });
  // ロール変更時は、既存ロールを尊重したままパート名を自動採番し直す
  const shouldRenumber = patch.role !== undefined && state.parsedMidi !== null;
  return {
    ...state,
    trackConfigs: shouldRenumber
      ? renumberByRole(state.parsedMidi!.tracks, trackConfigs)
      : trackConfigs,
  };
}

export function setBackgroundVolume(state: AppState, percent: number): AppState {
  const clamped = Math.max(0, Math.min(100, percent));
  return {
    ...state,
    backgroundVolumePercent: clamped,
  };
}

/** 1トラックのパート名を上書きする（空にした場合はロール名へフォールバック） */
export function setTrackPartName(state: AppState, trackId: number, name: string): AppState {
  const trimmed = name.trim();
  return {
    ...state,
    trackConfigs: state.trackConfigs.map((config) => (
      config.trackId === trackId
        ? { ...config, partName: trimmed.length > 0 ? trimmed : String(config.role) }
        : config
    )),
  };
}

export function setProgress(state: AppState, progressPatch: Partial<ProgressState>): AppState {
  return {
    ...state,
    progress: {
      ...state.progress,
      ...progressPatch,
    },
  };
}

export function addGeneratedPart(state: AppState, part: GeneratedPart): AppState {
  return {
    ...state,
    generatedParts: [...state.generatedParts, part],
  };
}

export function resetGeneration(state: AppState): AppState {
  return {
    ...state,
    progress: { ...INITIAL_PROGRESS },
    generatedParts: [],
  };
}
