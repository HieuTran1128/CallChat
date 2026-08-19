import { Outlet } from 'react-router-dom'
import { Logo } from '../components/Logo'
export function AuthLayout() {
  return <main className="auth-page">
    <section className="brand-panel"><Logo /><div className="brand-content"><p className="eyebrow light">Kết nối không khoảng cách</p><h1>Trò chuyện gần nhau hơn.</h1><p>Nhắn tin, gọi thoại và video với những người quan trọng — trong một không gian đơn giản và riêng tư.</p><div className="feature-row"><span>💬 Tin nhắn</span><span>📞 Gọi thoại</span><span>🎥 Video call</span></div></div><p className="copyright">© 2026 CallChat</p></section>
    <section className="form-panel"><div className="mobile-logo"><Logo /></div><Outlet /></section>
  </main>
}
