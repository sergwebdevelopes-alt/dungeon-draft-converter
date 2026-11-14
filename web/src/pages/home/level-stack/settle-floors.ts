import { FLOAT_FADE_MS } from './scene.ts';

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

export { floatOffsets, settleFloors };
