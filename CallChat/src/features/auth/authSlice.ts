import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { tokenStorage } from '../../shared/services/storage'
import { authService } from './authService'
import type { AuthResponse, AuthState, LoginPayload, RegisterPayload, User } from './authTypes'
import { updateProfile, uploadAvatar } from '../users/usersSlice'

const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Không thể kết nối tới máy chủ'
export const login = createAsyncThunk<AuthResponse, LoginPayload, { rejectValue: string }>('auth/login', async (payload, { rejectWithValue }) => { try { return await authService.login(payload) } catch (error) { return rejectWithValue(messageOf(error)) } })
export const register = createAsyncThunk<AuthResponse, RegisterPayload, { rejectValue: string }>('auth/register', async (payload, { rejectWithValue }) => { try { return await authService.register(payload) } catch (error) { return rejectWithValue(messageOf(error)) } })
export const restoreSession = createAsyncThunk<User, string, { rejectValue: string }>('auth/restoreSession', async (token, { rejectWithValue }) => { try { return await authService.getMe(token) } catch (error) { return rejectWithValue(messageOf(error)) } })
const storedToken = tokenStorage.get()
const initialState: AuthState = { user: null, token: storedToken, status: 'idle', restoring: Boolean(storedToken), error: null }
const authSlice = createSlice({
  name: 'auth', initialState,
  reducers: {
    logout: (state) => { state.user = null; state.token = null; state.status = 'idle'; state.error = null },
    clearAuthError: (state) => { state.error = null },
  },
  extraReducers: (builder) => builder
    .addCase(updateProfile.fulfilled, (state, action) => { state.user = action.payload })
    .addCase(uploadAvatar.fulfilled, (state, action) => { state.user = action.payload })
    .addCase(restoreSession.fulfilled, (state, action) => { state.user = action.payload; state.token = action.meta.arg; state.status = 'authenticated'; state.restoring = false })
    .addCase(restoreSession.rejected, (state) => { state.user = null; state.token = null; state.status = 'idle'; state.restoring = false })
    .addMatcher((action) => login.pending.match(action) || register.pending.match(action), (state) => { state.status = 'loading'; state.error = null })
    .addMatcher((action) => login.fulfilled.match(action) || register.fulfilled.match(action), (state, action) => { state.user = action.payload.user; state.token = action.payload.accessToken; state.status = 'authenticated' })
    .addMatcher((action) => login.rejected.match(action) || register.rejected.match(action), (state, action) => { state.status = 'failed'; state.error = action.payload ?? 'Xác thực không thành công' }),
})
export const { logout, clearAuthError } = authSlice.actions
export default authSlice.reducer
