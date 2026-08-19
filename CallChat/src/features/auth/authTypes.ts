export type UserRole = 'USER' | 'ADMIN'
export interface User { id: string; username: string; email: string; displayName: string; avatarUrl?: string; status: string; role: UserRole }
export interface AuthResponse { accessToken: string; user: User }
export interface LoginPayload { identifier: string; password: string }
export interface RegisterPayload { username: string; email: string; password: string; displayName: string }
export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'failed'
export interface AuthState { user: User | null; token: string | null; status: AuthStatus; restoring: boolean; error: string | null }
