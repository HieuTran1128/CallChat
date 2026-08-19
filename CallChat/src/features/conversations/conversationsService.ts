import { apiRequest } from "../../shared/services/api";
import type { Conversation } from "./conversationTypes";

type ApiUser = Conversation["participants"][number] & { _id?: string };
type ApiConversation = Omit<Conversation, "id" | "participants" | "lastMessage"> & {
  id?: string;
  _id?: string;
  participants: ApiUser[];
  lastMessage?:
    | (Omit<NonNullable<Conversation["lastMessage"]>, "id" | "senderId"> & {
        _id?: string;
        id?: string;
        senderId: string | { _id: string };
      })
    | null;
};

export function normalizeConversation(item: ApiConversation): Conversation {
  return {
    ...item,
    id: item.id ?? item._id ?? "",
    participants: item.participants.map((user) => ({
      ...user,
      id: user.id ?? user._id ?? "",
    })),
    unreadCount: item.unreadCount ?? 0,
    lastMessage: item.lastMessage
      ? {
          ...item.lastMessage,
          id: item.lastMessage.id ?? item.lastMessage._id ?? "",
          senderId:
            typeof item.lastMessage.senderId === "string"
              ? item.lastMessage.senderId
              : item.lastMessage.senderId._id,
        }
      : null,
  };
}

export const conversationsService = {
  list: () =>
    apiRequest<ApiConversation[]>("/conversations").then((items) =>
      items.map(normalizeConversation),
    ),
  direct: (userId: string) =>
    apiRequest<ApiConversation>(`/conversations/direct/${userId}`, {
      method: "POST",
    }).then(normalizeConversation),
};
