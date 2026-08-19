import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { conversationsService } from "./conversationsService";
import type { Conversation } from "./conversationTypes";
import type { ChatMessage } from "../messages/messageTypes";

interface State {
  items: Conversation[];
  activeId: string | null;
  status: "idle" | "loading" | "failed";
  error: string | null;
}
const initialState: State = {
  items: [],
  activeId: null,
  status: "idle",
  error: null,
};
const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : "Không thể tải cuộc trò chuyện";

export const fetchConversations = createAsyncThunk<
  Conversation[],
  void,
  { rejectValue: string }
>("conversations/list", async (_, { rejectWithValue }) => {
  try {
    return await conversationsService.list();
  } catch (error) {
    return rejectWithValue(messageOf(error));
  }
});
export const openDirectConversation = createAsyncThunk<
  Conversation,
  string,
  { rejectValue: string }
>("conversations/direct", async (userId, { rejectWithValue }) => {
  try {
    return await conversationsService.direct(userId);
  } catch (error) {
    return rejectWithValue(messageOf(error));
  }
});

const slice = createSlice({
  name: "conversations",
  initialState,
  reducers: {
    selectConversation: (state, action: { payload: string }) => {
      state.activeId = action.payload;
      const selected = state.items.find((item) => item.id === action.payload);
      if (selected) selected.unreadCount = 0;
    },
    conversationMessageReceived: (
      state,
      action: {
        payload: {
          message: ChatMessage;
          currentUserId: string;
          isViewingConversation: boolean;
        };
      },
    ) => {
      const { message, currentUserId } = action.payload;
      const index = state.items.findIndex(
        (item) => item.id === message.conversationId,
      );
      if (index < 0) return;
      const conversation = state.items[index];
      conversation.updatedAt = message.createdAt;
      conversation.lastMessage = {
        id: message.id,
        senderId: message.senderId,
        content: message.content,
        type: message.type,
        createdAt: message.createdAt,
      };
      if (
        message.senderId !== currentUserId &&
        !action.payload.isViewingConversation
      )
        conversation.unreadCount += 1;
      state.items.splice(index, 1);
      state.items.unshift(conversation);
    },
    conversationPresenceUpdated: (
      state,
      action: { payload: { userId: string; status: "ONLINE" | "OFFLINE" } },
    ) => {
      state.items.forEach((conversation) =>
        conversation.participants.forEach((user) => {
          if (user.id === action.payload.userId)
            user.status = action.payload.status;
        }),
      );
    },
  },
  extraReducers: (builder) =>
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        const selectedId = state.activeId ?? action.payload[0]?.id ?? null;
        state.activeId = selectedId;
        state.items = action.payload.map((item) =>
          item.id === selectedId ? { ...item, unreadCount: 0 } : item,
        );
        state.status = "idle";
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Không thể tải cuộc trò chuyện";
      })
      .addCase(openDirectConversation.fulfilled, (state, action) => {
        const existing = state.items.find(
          (item) => item.id === action.payload.id,
        );
        if (existing) existing.unreadCount = 0;
        else state.items.unshift({ ...action.payload, unreadCount: 0 });
        state.activeId = action.payload.id;
        state.error = null;
      })
      .addCase(openDirectConversation.rejected, (state, action) => {
        state.error = action.payload ?? "Không thể mở cuộc trò chuyện";
      }),
});
export const {
  selectConversation,
  conversationPresenceUpdated,
  conversationMessageReceived,
} = slice.actions;
export default slice.reducer;
