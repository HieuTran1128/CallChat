import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { contactsService } from './contactsService'
import type { ContactRecord, ContactRequests, ContactUser } from './contactsTypes'
import type { PresenceUpdate } from '../../shared/services/socket'

interface ContactsState {
  searchResults: ContactUser[]
  searchStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  sendingTo: string | null
  sentUserIds: string[]
  error: string | null
  searchRequestId: string | null
  incoming: ContactRecord[]
  outgoing: ContactRecord[]
  requestsStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  actionContactId: string | null
  friends: ContactRecord[]
  friendsStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  actionUserId: string | null
  blocked: ContactRecord[]
  blockedStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
}

const initialState: ContactsState = {
  searchResults: [],
  searchStatus: 'idle',
  sendingTo: null,
  sentUserIds: [],
  error: null,
  searchRequestId: null,
  incoming: [],
  outgoing: [],
  requestsStatus: 'idle',
  actionContactId: null,
  friends: [],
  friendsStatus: 'idle',
  actionUserId: null,
  blocked: [],
  blockedStatus: 'idle',
}
const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : 'Yêu cầu không thành công'

export const searchUsers = createAsyncThunk<ContactUser[], string, { rejectValue: string }>(
  'contacts/searchUsers',
  async (query, { rejectWithValue }) => {
    try { return await contactsService.searchUsers(query) }
    catch (error) { return rejectWithValue(messageOf(error)) }
  },
)

export const sendFriendRequest = createAsyncThunk<
  ContactRecord,
  string,
  { rejectValue: string }
>('contacts/sendRequest', async (userId, { rejectWithValue }) => {
  try { return await contactsService.sendRequest(userId) }
  catch (error) { return rejectWithValue(messageOf(error)) }
})

export const fetchFriendRequests = createAsyncThunk<ContactRequests, void, { rejectValue: string }>(
  'contacts/fetchRequests',
  async (_, { rejectWithValue }) => {
    try { return await contactsService.getRequests() }
    catch (error) { return rejectWithValue(messageOf(error)) }
  },
)
export const acceptFriendRequest = createAsyncThunk<ContactRecord, string, { rejectValue: string }>('contacts/acceptRequest', async (id, { rejectWithValue }) => {
  try { return await contactsService.acceptRequest(id) } catch (error) { return rejectWithValue(messageOf(error)) }
})
export const rejectFriendRequest = createAsyncThunk<ContactRecord, string, { rejectValue: string }>('contacts/rejectRequest', async (id, { rejectWithValue }) => {
  try { return await contactsService.rejectRequest(id) } catch (error) { return rejectWithValue(messageOf(error)) }
})
export const cancelFriendRequest = createAsyncThunk<void, string, { rejectValue: string }>('contacts/cancelRequest', async (id, { rejectWithValue }) => {
  try { await contactsService.cancelRequest(id) } catch (error) { return rejectWithValue(messageOf(error)) }
})
export const fetchFriends = createAsyncThunk<ContactRecord[], void, { rejectValue: string }>('contacts/fetchFriends', async (_, { rejectWithValue }) => {
  try { return await contactsService.getFriends() } catch (error) { return rejectWithValue(messageOf(error)) }
})
export const removeFriend = createAsyncThunk<void, string, { rejectValue: string }>('contacts/removeFriend', async (userId, { rejectWithValue }) => {
  try { await contactsService.removeFriend(userId) } catch (error) { return rejectWithValue(messageOf(error)) }
})
export const blockUser = createAsyncThunk<ContactRecord, string, { rejectValue: string }>('contacts/blockUser', async (userId, { rejectWithValue }) => {
  try { return await contactsService.blockUser(userId) } catch (error) { return rejectWithValue(messageOf(error)) }
})
export const fetchBlockedUsers = createAsyncThunk<ContactRecord[], void, { rejectValue: string }>('contacts/fetchBlocked', async (_, { rejectWithValue }) => {
  try { return await contactsService.getBlocked() } catch (error) { return rejectWithValue(messageOf(error)) }
})
export const unblockUser = createAsyncThunk<void, string, { rejectValue: string }>('contacts/unblockUser', async (userId, { rejectWithValue }) => {
  try { await contactsService.unblockUser(userId) } catch (error) { return rejectWithValue(messageOf(error)) }
})

