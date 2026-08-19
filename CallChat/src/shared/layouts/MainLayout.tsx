import { NavLink, Outlet } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { logout } from "../../features/auth/authSlice";
import { NotificationToasts } from "../../features/notifications/components/NotificationToasts";
import { IncomingCall } from "../../features/calls/components/IncomingCall";
import { Logo } from "../components/Logo";
import { ROUTES } from "../constants/routes";

export function MainLayout() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user)!;
  const unreadCount = useAppSelector((state) =>
    state.conversations.items.reduce(
      (total, conversation) => total + conversation.unreadCount,
      0,
    ),
  );

  return (
    <main className="app-shell">
      <header className="topbar">
        <Logo />
        <nav className="main-nav">
          <NavLink to={ROUTES.chat}>
            Trò chuyện
            {unreadCount > 0 && (
              <span className="nav-unread-badge">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </NavLink>
          <NavLink to={ROUTES.contacts}>Danh bạ</NavLink>
          <NavLink to={ROUTES.profile}>Hồ sơ</NavLink>
          {user.role === "ADMIN" && (
            <NavLink to={ROUTES.admin}>Quản trị</NavLink>
          )}
        </nav>
        <div className="account-menu">
          <span>{user.displayName}</span>
          <button className="logout-button" onClick={() => dispatch(logout())}>
            Đăng xuất
          </button>
        </div>
      </header>
      <div className="page-container">
        <Outlet />
      </div>
      <NotificationToasts />
      <IncomingCall />
    </main>
  );
}
