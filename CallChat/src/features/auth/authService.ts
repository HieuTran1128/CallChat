import { apiRequest } from '../../shared/services/api'
import type { AuthResponse, LoginPayload, RegisterPayload, User } from './authTypes'

type ApiUser = Omit<User, 'id'> & { id?: string; _id?: string }
type ApiAuthResponse = Omit<AuthResponse, 'user'> & { user: ApiUser }

function normalizeUser(user: ApiUser): User {
  return { ...user, id: user.id ?? user._id ?? '' }
}

function normalizeAuth(response: ApiAuthResponse): AuthResponse {
  return { ...response, user: normalizeUser(response.user) }
}

export const authService = {
  login: (data: LoginPayload) =>
    apiRequest<ApiAuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(normalizeAuth),
  register: (data: RegisterPayload) =>
    apiRequest<ApiAuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(normalizeAuth),
  getMe: (token: string) =>
    apiRequest<ApiUser>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    }).then(normalizeUser),
}
