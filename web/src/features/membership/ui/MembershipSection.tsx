import type { MembershipPlan } from '../../../shared/config/site.ts';
import { Container } from '../../../shared/ui/Container.tsx';
import { ExternalLink } from '../../../shared/ui/ExternalLink.tsx';
import { PlanCard } from './PlanCard.tsx';

interface MembershipSectionProps {
  plans: MembershipPlan[];
  followUrl: string;
}

function MembershipSection({ plans, followUrl }: MembershipSectionProps) {
  if (plans.length === 0) {
    return null;
  }

  return (
    <section
      id="membership"
      aria-labelledby="membership-title"
      className="relative scroll-mt-16 overflow-hidden py-20 sm:py-28"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-1/2 -z-10 h-96 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,var(--glow),transparent_70%)]"
      />
      <Container className="grid justify-items-center gap-12 text-center">
        <div className="grid max-w-2xl gap-4">
          <p className="text-sm font-bold tracking-[0.2em] text-gold uppercase">
            Membership
          </p>
          <h2
            id="membership-title"
            className="font-display text-4xl font-bold tracking-wide sm:text-5xl"
          >
            Join the Lair
          </h2>
          <p className="text-lg text-muted">
            Four to eight new battle maps every month, with VTT-ready files and
            hand-drawn assets. Members keep them coming.
          </p>
        </div>

        <div className="grid w-full justify-center gap-6 text-left [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),380px))]">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>

        <p className="text-muted">
          Not ready to join?{' '}
          <ExternalLink
            href={followUrl}
            className="font-bold text-text underline decoration-gold underline-offset-4 hover:text-gold"
          >
            Follow for free on Patreon
          </ExternalLink>
        </p>
      </Container>
    </section>
  );
}

export { MembershipSection };
