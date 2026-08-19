import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit'
import authReducer, {
  login,
  logout,
  register,
  restoreSession,
} from '../features/auth/authSlice'
import { tokenStorage } from '../shared/services/storage'
import usersReducer from '../features/users/usersSlice'
import adminReducer from '../features/admin/adminSlice'
import contactsReducer from '../features/contacts/contactsSlice'
import conversationsReducer from '../features/conversations/conversationsSlice'
import messagesReducer from '../features/messages/messagesSlice'
import notificationsReducer from '../features/notifications/notificationsSlice'
import callsReducer from '../features/calls/callsSlice'

const authListener = createListenerMiddleware()

authListener.startListening({
  actionCreator: login.fulfilled,
  effect: (action) => {
    tokenStorage.set(action.payload.accessToken)
  },
})

authListener.startListening({
  actionCreator: register.fulfilled,
  effect: (action) => {
    tokenStorage.set(action.payload.accessToken)
  },
})

authListener.startListening({
  actionCreator: logout,
  effect: () => tokenStorage.remove(),
})

authListener.startListening({
  actionCreator: restoreSession.rejected,
  effect: () => tokenStorage.remove(),
})

export const store = configureStore({
  reducer: { auth: authReducer, users: usersReducer, admin: adminReducer, contacts: contactsReducer, conversations: conversationsReducer, messages: messagesReducer, notifications: notificationsReducer, calls: callsReducer },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(authListener.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
