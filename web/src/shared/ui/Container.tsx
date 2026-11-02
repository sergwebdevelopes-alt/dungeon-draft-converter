import type { ReactNode } from 'react';

interface ContainerProps {
  className?: string;
  children: ReactNode;
}

function Container({ className = '', children }: ContainerProps) {
  return (
    <div
      className={`mx-auto w-full max-w-7xl pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </div>
  );
}

export { Container };
