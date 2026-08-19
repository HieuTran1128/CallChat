import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { restoreSession } from '../features/auth/authSlice'
import { AppRouter } from '../routes/AppRouter'
import { Loading } from '../shared/components/Loading/Loading'
import { useAppDispatch, useAppSelector } from './hooks'
export default function App() { const dispatch = useAppDispatch(); const { token, restoring } = useAppSelector((state) => state.auth); useEffect(() => { if (token) void dispatch(restoreSession(token)) }, [dispatch, token]); if (restoring) return <main className="loading-screen"><Loading /><p>Đang mở CallChat...</p></main>; return <BrowserRouter><AppRouter /></BrowserRouter> }
