import axios from "axios";
import { jwtDecode } from "jwt-decode";

const API_URL = import.meta.env.VITE_API_URL;
const FRONT_URL = import.meta.env.VITE_FRONTEND_URL;

const api = axios.create({ baseURL: `${API_URL}/api` });

// Rutas públicas (no poner Authorization ni forzar redirect)
const PUBLIC_PATHS = [
  "/auth/login",
  "/auth/registro",
  "/auth/refresh",
];

api.interceptors.request.use(
  (config) => {
    const isPublic = PUBLIC_PATHS.some(p => config.url?.startsWith(p));
    if (isPublic) return config;

    const token = localStorage.getItem("token");
    if (token) {
      try {
        const { exp } = jwtDecode(token);
        if (Date.now() >= exp * 1000) {
          localStorage.clear();
          // no redirijas si estás ya en una pública
          if (!isPublic) window.location.href = FRONT_URL;
          return Promise.reject("Token expirado");
        }
        config.headers.Authorization = `Bearer ${token}`;
      } catch (e) {
        console.error("Error decodificando token:", e);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// (Opcional) Respuesta 401 global – evita actuar en endpoints públicos
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err?.config?.url || "";
    const isPublic = PUBLIC_PATHS.some(p => url.startsWith(p));
    if (err?.response?.status === 401 && !isPublic) {
      localStorage.clear();
      window.location.href = FRONT_URL;
    }
    return Promise.reject(err);
  }
);

export default api;