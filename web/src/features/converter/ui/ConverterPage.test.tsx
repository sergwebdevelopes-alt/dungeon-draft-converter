import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '../model/types.ts';
import { ConverterPage } from './ConverterPage.tsx';

const CONFIG: Config = {
  presets: [
    { name: 'JPG_70', ppi: 70, format: 'jpg' },
    { name: 'WEBP_140', ppi: 140, format: 'webp' },
  ],
  variants: ['NoGrid', 'Grid'],
  maxUploadBytes: 1000,
  maxTotalUploadBytes: 2000,
  maxLevels: 10,
  maxLogoBytes: 1000,
  logo: {
    size: { min: 2, max: 20, step: 1, default: 10 },
    margin: { min: 0, max: 5, step: 0.5, default: 3 },
  },
};

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockServer() {
  const fetchMock = vi.fn((url: string) => {
    if (url === '/api/config') {
      return Promise.resolve(json(CONFIG));
    }
    if (url.startsWith('/api/convert')) {
      return Promise.resolve(new Response(new Blob(['zip'])));
    }
    return Promise.resolve(json({ state: 'unknown' }));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function mapFile(name = 'Cave.dd2vtt', size = 10): File {
  return new File(['x'.repeat(size)], name);
}

async function renderPage() {
  render(<ConverterPage />);
  await screen.findByRole('checkbox', { name: /JPG · 70 px/ });
}

function mapInput(): HTMLInputElement {
  return document.querySelector('input[accept=".dd2vtt"]')!;
}

describe('ConverterPage', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.assign(URL, {
      createObjectURL: vi.fn(() => 'blob:zip'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      () => undefined,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('disables Convert until a map is added', async () => {
    mockServer();
    await renderPage();

    const convert = screen.getByRole('button', { name: 'Convert & download' });
    expect(convert).toBeDisabled();

    await userEvent.upload(mapInput(), mapFile());

    expect(screen.getByText('Cave.dd2vtt')).toBeInTheDocument();
    expect(convert).toBeEnabled();
  });

  it('disables Convert when no format is chosen', async () => {
    mockServer();
    await renderPage();
    await userEvent.upload(mapInput(), mapFile());

    await userEvent.click(
      screen.getByRole('checkbox', { name: /JPG · 70 px/ }),
    );
    await userEvent.click(
      screen.getByRole('checkbox', { name: /WEBP · 140 px/ }),
    );

    expect(
      screen.getByRole('button', { name: 'Convert & download' }),
    ).toBeDisabled();
  });

  it('rejects files that are not .dd2vtt', async () => {
    mockServer();
    await renderPage();

    await userEvent.upload(mapInput(), mapFile('notes.txt'), {
      applyAccept: false,
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      '"notes.txt" is not a .dd2vtt file.',
    );
  });

  it('rejects maps over the size limit', async () => {
    mockServer();
    await renderPage();

    await userEvent.upload(mapInput(), mapFile('Huge.dd2vtt', 1001));

    expect(screen.getByRole('alert')).toHaveTextContent(
      '"Huge.dd2vtt" is too large',
    );
  });

  it('converts and offers the zip again', async () => {
    const fetchMock = mockServer();
    await renderPage();
    await userEvent.upload(mapInput(), mapFile());

    await userEvent.click(
      screen.getByRole('button', { name: 'Convert & download' }),
    );

    expect(
      await screen.findByRole('button', { name: 'Download again' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Cave.zip is ready.');

    const convertUrl = fetchMock.mock.calls
      .map(([url]) => url)
      .find((url) => url.startsWith('/api/convert'));
    expect(convertUrl).toBeDefined();
    const params = new URL(convertUrl!, 'http://test').searchParams;
    expect(params.get('presets')).toBe('JPG_70,WEBP_140');
    expect(params.get('variants')).toBe('NoGrid,Grid');
  });

  it('shows the server error when conversion fails', async () => {
    const fetchMock = mockServer();
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url === '/api/config'
          ? json(CONFIG)
          : new Response(JSON.stringify({ error: 'Map is broken.' }), {
              status: 400,
            }),
      ),
    );
    await renderPage();
    await userEvent.upload(mapInput(), mapFile());

    await userEvent.click(
      screen.getByRole('button', { name: 'Convert & download' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Map is broken.',
    );
  });

  it('does not show the old storage footnote', async () => {
    mockServer();
    await renderPage();

    expect(screen.queryByText(/never stored on the server/)).toBeNull();
  });
});
