import type { CSSProperties } from 'react';
import {
  EXPLODE_STAGGER_MS,
  FLOAT_MS,
  FLOAT_STAGGER_MS,
  FLOAT_VARIATION_MS,
  GLOWS,
  HEIGHT,
  HIDDEN_AFTER_MS,
  LANDING_MS,
  LEVELS,
  LIFT_CQW,
  MERGE_STAGGER_MS,
  MOVE_MS,
  PULSE_SHIFT_MS,
  ROUNDED,
  WIDTH,
  type Glow,
} from './scene.ts';

const GROUND = `${ROUNDED} shadow-[0_30px_60px_-20px_rgb(0_0_0/0.75)] ring-1 ring-white/20`;
const OUTLINE = `${ROUNDED} ring-1 transition-[background-color,box-shadow] duration-300`;

const MOVE = 'duration-[1100ms]';
const LAND = 'cubic-bezier(0.65, 0, 0.2, 1)';
const SPRING = 'cubic-bezier(0.3, 1.5, 0.5, 1)';

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

export { Floor };
