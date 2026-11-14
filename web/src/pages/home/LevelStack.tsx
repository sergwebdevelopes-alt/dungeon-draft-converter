import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { useInView } from '@/shared/hooks/useInView.ts';
import level1 from './level-stack/level-01.webp';
import level2 from './level-stack/level-02.webp';
import level3 from './level-stack/level-03.webp';
import level4 from './level-stack/level-04.webp';
import level5 from './level-stack/level-05.webp';
import level6 from './level-stack/level-06.webp';
import level7 from './level-stack/level-07.webp';
import level8 from './level-stack/level-08.webp';
import mergedMap from './level-stack/merged.webp';

const LEVELS = [level1, level2, level3, level4, level5, level6, level7, level8];
const ROUNDED = 'rounded-3xl';
const GROUND = `${ROUNDED} shadow-[0_30px_60px_-20px_rgb(0_0_0/0.75)] ring-1 ring-white/20`;
const OUTLINE = `${ROUNDED} ring-1 transition-[background-color,box-shadow] duration-300`;

const GLOWS = [
  { level: 0, x: 45.7, y: 49.9, color: '#ffad58' },
  { level: 1, x: 52.7, y: 41, color: '#ffad58' },
  { level: 2, x: 55.4, y: 50, color: '#ffad58' },
  { level: 3, x: 54.8, y: 58.9, color: '#ffad58' },
  { level: 4, x: 57.7, y: 59.1, color: '#4dd569' },
  { level: 5, x: 57.4, y: 40.3, color: '#dc4949' },
];
const CORNERS = [
  { left: '3%', top: '4%' },
  { left: '97%', top: '4%' },
  { left: '3%', top: '96%' },
  { left: '97%', top: '96%' },
];
const WIDTH = 1280;
const HEIGHT = 880;
const LIFT_CQW = 6.9;
const VISIBLE_SHARE = 0.5;

const HOLD_MS = 4800;
const FIRST_MERGE_MS = 1000;
const MOVE_MS = 1100;
const LANDED_SHARE = 0.55;
const MERGE_STAGGER_MS = 130;
const EXPLODE_STAGGER_MS = 45;
const LANDING_MS =
  (LEVELS.length - 1) * MERGE_STAGGER_MS + MOVE_MS * LANDED_SHARE;
const MERGED_FADE_MS = 500;
const HIDDEN_AFTER_MS = LANDING_MS + MERGED_FADE_MS;
const FLASH_LEAD_MS = 120;
const FLOAT_MS = 3200;
const FLOAT_VARIATION_MS = 700;
const FLOAT_STAGGER_MS = 150;
const FLOAT_FADE_MS = 500;
const PULSE_SHIFT_MS = 380;

const MOVE = 'duration-[1100ms]';
const LAND = 'cubic-bezier(0.65, 0, 0.2, 1)';
const SPRING = 'cubic-bezier(0.3, 1.5, 0.5, 1)';
const SCENE_MOVE = 'duration-[1900ms] ease-[cubic-bezier(0.65,0,0.2,1)]';

const APART: CSSProperties = {
  transform: 'translateY(15%) rotateX(58deg) rotateZ(-32deg) scale(0.72)',
};
const TOGETHER: CSSProperties = {
  transform: 'translateY(0%) rotateX(0deg) rotateZ(0deg) scale(1)',
};

type Glow = (typeof GLOWS)[number];

function liftStyle(level: number, merged: boolean): CSSProperties {
  return {
    transform: merged
      ? 'translateZ(0px)'
      : `translateZ(${level * LIFT_CQW}cqw)`,
    transitionDelay: merged
      ? `${level * MERGE_STAGGER_MS}ms`
      : `${(LEVELS.length - 1 - level) * EXPLODE_STAGGER_MS}ms`,
    transitionTimingFunction: merged ? LAND : SPRING,
    transformStyle: 'preserve-3d',
  };
}

function outlineClass(merged: boolean): string {
  return `${OUTLINE} ${merged ? 'bg-transparent ring-transparent' : 'bg-text/5 ring-gold/45'}`;
}

function outlineFade(merged: boolean): CSSProperties {
  return { transitionDelay: merged ? `${LANDING_MS}ms` : '0ms' };
}

function floatTiming(level: number): CSSProperties {
  return {
    animationDuration: `${FLOAT_MS + (level % 3) * FLOAT_VARIATION_MS}ms`,
    animationDelay: `${MOVE_MS + level * FLOAT_STAGGER_MS}ms`,
  };
}

