import type { User, UserRole } from '../auth/authTypes'

export interface AdminUser extends User { isActive: boolean; createdAt: string; updatedAt: string }
export interface Pagination { page: number; limit: number; total: number; totalPages: number }
export interface AdminUsersResponse { items: AdminUser[]; pagination: Pagination }
export interface AdminUsersQuery { page: number; limit: number; q?: string }
export interface UpdateRolePayload { userId: string; role: UserRole }
export interface UpdateStatusPayload { userId: string; isActive: boolean }
