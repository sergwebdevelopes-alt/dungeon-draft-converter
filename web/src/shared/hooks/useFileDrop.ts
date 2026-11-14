import { useEffect, useState, type DragEvent } from 'react';

function useFileDrop(disabled: boolean, onFiles: (files: File[]) => void) {
  const [over, setOver] = useState(false);

  return {
    over: over && !disabled,
    handlers: {
      onDragOver(event: DragEvent) {
        event.preventDefault();
        setOver(true);
      },
      onDragLeave(event: DragEvent) {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOver(false);
        }
      },
      onDrop(event: DragEvent) {
        event.preventDefault();
        setOver(false);
        const files = [...event.dataTransfer.files];
        if (!disabled && files.length > 0) {
          onFiles(files);
        }
      },
    },
  };
}

function usePreventPageDrop() {
  useEffect(() => {
    const prevent = (event: Event) => event.preventDefault();
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);
}

export { useFileDrop, usePreventPageDrop };
