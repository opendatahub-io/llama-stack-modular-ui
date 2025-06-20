import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { authService } from './services/authService';

const ChatbotMain = lazy(() => import('./Chatbot/ChatbotMain'));
const NotFound = lazy(() => import('./NotFound/NotFound'));
const OAuthCallback = lazy(() => import('./OAuth/OAuthCallback'));

const AppRoutes = () => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(authService.isAuthenticated());
  const [loginError, setLoginError] = React.useState<string | null>(null);

  // Listen for storage changes (e.g., after login in another tab)
  React.useEffect(() => {
    const checkAuth = () => setIsAuthenticated(authService.isAuthenticated());
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  // Check auth on mount and after login
  React.useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
  }, []);

  return (
    <Suspense
      fallback={
        <Bullseye>
          <Spinner />
        </Bullseye>
      }
    >
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <ChatbotMain />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/login"
          element={
            !isAuthenticated ? (
              <div className="pf-u-text-align-center pf-u-mt-xl">
                <h1>Welcome to Llama Stack</h1>
                <button
                  className="pf-c-button pf-m-primary pf-u-mt-xl"
                  onClick={async () => {
                    setLoginError(null);
                    try {
                      await authService.initiateLogin();
                      setIsAuthenticated(authService.isAuthenticated());
                    } catch (e: any) {
                      setLoginError(e?.message || 'Login failed');
                    }
                  }}
                >
                  Login with OpenShift
                </button>
                {loginError && (
                  <div style={{ color: 'red', marginTop: 16 }}>{loginError}</div>
                )}
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
