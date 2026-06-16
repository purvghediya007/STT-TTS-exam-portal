// frontend/practice/services/codingApi.js
import axiosInstance from '../../api/axiosInstance';

const BASE = '/practice/coding';

// Health check
export const checkJudgeHealth = () => axiosInstance.get(`${BASE}/health`);

// Topics
export const getCodingTopics = () => axiosInstance.get(`${BASE}/topics`);

// Problems
export const getCodingProblems = (params = {}) =>
  axiosInstance.get(`${BASE}/problems`, { params }).then((r) => r.data);

export const getCodingProblem = (slug) =>
  axiosInstance.get(`${BASE}/problems/${slug}`).then((r) => r.data);

// Code execution
export const runCode = (slug, language, code) =>
  axiosInstance.post(`${BASE}/run`, { slug, language, code }).then((r) => r.data);

export const submitCode = (slug, language, code) =>
  axiosInstance.post(`${BASE}/submit`, { slug, language, code }).then((r) => r.data);

// Submissions & Progress
export const getSubmissions = (slug) =>
  axiosInstance.get(`${BASE}/submissions/${slug}`).then((r) => r.data);

export const getCodingProgress = () =>
  axiosInstance.get(`${BASE}/progress`).then((r) => r.data);
