import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEffect } from 'react';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('showGlobalToast', {
        detail: { title: 'Auth Required', message: 'Please login to access this feature.' }
      }));
    }
  }, [user]);

  if (!user) {
    // Redirect to login and save the intended location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
