import { StrictMode } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useModalDialog } from './useModalDialog.ts';

function Dialog() {
  const dialogRef = useModalDialog();

  return <dialog ref={dialogRef}>Hello</dialog>;
}

describe('useModalDialog', () => {
  it('opens the dialog as a modal once', () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');

    try {
      const { rerender, container } = render(<Dialog />);
      rerender(<Dialog />);

      expect(showModal).toHaveBeenCalledTimes(1);
      expect(container.querySelector('dialog')).toHaveAttribute('open');
    } finally {
      showModal.mockRestore();
    }
  });

  it('does not open a dialog that is already open when the effect runs again', () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');

    try {
      render(
        <StrictMode>
          <Dialog />
        </StrictMode>,
      );

      expect(showModal).toHaveBeenCalledTimes(1);
    } finally {
      showModal.mockRestore();
    }
  });
});
