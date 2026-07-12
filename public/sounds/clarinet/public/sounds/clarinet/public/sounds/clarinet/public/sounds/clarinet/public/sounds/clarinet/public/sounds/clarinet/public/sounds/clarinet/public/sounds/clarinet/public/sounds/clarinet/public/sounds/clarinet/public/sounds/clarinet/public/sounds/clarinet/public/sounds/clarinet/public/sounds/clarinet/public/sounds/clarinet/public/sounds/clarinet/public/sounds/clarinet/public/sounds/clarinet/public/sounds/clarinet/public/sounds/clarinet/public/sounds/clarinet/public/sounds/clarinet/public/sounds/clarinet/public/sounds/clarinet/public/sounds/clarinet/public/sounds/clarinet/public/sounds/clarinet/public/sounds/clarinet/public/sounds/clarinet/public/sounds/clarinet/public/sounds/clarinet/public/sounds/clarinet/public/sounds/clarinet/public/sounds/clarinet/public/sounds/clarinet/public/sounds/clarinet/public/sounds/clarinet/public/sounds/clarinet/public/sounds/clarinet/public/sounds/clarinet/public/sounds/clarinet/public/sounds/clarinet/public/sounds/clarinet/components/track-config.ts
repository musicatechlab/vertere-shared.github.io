import type { ChoirType, InstrumentChoice, PartRole } from '../../core/types.ts';

interface TrackConfigChangeHandlers {
  onRoleChange: (trackId: number, role: PartRole) => void;
  onInstrumentChange: (trackId: number, instrument: InstrumentChoice) => void;
  onPartNameChange: (trackId: number, name: string) => void;
  onChoirTypeChange: (choirType: ChoirType) => void;
}

function parseTrackId(element: HTMLElement): number | null {
  const raw = element.dataset.trackId;
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

export function bindTrackConfigHandlers(
  container: HTMLElement,
  handlers: TrackConfigChangeHandlers
): void {
  container.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;

    if (target.classList.contains('js-choir-type-select')) {
      handlers.onChoirTypeChange(target.value as ChoirType);
      return;
    }

    const trackId = parseTrackId(target);
    if (trackId === null) return;

    if (target.classList.contains('js-role-select')) {
      handlers.onRoleChange(trackId, target.value as PartRole);
      return;
    }
    if (target.classList.contains('js-instrument-select')) {
      handlers.onInstrumentChange(trackId, target.value as InstrumentChoice);
    }
  });

  container.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.classList.contains('js-part-name-input')) return;
    const trackId = parseTrackId(target);
    if (trackId === null) return;
    handlers.onPartNameChange(trackId, target.value);
  });
}
