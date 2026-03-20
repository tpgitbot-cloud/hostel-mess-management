export const getStoredUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const getStoredToken = () => {
  return localStorage.getItem('token');
};

export const saveUser = (user, token) => {
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('token', token);
};

export const clearAuth = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
};

export const isAuthenticated = () => {
  return !!getStoredToken();
};

export const getUserRole = () => {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    
    // Replace base64url characters with base64 characters
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(jsonPayload);
    return payload.role;
  } catch (error) {
    console.error('Token decoding error:', error);
    return null;
  }
};
