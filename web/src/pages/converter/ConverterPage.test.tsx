import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONVERTER_FAQ } from '@contracts/converter-guide.ts';
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
    expect(document.title).toBe(
      'Free dd2vtt Converter for Dungeondraft · Lair of Artificer',
    );
  });

  it('explains below the form how the converter works, in three steps', () => {
    render(<ConverterPage />);

    const steps = within(
      screen.getByRole('region', { name: 'How the converter works' }),
    );
    expect(
      steps
        .getAllByRole('heading', { level: 3 })
        .map((step) => step.textContent),
    ).toEqual([
      'Export from Dungeondraft',
      'Drop your maps',
      'Pick formats and download',
    ]);
    const form = document.querySelector('form')!;
    expect(
      form.compareDocumentPosition(steps.getByText('Step 1')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('answers every question that it gives to search engines', () => {
    render(<ConverterPage />);

    const questions = within(
      screen.getByRole('region', {
        name: 'Questions about converting .dd2vtt maps',
      }),
    );
    expect(
      questions.getAllByRole('term').map((question) => question.textContent),
    ).toEqual(CONVERTER_FAQ.map((entry) => entry.question));
    expect(
      questions.getAllByRole('definition').map((answer) => answer.textContent),
    ).toEqual(CONVERTER_FAQ.map((entry) => entry.answer));
  });
});
