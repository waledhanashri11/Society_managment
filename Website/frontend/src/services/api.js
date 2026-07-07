import axios from 'axios';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const API_URL = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

export const userAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const flatAPI = {
  getAll: () => api.get('/flats'),
  getById: (id) => api.get(`/flats/${id}`),
  create: (data) => api.post('/flats', data),
  update: (id, data) => api.put(`/flats/${id}`, data),
  delete: (id) => api.delete(`/flats/${id}`),
};

export const maintenanceAPI = {
  getAll: () => api.get('/maintenance'),
  getById: (id) => api.get(`/maintenance/${id}`),
  create: (data) => api.post('/maintenance', data),
  update: (id, data) => api.put(`/maintenance/${id}`, data),
  delete: (id) => api.delete(`/maintenance/${id}`),
  generateBills: (data) => api.post('/maintenance/generate', data),
  getBills: () => api.get('/maintenance/bills'),
  getBillById: (id) => api.get(`/maintenance/bills/${id}`),
  submitPayment: (data) => api.post('/maintenance/payments', data),
  updatePayment: (id, data) => api.put(`/maintenance/payments/${id}`, data),
  getPayments: () => api.get('/maintenance/payments'),
  getReports: (type) => api.get(`/maintenance/reports?type=${type}`),
  getUserMaintenance: () => api.get('/maintenance/user/my-maintenance'),
};

export const complaintAPI = {
  getAll: () => api.get('/complaints'),
  getById: (id) => api.get(`/complaints/${id}`),
  create: (data) => api.post('/complaints', data),
  update: (id, data) => api.put(`/complaints/${id}`, data),
  delete: (id) => api.delete(`/complaints/${id}`),
  getUserComplaints: () => api.get('/complaints/user/my-complaints'),
};

export const noticeAPI = {
  getAll: () => api.get('/notices'),
  getLatest: () => api.get('/notices/latest'),
  getById: (id) => api.get(`/notices/${id}`),
  create: (data) => api.post('/notices', data),
  delete: (id) => api.delete(`/notices/${id}`),
};

export const staffAPI = {
  getAll: () => api.get('/staff'),
  getById: (id) => api.get(`/staff/${id}`),
  create: (data) => api.post('/staff', data),
  update: (id, data) => api.put(`/staff/${id}`, data),
  delete: (id) => api.delete(`/staff/${id}`),
};

export { api };
export default api;
