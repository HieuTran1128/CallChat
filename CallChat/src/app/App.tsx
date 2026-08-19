import { useEffect, useRef } from "react";
import { BrowserRouter } from "react-router-dom";
import { logout, restoreSession } from "../features/auth/authSlice";
import { presenceUpdated } from "../features/contacts/contactsSlice";
import {
  connectionChanged,
  messageReceived,
  messageRemoved,
  messageUpdated,
  receiptReceived,
  typingReceived,
} from "../features/messages/messagesSlice";
import {
  normalizeMessage,
  type ApiMessage,
} from "../features/messages/messagesService";
import {
  conversationMessageReceived,
  conversationPresenceUpdated,
  fetchConversations,
} from "../features/conversations/conversationsSlice";
import { notificationAdded } from "../features/notifications/notificationsSlice";
import {
  answerReceived,
  callChanged,
  callFinished,
  candidateReceived,
  incomingCallReceived,
  normalizeCall,
  offerReceived,
  fetchCallHistory,
} from "../features/calls/callsSlice";
import type { CallSignal } from "../features/calls/callTypes";
import { AppRouter } from "../routes/AppRouter";
import { Loading } from "../shared/components/Loading/Loading";
import { ROUTES } from "../shared/constants/routes";
import {
  requestBrowserNotificationPermission,
  showBrowserChatNotification,
} from "../shared/services/browserNotifications";
import { AUTH_TOKEN_KEY } from "../shared/services/storage";
import { connectRealtime } from "../shared/services/socket";
import { unlockCallAudio } from "../shared/services/callAudio";
import { useAppDispatch, useAppSelector } from "./hooks";

export default function App() {
  const dispatch = useAppDispatch();
  const { token, user, restoring } = useAppSelector((state) => state.auth);
  const conversations = useAppSelector((state) => state.conversations.items);
  const activeConversationId = useAppSelector(
    (state) => state.conversations.activeId,
  );
  const conversationsRef = useRef(conversations);
  const activeConversationIdRef = useRef(activeConversationId);

  useEffect(() => {
    conversationsRef.current = conversations;
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId, conversations]);

  useEffect(() => {
    if (token) void dispatch(restoreSession(token));
  }, [dispatch, token]);

  useEffect(() => {
    function syncSession(event: StorageEvent) {
      if (event.key !== AUTH_TOKEN_KEY) return;
      if (event.newValue) void dispatch(restoreSession(event.newValue));
      else dispatch(logout());
    }
    window.addEventListener("storage", syncSession);
    return () => window.removeEventListener("storage", syncSession);
  }, [dispatch]);

  useEffect(() => {
    if (!token || !user) return;
    const askForNotificationPermission = () => {
      requestBrowserNotificationPermission();
      unlockCallAudio();
      window.removeEventListener("pointerdown", askForNotificationPermission);
      window.removeEventListener("keydown", askForNotificationPermission);
    };
    window.addEventListener("pointerdown", askForNotificationPermission, {
      once: true,
    });
    window.addEventListener("keydown", askForNotificationPermission, {
      once: true,
    });

    const disconnect = connectRealtime(token, {
      onPresence: (update) => {
        dispatch(presenceUpdated(update));
        dispatch(conversationPresenceUpdated(update));
      },
      onMessage: (message) => {
        const normalized = normalizeMessage(message as ApiMessage);
        const conversation = conversationsRef.current.find(
          (item) => item.id === normalized.conversationId,
        );
        const isIncoming = normalized.senderId !== user.id;
        const isViewingConversation =
          window.location.pathname === ROUTES.chat &&
          document.visibilityState === "visible" &&
          activeConversationIdRef.current === normalized.conversationId;
        dispatch(messageReceived(normalized));
        dispatch(
          conversationMessageReceived({
            message: normalized,
            currentUserId: user.id,
            isViewingConversation,
          }),
        );
        if (!conversation) void dispatch(fetchConversations());

        if (isIncoming && !isViewingConversation) {
          const sender = conversation?.participants.find(
            (participant) => participant.id === normalized.senderId,
          );
          const title = sender?.displayName ?? "Tin nhắn mới";
          const body =
            normalized.content ||
            (normalized.type === "IMAGE" ? "Đã gửi ảnh" : "Đã gửi tệp");
          if (document.visibilityState === "hidden") {
            showBrowserChatNotification(
              title,
              body,
              normalized.conversationId,
            );
          } else {
            dispatch(
              notificationAdded({
                id: `${normalized.id}-${Date.now()}`,
                conversationId: normalized.conversationId,
                title,
                body,
              }),
            );
          }
        }
      },
      onReceipt: (receipt) => dispatch(receiptReceived(receipt)),
      onTyping: (update) => dispatch(typingReceived(update)),
      onConnection: (connected) => dispatch(connectionChanged(connected)),
      onMessageUpdated: (message) => {
        dispatch(messageUpdated(normalizeMessage(message as ApiMessage)));
        void dispatch(fetchConversations());
      },
      onMessageRemoved: (payload) => {
        dispatch(messageRemoved(payload));
        void dispatch(fetchConversations());
      },
      onMessageDeletedForMe: (payload) => {
        dispatch(messageRemoved(payload));
        void dispatch(fetchConversations());
      },
      onIncomingCall: (call) =>
        dispatch(incomingCallReceived(normalizeCall(call as never))),
      onCallAccepted: (call) =>
        dispatch(callChanged(normalizeCall(call as never))),
      onCallRejected: (call) =>
        dispatch(callFinished(normalizeCall(call as never))),
      onCallEnded: (call) =>
        dispatch(callFinished(normalizeCall(call as never))),
      onCallOffer: (signal) => dispatch(offerReceived(signal as CallSignal)),
      onCallAnswer: (signal) => dispatch(answerReceived(signal as CallSignal)),
      onCallIceCandidate: (signal) =>
        dispatch(candidateReceived(signal as CallSignal)),
    });
    void dispatch(fetchCallHistory(user.id));
    const callSyncTimer = window.setInterval(
      () => void dispatch(fetchCallHistory(user.id)),
      5000,
    );
    return () => {
      window.removeEventListener("pointerdown", askForNotificationPermission);
      window.removeEventListener("keydown", askForNotificationPermission);
      disconnect?.();
      window.clearInterval(callSyncTimer);
    };
  }, [dispatch, token, user]);

  if (restoring) {
    return (
      <main className="loading-screen">
        <Loading />
        <p>Đang mở CallChat...</p>
      </main>
    );
  }
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
