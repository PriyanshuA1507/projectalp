import { Api } from '../api/Api.js';

class AuthService {
  constructor() {
    this.api = new Api(import.meta.env.VITE_BASEURL);
  }

  async login(email, password, role) {
    return this.api.post('/auth/login', { email, password, role });
  }

  async changePassword(oldPassword, newPassword) {
    return this.api.post('/auth/change-password', { oldPassword, newPassword });
  }

  async logout() {
    return this.api.post('/auth/logout', {});
  }

  async getProfile() {
    return this.api.get('/auth/profile');
  }

  async verifyRole(role) {
    return this.api.post('/auth/verify-role', { role });
  }


}

export const authService = new AuthService();
