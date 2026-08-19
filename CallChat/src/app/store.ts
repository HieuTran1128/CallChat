import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit'
import authReducer, {
  login,
  logout,
  register,
  restoreSession,
} from '../features/auth/authSlice'
import { tokenStorage } from '../shared/services/storage'

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
  reducer: { auth: authReducer },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(authListener.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
