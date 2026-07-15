export const getToken = () => localStorage.getItem('token');
export const getUser = () => JSON.parse(localStorage.getItem('user') || 'null');
export const setToken = (token) => localStorage.setItem('token', token);
export const setUser = (user) => localStorage.setItem('user', JSON.stringify(user));

const clearSessionApiCache = () => {
  try {
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith('society-api-cache:'))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch (error) {
    // Logging out should never fail because cache storage is unavailable.
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('adminSettings');
  clearSessionApiCache();
};
