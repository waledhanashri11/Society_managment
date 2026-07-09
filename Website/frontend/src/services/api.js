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
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

export const userAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  updateStatus: (id, status) => api.put(`/users/${id}/status`, { status }),
  delete: (id) => api.delete(`/users/${id}`),
};

export const flatAPI = {
  getAll: () => api.get('/flats'),
  getAvailable: () => api.get('/flats/available'),
  getById: (id) => api.get(`/flats/${id}`),
  create: (data) => api.post('/flats', data),
  update: (id, data) => api.put(`/flats/${id}`, data),
  delete: (id) => api.delete(`/flats/${id}`),
};

export const maintenanceAPI = {
  getDashboard: () => api.get('/maintenance/dashboard'),
  getSettings: () => api.get('/maintenance/settings'),
  saveSettings: (data) => api.post('/maintenance/settings', data),
  applyPenalty: () => api.post('/maintenance/apply-penalty'),
  getAll: () => api.get('/maintenance'),
  getById: (id) => api.get(`/maintenance/${id}`),
  create: (data) => api.post('/maintenance', data),
  update: (id, data) => api.put(`/maintenance/${id}`, data),
  delete: (id) => api.delete(`/maintenance/${id}`),
  generateBills: (data) => api.post('/maintenance/generate', data),
  getBills: () => api.get('/maintenance/bills'),
  getBillById: (id) => api.get(`/maintenance/bills/${id}`),
  pay: (id, data) => api.put(`/maintenance/${id}/pay`, data),
  markBillPaid: (id, data) => api.put(`/maintenance/bills/${id}/mark-paid`, data),
  sendReminder: (id) => api.post(`/maintenance/bills/${id}/reminder`),
  submitPayment: (data) => api.post('/maintenance/payments', data),
  updatePayment: (id, data) => api.put(`/maintenance/payments/${id}`, data),
  getPayments: () => api.get('/maintenance/payments'),
  getReports: (type) => api.get(`/maintenance/reports?type=${type}`),
  getUserMaintenance: () => api.get('/maintenance/user/my-maintenance'),
  getCategories: () => api.get('/maintenance/categories'),
  createCategory: (data) => api.post('/maintenance/categories', data),
  updateCategory: (id, data) => api.put(`/maintenance/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/maintenance/categories/${id}`),
  getExpenses: (params = {}) => api.get('/maintenance/expenses', { params }),
  createExpense: (data) => api.post('/maintenance/expenses', data),
  deleteExpense: (id) => api.delete(`/maintenance/expenses/${id}`),
  getLateFeeRule: () => api.get('/maintenance/late-fee-rule'),
  saveLateFeeRule: (data) => api.put('/maintenance/late-fee-rule', data),
  waiveLateFee: (id) => api.put(`/maintenance/bills/${id}/waive-late-fee`),
  createDispute: (data) => api.post('/maintenance/disputes', data),
  getDisputes: () => api.get('/maintenance/disputes'),
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

export const settingsAPI = {
  get: () => api.get('/settings'),
  getPayment: () => api.get('/settings/payment'),
  update: (data) => api.put('/settings', data),
};

export const notificationAPI = {
  getAdmin: () => api.get('/notifications/admin'),
  markAdminRead: () => api.put('/notifications/admin/read'),
};

export const residentAPI = {
  getDashboard: () => api.get('/resident/dashboard'),
  getMembers: () => api.get('/resident/members'),
  updateProfile: (data) => api.put('/resident/profile', data),
  getReportSummary: () => api.get('/resident/reports/my-summary'),
  getReportMaintenance: (params = {}) => api.get('/resident/reports/my-maintenance', { params }),
  getSocietyReportSummary: (params = {}) => api.get('/resident/reports/society-summary', { params }),
  getReportExpenses: (params = {}) => api.get('/resident/reports/expenses', { params }),
};

export { api };
export default api;
