import axios from 'axios';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const API_URL = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const CACHE_PREFIX = 'society-api-cache:';
const CACHE_TTL_MS = 5 * 60 * 1000;
const pendingGetRequests = new Map();

const stableStringify = (value) => {
  if (!value) return '';
  if (typeof value !== 'object') return String(value);
  return JSON.stringify(
    Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = value[key];
        return acc;
      }, {})
  );
};

const getCacheKey = (url, config = {}) => {
  const token = localStorage.getItem('token') || 'anonymous';
  const tokenScope = token.slice(0, 18);
  return `${CACHE_PREFIX}${tokenScope}:${url}:${stableStringify(config.params)}`;
};

export const clearApiCache = (matcher = '') => {
  try {
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith(CACHE_PREFIX) && (!matcher || key.includes(matcher)))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch (error) {
    // Cache cleanup should never break the app.
  }
};

const cachedGet = async (url, config = {}, options = {}) => {
  const ttl = options.ttl ?? CACHE_TTL_MS;
  const force = options.force === true;
  const key = getCacheKey(url, config);

  if (!force) {
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.expiresAt > Date.now()) {
          return {
            data: parsed.data,
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
            cached: true,
          };
        }
        sessionStorage.removeItem(key);
      }
    } catch (error) {
      sessionStorage.removeItem(key);
    }
  }

  if (pendingGetRequests.has(key)) {
    return pendingGetRequests.get(key);
  }

  const request = api.get(url, config)
    .then((response) => {
      try {
        sessionStorage.setItem(key, JSON.stringify({
          data: response.data,
          expiresAt: Date.now() + ttl,
        }));
      } catch (error) {
        // Storage can be full/private; app should still work without cache.
      }
      return response;
    })
    .finally(() => {
      pendingGetRequests.delete(key);
    });

  pendingGetRequests.set(key, request);
  return request;
};

const mutate = async (request, cacheMatcher = '') => {
  const response = await request;
  if (Array.isArray(cacheMatcher)) {
    cacheMatcher.forEach((m) => clearApiCache(m));
  } else {
    clearApiCache(cacheMatcher);
  }
  return response;
};

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
  getAll: (config = {}) => cachedGet('/users', config),
  getById: (id, config = {}) => cachedGet(`/users/${id}`, config),
  create: (data) => mutate(api.post('/users', data), ['/users', '/flats']),
  update: (id, data) => mutate(api.put(`/users/${id}`, data), ['/users', '/flats']),
  updateStatus: (id, status) => mutate(api.put(`/users/${id}/status`, { status }), ['/users', '/flats']),
  delete: (id) => mutate(api.delete(`/users/${id}`), ['/users', '/flats']),
};

export const flatAPI = {
  getAll: (config = {}) => cachedGet('/flats', config),
  getAvailable: (config = {}) => cachedGet('/flats/available', config),
  getById: (id, config = {}) => cachedGet(`/flats/${id}`, config),
  create: (data) => mutate(api.post('/flats', data), ['/flats', '/users']),
  update: (id, data) => mutate(api.put(`/flats/${id}`, data), ['/flats', '/users']),
  delete: (id) => mutate(api.delete(`/flats/${id}`), ['/flats', '/users']),
  getCurrentResident: (id, config = {}) => cachedGet(`/flats/${id}/current-resident`, config),
  getHistory: (id, config = {}) => cachedGet(`/flats/${id}/history`, config),
  getTransfers: (id, config = {}) => cachedGet(`/flats/${id}/transfers`, config),
  getMaintenanceHistory: (id, config = {}) => cachedGet(`/flats/${id}/maintenance-history`, config),
  transfer: (data) => mutate(api.post('/flats/transfer', data), ['/flats', '/users']),
};

export const flatTypeAPI = {
  getAll: (config = {}) => cachedGet('/flat-types', config),
  create: (data) => mutate(api.post('/flat-types', data), ['/flat-types', '/flats']),
  update: (id, data) => mutate(api.put(`/flat-types/${id}`, data), ['/flat-types', '/flats']),
  delete: (id) => mutate(api.delete(`/flat-types/${id}`), ['/flat-types', '/flats']),
};

export const meetingAPI = {
  getAll: (params = {}, config = {}) => cachedGet('/meetings', { params, ...config }),
  getById: (id, config = {}) => cachedGet(`/meetings/${id}`, config),
  create: (data) => mutate(api.post('/meetings', data), '/meetings'),
  update: (id, data) => mutate(api.put(`/meetings/${id}`, data), ['/meetings', `/meetings/${id}`]),
  delete: (id) => mutate(api.delete(`/meetings/${id}`), '/meetings'),
  updateAgenda: (id, data) => mutate(api.put(`/meetings/${id}/agenda`, data), [`/meetings/${id}`, '/meetings']),
  getAttendance: (id, config = {}) => cachedGet(`/meetings/${id}/attendance`, config),
  saveAttendance: (id, data) => mutate(api.post(`/meetings/${id}/attendance`, data), [`/meetings/${id}`, '/meetings']),
  saveReport: (id, data) => mutate(api.post(`/meetings/${id}/report`, data), [`/meetings/${id}`, '/meetings']),
  createAction: (data) => mutate(api.post('/meetings/actions', data), '/meetings'),
  updateAction: (id, data) => mutate(api.put(`/meetings/actions/${id}`, data), '/meetings'),
  deleteAction: (id) => mutate(api.delete(`/meetings/actions/${id}`), '/meetings'),
  createVote: (data) => mutate(api.post('/meetings/votes', data), '/meetings'),
  castVote: (id, choice) => mutate(api.post(`/meetings/${id}/votes/cast`, { choice }), ['/meetings', `/meetings/${id}`])
};

