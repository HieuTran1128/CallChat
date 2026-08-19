import { apiRequest } from '../../shared/services/api'
import type { AdminUser, AdminUsersQuery, AdminUsersResponse, UpdateRolePayload, UpdateStatusPayload } from './adminTypes'

export const adminService = {
  getUsers: ({ page, limit, q }: AdminUsersQuery) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (q?.trim()) params.set('q', q.trim())
    return apiRequest<AdminUsersResponse>(`/admin/users?${params}`)
  },
  updateStatus: ({ userId, isActive }: UpdateStatusPayload) =>
    apiRequest<AdminUser>(`/admin/users/${userId}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
  updateRole: ({ userId, role }: UpdateRolePayload) =>
    apiRequest<AdminUser>(`/admin/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
}
