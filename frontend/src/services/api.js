// frontend/src/services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Maps backend API error codes and HTTP statuses to friendly, safe user-facing messages.
 * Never exposes raw SQL, database errors, stack traces, or session tokens.
 *
 * @param {Error|object} err - The Axios error or API error object
 * @returns {string} Safe, human-readable error description
 */
export function formatAuthError(err) {
  if (!err) {
    return 'An unexpected error occurred. Please try again.';
  }

  // Network or offline error
  if (!err.response) {
    if (err.message && err.message.toLowerCase().includes('network')) {
      return 'Unable to reach the server. Please check your internet connection and verify the backend is running.';
    }
    return err.message || 'Network error: Please try again.';
  }

  const status = err.response.status;
  const errorData = err.response.data?.error;
  const errorCode = (typeof errorData === 'object' ? errorData?.code : null) || '';
  const serverMessage = (typeof errorData === 'object' ? errorData?.message : errorData) || '';

  // Specific structured backend error codes
  switch (errorCode) {
    case 'INVALID_CREDENTIALS':
      return 'Invalid email or password. Please verify your credentials and try again.';
    case 'EMAIL_ALREADY_IN_USE':
      return 'An account with this email already exists. Please sign in instead.';
    case 'ACCOUNT_COLLISION':
      return 'This email was registered with a password. Please sign in with your email and password.';
    case 'PLAN_ALREADY_CLAIMED':
      return 'This startup plan has already been saved to an account.';
    case 'TRIAL_LIMIT_REACHED':
      return 'Your free trial plan is already saved. Sign in to create and save more startup plans.';
    case 'PLAN_NOT_FOUND':
      return 'The requested startup plan was not found.';
    case 'INVALID_TRIAL_SESSION':
      return 'Your trial session is invalid or has expired. Please sign in to access your plans.';
    case 'UNAUTHORIZED':
      return 'Authentication required. Please sign in to continue.';
    case 'INVALID_INPUT':
      return serverMessage || 'Please check the information you entered and try again.';
    case 'AUTH_FAILED':
      return serverMessage || 'Authentication failed. Please try again.';
    default:
      break;
  }

  // Fallback by HTTP status code
  if (status === 401) {
    return 'Invalid email or password. Please try again.';
  }
  if (status === 403) {
    return serverMessage || 'You do not have permission to perform this action.';
  }
  if (status === 404) {
    return 'The requested resource was not found.';
  }
  if (status === 409) {
    return serverMessage || 'A conflict occurred. Please check your information.';
  }
  if (status >= 500) {
    return 'Server error occurred. Please try again in a few moments.';
  }

  return serverMessage || 'An unexpected error occurred. Please try again.';
}

export default api;
export { API_BASE_URL };