const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    clearSearch: (state) => {
      state.searchResults = []
      state.searchStatus = 'idle'
      state.searchRequestId = null
      state.error = null
    },
    presenceUpdated: (state, action: { payload: PresenceUpdate }) => {
      const { userId, status } = action.payload
      const update = (user: ContactUser) => {
        if (user.id === userId) user.status = status
      }
      state.searchResults.forEach(update)
      ;[state.incoming, state.outgoing, state.friends, state.blocked]
        .forEach((contacts) => contacts.forEach((contact) => contact.participants.forEach(update)))
    },
  },
  extraReducers: (builder) => builder
    .addCase(searchUsers.pending, (state, action) => { state.searchStatus = 'loading'; state.searchRequestId = action.meta.requestId; state.error = null })
    .addCase(searchUsers.fulfilled, (state, action) => { if (state.searchRequestId !== action.meta.requestId) return; state.searchResults = action.payload; state.searchStatus = 'succeeded'; state.searchRequestId = null })
    .addCase(searchUsers.rejected, (state, action) => { if (state.searchRequestId !== action.meta.requestId) return; state.searchStatus = 'failed'; state.searchRequestId = null; state.error = action.payload ?? 'Không thể tìm người dùng' })
    .addCase(sendFriendRequest.pending, (state, action) => { state.sendingTo = action.meta.arg; state.error = null })
    .addCase(sendFriendRequest.fulfilled, (state, action) => { state.sendingTo = null; if (!state.sentUserIds.includes(action.meta.arg)) state.sentUserIds.push(action.meta.arg); if (!state.outgoing.some((contact) => contact.id === action.payload.id)) state.outgoing.unshift(action.payload) })
    .addCase(sendFriendRequest.rejected, (state, action) => { state.sendingTo = null; state.error = action.payload ?? 'Không thể gửi lời mời' })
    .addCase(fetchFriendRequests.pending, (state) => { state.requestsStatus = 'loading'; state.error = null })
    .addCase(fetchFriendRequests.fulfilled, (state, action) => { state.incoming = action.payload.incoming; state.outgoing = action.payload.outgoing; state.requestsStatus = 'succeeded' })
    .addCase(fetchFriendRequests.rejected, (state, action) => { state.requestsStatus = 'failed'; state.error = action.payload ?? 'Không thể tải lời mời' })
    .addCase(cancelFriendRequest.fulfilled, (state, action) => { state.actionContactId = null; state.outgoing = state.outgoing.filter((contact) => contact.id !== action.meta.arg) })
    .addCase(fetchFriends.pending, (state) => { state.friendsStatus = 'loading'; state.error = null })
    .addCase(fetchFriends.fulfilled, (state, action) => { state.friends = action.payload; state.friendsStatus = 'succeeded' })
    .addCase(fetchFriends.rejected, (state, action) => { state.friendsStatus = 'failed'; state.error = action.payload ?? 'Không thể tải danh sách bạn bè' })
    .addCase(acceptFriendRequest.fulfilled, (state, action) => { state.actionContactId = null; state.incoming = state.incoming.filter((contact) => contact.id !== action.meta.arg); if (!state.friends.some((contact) => contact.id === action.payload.id)) state.friends.unshift(action.payload) })
    .addCase(rejectFriendRequest.fulfilled, (state, action) => { state.actionContactId = null; state.incoming = state.incoming.filter((contact) => contact.id !== action.meta.arg) })
    .addCase(fetchBlockedUsers.pending, (state) => { state.blockedStatus = 'loading'; state.error = null })
    .addCase(fetchBlockedUsers.fulfilled, (state, action) => { state.blocked = action.payload; state.blockedStatus = 'succeeded' })
    .addCase(fetchBlockedUsers.rejected, (state, action) => { state.blockedStatus = 'failed'; state.error = action.payload ?? 'Không thể tải danh sách đã chặn' })
    .addCase(removeFriend.fulfilled, (state, action) => { state.actionUserId = null; state.friends = state.friends.filter((contact) => !contact.participants.some((user) => user.id === action.meta.arg)) })
    .addCase(blockUser.fulfilled, (state, action) => { state.actionUserId = null; state.friends = state.friends.filter((contact) => !contact.participants.some((user) => user.id === action.meta.arg)); if (!state.blocked.some((contact) => contact.id === action.payload.id)) state.blocked.unshift(action.payload) })
    .addCase(unblockUser.fulfilled, (state, action) => { state.actionUserId = null; state.blocked = state.blocked.filter((contact) => !contact.participants.some((user) => user.id === action.meta.arg)) })
    .addMatcher((action) => removeFriend.pending.match(action) || blockUser.pending.match(action) || unblockUser.pending.match(action), (state, action) => { state.actionUserId = action.meta.arg; state.error = null })
    .addMatcher((action) => removeFriend.rejected.match(action) || blockUser.rejected.match(action) || unblockUser.rejected.match(action), (state, action) => { state.actionUserId = null; state.error = action.payload ?? 'Không thể xử lý liên hệ' })
    .addMatcher((action) => acceptFriendRequest.pending.match(action) || rejectFriendRequest.pending.match(action) || cancelFriendRequest.pending.match(action), (state, action) => { state.actionContactId = action.meta.arg; state.error = null })
    .addMatcher((action) => acceptFriendRequest.rejected.match(action) || rejectFriendRequest.rejected.match(action) || cancelFriendRequest.rejected.match(action), (state, action) => { state.actionContactId = null; state.error = action.payload ?? 'Không thể xử lý lời mời' }),
})

export const { clearSearch, presenceUpdated } = contactsSlice.actions
export default contactsSlice.reducer
