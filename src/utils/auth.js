// Auth helper functions for checking login status and user roles
//
// How it works:
// When a user logs in, the server returns a JWT token.
// The token is saved in localStorage under the key 'token'.
// A JWT has 3 parts: header.payload.signature
// The payload contains user info like their role and expiry time.

// Decode a JWT token and return the payload as a JavaScript object
function decodeToken(token) {
  try {
    // A JWT looks like: "xxxxx.YYYYY.zzzzz" — we need the middle part
    const payloadPart = token.split('.')[1];

    // JWT uses URL-safe base64 — convert back to standard base64 before decoding
    const base64 = payloadPart
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

// Get the decoded user object from the token saved in localStorage
export function getUser() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  return decodeToken(token);
}

// Get the current user's role as an uppercase string (e.g. "ADMIN", "DEVELOPER")
export function getRole() {
  // Try reading the role from the stored user object first
  try {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser?.role) {
      // Remove "ROLE_" prefix if present (e.g. "ROLE_ADMIN" → "ADMIN")
      return storedUser.role.replace(/^ROLE_/i, '').toUpperCase();
    }
  } catch {
    // Ignore parse errors and fall through to the token fallback
  }

  // Fallback: read the role from the decoded JWT token
  const decoded = getUser();
  const rawRole =
    decoded?.role ||
    decoded?.roles?.[0] ||
    decoded?.authorities?.[0]?.authority ||
    null;

  if (rawRole) {
    return rawRole.replace(/^ROLE_/i, '').toUpperCase();
  }

  return null;
}

// Check if the current user has one of the given roles
// Usage: hasRole('ADMIN', 'MANAGER')
export function hasRole(...roles) {
  const currentRole = (getRole() || '').toUpperCase();
  return roles.map(r => r.toUpperCase()).includes(currentRole);
}

// Check if the user is logged in with a valid, non-expired token
export function isAuthenticated() {
  const token = localStorage.getItem('token');
  if (!token) return false;

  const decoded = decodeToken(token);
  if (!decoded) return false;

  // Check if the token has expired
  if (decoded.exp && decoded.exp * 1000 < Date.now()) {
    localStorage.removeItem('token');
    return false;
  }

  return true;
}

// Check if the current user is an admin
export function canManageProjects() {
  return hasRole('ADMIN');
}
