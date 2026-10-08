import { formatAuthError } from './api';

describe('formatAuthError utility', () => {
  test('maps network errors safely', () => {
    const networkErr = new Error('Network Error');
    expect(formatAuthError(networkErr)).toContain('Unable to reach the server');
  });

  test('maps INVALID_CREDENTIALS safely', () => {
    const err = {
      response: {
        status: 401,
        data: { error: { code: 'INVALID_CREDENTIALS', message: 'Raw internal message' } }
      }
    };
    expect(formatAuthError(err)).toBe('Invalid email or password. Please verify your credentials and try again.');
  });

  test('maps EMAIL_ALREADY_IN_USE safely', () => {
    const err = {
      response: {
        status: 409,
        data: { error: { code: 'EMAIL_ALREADY_IN_USE', message: 'Email taken' } }
      }
    };
    expect(formatAuthError(err)).toBe('An account with this email already exists. Please sign in instead.');
  });

  test('maps ACCOUNT_COLLISION safely', () => {
    const err = {
      response: {
        status: 409,
        data: { error: { code: 'ACCOUNT_COLLISION' } }
      }
    };
    expect(formatAuthError(err)).toContain('registered with a password');
  });

  test('maps PLAN_ALREADY_CLAIMED safely', () => {
    const err = {
      response: {
        status: 409,
        data: { error: { code: 'PLAN_ALREADY_CLAIMED' } }
      }
    };
    expect(formatAuthError(err)).toBe('This startup plan has already been saved to an account.');
  });

  test('maps TRIAL_LIMIT_REACHED safely', () => {
    const err = {
      response: {
        status: 403,
        data: { error: { code: 'TRIAL_LIMIT_REACHED' } }
      }
    };
    expect(formatAuthError(err)).toBe('Your free trial plan is already saved. Sign in to create and save more startup plans.');
  });

  test('maps PLAN_NOT_FOUND safely', () => {
    const err = {
      response: {
        status: 404,
        data: { error: { code: 'PLAN_NOT_FOUND' } }
      }
    };
    expect(formatAuthError(err)).toBe('The requested startup plan was not found.');
  });

  test('maps UNAUTHORIZED safely', () => {
    const err = {
      response: {
        status: 401,
        data: { error: { code: 'UNAUTHORIZED' } }
      }
    };
    expect(formatAuthError(err)).toBe('Authentication required. Please sign in to continue.');
  });

  test('maps 500 server error cleanly without revealing internals', () => {
    const err = {
      response: {
        status: 500,
        data: { error: { code: 'SQL_ERROR', message: 'syntax error at or near SELECT * FROM users' } }
      }
    };
    expect(formatAuthError(err)).toBe('Server error occurred. Please try again in a few moments.');
  });
});
