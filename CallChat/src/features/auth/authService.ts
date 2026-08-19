import { apiRequest } from '../../shared/services/api'
import type { AuthResponse, LoginPayload, RegisterPayload, User } from './authTypes'
export const authService = {
  login: (data: LoginPayload) => apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: RegisterPayload) => apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: (token: string) => apiRequest<User>('/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
}
