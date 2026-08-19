import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { Button } from '../shared/components/Button'
import { Input } from '../shared/components/Input'
import { changePassword, clearUsersState, updateProfile, uploadAvatar } from '../features/users/usersSlice'

export function ProfilePage() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)!
  const { status, error } = useAppSelector((state) => state.users)
  const [displayName, setDisplayName] = useState(user.displayName)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const avatarPreview = useMemo(
    () => avatarFile ? URL.createObjectURL(avatarFile) : null,
    [avatarFile],
  )
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [message, setMessage] = useState('')

  useEffect(() => () => { dispatch(clearUsersState()) }, [dispatch])
  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
  }, [avatarPreview])

  async function saveProfile(event: FormEvent) {
    event.preventDefault(); setMessage('')
    const profileResult = await dispatch(updateProfile({ displayName }))
    if (!updateProfile.fulfilled.match(profileResult)) return
    if (avatarFile) {
      const avatarResult = await dispatch(uploadAvatar(avatarFile))
      if (!uploadAvatar.fulfilled.match(avatarResult)) return
      setAvatarFile(null)
    }
    setMessage('Đã cập nhật hồ sơ')
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault(); setMessage('')
    if (passwords.newPassword !== passwords.confirmPassword) { setMessage('Mật khẩu xác nhận không khớp'); return }
    const result = await dispatch(changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }))
    if (changePassword.fulfilled.match(result)) { setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' }); setMessage('Đã đổi mật khẩu') }
  }

  return <section className="settings-page">
    <div className="page-title"><div><p className="eyebrow">Tài khoản</p><h1>Hồ sơ cá nhân</h1></div></div>
    {message && <div className="notice">{message}</div>}{error && <div className="error-message">{error}</div>}
    <div className="settings-grid">
      <form className="settings-card" onSubmit={saveProfile}><h2>Thông tin hiển thị</h2><div className="profile-preview"><div className="avatar">{avatarPreview || user.avatarUrl ? <img src={avatarPreview ?? user.avatarUrl} alt="Avatar" /> : displayName.charAt(0).toUpperCase()}</div><div><strong>{displayName}</strong><p>@{user.username} · {user.role}</p></div></div><Input label="Tên hiển thị" value={displayName} maxLength={60} onChange={(e) => setDisplayName(e.target.value)} required /><div className="avatar-upload"><div><span className="upload-label">Ảnh đại diện</span><p>{avatarFile ? avatarFile.name : 'JPEG, PNG hoặc WebP · tối đa 5 MB'}</p></div><label className="upload-button" tabIndex={0}><span>↑</span>{avatarFile ? 'Chọn ảnh khác' : 'Chọn ảnh'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} /></label></div><Button disabled={status === 'loading'}>Lưu hồ sơ</Button></form>
      <form className="settings-card" onSubmit={savePassword}><h2>Đổi mật khẩu</h2><p className="card-description">Sử dụng mật khẩu mạnh có ít nhất 8 ký tự.</p><Input label="Mật khẩu hiện tại" type="password" minLength={8} value={passwords.currentPassword} onChange={(e) => setPasswords({...passwords,currentPassword:e.target.value})} required /><Input label="Mật khẩu mới" type="password" minLength={8} value={passwords.newPassword} onChange={(e) => setPasswords({...passwords,newPassword:e.target.value})} required /><Input label="Xác nhận mật khẩu mới" type="password" minLength={8} value={passwords.confirmPassword} onChange={(e) => setPasswords({...passwords,confirmPassword:e.target.value})} required /><Button disabled={status === 'loading'}>Đổi mật khẩu</Button></form>
    </div>
  </section>
}
