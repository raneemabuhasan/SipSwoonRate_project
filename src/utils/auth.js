// Simple password hashing utility (for demo purposes)
// In production, use a proper backend with bcrypt or similar
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export function validatePassword(password) {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  return null;
}

export function validateUsername(username) {
  if (username.length < 3) {
    return 'Username must be at least 3 characters long';
  }
  if (username.length > 20) {
    return 'Username must be no more than 20 characters long';
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Username can only contain letters, numbers, and underscores';
  }
  return null;
}

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
}

export function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateResetCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Remember me token management
export function saveRememberMeToken(token) {
  localStorage.setItem('rememberMeToken', token);
}

export function getRememberMeToken() {
  return localStorage.getItem('rememberMeToken');
}

export function clearRememberMeToken() {
  localStorage.removeItem('rememberMeToken');
  localStorage.removeItem('rememberedUsername');
}

// Remember username for convenience
export function saveRememberedUsername(username) {
  localStorage.setItem('rememberedUsername', username);
}

export function getRememberedUsername() {
  return localStorage.getItem('rememberedUsername');
}

export function clearRememberedUsername() {
  localStorage.removeItem('rememberedUsername');
}
