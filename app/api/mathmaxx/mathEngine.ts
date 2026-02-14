/**
 * mathEngine.ts — Server-side math computation using math.js
 * 
 * This module handles:
 * 1. Detecting mathematical expressions in user input
 * 2. Evaluating them with math.js for verified answers
 * 3. Providing computed results to Gemini so it can explain step-by-step
 */

import { create, all } from 'mathjs';

// Create a math.js instance with all functions
const math = create(all);

/**
 * Patterns that indicate the user is asking a math computation question
 * (as opposed to a conceptual question like "what is calculus?")
 */
const COMPUTATION_PATTERNS = [
  // Equations: solve x^2 + 3x = 0, find x if 2x + 5 = 13
  /(?:solve|find|calculate|compute|evaluate|simplify|what\s+is)\s+(.+)/i,
  // Direct expressions: 2 + 2, sin(45), sqrt(16), 3^4
  /^[\d\s+\-*/^().,%]+$/,
  // Expressions with functions: sin(30), log(100), sqrt(49)
  /(?:sin|cos|tan|log|ln|sqrt|abs|exp|factorial)\s*\(/i,
  // Fractions and algebra-like patterns
  /\d+\s*[+\-*/^]\s*\d+/,
];

/**
 * Try to detect if a message contains a computable expression
 * Returns the expression string or null if not computable
 */
export function detectExpression(message: string): string | null {
  // Clean the message — remove "solve", "calculate", etc.
  let expr = message
    .replace(/^(?:solve|find|calculate|compute|evaluate|what\s+is|what's)\s+/i, '')
    .replace(/[?!.]+$/, '')
    .trim();

  // Check if the cleaned expression looks like math
  const hasMathChars = /[\d+\-*/^()√]/.test(expr);
  const hasEquation = /=/.test(expr);
  const hasFunctions = /(?:sin|cos|tan|log|ln|sqrt|abs|exp)\s*\(/i.test(expr);

  if (!hasMathChars && !hasFunctions) return null;

  // Normalize common notations
  expr = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/√(\d+)/g, 'sqrt($1)')
    .replace(/(\d+)\^(\d+)/g, '$1^$2')
    .replace(/\s*=\s*0\s*$/, '') // Remove "= 0" from equations for evaluation context
    .trim();

  return expr || null;
}

/**
 * Attempt to evaluate a math expression using math.js
 * Returns the result as a string, or null if evaluation fails
 */
export function evaluateExpression(expression: string): string | null {
  try {
    // Try direct evaluation
    const result = math.evaluate(expression);

    // Format the result nicely
    if (typeof result === 'number') {
      // Avoid floating point noise: 0.30000000000000004 → 0.3
      if (Math.abs(result - Math.round(result * 1e10) / 1e10) < 1e-12) {
        return String(Math.round(result * 1e10) / 1e10);
      }
      return String(result);
    }

    if (result !== undefined && result !== null) {
      return math.format(result, { precision: 10 });
    }

    return null;
  } catch {
    // Expression couldn't be evaluated (e.g., "x^2 + 3x" has variables)
    // That's fine — Gemini will handle the algebra
    return null;
  }
}

/**
 * Build an enhanced prompt that includes computed results when available
 * This lets Gemini know the verified answer so it can focus on explanation
 */
export function buildMathContext(message: string): {
  enhancedMessage: string;
  computedResult: string | null;
  detectedExpression: string | null;
} {
  const expr = detectExpression(message);
  
  if (!expr) {
    return { enhancedMessage: message, computedResult: null, detectedExpression: null };
  }

  const result = evaluateExpression(expr);

  if (result !== null) {
    // We have a verified computation — tell Gemini
    const enhancedMessage = `${message}\n\n[SYSTEM NOTE: math.js computed "${expr}" = ${result}. Use this verified answer in your step-by-step explanation. Show all work leading to this result.]`;
    return { enhancedMessage, computedResult: result, detectedExpression: expr };
  }

  // Expression detected but not directly computable (e.g., has variables)
  // Just pass it through — Gemini handles algebra
  return { enhancedMessage: message, computedResult: null, detectedExpression: expr };
}
