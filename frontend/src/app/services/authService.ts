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

  constructor() {
    this.token = localStorage.getItem('auth_token');
    console.log('[Frontend] AuthService initialized. Token:', this.token);
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
    console.log('[Frontend] isAuthenticated:', result, 'Token:', this.token);
    return result;
  }

  getToken(): string | null {
    console.log('[Frontend] getToken:', this.token);
    return this.token;
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
    console.log('[Frontend] setToken:', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
    console.log('[Frontend] clearToken');
  }

  // Handle OAuth callback
  async handleCallback(code: string): Promise<void> {
    try {
      console.log('[Frontend] handleCallback: exchanging code for token', code);
      const response = await axios.post('/api/v1/auth/callback', { code });
      const { access_token } = response.data;
      console.log('[Frontend] Received access_token:', access_token);
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
    if (!oauthClientId || !oauthRedirectUri || !oauthServerUrl) {
      throw new Error('OAuth configuration is missing');
    }
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('oauth_state', state);
    const authUrl = `${oauthServerUrl}/oauth/authorize?` +
      `response_type=code&` +
      `client_id=${encodeURIComponent(oauthClientId)}&` +
      `redirect_uri=${encodeURIComponent(oauthRedirectUri)}&` +
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