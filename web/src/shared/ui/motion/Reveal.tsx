import type { ReactNode } from 'react';
import * as m from 'motion/react-m';

const EASE = [0.2, 0.7, 0.2, 1] as const;

interface RevealProps {
  index?: number;
  className?: string;
  children: ReactNode;
}

function Reveal({ index = 0, className, children }: RevealProps) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{
        duration: 0.45,
        delay: Math.min(index, 12) * 0.04,
        ease: EASE,
      }}
    >
      {children}
    </m.div>
  );
}

export { Reveal };
