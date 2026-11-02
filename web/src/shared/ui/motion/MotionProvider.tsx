import type { ReactNode } from 'react';
import { LazyMotion, MotionConfig } from 'motion/react';

async function loadFeatures() {
  return (await import('./features.ts')).default;
}

function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

export { MotionProvider };
