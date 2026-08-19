import { useAppSelector } from '../../app/hooks'

export function AdminDashboardPage() {
  const user = useAppSelector((state) => state.auth.user)!
  return <section className="welcome-card"><p className="eyebrow">Khu vực quản trị</p><h1>Xin chào Admin {user.displayName}</h1><p className="welcome-copy">Đây là trang riêng dành cho quản trị viên. Các chức năng quản lý tài khoản và báo cáo sẽ được xây tại feature admin.</p></section>
}
