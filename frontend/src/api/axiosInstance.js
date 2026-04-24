import axios from "axios";

// Production API URL - directly hardcoded to avoid Vercel env variable issues
const API_URL = "https://stt-tts-exam-portal.onrender.com/api";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: false, // set true if using cookies
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
