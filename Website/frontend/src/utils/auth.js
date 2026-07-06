export const getToken = () => localStorage.getItem('token');
export const getUser = () => JSON.parse(localStorage.getItem('user') || 'null');
export const setToken = (token) => localStorage.setItem('token', token);
export const setUser = (user) => localStorage.setItem('user', JSON.stringify(user));
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};
