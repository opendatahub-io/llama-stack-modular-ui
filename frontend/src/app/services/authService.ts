import axios from 'axios';

export type OAuthConfig = {
  oauthEnabled: boolean;
  oauthClientId: string;
  oauthRedirectUri: string;
  oauthServerUrl: string;
};

class AuthService {
  private token: string | null = null;
  private config?: OAuthConfig;
  private isDevelopment = process.env.NODE_ENV === 'development';

  constructor() {
    this.token = localStorage.getItem('auth_token');
    if (this.isDevelopment) {
      console.log('[Frontend] AuthService initialized. Token present:', !!this.token);
    }
  }

  async loadConfig(): Promise<OAuthConfig> {
    if (!this.config) {
      console.log('[Frontend] Fetching OAuth config from /api/v1/config');
      const response = await axios.get('/api/v1/config');
      this.config = response.data;
      console.log('[Frontend] OAuth config loaded:', this.config);
    }
    if (!this.config) {
      throw new Error('OAuth configuration could not be loaded');
    }
    return this.config;
  }

  isAuthenticated(): boolean {
    const result = !!this.token;
    if (this.isDevelopment) {
      console.log('[Frontend] isAuthenticated:', result);
    }
    return result;
  }

  getToken(): string | null {
    if (this.isDevelopment) {
      console.log('[Frontend] getToken called');
    }
    return this.token;
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
    if (this.isDevelopment) {
      console.log('[Frontend] setToken: token stored');
    }
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
    if (this.isDevelopment) {
      console.log('[Frontend] clearToken');
    }
  }

  // Handle OAuth callback
  async handleCallback(code: string, state?: string): Promise<void> {
    try {
      console.log('[Frontend] handleCallback: exchanging code for token', code);
      
      if (!state) {
        throw new Error('OAuth state parameter is missing');
      }
      
      const response = await axios.post('/api/v1/auth/callback', { 
        code, 
        state 
      });
      const { access_token } = response.data;
      if (this.isDevelopment) {
        console.log('[Frontend] OAuth token exchange successful');
      }
      this.setToken(access_token);
    } catch (error) {
      console.error('[Frontend] Error handling OAuth callback:', error);
      throw error;
    }
  }

  // Initiate OAuth login
  async initiateLogin() {
    const config = await this.loadConfig();
    const { oauthClientId, oauthRedirectUri, oauthServerUrl } = config;
    
    // Validate all required config values
    if (!oauthClientId) throw new Error('OAuth client ID is missing');
    if (!oauthRedirectUri) throw new Error('OAuth redirect URI is missing');
    if (!oauthServerUrl) throw new Error('OAuth server URL is missing');
    
    console.log('[Frontend] OAuth config:', {
      oauthClientId,
      oauthRedirectUri,
      oauthServerUrl: oauthServerUrl
    });
    
    // Get state parameter from backend
    const stateResponse = await axios.get('/api/v1/auth/state');
    const { state } = stateResponse.data;
    
    if (!state) {
      throw new Error('Failed to get OAuth state parameter');
    }
    
    localStorage.setItem('oauth_state', state);
    const authUrl = `${oauthServerUrl}/oauth/authorize?` +
      `response_type=code&` +
      `client_id=${encodeURIComponent(oauthClientId)}&` +
      `redirect_uri=${encodeURIComponent(oauthRedirectUri)}&` +
      `scope=${encodeURIComponent('user:info')}&` +
      `state=${encodeURIComponent(state)}`;
    console.log('[Frontend] Redirecting to OAuth login:', authUrl);
    window.location.href = authUrl;
  }



  // Logout
  logout() {
    this.clearToken();
    window.location.href = '/';
  }
}

export const authService = new AuthService(); 