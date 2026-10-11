// backend/services/geminiClient.js
const axios = require('axios');
require('dotenv').config();

const DEFAULT_CONFIG = {
  modelUrl: process.env.GEMINI_MODEL_URL || 'https://generativelanguage.googleapis.com/v1/models/gemini-3.8-flash:generateContent',
  maxRetries: process.env.GEMINI_MAX_RETRIES ? parseInt(process.env.GEMINI_MAX_RETRIES, 10) : 3,
  baseDelayMs: process.env.GEMINI_RETRY_BASE_DELAY_MS ? parseInt(process.env.GEMINI_RETRY_BASE_DELAY_MS, 10) : 1000,
  maxDelayMs: process.env.GEMINI_RETRY_MAX_DELAY_MS ? parseInt(process.env.GEMINI_RETRY_MAX_DELAY_MS, 10) : 10000,
  timeoutMs: process.env.GEMINI_TIMEOUT_MS ? parseInt(process.env.GEMINI_TIMEOUT_MS, 10) : 30000,
  maxConcurrent: process.env.GEMINI_MAX_CONCURRENT ? parseInt(process.env.GEMINI_MAX_CONCURRENT, 10) : 2,
};

/**
 * Determines if an error from Gemini/Axios is transient and safe to retry.
 *
 * Transient errors include:
 * - HTTP 429 (Rate Limit / Quota Exceeded)
 * - HTTP 408 (Request Timeout)
 * - HTTP 500, 502, 503, 504 (Server / Gateway Overload)
 * - Network failures (ECONNRESET, ETIMEDOUT, ECONNABORTED, socket hang up)
 *
 * Non-transient errors include:
 * - HTTP 400 (Bad Request / Invalid Schema)
 * - HTTP 401 (Unauthorized / Invalid Key)
 * - HTTP 403 (Forbidden / Project Access Denied)
 * - HTTP 404 (Not Found / Invalid Endpoint)
 *
 * @param {Error} error - Caught error from Axios
 * @returns {boolean} True if error is transient
 */
function isTransientError(error) {
  if (!error) return false;

  // HTTP response status checks
  if (error.response && typeof error.response.status === 'number') {
    const status = error.response.status;
    if (status === 429 || status === 408 || (status >= 500 && status <= 504)) {
      return true;
    }
    return false;
  }

  // Network / socket / connection errors without valid response
  const networkErrorCodes = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNABORTED',
    'ENOTFOUND',
    'EAI_AGAIN',
    'ERR_NETWORK',
  ];

  if (error.code && networkErrorCodes.includes(error.code)) {
    return true;
  }

  if (error.message && (
    error.message.includes('timeout') ||
    error.message.includes('Network Error') ||
    error.message.includes('socket hang up')
  )) {
    return true;
  }

  if (error.request && !error.response) {
    return true;
  }

  return false;
}

/**
 * Calculates exponential backoff delay with proportional jitter.
 *
 * @param {number} attempt - Current retry attempt number (1-indexed)
 * @param {number} baseDelayMs - Base delay in milliseconds
 * @param {number} maxDelayMs - Maximum delay ceiling
 * @param {Function} randomFn - Random generator function (defaults to Math.random)
 * @returns {number} Delay in milliseconds
 */
function calculateBackoffDelay(attempt, baseDelayMs, maxDelayMs, randomFn = Math.random) {
  const safeAttempt = Math.max(1, attempt);
  const exponential = baseDelayMs * Math.pow(2, safeAttempt - 1);
  const jitterFraction = 0.25;
  const randVal = typeof randomFn === 'function' ? randomFn() : Math.random();
  const jitter = exponential * jitterFraction * randVal;
  const delay = Math.round(exponential + jitter);
  return Math.min(maxDelayMs, delay);
}

/**
 * Extracts and parses Retry-After header from an error response if present.
 *
 * @param {Error} error - Caught Axios error
 * @param {number} maxDelayMs - Maximum delay ceiling
 * @returns {number|null} Milliseconds to delay, or null if header absent/invalid
 */
function getRetryAfterDelayMs(error, maxDelayMs) {
  if (!error || !error.response || !error.response.headers) return null;
  const retryHeader = error.response.headers['retry-after'];
  if (!retryHeader) return null;

  const seconds = parseInt(retryHeader, 10);
  if (!isNaN(seconds) && seconds > 0) {
    return Math.min(maxDelayMs, seconds * 1000);
  }

  const dateParsed = Date.parse(retryHeader);
  if (!isNaN(dateParsed)) {
    const diffMs = dateParsed - Date.now();
    if (diffMs > 0) {
      return Math.min(maxDelayMs, diffMs);
    }
  }

  return null;
}

/**
 * Lightweight in-process concurrency limiter (semaphore).
 * Staggers parallel bursts to prevent triggering instantaneous upstream quota limits.
 */
class ConcurrencyLimiter {
  constructor(maxConcurrent = 2) {
    this.maxConcurrent = maxConcurrent > 0 ? maxConcurrent : 1;
    this.currentRunning = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.currentRunning < this.maxConcurrent) {
      this.currentRunning++;
      return;
    }
    await new Promise((resolve) => this.queue.push(resolve));
    this.currentRunning++;
  }

  release() {
    this.currentRunning = Math.max(0, this.currentRunning - 1);
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next();
    }
  }

  async run(task) {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }
}

const defaultLimiter = new ConcurrencyLimiter(DEFAULT_CONFIG.maxConcurrent);

