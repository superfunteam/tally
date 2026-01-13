import { useCallback, useRef } from 'react';

interface UseCameraOptions {
  accept?: string;
  multiple?: boolean;
  onCapture?: (files: File[]) => void;
}

export function useCamera(options: UseCameraOptions = {}) {
  const {
    accept = 'image/*',
    multiple = true,
    onCapture,
  } = options;

  const inputRef = useRef<HTMLInputElement | null>(null);

  const createInput = useCallback((capture: boolean) => {
    // Remove existing input if any
    if (inputRef.current) {
      inputRef.current.remove();
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple && !capture;
    input.style.display = 'none';

    if (capture) {
      input.setAttribute('capture', 'environment');
    }

    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const files = Array.from(target.files || []);
      if (files.length > 0) {
        onCapture?.(files);
      }
      // Clean up
      input.remove();
      inputRef.current = null;
    };

    document.body.appendChild(input);
    inputRef.current = input;

    return input;
  }, [accept, multiple, onCapture]);

  const openCamera = useCallback(() => {
    const input = createInput(true);
    input.click();
  }, [createInput]);

  const openGallery = useCallback(() => {
    const input = createInput(false);
    input.click();
  }, [createInput]);

  return {
    openCamera,
    openGallery,
  };
}
