import axios from 'axios';

class AuthService {
  private token: string | null = null;

  constructor() {
    // Try to get token from localStorage on initialization
    this.token = localStorage.getItem('auth_token');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  // Handle OAuth callback
  async handleCallback(code: string): Promise<void> {
    try {
      const response = await axios.post('/api/v1/auth/callback', { code });
      const { access_token } = response.data;
      this.setToken(access_token);
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      throw error;
    }
  }

  // Initiate OAuth login
  initiateLogin() {
    const clientId = process.env.REACT_APP_OAUTH_CLIENT_ID;
    const redirectUri = process.env.REACT_APP_OAUTH_REDIRECT_URI;
    const oauthUrl = process.env.REACT_APP_OAUTH_SERVER_URL;
    
    if (!clientId || !redirectUri || !oauthUrl) {
      throw new Error('OAuth configuration is missing');
    }

    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('oauth_state', state);

    const authUrl = `${oauthUrl}/oauth/authorize?` +
      `response_type=code&` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${encodeURIComponent(state)}`;

    window.location.href = authUrl;
  }

  // Logout
  logout() {
    this.clearToken();
    window.location.href = '/';
  }
}

export const authService = new AuthService(); 