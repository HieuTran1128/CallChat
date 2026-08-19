import { Outlet } from 'react-router-dom'
import { useAppDispatch } from '../../app/hooks'
import { logout } from '../../features/auth/authSlice'
import { Logo } from '../components/Logo'
export function MainLayout() {
  const dispatch = useAppDispatch()
  return <main className="welcome-page"><header className="topbar"><Logo /><button className="logout-button" onClick={() => dispatch(logout())}>Đăng xuất</button></header><Outlet /></main>
}
