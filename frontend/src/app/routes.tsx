import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Bullseye, Spinner, Button } from '@patternfly/react-core';
import { authService } from './services/authService';

const ChatbotMain = lazy(() => import('./Chatbot/ChatbotMain').then(module => ({ default: module.ChatbotMain })));
const NotFound = lazy(() => import('./NotFound/NotFound'));
const OAuthCallback = lazy(() => import('./OAuth/OAuthCallback'));

function LoginWithOpenShift({ setIsAuthenticated }: { setIsAuthenticated: (v: boolean) => void }) {
  const [loginError, setLoginError] = React.useState<string | null>(null);
  return (
    <div className="login-container">
      <Button variant="primary" className="login-btn" onClick={authenticate(setLoginError, setIsAuthenticated)} >
        Login with OpenShift
      </Button>
      {loginError && <div className="login-error">{loginError}</div>}
    </div>
  );
}

function authenticate(setLoginError: React.Dispatch<React.SetStateAction<string | null>>, setIsAuthenticated: (v: boolean) => void): React.MouseEventHandler<HTMLButtonElement> | undefined {
  return async () => {
    setLoginError(null);
    try {
      await authService.initiateLogin();
      setIsAuthenticated(authService.isAuthenticated());
    } catch (e: any) {
      setLoginError(e?.message || 'Login failed');
    }
  };
}

// Protected route wrapper component
function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const [isAuthenticated] = React.useState(authService.isAuthenticated());
  console.log('[ProtectedRoute] isAuthenticated:', isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export interface IAppRoute {
  label?: string; // Excluding the label will exclude the route from the nav sidebar in AppLayout
  /* eslint-disable @typescript-eslint/no-explicit-any */
  element: React.ReactElement;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  exact?: boolean;
  path: string;
  title: string;
  routes?: undefined;
  protected?: boolean; // New field to indicate if route requires authentication
}

export interface IAppRouteGroup {
  label: string;
  routes: IAppRoute[];
}
export type AppRouteConfig = IAppRoute | IAppRouteGroup;

const routes: AppRouteConfig[] = [
  {
    element: <ChatbotMain />,
    exact: true,
    label: 'Chatbot',
    path: '/',
    title: 'Chatbot Main Page',
    protected: true, // This route requires authentication
  },
];

const flattenedRoutes: IAppRoute[] = routes.reduce(
  (flattened, route) => [...flattened, ...(route.routes ? route.routes : [route])],
  [] as IAppRoute[],
);

const AppRoutes = (): React.ReactElement => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(authService.isAuthenticated());
  const [isAuthReady, setIsAuthReady] = React.useState(false);

  // Stable authentication check that doesn't cause flickering
  React.useEffect(() => {
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      console.log('[Routes] checkAuth result:', authenticated);
      setIsAuthenticated(authenticated);
      setIsAuthReady(true);
    };

    // Initial check
    checkAuth();

    // Listen for storage changes (e.g., after login in another tab)
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  // Don't render anything until we've done the initial auth check
  if (!isAuthReady) {
    return <Bullseye><Spinner /></Bullseye>;
  }

  return (
    <Suspense fallback={<Bullseye><Spinner /></Bullseye>}>
      <Routes>
        {/* Dynamic routes from flattened routes array */}
        {flattenedRoutes.map(({ path, element, protected: isProtected }, idx) => (
          <Route key={idx} path={path} element={isProtected ? <ProtectedRoute>{element}</ProtectedRoute> : element} />
        ))}
        {/* Authentication routes */}
        <Route path="/login" element={!isAuthenticated
          ? (<LoginWithOpenShift setIsAuthenticated={setIsAuthenticated} />)
          : (<Navigate to="/" replace />)} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />

        {/* Fallback route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
export { AppRoutes, routes };