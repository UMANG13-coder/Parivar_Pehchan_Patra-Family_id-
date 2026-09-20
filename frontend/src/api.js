import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses globally (expired token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('family');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/me'),
};

// Family API
export const familyAPI = {
  getFamily: () => api.get('/family'),
  getEligibleSchemes: () => api.get('/family/eligible-schemes'),
  updateFamily: (data) => api.put('/family', data),
  addMember: (data) => api.post('/family/members', data),
  editMember: (citizenId, data) => api.put(`/family/members/${citizenId}`, data),
  removeMember: (citizenId) => api.delete(`/family/members/${citizenId}`),
  verifyMember: (citizenId, otp) => api.put(`/family/members/${citizenId}/verify`, { otp }),
  makeHead: (citizenId) => api.put(`/family/members/${citizenId}/make-head`),
  submitApplication: () => api.post('/family/submit'),
};

// Document API
export const documentAPI = {
  getDocuments: () => api.get('/documents'),
  uploadDocument: (formData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteDocument: (mappingId) => api.delete(`/documents/${mappingId}`),
};

// Officer API
export const officerAPI = {
  getApplications: (status) => api.get('/officer/applications', { params: { status } }),
  getApplicationDetail: (familyId) => api.get(`/officer/applications/${familyId}`),
  verifyDocument: (mappingId, action, reject_reason) =>
    api.put(`/officer/documents/${mappingId}/verify`, { action, reject_reason }),
  approveApplication: (familyId) => api.post(`/officer/applications/${familyId}/approve`),
  rejectApplication: (familyId, reason) => api.post(`/officer/applications/${familyId}/reject`, { reason }),
  seedOfficer: () => api.post('/auth/seed-officer'),
};

export const adminAPI = {
  // Officers
  getOfficers: () => api.get('/admin/officers'),
  createOfficer: (data) => api.post('/admin/officers', data),
  updateOfficer: (id, data) => api.put(`/admin/officers/${id}`, data),
  deleteOfficer: (id) => api.delete(`/admin/officers/${id}`),
  // Families
  getFamilies: () => api.get('/admin/families'),
  getFamilyDetails: (id) => api.get(`/admin/families/${id}`),
  // Schemes
  getSchemes: () => api.get('/admin/schemes'),
  createScheme: (data) => api.post('/admin/schemes', data),
  updateScheme: (id, data) => api.put(`/admin/schemes/${id}`, data),
  deleteScheme: (id) => api.delete(`/admin/schemes/${id}`),
};

export default api;
