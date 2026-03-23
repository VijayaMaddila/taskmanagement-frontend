const BASE_URL = "http://localhost:8080";
function authHeader() {
  const token = localStorage.getItem("token");
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}
export async function fetchPage(path, page = 0, size = 10) {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${BASE_URL}${path}${separator}page=${page}&size=${size}`;

  const response = await fetch(url, {
    headers: authHeader(),
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
    return { content: [], totalPages: 0, totalElements: 0 };
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    return {
      content: data,
      totalPages: 1,
      totalElements: data.length,
    };
  }

  return {
    content: data.content ?? data.data ?? [],
    totalPages: data.totalPages ?? 1,
    totalElements: data.totalElements ?? 0,
  };
}

export async function fetchAll(path, size = 10) {
  const firstPage = await fetchPage(path, 0, size);

  if (firstPage.totalPages <= 1) {
    return firstPage.content;
  }
  const pageNumbers = Array.from(
    { length: firstPage.totalPages - 1 },
    (_, i) => i + 1,
  );
  const remainingPages = await Promise.all(
    pageNumbers.map((pageNum) => fetchPage(path, pageNum, size)),
  );
  const allItems = [
    firstPage.content,
    ...remainingPages.map((page) => page.content),
  ].flat();

  return allItems;
}
export async function apiGet(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: authHeader(),
  });
  return response;
}
export async function apiPost(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      ...authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return response;
}
export async function apiPut(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: {
      ...authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return response;
}
export async function apiDelete(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers: authHeader(),
  });
  return response;
}
