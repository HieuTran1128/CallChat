import { ROUTES } from "../constants/routes";

export function requestBrowserNotificationPermission() {
  if (!("Notification" in window) || Notification.permission !== "default")
    return;
  void Notification.requestPermission();
}

export function showBrowserChatNotification(
  title: string,
  body: string,
  conversationId: string,
) {
  if (
    !("Notification" in window) ||
    Notification.permission !== "granted" ||
    document.visibilityState !== "hidden"
  )
    return;

  const notification = new Notification(title, {
    body,
    icon: "/vite.svg",
    tag: `conversation-${conversationId}`,
  });
  notification.onclick = () => {
    window.focus();
    window.location.assign(
      `${ROUTES.chat}?conversationId=${encodeURIComponent(conversationId)}`,
    );
    notification.close();
  };
}
