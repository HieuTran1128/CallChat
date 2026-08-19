import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { ROUTES } from '../../../shared/constants/routes'
import { Button } from '../../../shared/components/Button'
import { Input } from '../../../shared/components/Input'
import { Loading } from '../../../shared/components/Loading/Loading'
import { clearAuthError, login, register } from '../authSlice'
import type { LoginPayload, RegisterPayload } from '../authTypes'

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const dispatch = useAppDispatch()
  const { user, status, error } = useAppSelector((state) => state.auth)
  const [loginData, setLoginData] = useState<LoginPayload>({ identifier: '', password: '' })
  const [registerData, setRegisterData] = useState<RegisterPayload>({ username: '', email: '', password: '', displayName: '' })
  if (user) return <Navigate to={ROUTES.chat} replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (mode === 'login') await dispatch(login(loginData))
    else await dispatch(register(registerData))
  }

  return <div className="auth-card">
    <div className="tabs"><Link className={mode === 'login' ? 'active' : ''} to={ROUTES.login} onClick={() => dispatch(clearAuthError())}>Đăng nhập</Link><Link className={mode === 'register' ? 'active' : ''} to={ROUTES.register} onClick={() => dispatch(clearAuthError())}>Tạo tài khoản</Link></div>
    <div className="form-heading"><h2>{mode === 'login' ? 'Chào mừng trở lại' : 'Tham gia CallChat'}</h2><p>{mode === 'login' ? 'Đăng nhập để tiếp tục cuộc trò chuyện.' : 'Chỉ mất một phút để tạo tài khoản mới.'}</p></div>
    <form onSubmit={submit}>
      {mode === 'register' && <><Input label="Tên hiển thị" value={registerData.displayName} onChange={(e) => setRegisterData({...registerData,displayName:e.target.value})} required /><Input label="Tên người dùng" value={registerData.username} onChange={(e) => setRegisterData({...registerData,username:e.target.value})} minLength={3} pattern="[a-zA-Z0-9_]+" required /><Input label="Email" type="email" value={registerData.email} onChange={(e) => setRegisterData({...registerData,email:e.target.value})} required /></>}
      {mode === 'login' && <Input label="Email hoặc tên người dùng" value={loginData.identifier} onChange={(e) => setLoginData({...loginData,identifier:e.target.value})} required autoFocus />}
      <Input label="Mật khẩu" type="password" minLength={8} value={mode === 'login' ? loginData.password : registerData.password} onChange={(e) => mode === 'login' ? setLoginData({...loginData,password:e.target.value}) : setRegisterData({...registerData,password:e.target.value})} required />
      {error && <div className="error-message" role="alert"><span>!</span>{error}</div>}
      <Button type="submit" disabled={status === 'loading'}>{status === 'loading' ? <><Loading small /> Đang xử lý...</> : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</Button>
    </form>
    <p className="switch-copy">{mode === 'login' ? 'Chưa có tài khoản?' : 'Bạn đã có tài khoản?'} <Link to={mode === 'login' ? ROUTES.register : ROUTES.login}>{mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}</Link></p>
  </div>
}
