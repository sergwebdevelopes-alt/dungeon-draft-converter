interface FaqEntry {
  question: string;
  answer: string;
}

const CONVERTER_NAME = 'Dungeondraft Converter';

const CONVERTER_FAQ: FaqEntry[] = [
  {
    question: 'What is a .dd2vtt file?',
    answer:
      'It is the Universal VTT export of Dungeondraft: one file that holds the map image together with its grid size, walls, doors and lights. In Dungeondraft choose Export, then Universal VTT.',
  },
  {
    question: 'How do I turn a .dd2vtt file into a JPG or WebP image?',
    answer:
      'Drop the file on the converter, pick the formats you want and press Convert & download. You get a zip with the map as JPG or WebP at 70, 140 or 300 pixels per grid square, with or without the grid.',
  },
  {
    question: 'Can I merge several Dungeondraft levels into one map?',
    answer:
      'Yes. Add up to 10 levels of the same size and grid, lowest floor first, and the converter stacks them into a single map. Each level keeps its own baked lighting, so the result is not darkened the way a merge inside Dungeondraft can be.',
  },
  {
    question: 'Does it work with Foundry VTT and Roll20?',
    answer:
      'Yes. Turn on Foundry VTT to also get a .dd2vtt with walls and lights for Foundry; for merged levels it keeps the walls of the top map and the lights that are still visible. For Roll20 and other tabletops use the JPG or WebP images.',
  },
  {
    question: 'Which size should I choose?',
    answer:
      '70 px per square loads fast and suits most online games, 140 px is sharper for zooming in, and 300 px is meant for printing at one inch per square. WebP gives the smallest files.',
  },
  {
    question: 'What if my map was exported without lighting?',
    answer:
      'The converter lights the images itself from the lights and walls stored in the file, so the downloaded maps are not flat.',
  },
  {
    question: 'Is it free, and what happens to my files?',
    answer:
      'It is free and needs no account. Files are used on the server only to build your download and are deleted when the conversion ends.',
  },
];

export { CONVERTER_FAQ, CONVERTER_NAME };
export type { FaqEntry };
