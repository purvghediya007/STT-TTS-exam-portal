// frontend/src/practice/services/practiceApi.js
// Uses existing axiosInstance from the platform
import api from '../../api/axiosInstance';

// Learning content
export const getLearningTopics = () => api.get('/practice/learning').then(r => r.data);
export const getLearningContent = (topic) => api.get(`/practice/learning/${topic}`).then(r => r.data);

// Topics with counts
export const getTopics = () => api.get('/practice/topics').then(r => r.data);

// Company-wise practice
export const getCompanies = () => api.get('/practice/companies').then(r => r.data);

// Practice history & analytics
export const getHistory = () => api.get('/practice/history').then(r => r.data);

// Session management
export const startPractice = (config) => api.post('/practice/start', config).then(r => r.data);
export const getSession = (sessionId) => api.get(`/practice/session/${sessionId}`).then(r => r.data);

// Answer saving
export const saveAnswer = (data) => api.post('/practice/save-answer', data).then(r => r.data);
export const saveAudio = (data) => api.post('/practice/save-audio', data).then(r => r.data);

// Timer sync
export const updateTime = (data) => api.post('/practice/update-time', data).then(r => r.data);

// Submit
export const submitPractice = (data) => api.post('/practice/submit', data).then(r => r.data);
