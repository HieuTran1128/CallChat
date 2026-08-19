import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { usersService, type ChangePasswordPayload, type UpdateProfilePayload } from './usersService'
import type { User } from '../auth/authTypes'

interface UsersState { status: 'idle' | 'loading' | 'succeeded' | 'failed'; error: string | null }
const initialState: UsersState = { status: 'idle', error: null }
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Yêu cầu không thành công'

export const updateProfile = createAsyncThunk<User, UpdateProfilePayload, { rejectValue: string }>('users/updateProfile', async (data, { rejectWithValue }) => {
  try { return await usersService.updateProfile(data) } catch (error) { return rejectWithValue(messageOf(error)) }
})
export const changePassword = createAsyncThunk<void, ChangePasswordPayload, { rejectValue: string }>('users/changePassword', async (data, { rejectWithValue }) => {
  try { await usersService.changePassword(data) } catch (error) { return rejectWithValue(messageOf(error)) }
})
export const uploadAvatar = createAsyncThunk<User, File, { rejectValue: string }>('users/uploadAvatar', async (file, { rejectWithValue }) => {
  try { return await usersService.uploadAvatar(file) } catch (error) { return rejectWithValue(messageOf(error)) }
})

const usersSlice = createSlice({
  name: 'users', initialState,
  reducers: { clearUsersState: () => initialState },
  extraReducers: (builder) => builder
    .addMatcher((action) => updateProfile.pending.match(action) || changePassword.pending.match(action) || uploadAvatar.pending.match(action), (state) => { state.status = 'loading'; state.error = null })
    .addMatcher((action) => updateProfile.fulfilled.match(action) || changePassword.fulfilled.match(action) || uploadAvatar.fulfilled.match(action), (state) => { state.status = 'succeeded' })
    .addMatcher((action) => updateProfile.rejected.match(action) || changePassword.rejected.match(action) || uploadAvatar.rejected.match(action), (state, action) => { state.status = 'failed'; state.error = action.payload ?? 'Yêu cầu không thành công' }),
})
export const { clearUsersState } = usersSlice.actions
export default usersSlice.reducer
