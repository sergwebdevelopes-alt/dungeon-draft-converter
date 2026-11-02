import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import { ExternalLink } from './ExternalLink.tsx';

type Variant = 'primary' | 'secondary' | 'glass';
type Size = 'md' | 'sm';

interface Look {
  variant?: Variant;
  size?: Size;
  className?: string;
}

const BASE =
  'inline-flex items-center justify-center rounded-full font-bold transition disabled:cursor-not-allowed';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gold text-on-gold hover:brightness-105 disabled:opacity-45 disabled:hover:brightness-100',
  secondary: 'ring-1 ring-line hover:ring-gold',
  glass: 'bg-text/10 ring-1 ring-text/20 backdrop-blur hover:bg-text/15',
};

const SIZES: Record<Size, string> = {
  md: 'min-h-12 px-6',
  sm: 'min-h-10 px-4 text-[15px]',
};

function buttonClass({
  variant = 'primary',
  size = 'md',
  className = '',
}: Look): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}

type ButtonProps = Look & ButtonHTMLAttributes<HTMLButtonElement>;

function Button({
  variant,
  size,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, className })}
      {...props}
    />
  );
}

type ButtonLinkProps = Look & { children: ReactNode } & (
    { to: string; href?: never } | { href: string; to?: never }
  );

function ButtonLink({
  variant,
  size,
  className,
  children,
  ...target
}: ButtonLinkProps) {
  const look = buttonClass({ variant, size, className });

  if (target.href !== undefined) {
    return (
      <ExternalLink href={target.href} className={look}>
        {children}
      </ExternalLink>
    );
  }

  return (
    <Link to={target.to} className={look}>
      {children}
    </Link>
  );
}

export { Button, ButtonLink, buttonClass };