/**
 * Centralized Gemini request dispatcher with timeout, retry/backoff, and concurrency limiting.
 *
 * @param {string} prompt - Prompt text to send to Gemini
 * @param {object} options - Optional configuration overrides (useful for testing and tuning)
/**
 * Strips any embedded key query parameter from the given URL.
 * Ensures API keys are never transmitted or logged in the URL query string.
 *
 * @param {string} rawUrl
 * @returns {string} Sanitized URL
 */
function stripApiKeyFromUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.searchParams.has('key')) {
      parsed.searchParams.delete('key');
      return parsed.toString();
    }
    return rawUrl;
  } catch {
    return rawUrl.replace(/[?&]key=[^&]+/, '').replace(/\?$/, '');
  }
}

/**
 * Redacts sensitive API keys from an error object, its message, URL, and headers.
 *
 * @param {Error} error
 * @param {string} apiKey
 * @returns {Error} Sanitized error
 */
function redactSensitiveData(error, apiKey) {
  if (!error) return error;
  if (apiKey && typeof apiKey === 'string' && apiKey.trim()) {
    const keyToRedact = apiKey.trim();
    if (error.message && typeof error.message === 'string' && error.message.includes(keyToRedact)) {
      error.message = error.message.replaceAll(keyToRedact, '[REDACTED_API_KEY]');
    }
    if (error.config) {
      if (error.config.url && typeof error.config.url === 'string' && error.config.url.includes(keyToRedact)) {
        error.config.url = error.config.url.replaceAll(keyToRedact, '[REDACTED_API_KEY]');
      }
      if (error.config.headers) {
        if (error.config.headers['x-goog-api-key']) {
          error.config.headers['x-goog-api-key'] = '[REDACTED_API_KEY]';
        }
        if (error.config.headers['X-Goog-Api-Key']) {
          error.config.headers['X-Goog-Api-Key'] = '[REDACTED_API_KEY]';
        }
      }
    }
  }
  return error;
}

/**
 * Centralized Gemini request dispatcher with timeout, retry/backoff, and concurrency limiting.
 *
 * @param {string} prompt - Prompt text to send to Gemini
 * @param {object} options - Optional configuration overrides (useful for testing and tuning)
 * @returns {Promise<string>} Raw text candidate from Gemini response
 */
async function callGemini(prompt, options = {}) {
  const config = {
    apiKey: options.apiKey || process.env.GEMINI_API_KEY,
    modelUrl: options.modelUrl || DEFAULT_CONFIG.modelUrl,
    maxRetries: options.maxRetries !== undefined ? options.maxRetries : DEFAULT_CONFIG.maxRetries,
    baseDelayMs: options.baseDelayMs !== undefined ? options.baseDelayMs : DEFAULT_CONFIG.baseDelayMs,
    maxDelayMs: options.maxDelayMs !== undefined ? options.maxDelayMs : DEFAULT_CONFIG.maxDelayMs,
    timeoutMs: options.timeoutMs !== undefined ? options.timeoutMs : DEFAULT_CONFIG.timeoutMs,
    context: options.context || 'Gemini Request',
    sleepFn: options.sleepFn || ((ms) => new Promise((resolve) => setTimeout(resolve, ms))),
    randomFn: options.randomFn || Math.random,
    limiter: options.limiter !== undefined ? options.limiter : defaultLimiter,
  };

  const executeRequest = async () => {
    let lastError = null;

    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      try {
        const headers = {
          'Content-Type': 'application/json',
        };
        if (config.apiKey) {
          headers['x-goog-api-key'] = config.apiKey;
        }

        const requestUrl = stripApiKeyFromUrl(config.modelUrl);

        const response = await axios.post(
          requestUrl,
          {
            contents: [{ parts: [{ text: prompt }] }],
          },
          {
            headers,
            timeout: config.timeoutMs,
          }
        );

        return response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      } catch (err) {
        redactSensitiveData(err, config.apiKey);
        lastError = err;
        const isTransient = isTransientError(err);
        const hasRetriesLeft = attempt <= config.maxRetries;

        if (!isTransient || !hasRetriesLeft) {
          if (hasRetriesLeft && !isTransient) {
            console.warn(`[GeminiClient:${config.context}] Non-retryable error (status: ${err.response?.status || 'N/A'}). Failing immediately.`);
          } else {
            console.error(`[GeminiClient:${config.context}] Retries exhausted after ${attempt} attempt(s) (status: ${err.response?.status || 'N/A'}).`);
          }
          throw err;
        }

        const retryAfterMs = getRetryAfterDelayMs(err, config.maxDelayMs);
        const delayMs = retryAfterMs !== null
          ? retryAfterMs
          : calculateBackoffDelay(attempt, config.baseDelayMs, config.maxDelayMs, config.randomFn);

        console.warn(`[GeminiClient:${config.context}] Transient error (status: ${err.response?.status || err.code || 'NETWORK_ERROR'}). Retrying attempt ${attempt}/${config.maxRetries} in ${delayMs}ms...`);

        await config.sleepFn(delayMs);
      }
    }

    throw lastError;
  };

  if (config.limiter && typeof config.limiter.run === 'function') {
    return await config.limiter.run(executeRequest);
  } else {
    return await executeRequest();
  }
}

module.exports = {
  callGemini,
  isTransientError,
  calculateBackoffDelay,
  getRetryAfterDelayMs,
  ConcurrencyLimiter,
  DEFAULT_CONFIG,
  stripApiKeyFromUrl,
  redactSensitiveData,
};
