import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '../app/hooks'
import { ROUTES } from '../shared/constants/routes'
export function ProtectedRoute() { const user = useAppSelector((state) => state.auth.user); return user ? <Outlet /> : <Navigate to={ROUTES.login} replace /> }
