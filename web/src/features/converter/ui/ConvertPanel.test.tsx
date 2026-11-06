import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConvertPanel } from './ConvertPanel.tsx';
import type { Status } from '../model/progress.ts';

function renderPanel(status: Status, canSubmit = true, foundry = false) {
  const handlers = {
    onCancel: vi.fn(),
    onDownloadAgain: vi.fn(),
    onReset: vi.fn(),
  };
  render(
    <form>
      <ConvertPanel
        status={status}
        canSubmit={canSubmit}
        mapCount={2}
        imageCount={4}
        foundry={foundry}
        {...handlers}
      />
    </form>,
  );
  return handlers;
}

describe('ConvertPanel', () => {
  it('summarises the download', () => {
    renderPanel({ kind: 'idle' });

    expect(
      screen.getByRole('complementary', { name: 'Conversion' }),
    ).toHaveTextContent('2 maps · 4 images');
    expect(
      screen.getByRole('complementary', { name: 'Conversion' }),
    ).not.toHaveTextContent('Foundry');
  });

  it('mentions the Foundry file when it is part of the download', () => {
    renderPanel({ kind: 'idle' }, true, true);

    expect(
      screen.getByRole('complementary', { name: 'Conversion' }),
    ).toHaveTextContent('2 maps · 4 images + Foundry file');
  });

  it('shows no summary before maps are added', () => {
    render(
      <ConvertPanel
        status={{ kind: 'idle' }}
        canSubmit={false}
        mapCount={0}
        imageCount={0}
        foundry={false}
        onCancel={vi.fn()}
        onDownloadAgain={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('complementary', { name: 'Conversion' }),
    ).not.toHaveTextContent(/map/);
  });

  it('disables Convert until the form is ready', () => {
    renderPanel({ kind: 'idle' }, false);

    expect(
      screen.getByRole('button', { name: 'Convert & download' }),
    ).toBeDisabled();
  });

  it('enables Convert as a submit button', () => {
    renderPanel({ kind: 'idle' });

    const button = screen.getByRole('button', { name: 'Convert & download' });
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('shows progress and lets the user cancel', async () => {
    const { onCancel } = renderPanel({
      kind: 'converting',
      startedAt: Date.now() - 65_000,
      ticket: 'a',
      progress: { state: 'waiting', ahead: 2 },
    });

    expect(screen.getByRole('status')).toHaveTextContent(
      'Waiting in line: 2 maps ahead of yours',
    );
    expect(screen.getByRole('status')).toHaveTextContent('1:05');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows an error', () => {
    renderPanel({ kind: 'error', message: 'Something broke.' });

    expect(screen.getByRole('alert')).toHaveTextContent('Something broke.');
    expect(
      screen.getByRole('button', { name: 'Convert & download' }),
    ).toBeInTheDocument();
  });

  it('offers to download again or start over when done', async () => {
    const { onDownloadAgain, onReset } = renderPanel({
      kind: 'done',
      url: 'blob:x',
      fileName: 'Cave.zip',
    });

    expect(screen.getByRole('status')).toHaveTextContent('Cave.zip is ready.');
    await userEvent.click(
      screen.getByRole('button', { name: 'Download again' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Convert another map' }),
    );
    expect(onDownloadAgain).toHaveBeenCalledOnce();
    expect(onReset).toHaveBeenCalledOnce();
  });
});
