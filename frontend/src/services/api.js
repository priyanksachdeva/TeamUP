import axios from "axios";

function normalizeBackendUrl(value) {
  const raw = (value || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

const BACKEND_URL = normalizeBackendUrl(process.env.REACT_APP_BACKEND_URL);
export const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ttm_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/signup") {
        localStorage.removeItem("ttm_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export function formatApiError(error) {
  const detail = error?.response?.data?.detail;
  if (detail == null) return error?.message || "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default api;
