import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Alert } from './Alert.tsx';

describe('Alert', () => {
  it('interrupts for errors', () => {
    render(<Alert tone="error">Something broke.</Alert>);

    expect(screen.getByRole('alert')).toHaveTextContent('Something broke.');
  });

  it('announces success politely', () => {
    render(<Alert tone="success">Cave.zip is ready.</Alert>);

    expect(screen.getByRole('status')).toHaveTextContent('Cave.zip is ready.');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
