export const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'moderator',
  'mod',
  'official',
  'root',
  'staff',
  'support',
  'sipandswoon',
  'sip_swoon',
  'sip-and-swoon',
]);

export class UsernameValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UsernameValidationError';
    this.status = 409;
  }
}

export function normalizeUsername(username) {
  return username?.trim().toLowerCase() || null;
}

export function validateUsername(username) {
  const trimmed = username?.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.length < 3) {
    throw new UsernameValidationError('Username must be at least 3 characters long.');
  }

  if (trimmed.length > 20) {
    throw new UsernameValidationError('Username must be no more than 20 characters long.');
  }

  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    throw new UsernameValidationError('Username can only contain letters, numbers, and underscores.');
  }

  const normalized = normalizeUsername(trimmed);

  if (RESERVED_USERNAMES.has(normalized)) {
    throw new UsernameValidationError('That username is not available.');
  }

  return {
    username: trimmed,
    usernameNormalized: normalized,
  };
}
