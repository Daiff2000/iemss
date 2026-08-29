// Generates strong random passwords (upper + lower + digit + symbol) for
// admin-issued credentials. Employees are forced to change these on first login.
const LOWER = 'abcdefghjkmnpqrstuvwxyz';
const UPPER = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const DIGIT = '23456789';
const SYMBOL = '!@#$%*?-';
const ALL = LOWER + UPPER + DIGIT + SYMBOL;

function pick(chars) { return chars[Math.floor(Math.random() * chars.length)]; }

function generateComplexPassword(length = 10) {
  const required = [pick(LOWER), pick(UPPER), pick(DIGIT), pick(SYMBOL)];
  const rest = Array.from({ length: Math.max(length - required.length, 0) }, () => pick(ALL));
  const chars = [...required, ...rest];
  // shuffle (Fisher-Yates)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

module.exports = { generateComplexPassword };
