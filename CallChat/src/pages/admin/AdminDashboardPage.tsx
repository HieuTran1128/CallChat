import { useEffect, useState, type FormEvent } from 'react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { fetchAdminUsers, updateAdminUserRole, updateAdminUserStatus } from '../../features/admin/adminSlice'
import type { UserRole } from '../../features/auth/authTypes'

export function AdminDashboardPage() {
  const dispatch = useAppDispatch()
  const currentUser = useAppSelector((state) => state.auth.user)!
  const { users, pagination, status, error } = useAppSelector((state) => state.admin)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => { void dispatch(fetchAdminUsers({ page: pagination.page, limit: pagination.limit, q: search })) }, [dispatch, pagination.page, pagination.limit, search])
  function submitSearch(event: FormEvent) { event.preventDefault(); setSearch(query.trim()) }
  function goToPage(page: number) { void dispatch(fetchAdminUsers({ page, limit: pagination.limit, q: search })) }
  function changeRole(userId: string, role: UserRole) { void dispatch(updateAdminUserRole({ userId, role })) }

  return <section className="admin-page">
    <div className="page-title"><div><p className="eyebrow">Quản trị</p><h1>Quản lý tài khoản</h1></div><span>{pagination.total} người dùng</span></div>
    <form className="admin-search" onSubmit={submitSearch}><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm username, email hoặc tên..." /><button>Tìm kiếm</button></form>
    {error && <div className="error-message">{error}</div>}
    <div className="users-table-wrap"><table className="users-table"><thead><tr><th>Người dùng</th><th>Role</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><div className="table-user"><div className="mini-avatar">{user.displayName.charAt(0).toUpperCase()}</div><div><strong>{user.displayName}</strong><span>@{user.username} · {user.email}</span></div></div></td><td><select value={user.role} disabled={user.id === currentUser.id || status === 'loading'} onChange={(e) => changeRole(user.id, e.target.value as UserRole)}><option value="USER">USER</option><option value="ADMIN">ADMIN</option></select></td><td><span className={`status-pill ${user.isActive ? 'active' : 'blocked'}`}>{user.isActive ? 'Hoạt động' : 'Đã khóa'}</span></td><td><button className="table-action" disabled={user.id === currentUser.id || status === 'loading'} onClick={() => dispatch(updateAdminUserStatus({ userId:user.id,isActive:!user.isActive }))}>{user.isActive ? 'Khóa' : 'Mở khóa'}</button></td></tr>)}</tbody></table>{status === 'loading' && !users.length && <p className="table-empty">Đang tải...</p>}{status !== 'loading' && !users.length && <p className="table-empty">Không tìm thấy người dùng</p>}</div>
    <div className="pagination"><button disabled={pagination.page <= 1} onClick={() => goToPage(pagination.page - 1)}>Trước</button><span>Trang {pagination.page} / {Math.max(1,pagination.totalPages)}</span><button disabled={pagination.page >= pagination.totalPages} onClick={() => goToPage(pagination.page + 1)}>Sau</button></div>
  </section>
}
