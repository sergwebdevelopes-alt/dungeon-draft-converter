import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UNZOOMED, type ZoomView } from '@/shared/lib/zoom.ts';
import { ZoomPan } from './ZoomPan.tsx';

const STAGE = { left: 100, top: 50, width: 400, height: 300 };
const DOUBLE = -Math.log(2) / 0.002;
const BOUNCE = 'transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)';

interface HarnessProps {
  start?: ZoomView;
  onPinch?: (pinching: boolean) => void;
  onChange?: (view: ZoomView) => void;
  zoomable?: boolean;
}

function Harness({
  start = UNZOOMED,
  onPinch = () => undefined,
  onChange = () => undefined,
  zoomable = true,
}: HarnessProps) {
  const [view, setView] = useState(start);

  function change(next: ZoomView) {
    onChange(next);
    setView(next);
  }

  return (
    <ZoomPan
      zoom={zoomable ? { view, onChange: change, onPinch } : undefined}
      className="stage"
    >
      <img src="/map.webp" alt="Map" />
    </ZoomPan>
  );
}

function content(): HTMLElement {
  return screen.getByRole('img', { name: 'Map' }).parentElement!;
}

function stage(): HTMLElement {
  return content().parentElement!;
}

function at(x: number, y: number) {
  return {
    clientX: STAGE.left + STAGE.width / 2 + x,
    clientY: STAGE.top + STAGE.height / 2 + y,
  };
}

function finger(pointerId: number, x: number, y: number) {
  return { pointerId, pointerType: 'touch', ...at(x, y) };
}

describe('ZoomPan', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      STAGE as DOMRect,
    );
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(400);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(300);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows the picture at its own size, in the given box', () => {
    render(<Harness />);

    expect(stage()).toHaveClass('stage');
    expect(content().style.transform).toBe('');
    expect(stage().style.cursor).toBe('');
  });

  it('zooms with the wheel around the pointer and keeps the page still', () => {
    render(<Harness />);

    const allowed = fireEvent.wheel(stage(), { deltaY: DOUBLE, ...at(100, 0) });

    expect(allowed).toBe(false);
    expect(content().style.transform).toMatch(
      /^translate\(-100(\.0+)?px, 0px\) scale\((2|1\.9999\d+)\)$/,
    );
    expect(stage().style.cursor).toBe('grab');
  });

  it('zooms back out with the wheel, down to the picture’s own size', () => {
    render(<Harness start={{ scale: 2, x: 0, y: 0 }} />);

    fireEvent.wheel(stage(), { deltaY: 2000, ...at(0, 0) });

    expect(content().style.transform).toBe('');
  });

  it('doubles on a double click around the pointer and resets on the next', () => {
    render(<Harness />);

    fireEvent.dblClick(stage(), at(50, -30));
    expect(content().style.transform).toBe('translate(-50px, 30px) scale(2)');

    fireEvent.dblClick(stage(), at(0, 0));
    expect(content().style.transform).toBe('');
  });

  it('moves an enlarged picture with the pointer, as far as its edge', () => {
    render(<Harness start={{ scale: 2, x: 0, y: 0 }} />);

    fireEvent.pointerDown(stage(), { pointerId: 1, button: 0, ...at(0, 0) });
    fireEvent.pointerMove(stage(), { pointerId: 1, ...at(60, -40) });
    expect(content().style.transform).toBe('translate(60px, -40px) scale(2)');
    expect(content().style.transition).toBe('none');
    expect(stage().style.cursor).toBe('grabbing');

    fireEvent.pointerMove(stage(), { pointerId: 1, ...at(900, -40) });
    expect(content().style.transform).toBe('translate(200px, -40px) scale(2)');

    fireEvent.pointerUp(stage(), { pointerId: 1 });
    fireEvent.pointerMove(stage(), { pointerId: 1, ...at(0, 0) });
    expect(content().style.transform).toBe('translate(200px, -40px) scale(2)');
    expect(content().style.transition).toBe(BOUNCE);
    expect(stage().style.cursor).toBe('grab');
  });

  it('leaves a picture at its own size alone when it is dragged', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.pointerDown(stage(), { pointerId: 1, button: 0, ...at(0, 0) });
    fireEvent.pointerMove(stage(), { pointerId: 1, ...at(60, -40) });

    expect(onChange).not.toHaveBeenCalled();
    expect(content().style.transform).toBe('');
    expect(content().style.transition).toBe(BOUNCE);
  });

  it('ignores the other mouse buttons', () => {
    render(<Harness start={{ scale: 2, x: 0, y: 0 }} />);

    fireEvent.pointerDown(stage(), {
      pointerId: 1,
      pointerType: 'mouse',
      button: 2,
      ...at(0, 0),
    });
    fireEvent.pointerMove(stage(), { pointerId: 1, ...at(60, 0) });

    expect(content().style.transform).toBe('translate(0px, 0px) scale(2)');
  });

  it('zooms with two fingers and says while they are down', () => {
    const onPinch = vi.fn();
    render(<Harness onPinch={onPinch} />);

    fireEvent.pointerDown(stage(), finger(1, -50, 0));
    fireEvent.pointerUp(stage(), finger(9, 0, 0));
    expect(onPinch).not.toHaveBeenCalled();

    fireEvent.pointerDown(stage(), finger(2, 50, 0));
    expect(onPinch).toHaveBeenLastCalledWith(true);

    fireEvent.pointerMove(stage(), finger(2, 150, 0));
    expect(content().style.transform).toBe('translate(50px, 0px) scale(2)');
    expect(content().style.transition).toBe('none');

    fireEvent.pointerUp(stage(), finger(2, 150, 0));
    expect(onPinch).toHaveBeenLastCalledWith(false);

    fireEvent.pointerCancel(stage(), finger(1, -50, 0));
    expect(content().style.transition).toBe(BOUNCE);
  });

  it('follows the wheel without a bounce, and bounces again once it rests', () => {
    vi.useFakeTimers();
    render(<Harness />);
    expect(content().style.transition).toBe(BOUNCE);

    fireEvent.wheel(stage(), { deltaY: -100, ...at(0, 0) });
    expect(content().style.transition).toBe('transform 140ms ease-out');

    act(() => {
      vi.advanceTimersByTime(219);
    });
    expect(content().style.transition).toBe('transform 140ms ease-out');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(content().style.transition).toBe(BOUNCE);
  });

  it('keeps the browser from dragging the picture away', () => {
    render(<Harness />);

    expect(fireEvent.dragStart(screen.getByRole('img', { name: 'Map' }))).toBe(
      false,
    );
    expect(stage().style.userSelect).toBe('none');
  });

  it('brings a view from outside back within the edges', () => {
    render(<Harness start={{ scale: 2, x: 900, y: -900 }} />);

    expect(content().style.transform).toBe('translate(200px, -150px) scale(2)');
  });

  it('does nothing without zoom controls, and moves at once', () => {
    render(<Harness zoomable={false} />);

    expect(fireEvent.wheel(stage(), { deltaY: DOUBLE, ...at(0, 0) })).toBe(
      true,
    );
    fireEvent.dblClick(stage(), at(0, 0));

    expect(content().style.transform).toBe('');
    expect(content().style.transition).toBe('none');
  });

  it('stops listening and ends the pinch when it goes away', () => {
    const onPinch = vi.fn();
    const { unmount } = render(<Harness onPinch={onPinch} />);
    const box = stage();

    unmount();

    expect(onPinch).toHaveBeenLastCalledWith(false);
    expect(fireEvent.wheel(box, { deltaY: DOUBLE, ...at(0, 0) })).toBe(true);
  });
});
