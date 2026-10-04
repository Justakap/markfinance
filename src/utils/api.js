import axios from "axios";
import { API_URL } from "../config/api";
import { clearSession } from "./auth";

let axiosInterceptorInstalled = false;

/** Invalid/expired JWT — clear local auth state and bounce to login so the
 *  app doesn't keep firing authenticated requests with a dead token. */
function handleUnauthorized() {
  clearSession();
  delete axios.defaults.headers.common.Authorization;

  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = new Headers(options.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (response.status === 401) {
    handleUnauthorized();
  }

  if (!response.ok) {
    const error = new Error(data?.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export function setupAxiosAuth() {
  const token = localStorage.getItem("token");

  if (token) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  if (!axiosInterceptorInstalled) {
    axiosInterceptorInstalled = true;

    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          handleUnauthorized();
        }
        return Promise.reject(error);
      },
    );
  }
}