function floorStyle(
  level: number,
  merged: boolean,
  floating: boolean,
): CSSProperties {
  return {
    transformStyle: 'preserve-3d',
    visibility: merged ? 'hidden' : 'visible',
    transition: `visibility 0s linear ${merged ? HIDDEN_AFTER_MS : 0}ms`,
    ...(floating ? floatTiming(level) : {}),
  };
}

function flashDelay(): CSSProperties {
  return { animationDelay: `${LANDING_MS - FLASH_LEAD_MS}ms` };
}

function floatOffsets(stage: HTMLElement | null): number[] {
  if (!stage || typeof DOMMatrixReadOnly === 'undefined') {
    return [];
  }

  return [...stage.querySelectorAll('[data-float]')].map(
    (floor) => new DOMMatrixReadOnly(getComputedStyle(floor).transform).m43,
  );
}

function settleFloors(stage: HTMLElement | null, offsets: number[]): void {
  const floors = stage ? [...stage.querySelectorAll('[data-float]')] : [];

  floors.forEach((floor, at) => {
    const from = offsets[at] ?? 0;
    if (from !== 0 && typeof floor.animate === 'function') {
      floor.animate(
        [
          { transform: `translateZ(${from}px)` },
          { transform: 'translateZ(0px)' },
        ],
        { duration: FLOAT_FADE_MS, easing: 'ease-out' },
      );
    }
  });
}

function prefersReducedMotion(): boolean {
  return (
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  );
}

interface MergeCycle {
  inView: boolean;
  onScreen: boolean;
  beforeMerge: () => void;
}

function useMergeCycle({ inView, onScreen, beforeMerge }: MergeCycle): boolean {
  const [merged, setMerged] = useState(false);
  const latest = useRef({ merged, beforeMerge });
  latest.current = { merged, beforeMerge };

  useEffect(() => {
    if (!onScreen) {
      setMerged(false);
    }
  }, [onScreen]);

  useEffect(() => {
    if (!inView || prefersReducedMotion()) {
      return;
    }

    let timer: ReturnType<typeof setTimeout>;
    function show(next: boolean, afterMs: number) {
      timer = setTimeout(() => {
        if (next) {
          latest.current.beforeMerge();
        }
        setMerged(next);
        show(!next, HOLD_MS);
      }, afterMs);
    }

    show(
      !latest.current.merged,
      latest.current.merged ? HOLD_MS : FIRST_MERGE_MS,
    );
    return () => clearTimeout(timer);
  }, [inView]);

  return merged;
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

function LightGlow({ glow, lit }: { glow: Glow; lit: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-testid="level-glow"
      className={`absolute size-[11%] -translate-1/2 rounded-full ${lit ? 'animate-light-pulse motion-reduce:animate-none' : ''}`}
      style={{
        left: `${glow.x}%`,
        top: `${glow.y}%`,
        aspectRatio: '1',
        background: `radial-gradient(circle, ${glow.color} 0%, transparent 68%)`,
        animationDelay: `${-glow.level * PULSE_SHIFT_MS}ms`,
      }}
    />
  );
}

interface FloorProps {
  image: string;
  level: number;
  merged: boolean;
  onScreen: boolean;
}

function Floor({ image, level, merged, onScreen }: FloorProps) {
  const ground = level === 0;
  const floating = !ground && onScreen && !merged;

  return (
    <div
      className={`absolute inset-0 transition-transform motion-reduce:transition-none ${MOVE} ${onScreen ? '' : 'transition-none'}`}
      style={liftStyle(level, merged)}
    >
      <div
        data-float={ground ? undefined : ''}
        className={`absolute inset-0 ${floating ? 'animate-level-float motion-reduce:animate-none' : ''}`}
        style={
          ground
            ? { transformStyle: 'preserve-3d' }
            : floorStyle(level, merged, floating)
        }
      >
        <img
          src={image}
          alt=""
          width={WIDTH}
          height={HEIGHT}
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 size-full ${ground ? GROUND : outlineClass(merged)}`}
          style={ground ? undefined : outlineFade(merged)}
        />
        {ground && (
          <span
            aria-hidden="true"
            data-testid="ground-shade"
            className={`absolute inset-0 ${ROUNDED} bg-black transition-opacity duration-700 ${merged ? 'opacity-0' : 'opacity-40'}`}
          />
        )}
        {GLOWS.filter((glow) => glow.level === level).map((glow) => (
          <LightGlow key={`${glow.x}-${glow.y}`} glow={glow} lit={onScreen} />
        ))}
      </div>
    </div>
  );
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
