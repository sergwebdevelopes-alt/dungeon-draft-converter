import level1 from './images/level-01.webp';
import level2 from './images/level-02.webp';
import level3 from './images/level-03.webp';
import level4 from './images/level-04.webp';
import level5 from './images/level-05.webp';
import level6 from './images/level-06.webp';
import level7 from './images/level-07.webp';
import level8 from './images/level-08.webp';
import mergedMap from './images/merged.webp';

const LEVELS = [level1, level2, level3, level4, level5, level6, level7, level8];
const ROUNDED = 'rounded-3xl';

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

type Glow = (typeof GLOWS)[number];

export {
  LEVELS,
  ROUNDED,
  GLOWS,
  CORNERS,
  WIDTH,
  HEIGHT,
  LIFT_CQW,
  VISIBLE_SHARE,
  HOLD_MS,
  FIRST_MERGE_MS,
  MOVE_MS,
  LANDED_SHARE,
  MERGE_STAGGER_MS,
  EXPLODE_STAGGER_MS,
  LANDING_MS,
  MERGED_FADE_MS,
  HIDDEN_AFTER_MS,
  FLASH_LEAD_MS,
  FLOAT_MS,
  FLOAT_VARIATION_MS,
  FLOAT_STAGGER_MS,
  FLOAT_FADE_MS,
  PULSE_SHIFT_MS,
  mergedMap,
};
export type { Glow };
