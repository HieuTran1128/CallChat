import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { adminService } from './adminService'
import type { AdminUser, AdminUsersQuery, AdminUsersResponse, Pagination, UpdateRolePayload, UpdateStatusPayload } from './adminTypes'

interface AdminState { users: AdminUser[]; pagination: Pagination; status: 'idle' | 'loading' | 'failed'; error: string | null }
const initialState: AdminState = { users: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }, status: 'idle', error: null }
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Yêu cầu không thành công'
export const fetchAdminUsers = createAsyncThunk<AdminUsersResponse, AdminUsersQuery, { rejectValue: string }>('admin/fetchUsers', async (query, { rejectWithValue }) => { try { return await adminService.getUsers(query) } catch (error) { return rejectWithValue(messageOf(error)) } })
export const updateAdminUserStatus = createAsyncThunk<AdminUser, UpdateStatusPayload, { rejectValue: string }>('admin/updateStatus', async (data, { rejectWithValue }) => { try { return await adminService.updateStatus(data) } catch (error) { return rejectWithValue(messageOf(error)) } })
export const updateAdminUserRole = createAsyncThunk<AdminUser, UpdateRolePayload, { rejectValue: string }>('admin/updateRole', async (data, { rejectWithValue }) => { try { return await adminService.updateRole(data) } catch (error) { return rejectWithValue(messageOf(error)) } })

const adminSlice = createSlice({
  name: 'admin', initialState, reducers: {},
  extraReducers: (builder) => builder
    .addCase(fetchAdminUsers.fulfilled, (state, action) => { state.users = action.payload.items; state.pagination = action.payload.pagination; state.status = 'idle' })
    .addMatcher((action) => updateAdminUserStatus.fulfilled.match(action) || updateAdminUserRole.fulfilled.match(action), (state, action) => { const index = state.users.findIndex((user) => user.id === action.payload.id); if (index >= 0) state.users[index] = action.payload })
    .addMatcher((action) => fetchAdminUsers.pending.match(action) || updateAdminUserStatus.pending.match(action) || updateAdminUserRole.pending.match(action), (state) => { state.status = 'loading'; state.error = null })
    .addMatcher((action) => fetchAdminUsers.rejected.match(action) || updateAdminUserStatus.rejected.match(action) || updateAdminUserRole.rejected.match(action), (state, action) => { state.status = 'failed'; state.error = action.payload ?? 'Yêu cầu không thành công' }),
})
export default adminSlice.reducer