export const residentsAPI = {
  getAll: (config = {}) => cachedGet('/residents', config),
  create: (data) => mutate(api.post('/residents', data), ['/residents', '/users', '/flats']),
};

export const maintenanceAPI = {
  getDashboard: (config = {}) => cachedGet('/maintenance/dashboard', config),
  getSettings: (config = {}) => cachedGet('/maintenance/settings', config),
  saveSettings: (data) => mutate(api.post('/maintenance/settings', data), '/maintenance'),
  applyPenalty: () => mutate(api.post('/maintenance/apply-penalty'), '/maintenance'),
  getAll: (config = {}) => cachedGet('/maintenance', config),
  getById: (id, config = {}) => cachedGet(`/maintenance/${id}`, config),
  create: (data) => mutate(api.post('/maintenance', data), '/maintenance'),
  update: (id, data) => mutate(api.put(`/maintenance/${id}`, data), '/maintenance'),
  delete: (id) => mutate(api.delete(`/maintenance/${id}`), '/maintenance'),
  generateBills: (data) => mutate(api.post('/maintenance/generate', data), '/maintenance'),
  getBills: (config = {}) => cachedGet('/maintenance/bills', config),
  getBillById: (id, config = {}) => cachedGet(`/maintenance/bills/${id}`, config),
  pay: (id, data) => mutate(api.put(`/maintenance/${id}/pay`, data), ['/maintenance', '/resident']),
  markBillPaid: (id, data) => mutate(api.put(`/maintenance/bills/${id}/mark-paid`, data), ['/maintenance', '/resident']),
  sendReminder: (id) => api.post(`/maintenance/bills/${id}/reminder`),
  submitPayment: (data) => mutate(api.post('/maintenance/payments', data), ['/maintenance', '/resident']),
  updatePayment: (id, data) => mutate(api.put(`/maintenance/payments/${id}`, data), ['/maintenance', '/resident']),
  approvePayment: (id) => mutate(api.put(`/maintenance/payments/${id}/approve`), ['/maintenance', '/resident']),
  rejectPayment: (id, data) => mutate(api.put(`/maintenance/payments/${id}/reject`, data), ['/maintenance', '/resident']),
  getPendingVerificationPayments: (config = {}) => cachedGet('/maintenance/payments/pending-verification', config),
  getPaymentHistory: (config = {}) => cachedGet('/maintenance/payments/history', config),
  getPaymentReceipt: (id, config = {}) => cachedGet(`/maintenance/payments/${id}/receipt`, config),
  getPayments: (config = {}) => api.get('/maintenance/payments', config),
  getReports: (type, config = {}) => cachedGet('/maintenance/reports', { ...config, params: { ...(config.params || {}), type } }),
  getUserMaintenance: (config = {}) => cachedGet('/maintenance/user/my-maintenance', config),
  getCategories: (config = {}) => cachedGet('/maintenance/categories', config),
  createCategory: (data) => mutate(api.post('/maintenance/categories', data), '/maintenance'),
  updateCategory: (id, data) => mutate(api.put(`/maintenance/categories/${id}`, data), '/maintenance'),
  deleteCategory: (id) => mutate(api.delete(`/maintenance/categories/${id}`), '/maintenance'),
  getResidentCategories: (config = {}) => cachedGet('/maintenance/resident-categories', config),
  getFlatCategories: (flatId, config = {}) => cachedGet(`/maintenance/flats/${flatId}/categories`, config),
  saveFlatCategories: (flatId, categoryIds) => mutate(api.put(`/maintenance/flats/${flatId}/categories`, { categoryIds }), '/maintenance'),
  bulkAssignResidentCategories: (data) => mutate(api.post('/maintenance/resident-categories/bulk', data), '/maintenance'),
  getExpenses: (params = {}, config = {}) => cachedGet('/maintenance/expenses', { ...config, params }),
  createExpense: (data) => mutate(api.post('/maintenance/expenses', data), '/maintenance'),
  deleteExpense: (id) => mutate(api.delete(`/maintenance/expenses/${id}`), '/maintenance'),
  getLateFeeRule: (config = {}) => cachedGet('/maintenance/late-fee-rule', config),
  saveLateFeeRule: (data) => mutate(api.put('/maintenance/late-fee-rule', data), '/maintenance'),
  waiveLateFee: (id) => mutate(api.put(`/maintenance/bills/${id}/waive-late-fee`), '/maintenance'),
  createDispute: (data) => mutate(api.post('/maintenance/disputes', data), '/maintenance'),
  getDisputes: (config = {}) => cachedGet('/maintenance/disputes', config),
};

