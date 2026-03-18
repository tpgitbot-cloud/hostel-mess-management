import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getStoredToken, getUserRole } from '../utils/auth';

export const ProtectedRoute = ({ children, requiredRole }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    const userRole = getUserRole();

    if (!token) {
      setIsAuthorized(false);
    } else if (requiredRole && userRole !== requiredRole) {
      setIsAuthorized(false);
    } else {
      setIsAuthorized(true);
    }
    setIsLoading(false);
  }, [requiredRole]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return isAuthorized ? children : <Navigate to="/login" />;
};

export default ProtectedRoute;
