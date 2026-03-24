const BASE_URL = "https://taskmanagement-backend-61mw.onrender.com";

export async function login(email, password) {
  return fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export async function register(body, inviteToken) {
  const url = inviteToken
    ? `${BASE_URL}/api/auth/register?token=${inviteToken}`
    : `${BASE_URL}/api/auth/register`;
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function getInviteInfo(token) {
  return fetch(`${BASE_URL}/api/teams/invite/info?token=${token}`);
}
