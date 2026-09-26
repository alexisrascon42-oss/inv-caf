/**
 * Safe math expression parser — no eval().
 * Supports: +, -, *, /, parentheses, decimal numbers.
 * Returns NaN for invalid expressions.
 */

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  const str = expr.replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/');

  while (i < str.length) {
    const ch = str[i];

    // Number (including decimals)
    if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < str.length && /[0-9.]/.test(str[i])) {
        num += str[i];
        i++;
      }
      const parsed = parseFloat(num);
      if (isNaN(parsed)) return null;
      tokens.push({ type: 'number', value: parsed });
      continue;
    }

    if ('+-*/'.includes(ch)) {
      tokens.push({ type: 'operator', value: ch });
      i++;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen' });
      i++;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'rparen' });
      i++;
      continue;
    }

    // Invalid character
    return null;
  }

  return tokens;
}

// Recursive descent parser
function parse(tokens) {
  let pos = 0;

  function peek() {
    return pos < tokens.length ? tokens[pos] : null;
  }

  function consume() {
    return tokens[pos++];
  }

  // expression = term (('+' | '-') term)*
  function expression() {
    let left = term();
    if (left === null) return null;

    while (peek() && peek().type === 'operator' && (peek().value === '+' || peek().value === '-')) {
      const op = consume().value;
      const right = term();
      if (right === null) return null;
      left = op === '+' ? left + right : left - right;
    }

    return left;
  }

  // term = factor (('*' | '/') factor)*
  function term() {
    let left = factor();
    if (left === null) return null;

    while (peek() && peek().type === 'operator' && (peek().value === '*' || peek().value === '/')) {
      const op = consume().value;
      const right = factor();
      if (right === null) return null;
      if (op === '/') {
        if (right === 0) return null;
        left = left / right;
      } else {
        left = left * right;
      }
    }

    return left;
  }

  // factor = number | '(' expression ')'
  function factor() {
    const token = peek();
    if (!token) return null;

    if (token.type === 'number') {
      consume();
      return token.value;
    }

    if (token.type === 'lparen') {
      consume(); // (
      const val = expression();
      if (val === null) return null;
      const closing = consume();
      if (!closing || closing.type !== 'rparen') return null;
      return val;
    }

    // Handle unary minus
    if (token.type === 'operator' && token.value === '-') {
      consume();
      const val = factor();
      if (val === null) return null;
      return -val;
    }

    return null;
  }

  const result = expression();
  if (pos !== tokens.length) return null; // Extra tokens
  return result;
}

/**
 * Evaluate a math expression string safely.
 * @param {string} expr - e.g. "5*20", "3*24+7", "(10+5)*2"
 * @returns {number|null} - Result or null if invalid
 */
export function evaluateExpression(expr) {
  if (!expr || typeof expr !== 'string') return null;

  const cleaned = expr.trim();
  if (cleaned === '') return null;

  // If it's just a plain number, return it directly
  const asNumber = parseFloat(cleaned);
  if (!isNaN(asNumber) && String(asNumber) === cleaned) {
    return asNumber;
  }

  const tokens = tokenize(cleaned);
  if (!tokens || tokens.length === 0) return null;

  const result = parse(tokens);
  if (result === null || !isFinite(result) || result < 0) return null;

  return Math.round(result * 100) / 100; // Round to 2 decimals
}

/**
 * Check if a string contains math operators (is an expression, not just a number)
 */
export function isExpression(str) {
  if (!str) return false;
  return /[+\-*/×÷()]/.test(str.replace(/^-/, '')); // ignore leading minus
}

/**
 * Format expression for display with result preview
 * @returns {{ expression: string, result: number|null, isValid: boolean }}
 */
export function previewExpression(expr) {
  const result = evaluateExpression(expr);
  return {
    expression: expr,
    result,
    isValid: result !== null,
    hasOperator: isExpression(expr)
  };
}
