import { useId, useRef, type MouseEvent, type SyntheticEvent } from 'react';
import { useModalDialog } from '@/shared/hooks/useModalDialog.ts';
import { useScrollLock } from '@/shared/hooks/useScrollLock.ts';
import type { MapEntry } from '../model/catalog.ts';
import { MapView } from './MapView.tsx';

interface MapModalProps {
  map: MapEntry;
  morph: boolean;
  onClose: () => void;
}

function MapModal({ map, morph, onClose }: MapModalProps) {
  const dialogRef = useModalDialog();
  const titleId = useId();
  useScrollLock();
  const pressedBackdrop = useRef(false);

  function handleCancel(event: SyntheticEvent) {
    event.preventDefault();
    onClose();
  }

  function handleBackdropPress(event: MouseEvent) {
    pressedBackdrop.current = event.target === event.currentTarget;
  }

  function handleBackdropClick(event: MouseEvent) {
    if (pressedBackdrop.current && event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onMouseDown={handleBackdropPress}
      onClick={handleBackdropClick}
      className="m-auto h-dvh max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 text-text backdrop:bg-black/75 backdrop:backdrop-blur-sm sm:h-[min(92dvh,920px)] sm:w-[min(94vw,1280px)]"
    >
      <MapView
        map={map}
        morph={morph}
        titleId={titleId}
        inWindow
        onClose={onClose}
      />
    </dialog>
  );
}

export { MapModal };
