function decodeToken(token) {
  try {
    const payloadPart = token.split(".")[1];
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");

    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}
export function getUser() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  return decodeToken(token);
}
export function getRole() {
  try {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser?.role) {
      return storedUser.role.replace(/^ROLE_/i, "").toUpperCase();
    }
  } catch {}

  const decoded = getUser();
  const rawRole =
    decoded?.role ||
    decoded?.roles?.[0] ||
    decoded?.authorities?.[0]?.authority ||
    null;

  if (rawRole) {
    return rawRole.replace(/^ROLE_/i, "").toUpperCase();
  }

  return null;
}

export function hasRole(...roles) {
  const currentRole = (getRole() || "").toUpperCase();
  return roles.map((r) => r.toUpperCase()).includes(currentRole);
}
export function isAuthenticated() {
  const token = localStorage.getItem("token");
  if (!token) return false;

  const decoded = decodeToken(token);
  if (!decoded) return false;
  if (decoded.exp && decoded.exp * 1000 < Date.now()) {
    localStorage.removeItem("token");
    return false;
  }

  return true;
}

export function canManageProjects() {
  return hasRole("ADMIN");
}
