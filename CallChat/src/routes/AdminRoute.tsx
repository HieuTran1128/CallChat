import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '../app/hooks'
import { ROUTES } from '../shared/constants/routes'

export function AdminRoute() {
  const role = useAppSelector((state) => state.auth.user?.role)
  return role === 'ADMIN' ? <Outlet /> : <Navigate to={ROUTES.chat} replace />
}
