import { MotionGlobalConfig } from 'motion/react';

function skipAnimations(): void {
  MotionGlobalConfig.skipAnimations = true;
}

export { skipAnimations };
