/**
 * Robust JSON Parser for Gemini LLM Responses
 * 
 * Extracts and parses JSON from raw LLM outputs which may contain:
 * - Plain pristine JSON
 * - Markdown code blocks (```json ... ```, ``` ... ```, case-insensitive)
 * - Incomplete/unclosed markdown code blocks (```json ...)
 * - Conversational preamble / postamble ("Here is your JSON...", "Hope this helps!")
 * - Trailing commas before closing braces/brackets in objects and arrays
 * - UTF-8 Byte Order Marks (BOM) and zero-width spaces
 */

/**
 * Safely removes trailing commas before } or ] outside of string literals.
 * Preserves commas inside quoted strings (e.g. {"text": "A, B, }"}).
 * 
 * @param {string} jsonString - The JSON string to sanitize
 * @returns {string} Sanitized JSON string with trailing commas removed
 */
function stripTrailingCommas(jsonString) {
  if (typeof jsonString !== 'string') return jsonString;

  let insideString = false;
  let isEscaped = false;
  let lastCommaIndex = -1;
  let result = '';

  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];

    if (insideString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === '\\') {
        isEscaped = true;
      } else if (char === '"') {
        insideString = false;
      }
      result += char;
    } else {
      if (char === '"') {
        insideString = true;
        result += char;
      } else if (char === ',') {
        lastCommaIndex = result.length;
        result += char;
      } else if ((char === '}' || char === ']') && lastCommaIndex !== -1) {
        // Check if there is only whitespace between lastCommaIndex and current position
        const between = result.slice(lastCommaIndex + 1);
        if (/^\s*$/.test(between)) {
          // Remove the trailing comma
          result = result.slice(0, lastCommaIndex) + between + char;
          lastCommaIndex = -1;
          continue;
        }
        result += char;
      } else {
        if (!/\s/.test(char)) {
          lastCommaIndex = -1;
        }
        result += char;
      }
    }
  }

  return result;
}

/**
 * Extracts outermost object {...} and array [...] candidate substrings from text.
 * 
 * @param {string} text - Raw text containing JSON substring
 * @returns {string[]} Array of candidate substrings, ordered by earlier appearance
 */
function extractOuterJsonCandidates(text) {
  if (typeof text !== 'string') return [];

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');

  const candidates = [];

  const hasObject = firstBrace !== -1 && lastBrace > firstBrace;
  const hasArray = firstBracket !== -1 && lastBracket > firstBracket;

  if (hasObject && hasArray) {
    if (firstBrace < firstBracket) {
      candidates.push(text.substring(firstBrace, lastBrace + 1));
      candidates.push(text.substring(firstBracket, lastBracket + 1));
    } else {
      candidates.push(text.substring(firstBracket, lastBracket + 1));
      candidates.push(text.substring(firstBrace, lastBrace + 1));
    }
  } else if (hasObject) {
    candidates.push(text.substring(firstBrace, lastBrace + 1));
  } else if (hasArray) {
    candidates.push(text.substring(firstBracket, lastBracket + 1));
  }

  return candidates;
}

/**
 * Helper to attempt standard JSON.parse, followed by trailing-comma sanitized parse.
 * 
 * @param {string} candidate - String to parse
 * @returns {object|array|null} Parsed object or array, or null if parsing fails
 */
function tryParse(candidate) {
  if (typeof candidate !== 'string') return null;
  const trimmed = candidate.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
  } catch (_) {
    // Attempt with trailing commas stripped
    try {
      const sanitized = stripTrailingCommas(trimmed);
      const parsed = JSON.parse(sanitized);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    } catch (_) {
      // Failed to parse
    }
  }

  return null;
}

/**
 * Main parser entry point: Robustly extracts and parses JSON from Gemini responses.
 * 
 * @param {string} rawText - Raw text output from Gemini model candidate
 * @returns {object|array} Parsed JSON structure
 * @throws {Error} Descriptive error if no valid JSON could be extracted
 */
function parseGeminiJson(rawText) {
  if (typeof rawText === 'object' && rawText !== null) {
    // Already parsed object
    return rawText;
  }

  if (rawText === null || rawText === undefined || typeof rawText !== 'string') {
    throw new Error('Invalid or empty response text received from Gemini');
  }

  // Strip BOM and zero-width characters, then trim
  const cleanText = rawText
    .replace(/^\uFEFF/, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();

  if (!cleanText) {
    throw new Error('Response text from Gemini is empty after trimming');
  }

  // 1. Fast path: Direct parse (or direct parse with trailing comma sanitization)
  const fastResult = tryParse(cleanText);
  if (fastResult) {
    return fastResult;
  }

  // 2. Markdown fenced code blocks: ```json ... ```, ``` ... ```, etc.
  const codeBlockRegex = /```(?:json|javascript|js)?\s*([\s\S]*?)(?:```|$)/gi;
  let codeMatch;
  while ((codeMatch = codeBlockRegex.exec(cleanText)) !== null) {
    const blockContent = codeMatch[1]?.trim();
    if (blockContent) {
      const parsedBlock = tryParse(blockContent);
      if (parsedBlock) {
        return parsedBlock;
      }

      // If the block itself contained surrounding conversational text or brackets
      const subCandidates = extractOuterJsonCandidates(blockContent);
      for (const subCandidate of subCandidates) {
        const parsedSub = tryParse(subCandidate);
        if (parsedSub) {
          return parsedSub;
        }
      }
    }
  }

  // 3. Fallback: Extract outermost {...} or [...] from the full text
  const outerCandidates = extractOuterJsonCandidates(cleanText);
  for (const candidate of outerCandidates) {
    const parsedCandidate = tryParse(candidate);
    if (parsedCandidate) {
      return parsedCandidate;
    }
  }

  // 4. Fallback: Strip all markdown delimiters globally and attempt parse
  const strippedFences = cleanText.replace(/```[a-zA-Z]*|```/g, '').trim();
  if (strippedFences && strippedFences !== cleanText) {
    const parsedStripped = tryParse(strippedFences);
    if (parsedStripped) {
      return parsedStripped;
    }
  }

  // If all strategies fail, construct a clear and informative error
  const snippet = cleanText.length > 120 ? cleanText.substring(0, 120) + '...' : cleanText;
  throw new Error(`Failed to parse JSON from Gemini response: "${snippet}"`);
}

module.exports = {
  parseGeminiJson,
  stripTrailingCommas,
  extractOuterJsonCandidates
};
