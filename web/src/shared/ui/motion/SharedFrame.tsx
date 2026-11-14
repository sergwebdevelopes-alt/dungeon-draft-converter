import type { CSSProperties, ReactNode } from 'react';
import * as m from 'motion/react-m';

const SPRING = { type: 'spring', stiffness: 260, damping: 30 } as const;

interface SharedFrameProps {
  layoutId: string;
  layoutKey?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

function SharedFrame({
  layoutId,
  layoutKey,
  className,
  style,
  children,
}: SharedFrameProps) {
  return (
    <m.div
      layoutId={layoutId}
      layoutDependency={layoutKey}
      transition={SPRING}
      className={className}
      style={style}
    >
      <m.div layout layoutDependency={layoutKey} className="size-full">
        {children}
      </m.div>
    </m.div>
  );
}

export { SharedFrame };
