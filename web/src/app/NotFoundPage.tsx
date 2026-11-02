import { Link } from 'react-router';
import { PageTitle } from '../shared/ui/PageTitle.tsx';

function NotFoundPage() {
  return (
    <section className="grid max-w-xl gap-4 py-10">
      <PageTitle title="Page not found" />
      <h1 className="font-display text-3xl font-bold tracking-wide">
        This passage leads nowhere
      </h1>
      <p className="text-muted">
        The page you were looking for doesn't exist or has moved.
      </p>
      <Link to="/" className="w-fit font-bold text-brand-text hover:underline">
        Back to the home page
      </Link>
    </section>
  );
}

export { NotFoundPage };
