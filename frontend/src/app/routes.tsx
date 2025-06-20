import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { authService } from './services/authService';

const ChatbotMain = lazy(() => import('./Chatbot/ChatbotMain'));
const NotFound = lazy(() => import('./NotFound/NotFound'));
const OAuthCallback = lazy(() => import('./OAuth/OAuthCallback'));

const AppRoutes = () => {
  const isAuthenticated = authService.isAuthenticated();

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
                  onClick={() => authService.initiateLogin()}
                >
                  Login with OpenShift
                </button>
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
