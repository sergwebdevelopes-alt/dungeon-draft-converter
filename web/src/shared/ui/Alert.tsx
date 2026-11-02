import type { ReactNode } from 'react';

type Tone = 'error' | 'success';

const TONES: Record<Tone, string> = {
  error: 'border-danger bg-danger-soft',
  success: 'border-success bg-success-soft',
};

interface AlertProps {
  tone: Tone;
  className?: string;
  children: ReactNode;
}

function Alert({ tone, className = '', children }: AlertProps) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border-l-[3px] px-3 py-2 ${TONES[tone]} ${className}`}
    >
      {children}
    </p>
  );
}

export { Alert };
