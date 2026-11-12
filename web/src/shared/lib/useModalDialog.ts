import { useLayoutEffect, useRef } from 'react';

function useModalDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  return dialogRef;
}

export { useModalDialog };
