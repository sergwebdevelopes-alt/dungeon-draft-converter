import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MembershipPlan } from '../../../shared/config/site.ts';
import { MembershipSection } from './MembershipSection.tsx';

function plan(overrides: Partial<MembershipPlan> = {}): MembershipPlan {
  return {
    id: 'coffee',
    name: 'Buy the Creator a Coffee',
    price: { cents: 500, currency: 'USD', period: 'month' },
    description: 'Pure support.',
    perks: [],
    joinUrl: 'https://www.patreon.com/checkout/LairofArtificer?rid=1',
    ...overrides,
  };
}

describe('MembershipSection', () => {
  it('shows each plan with its price and a join link', () => {
    render(
      <MembershipSection
        plans={[
          plan(),
          plan({
            id: 'gold',
            name: 'Gold',
            price: { cents: 1500, currency: 'USD', period: 'month' },
            perks: ['Every map in HD', 'Early access'],
            joinUrl: 'https://www.patreon.com/checkout/LairofArtificer?rid=2',
          }),
        ]}
        followUrl="https://www.patreon.com/cw/LairofArtificer"
      />,
    );

    const coffee = within(
      screen.getByRole('article', { name: 'Buy the Creator a Coffee' }),
    );
    expect(coffee.getByText('$5')).toBeInTheDocument();
    expect(coffee.getByText('per month')).toBeInTheDocument();
    expect(coffee.queryByRole('list')).toBeNull();
    expect(
      coffee.getByRole('link', { name: 'Join on Patreon' }),
    ).toHaveAttribute(
      'href',
      'https://www.patreon.com/checkout/LairofArtificer?rid=1',
    );

    const gold = within(screen.getByRole('article', { name: 'Gold' }));
    expect(gold.getByText('$15')).toBeInTheDocument();
    expect(gold.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '✓Every map in HD',
      '✓Early access',
    ]);
  });

  it('offers following for free', () => {
    render(
      <MembershipSection
        plans={[plan()]}
        followUrl="https://www.patreon.com/cw/LairofArtificer"
      />,
    );

    expect(
      screen.getByRole('link', { name: 'Follow for free on Patreon' }),
    ).toHaveAttribute('href', 'https://www.patreon.com/cw/LairofArtificer');
  });

  it('shows nothing without plans', () => {
    const { container } = render(
      <MembershipSection plans={[]} followUrl="https://example.com" />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
