interface VolumeControlOptions {
  slider: HTMLInputElement;
  onChange: (percent: number) => void;
}

export function setupVolumeControl(options: VolumeControlOptions): void {
  const { slider, onChange } = options;
  slider.addEventListener('input', () => {
    const percent = Number(slider.value);
    if (Number.isFinite(percent)) {
      onChange(percent);
    }
  });
}
