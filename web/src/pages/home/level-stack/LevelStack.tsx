import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { useInView } from '@/shared/hooks/useInView.ts';
import { Floor } from './Floor.tsx';
import {
  CORNERS,
  FLASH_LEAD_MS,
  HEIGHT,
  LANDING_MS,
  LEVELS,
  LIFT_CQW,
  MERGED_FADE_MS,
  ROUNDED,
  VISIBLE_SHARE,
  WIDTH,
  mergedMap,
} from './scene.ts';
import { floatOffsets, settleFloors } from './settle-floors.ts';
import { useMergeCycle } from './useMergeCycle.ts';

const SCENE_MOVE = 'duration-[1900ms] ease-[cubic-bezier(0.65,0,0.2,1)]';

const APART: CSSProperties = {
  transform: 'translateY(15%) rotateX(58deg) rotateZ(-32deg) scale(0.72)',
};
const TOGETHER: CSSProperties = {
  transform: 'translateY(0%) rotateX(0deg) rotateZ(0deg) scale(1)',
};

function flashDelay(): CSSProperties {
  return { animationDelay: `${LANDING_MS - FLASH_LEAD_MS}ms` };
}

function CornerGuides({ merged }: { merged: boolean }) {
  return CORNERS.map((corner) => (
    <span
      key={`${corner.left}-${corner.top}`}
      aria-hidden="true"
      data-testid="level-guide"
      className={`absolute w-0.5 origin-top bg-gold/35 transition-[transform,opacity] duration-700 ${merged ? 'opacity-0' : 'opacity-100 delay-500'}`}
      style={{
        ...corner,
        height: `${(LEVELS.length - 1) * LIFT_CQW}cqw`,
        transform: `rotateX(90deg) scaleY(${merged ? 0 : 1})`,
      }}
    />
  ));
}

function MergedMap({ merged }: { merged: boolean }) {
  return (
    <img
      src={mergedMap}
      alt={`Castle Ravenloft, ${LEVELS.length} levels merged into one map`}
      width={WIDTH}
      height={HEIGHT}
      loading="lazy"
      decoding="async"
      className={`absolute inset-0 size-full ${ROUNDED} ring-1 ring-white/20 ${merged ? 'opacity-100' : 'opacity-0'}`}
      style={{
        transform: merged
          ? 'translateZ(1px)'
          : `translateZ(${LEVELS.length * LIFT_CQW}cqw)`,
        transitionProperty: 'opacity, transform',
        transitionDuration: `${MERGED_FADE_MS}ms, 0s`,
        transitionDelay: merged
          ? `${LANDING_MS}ms, 0s`
          : `0s, ${MERGED_FADE_MS}ms`,
      }}
    />
  );
}

function LevelStack() {
  const {
    target: stage,
    inView,
    onScreen,
  } = useInView<HTMLDivElement>(VISIBLE_SHARE);
  const offsets = useRef<number[]>([]);
  const merged = useMergeCycle({
    inView,
    onScreen,
    beforeMerge: () => {
      offsets.current = floatOffsets(stage.current);
    },
  });

  useLayoutEffect(() => {
    if (merged) {
      settleFloors(stage.current, offsets.current);
    }
  }, [merged, stage]);

  return (
    <div ref={stage}>
      <div
        className={`relative mt-20 lg:my-6 ${onScreen ? '' : 'invisible'}`}
        style={{
          aspectRatio: `${WIDTH} / ${HEIGHT}`,
          perspective: '1800px',
          containerType: 'inline-size',
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[10%] -bottom-8 h-28 rounded-full bg-gold/15 blur-3xl"
        />
        {merged && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[4%] -bottom-10 h-36 animate-merge-flash rounded-full bg-gold/45 opacity-0 blur-3xl motion-reduce:animate-none"
            style={flashDelay()}
          />
        )}
        <div
          data-testid="level-scene"
          data-view={merged ? 'merged' : 'apart'}
          className={`absolute inset-0 transition-transform motion-reduce:transition-none ${SCENE_MOVE} ${onScreen ? '' : 'transition-none'}`}
          style={{
            ...(merged ? TOGETHER : APART),
            transformStyle: 'preserve-3d',
          }}
        >
          <CornerGuides merged={merged} />
          {LEVELS.map((image, level) => (
            <Floor
              key={image}
              image={image}
              level={level}
              merged={merged}
              onScreen={onScreen}
            />
          ))}
          <MergedMap merged={merged} />
          {merged && (
            <span
              aria-hidden="true"
              data-testid="merge-flash"
              className={`pointer-events-none absolute inset-0 animate-merge-flash ${ROUNDED} opacity-0 ring-2 ring-gold shadow-[0_0_70px_10px_var(--gold)] motion-reduce:animate-none`}
              style={{ ...flashDelay(), transform: 'translateZ(2px)' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export { LevelStack };
