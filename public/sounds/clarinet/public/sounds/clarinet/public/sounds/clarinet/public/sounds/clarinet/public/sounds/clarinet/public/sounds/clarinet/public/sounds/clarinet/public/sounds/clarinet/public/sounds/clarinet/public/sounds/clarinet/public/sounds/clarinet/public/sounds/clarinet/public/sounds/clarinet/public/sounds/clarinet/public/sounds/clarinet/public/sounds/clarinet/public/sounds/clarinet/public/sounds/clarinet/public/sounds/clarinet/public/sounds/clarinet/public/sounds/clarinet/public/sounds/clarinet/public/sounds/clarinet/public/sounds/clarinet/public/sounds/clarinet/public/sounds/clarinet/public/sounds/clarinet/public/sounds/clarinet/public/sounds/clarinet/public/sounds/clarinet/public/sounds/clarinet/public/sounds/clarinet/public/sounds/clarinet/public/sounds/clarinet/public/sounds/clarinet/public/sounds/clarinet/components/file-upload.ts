import { t } from '../../core/i18n.ts';
interface FileUploadOptions {
  dropZone: HTMLElement;
  fileTags: HTMLElement;
  onFilesChanged: (files: File[]) => void;
  onValidationError?: (message: string) => void;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

function isMidiFile(file: File): boolean {
  return /\.(mid|midi)$/i.test(file.name);
}

function renderTags(container: HTMLElement, files: File[], onRemove: (index: number) => void): void {
  container.innerHTML = files.map((file, index) => `
    <span class="file-tag">
      ${file.name}
      <button type="button" class="file-tag__remove" data-index="${index}" aria-label="${t('upload.remove', file.name)}">×</button>
    </span>
  `).join('');

  container.querySelectorAll<HTMLButtonElement>('.file-tag__remove').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.index);
      if (Number.isFinite(index)) onRemove(index);
    });
  });
}

export function setupFileUpload(options: FileUploadOptions): void {
  const { dropZone, fileTags, onFilesChanged, onValidationError } = options;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.mid,.midi';
  input.multiple = true;
  input.classList.add('hidden');
  dropZone.insertAdjacentElement('afterend', input);

  let selectedFiles: File[] = [];

  const publish = (): void => {
    renderTags(fileTags, selectedFiles, (index) => {
      selectedFiles = selectedFiles.filter((_, i) => i !== index);
      publish();
    });
    onFilesChanged(selectedFiles);
  };

  const addFiles = (incoming: FileList | null): void => {
    if (!incoming) return;
    const candidateFiles = Array.from(incoming);
    const midiFiles = candidateFiles.filter(isMidiFile);
    if (midiFiles.length !== candidateFiles.length) {
      onValidationError?.('MIDIファイル（.mid / .midi）のみ選択できます');
    }
    if (midiFiles.length === 0) return;

    const oversized = midiFiles.find((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (oversized) {
      onValidationError?.(`ファイルサイズ上限（10MB）を超えています: ${oversized.name}`);
      return;
    }

    const existing = new Set(selectedFiles.map((f) => `${f.name}:${f.size}:${f.lastModified}`));
    for (const file of midiFiles) {
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (!existing.has(key)) {
        selectedFiles.push(file);
        existing.add(key);
      }
    }
    publish();
  };

  dropZone.addEventListener('click', () => input.click());
  dropZone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      input.click();
    }
  });
  input.addEventListener('change', () => addFiles(input.files));

  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('drop-zone--active');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drop-zone--active');
  });
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('drop-zone--active');
    addFiles(event.dataTransfer?.files ?? null);
  });
}
