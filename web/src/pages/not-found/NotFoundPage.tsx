import { Link } from 'react-router';
import { Container } from '@/shared/ui/Container.tsx';
import { usePageTitle } from '@/shared/hooks/usePageTitle.ts';
import { NOT_FOUND_PAGE } from '@contracts/site-pages.ts';

function NotFoundPage() {
  usePageTitle(NOT_FOUND_PAGE.title);

  return (
    <Container className="grid max-w-xl gap-4 py-16">
      <h1 className="font-display text-3xl font-bold tracking-wide">
        This passage leads nowhere
      </h1>
      <p className="text-muted">
        The page you were looking for doesn't exist or has moved.
      </p>
      <Link to="/" className="w-fit font-bold text-brand-text hover:underline">
        Back to the home page
      </Link>
    </Container>
  );
}

export { NotFoundPage };
