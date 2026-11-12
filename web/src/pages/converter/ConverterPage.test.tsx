import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConverterPage } from './ConverterPage.tsx';

const CONFIG = {
  presets: [{ name: 'JPG_70', ppi: 70, format: 'jpg' }],
  variants: ['NoGrid', 'Grid'],
  maxUploadBytes: 1000,
  maxTotalUploadBytes: 2000,
  maxLevels: 10,
  maxLogoBytes: 1000,
  maxOutputPixels: 250_000_000,
  logo: {
    size: { min: 2, max: 20, step: 1, default: 10 },
    margin: { min: 0, max: 5, step: 0.5, default: 3 },
  },
};

describe('ConverterPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('introduces the converter above its form and names the tab', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify(CONFIG), {
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      ),
    );

    render(<ConverterPage />);
    const format = await screen.findByRole('button', { name: /JPG · 70 px/ });

    const title = screen.getByRole('heading', {
      level: 1,
      name: 'Dungeondraft Converter',
    });
    expect(
      title.compareDocumentPosition(format) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(format.closest('form')).not.toBeNull();
    expect(document.title).toBe('Converter · Lair of Artificer');
  });
});
