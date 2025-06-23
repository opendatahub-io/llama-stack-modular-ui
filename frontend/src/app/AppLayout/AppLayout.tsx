import * as React from 'react';
import {
  Page,
  SkipToContent,
  Masthead,
  MastheadBrand,
  MastheadContent,
  Button
} from '@patternfly/react-core';
import { authService } from '../services/authService';

interface IAppLayout {
  children: React.ReactNode;
}

const AppLayout: React.FunctionComponent<IAppLayout> = ({ children }) => {
  const pageId = 'primary-app-container';
  const [isAuthenticated, setIsAuthenticated] = React.useState(authService.isAuthenticated());

  React.useEffect(() => {
    const checkAuth = () => setIsAuthenticated(authService.isAuthenticated());
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const PageSkipToContent = (
    <SkipToContent onClick={(event) => {
      event.preventDefault();
      const primaryContentContainer = document.getElementById(pageId);
      primaryContentContainer?.focus();
    }}
      href={`#${pageId}`}
    >
      Skip to Content
    </SkipToContent>
  );

  const masthead = (
    <Masthead>
      <MastheadBrand>
        <span style={{ fontWeight: 'bold', fontSize: 20 }}>Llama Stack</span>
      </MastheadBrand>
      <MastheadContent style={{ flex: 1, justifyContent: 'flex-end', display: 'flex' }}>
        {isAuthenticated && (
          <Button variant="secondary" onClick={() => authService.logout()} style={{ marginLeft: 'auto' }}>
            Logout
          </Button>
        )}
      </MastheadContent>
    </Masthead>
  );

  return (
    <Page
      mainContainerId={pageId}
      skipToContent={PageSkipToContent}
      masthead={masthead}
    >
      {children}
    </Page>
  );
};

export { AppLayout };
