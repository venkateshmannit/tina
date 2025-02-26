// src/pages/GitHubCallback.tsx
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GitHubCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const accessToken = params.get('access_token');
    const username = params.get('username');
    const authType = params.get('authType');

    if (accessToken && username && authType === 'github') {
      login(username, accessToken, 'github');
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [login, location, navigate]);

  return <div>Authenticating...</div>;
};

export default GitHubCallback;