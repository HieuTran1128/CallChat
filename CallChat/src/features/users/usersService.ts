import { apiRequest } from '../../shared/services/api'
import type { User } from '../auth/authTypes'

export interface UpdateProfilePayload { displayName: string }
export interface ChangePasswordPayload { currentPassword: string; newPassword: string }

export const usersService = {
  updateProfile: (data: UpdateProfilePayload) =>
    apiRequest<User>('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
  changePassword: (data: ChangePasswordPayload) =>
    apiRequest<void>('/users/me/password', { method: 'PATCH', body: JSON.stringify(data) }),
  uploadAvatar: (file: File) => {
    const body = new FormData()
    body.append('avatar', file)
    return apiRequest<User>('/users/me/avatar', { method: 'PATCH', body })
  },
}
