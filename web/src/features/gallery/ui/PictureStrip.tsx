import { useEffect, useRef } from 'react';
import type { Picture } from '../model/catalog.ts';

interface PictureStripProps {
  pictures: Picture[];
  current: number;
  onSelect: (index: number) => void;
}

const THUMB =
  'block h-12 w-[4.5rem] overflow-hidden rounded-md transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold';
const ACTIVE = 'ring-2 ring-gold';
const INACTIVE = 'opacity-60 ring-1 ring-white/25 hover:opacity-100';

function centreInList(list: HTMLElement, item: HTMLElement) {
  const listBox = list.getBoundingClientRect();
  const itemBox = item.getBoundingClientRect();
  const left =
    list.scrollLeft +
    itemBox.left -
    listBox.left -
    (listBox.width - itemBox.width) / 2;

  list.scrollTo?.({ left, behavior: 'smooth' });
}

function PictureStrip({ pictures, current, onSelect }: PictureStripProps) {
  const list = useRef<HTMLUListElement>(null);
  const active = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (list.current && active.current) {
      centreInList(list.current, active.current);
    }
  }, [current]);

  return (
    <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent pt-8">
      <ul
        ref={list}
        aria-label="Pictures of this map"
        className="mx-auto flex w-fit max-w-full gap-2 overflow-x-auto px-3 pt-1 pb-3"
      >
        {pictures.map((picture, index) => (
          <li key={picture.view} className="shrink-0">
            <button
              ref={index === current ? active : undefined}
              type="button"
              aria-label={`Picture ${index + 1} of ${pictures.length}`}
              aria-current={index === current ? 'true' : undefined}
              className={`${THUMB} ${index === current ? ACTIVE : INACTIVE}`}
              onClick={() => onSelect(index)}
            >
              <img
                src={picture.thumb}
                alt=""
                width={240}
                height={160}
                draggable={false}
                className="size-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { PictureStrip };
