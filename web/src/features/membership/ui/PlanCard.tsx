import type { MembershipPlan } from '../../../shared/config/site.ts';
import { ButtonLink } from '../../../shared/ui/Button.tsx';
import { formatPrice, periodLabel } from '../model/price.ts';

function PlanCard({ plan }: { plan: MembershipPlan }) {
  const ring = plan.featured
    ? 'ring-2 ring-gold shadow-[0_24px_60px_-20px_rgb(241_214_119/0.35)]'
    : 'ring-1 ring-line';

  return (
    <article
      aria-labelledby={`plan-${plan.id}`}
      className={`relative grid content-start gap-5 rounded-3xl bg-surface/80 p-7 backdrop-blur ${ring}`}
    >
      {plan.featured && (
        <span className="absolute -top-3 left-7 rounded-full bg-gold px-3 py-1 text-xs font-bold tracking-wide text-on-gold uppercase">
          Members
        </span>
      )}

      <h3
        id={`plan-${plan.id}`}
        className="font-display text-xl leading-tight font-bold tracking-wide"
      >
        {plan.name}
      </h3>

      <p className="flex items-baseline gap-2">
        <span className="font-display text-5xl font-bold tracking-tight">
          {formatPrice(plan.price)}
        </span>
        <span className="text-muted">{periodLabel(plan.price)}</span>
      </p>

      <p className="text-muted">{plan.description}</p>

      {plan.perks.length > 0 && (
        <ul className="grid gap-2" aria-label="Included">
          {plan.perks.map((perk) => (
            <li key={perk} className="flex gap-2">
              <span aria-hidden="true" className="text-gold">
                ✓
              </span>
              {perk}
            </li>
          ))}
        </ul>
      )}

      <ButtonLink href={plan.joinUrl}>Join on Patreon</ButtonLink>
    </article>
  );
}

export { PlanCard };
