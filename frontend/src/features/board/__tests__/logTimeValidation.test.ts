import { describe, it, expect } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { validateLogTimeHours, extractApiErrorMessage } from '../components/WorkItemModal';

// Regression coverage for the production bug: entering hours > 24 (or < 0.25) in the
// Log Time form passed the frontend's "is it non-empty" guard, hit the backend's
// class-validator @Max(24)/@Min(0.25) check, and failed with a silent 400 — no
// client-side range check and no error surfaced to the user.

describe('validateLogTimeHours', () => {
  it('rejects hours above the 24h backend limit', () => {
    expect(validateLogTimeHours('25')).toBe('Hours must be between 0.25 and 24');
  });

  it('rejects hours below the 0.25h backend minimum', () => {
    expect(validateLogTimeHours('0')).toBe('Hours must be between 0.25 and 24');
  });

  it('accepts hours within the valid range', () => {
    expect(validateLogTimeHours('8')).toBe('');
    expect(validateLogTimeHours('0.25')).toBe('');
    expect(validateLogTimeHours('24')).toBe('');
  });

  it('rejects non-numeric input', () => {
    expect(validateLogTimeHours('abc')).toBe('Enter a valid number of hours');
  });

  it('rejects empty input', () => {
    expect(validateLogTimeHours('')).toBe('Enter a valid number of hours');
  });
});

function makeAxiosError(message: string | string[]): AxiosError<{ message: string | string[] }> {
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: { message },
    } as never,
  );
}

describe('extractApiErrorMessage', () => {
  it('joins a class-validator array message into one string', () => {
    expect(extractApiErrorMessage(makeAxiosError(['hours must not be greater than 24']), 'fallback'))
      .toBe('hours must not be greater than 24');
  });

  it('joins multiple validation messages with a comma', () => {
    expect(extractApiErrorMessage(makeAxiosError(['a', 'b']), 'fallback')).toBe('a, b');
  });

  it('passes through a plain string message', () => {
    expect(extractApiErrorMessage(makeAxiosError('Only the assignee or reporter can log time on this item'), 'fallback'))
      .toBe('Only the assignee or reporter can log time on this item');
  });

  it('falls back to the given message for a non-axios error', () => {
    expect(extractApiErrorMessage(new Error('network down'), 'Failed to log time. Please try again.'))
      .toBe('Failed to log time. Please try again.');
  });
});
