import { io, type Socket } from "socket.io-client";
import { API_URL } from "./api";

export interface PresenceUpdate {
  userId: string;
  status: "ONLINE" | "OFFLINE";
  lastSeenAt?: string;
}
interface RealtimeHandlers {
  onPresence: (update: PresenceUpdate) => void;
  onMessage: (message: unknown) => void;
  onReceipt: (receipt: {
    conversationId: string;
    userId: string;
    status: "READ";
  }) => void;
  onTyping: (update: {
    conversationId: string;
    userId: string;
    isTyping: boolean;
  }) => void;
  onConnection: (connected: boolean) => void;
  onMessageUpdated: (message: unknown) => void;
  onMessageRemoved: (payload: { conversationId: string; messageId: string }) => void;
  onMessageDeletedForMe: (payload: { conversationId: string; messageId: string }) => void;
  onIncomingCall: (call: unknown) => void;
  onCallAccepted: (call: unknown) => void;
  onCallRejected: (call: unknown) => void;
  onCallEnded: (call: unknown) => void;
  onCallOffer: (signal: unknown) => void;
  onCallAnswer: (signal: unknown) => void;
  onCallIceCandidate: (signal: unknown) => void;
}

let presenceSocket: Socket | null = null;
let activeConversationId: string | null = null;

export function connectRealtime(
  token: string,
  handlers: RealtimeHandlers,
): () => void {
  presenceSocket?.disconnect();
  presenceSocket = io(`${API_URL}/presence`, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });
  presenceSocket.on("connect", () => {
    handlers.onConnection(true);
    if (activeConversationId)
      presenceSocket?.emit("conversation:join", {
        conversationId: activeConversationId,
      });
  });
  presenceSocket.on("disconnect", () => handlers.onConnection(false));
  presenceSocket.on("connect_error", () => handlers.onConnection(false));
  presenceSocket.on("presence:update", handlers.onPresence);
  presenceSocket.on("message:new", handlers.onMessage);
  presenceSocket.on("message:receipt", handlers.onReceipt);
  presenceSocket.on("typing:update", handlers.onTyping);
  presenceSocket.on("message:updated", handlers.onMessageUpdated);
  presenceSocket.on("message:removed", handlers.onMessageRemoved);
  presenceSocket.on("message:deleted-for-me", handlers.onMessageDeletedForMe);
  presenceSocket.on("call:incoming", handlers.onIncomingCall);
  presenceSocket.on("call:accepted", handlers.onCallAccepted);
  presenceSocket.on("call:rejected", handlers.onCallRejected);
  presenceSocket.on("call:ended", handlers.onCallEnded);
  presenceSocket.on("call:offer", handlers.onCallOffer);
  presenceSocket.on("call:answer", handlers.onCallAnswer);
  presenceSocket.on("call:ice-candidate", handlers.onCallIceCandidate);

  return () => {
    presenceSocket?.off();
    presenceSocket?.disconnect();
    presenceSocket = null;
    activeConversationId = null;
  };
}

export const joinConversation = (conversationId: string) => {
  activeConversationId = conversationId;
  presenceSocket?.emit("conversation:join", { conversationId });
};
export function sendRealtimeMessage(
  conversationId: string,
  content: string,
  attachments: unknown[] = [],
  replyToId?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!presenceSocket?.connected) {
      reject(new Error("Mất kết nối. Đang thử kết nối lại..."));
      return;
    }
    presenceSocket
      .timeout(15000)
      .emit(
        "message:send",
        { conversationId, content, attachments, replyToId },
        (error: Error | null, response?: { ok?: boolean; error?: string }) => {
          if (error) reject(new Error("Gửi tin nhắn quá thời gian chờ"));
          else if (!response?.ok)
            reject(new Error(response?.error ?? "Không thể gửi tin nhắn"));
          else resolve();
        },
      );
  });
}
function emitMessageAction(event: string, payload: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!presenceSocket?.connected) { reject(new Error("Mất kết nối")); return; }
    presenceSocket.timeout(8000).emit(event, payload, (error: Error | null, response?: { ok?: boolean; error?: string }) => {
      if (error) reject(new Error("Yêu cầu quá thời gian chờ"));
      else if (!response?.ok) reject(new Error(response?.error ?? "Không thể xử lý tin nhắn"));
      else resolve();
    });
  });
}
export const editRealtimeMessage = (messageId: string, content: string) => emitMessageAction("message:edit", { messageId, content });
export const removeRealtimeMessage = (messageId: string) => emitMessageAction("message:remove", { messageId });
export const deleteRealtimeMessageForMe = (messageId: string) => emitMessageAction("message:delete-for-me", { messageId });
export const reactRealtimeMessage = (messageId: string, emoji: string) => emitMessageAction("message:react", { messageId, emoji });
export const sendTyping = (conversationId: string, isTyping: boolean) =>
  presenceSocket?.emit(isTyping ? "typing:start" : "typing:stop", {
    conversationId,
  });
export const markConversationRead = (conversationId: string) =>
  presenceSocket?.emit("message:read", { conversationId });

function emitCall<T>(event: string, payload: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!presenceSocket?.connected) {
      reject(new Error("Mất kết nối tới máy chủ"));
      return;
    }
    presenceSocket.timeout(15000).emit(
      event,
      payload,
      (error: Error | null, response?: { ok?: boolean; error?: string; call?: T }) => {
        if (error) reject(new Error("Yêu cầu gọi quá thời gian chờ"));
        else if (!response?.ok) reject(new Error(response?.error ?? "Không thể thực hiện cuộc gọi"));
        else resolve(response.call as T);
      },
    );
  });
}

export const initiateCall = <T>(receiverId: string, type: "AUDIO" | "VIDEO") =>
  emitCall<T>("call:initiate", { receiverId, type });
export const acceptCall = <T>(callId: string) => emitCall<T>("call:accept", { callId });
export const rejectCall = <T>(callId: string) => emitCall<T>("call:reject", { callId });
export const endCall = <T>(callId: string) => emitCall<T>("call:end", { callId });
export const sendCallOffer = (callId: string, offer: RTCSessionDescriptionInit) => emitCall<never>("call:offer", { callId, offer });
export const sendCallAnswer = (callId: string, answer: RTCSessionDescriptionInit) => emitCall<never>("call:answer", { callId, answer });
export const sendIceCandidate = (callId: string, candidate: RTCIceCandidateInit) => emitCall<never>("call:ice-candidate", { callId, candidate });