export const complaintAPI = {
  getAll: (config = {}) => cachedGet('/complaints', config),
  getById: (id, config = {}) => cachedGet(`/complaints/${id}`, config),
  create: (data) => mutate(api.post('/complaints', data), '/complaints'),
  update: (id, data) => mutate(api.put(`/complaints/${id}`, data), '/complaints'),
  delete: (id) => mutate(api.delete(`/complaints/${id}`), '/complaints'),
  getUserComplaints: (config = {}) => cachedGet('/complaints/user/my-complaints', config),
  confirmResolved: (id) => mutate(api.put(`/complaints/${id}/confirm-resolved`), '/complaints'),
  reopen: (id, data) => mutate(api.put(`/complaints/${id}/reopen`, data), '/complaints'),
};

export const noticeAPI = {
  getAll: (config = {}) => cachedGet('/notices', config),
  getLatest: (config = {}) => cachedGet('/notices/latest', config),
  getById: (id, config = {}) => cachedGet(`/notices/${id}`, config),
  create: (data) => mutate(api.post('/notices', data), '/notices'),
  delete: (id) => mutate(api.delete(`/notices/${id}`), '/notices'),
};

export const staffAPI = {
  getAll: (config = {}) => cachedGet('/staff', config),
  getById: (id, config = {}) => cachedGet(`/staff/${id}`, config),
  create: (data) => mutate(api.post('/staff', data), '/staff'),
  update: (id, data) => mutate(api.put(`/staff/${id}`, data), '/staff'),
  delete: (id) => mutate(api.delete(`/staff/${id}`), '/staff'),
};

export const settingsAPI = {
  get: (config = {}) => cachedGet('/settings', config),
  getPayment: (config = {}) => cachedGet('/settings/payment', config),
  update: (data) => mutate(api.put('/settings', data), '/settings'),
};

export const notificationAPI = {
  getAdmin: (config = {}) => cachedGet('/notifications/admin', config, { ttl: 60 * 1000 }),
  markAdminRead: () => mutate(api.put('/notifications/admin/read'), '/notifications'),
  getResident: (config = {}) => cachedGet('/notifications', config, { ttl: 60 * 1000 }),
  markRead: (id) => mutate(api.put(`/notifications/${id}/read`), '/notifications'),
};

export const nocAPI = {
  createRequest: (data) => mutate(api.post('/noc/request', data), ['/noc', '/notifications']),
  getAll: (config = {}) => cachedGet('/noc', config),
  getById: (id, config = {}) => cachedGet(`/noc/${id}`, config),
  getSummary: (config = {}) => cachedGet('/noc/summary', config),
  markReview: (id, data = {}) => mutate(api.put(`/noc/${id}/review`, data), ['/noc', '/notifications']),
  approve: (id, data = {}) => mutate(api.put(`/noc/${id}/approve`, data), ['/noc', '/notifications']),
  reject: (id, data = {}) => mutate(api.put(`/noc/${id}/reject`, data), ['/noc', '/notifications']),
  getTypes: (config = {}) => cachedGet('/noc/types', config),
  createType: (data) => mutate(api.post('/noc/types', data), '/noc/types'),
  getPdf: (id) => api.get(`/noc/${id}/pdf`, { responseType: 'blob' }),
  generateShareLink: (id) => api.post(`/noc/${id}/share`),
  getPublicCertificate: (token) => api.get(`/noc/public/${token}`),
};

export const residentAPI = {
  getDashboard: (config = {}) => cachedGet('/resident/dashboard', config),
  getMembers: (config = {}) => cachedGet('/resident/members', config),
  updateProfile: (data) => mutate(api.put('/resident/profile', data), '/resident'),
  getReportSummary: (config = {}) => cachedGet('/resident/reports/my-summary', config),
  getReportMaintenance: (params = {}, config = {}) => cachedGet('/resident/reports/my-maintenance', { ...config, params }),
  getSocietyReportSummary: (params = {}, config = {}) => cachedGet('/resident/reports/society-summary', { ...config, params }),
  getReportExpenses: (params = {}, config = {}) => cachedGet('/resident/reports/expenses', { ...config, params }),
  getMembersMaintenanceReport: (params = {}, config = {}) => cachedGet('/resident/reports/members-maintenance', { ...config, params }),
  getAllMaintenanceReport: (params = {}, config = {}) => cachedGet('/resident/reports/all-maintenance', { ...config, params }),
  getComplaintsReport: (config = {}) => cachedGet('/resident/reports/complaints', config),
};

export { api };
export default api;
