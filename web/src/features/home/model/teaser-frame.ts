interface Size {
  width: number;
  height: number;
}

const WIDEST = 4 / 3;
const TALLEST = 4 / 5;

function teaserFrameRatio({ width, height }: Size): number {
  return Math.min(Math.max(width / height, TALLEST), WIDEST);
}

function teaserCoverWidth({ width, height }: Size): string {
  return `max(100cqw, calc(100cqh * ${width / height}))`;
}

export { teaserCoverWidth, teaserFrameRatio };
