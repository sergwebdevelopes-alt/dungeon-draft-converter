import { ConverterForm } from '@/features/converter/index.ts';
import { Container } from '@/shared/ui/Container.tsx';
import { usePageTitle } from '@/shared/hooks/usePageTitle.ts';
import { SITE_PAGES } from '@contracts/site-pages.ts';

function ConverterPage() {
  usePageTitle(SITE_PAGES['/converter'].title);

  return (
    <Container className="grid gap-5 pt-6 pb-40 sm:pt-8 lg:pb-12">
      <header className="grid gap-1">
        <h1 className="font-display text-3xl font-bold tracking-wide sm:text-4xl">
          Dungeondraft Converter
        </h1>
        <p className="text-muted">
          Turn <code>.dd2vtt</code> exports into images for your virtual
          tabletop or printer.
        </p>
      </header>

      <ConverterForm />
    </Container>
  );
}

export { ConverterPage };
