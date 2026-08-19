import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { ROUTES } from "../../../shared/constants/routes";
import {
  notificationDismissed,
  type ChatNotification,
} from "../notificationsSlice";

function NotificationToast({ item }: { item: ChatNotification }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(
      () => dispatch(notificationDismissed(item.id)),
      5000,
    );
    return () => window.clearTimeout(timer);
  }, [dispatch, item.id]);

  return (
    <button
      type="button"
      className="notification-toast"
      onClick={() => {
        dispatch(notificationDismissed(item.id));
        navigate(`${ROUTES.chat}?conversationId=${item.conversationId}`);
      }}
    >
      <span>💬</span>
      <span>
        <strong>{item.title}</strong>
        <small>{item.body}</small>
      </span>
      <i
        role="button"
        aria-label="Đóng thông báo"
        tabIndex={0}
        onClick={(event) => {
          event.stopPropagation();
          dispatch(notificationDismissed(item.id));
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.stopPropagation();
            dispatch(notificationDismissed(item.id));
          }
        }}
      >
        ×
      </i>
    </button>
  );
}

export function NotificationToasts() {
  const items = useAppSelector((state) => state.notifications.items);
  return (
    <div className="notification-stack" aria-live="polite">
      {items.map((item) => (
        <NotificationToast item={item} key={item.id} />
      ))}
    </div>
  );
}
