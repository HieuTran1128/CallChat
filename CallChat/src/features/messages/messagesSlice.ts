import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { sendRealtimeMessage } from "../../shared/services/socket";
import { messagesService } from "./messagesService";
import type { ChatMessage, MessageReceipt, TypingUpdate } from "./messageTypes";

interface State {
  byConversation: Record<string, ChatMessage[]>;
  pages: Record<string, number>;
  totalPages: Record<string, number>;
  loading: boolean;
  sending: boolean;
  connected: boolean;
  typingByConversation: Record<string, string | null>;
  error: string | null;
}
const initialState: State = {
  byConversation: {},
  pages: {},
  totalPages: {},
  loading: false,
  sending: false,
  connected: false,
  typingByConversation: {},
  error: null,
};

export const fetchMessages = createAsyncThunk(
  "messages/list",
  async ({
    conversationId,
    page = 1,
  }: {
    conversationId: string;
    page?: number;
  }) => ({
    conversationId,
    page,
    result: await messagesService.list(conversationId, page),
  }),
);
export const sendMessage = createAsyncThunk<
  void,
  { conversationId: string; content: string; files?: File[]; replyToId?: string },
  { rejectValue: string }
>("messages/send", async (payload, { rejectWithValue }) => {
  try {
    const attachments = payload.files?.length
      ? await messagesService.uploadAttachments(
          payload.conversationId,
          payload.files,
        )
      : [];
    await sendRealtimeMessage(
      payload.conversationId,
      payload.content,
      attachments,
      payload.replyToId,
    );
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Không thể gửi tin nhắn",
    );
  }
});

const slice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    messageReceived: (state, action: { payload: ChatMessage }) => {
      const message = action.payload;
      const items = (state.byConversation[message.conversationId] ??= []);
      if (!items.some((item) => item.id === message.id)) items.push(message);
    },
    receiptReceived: (state, action: { payload: MessageReceipt }) => {
      const { conversationId, userId } = action.payload;
      (state.byConversation[conversationId] ?? []).forEach((message) => {
        if (message.senderId !== userId && !message.readBy.includes(userId))
          message.readBy.push(userId);
      });
    },
    typingReceived: (state, action: { payload: TypingUpdate }) => {
      state.typingByConversation[action.payload.conversationId] = action.payload
        .isTyping
        ? action.payload.userId
        : null;
    },
    connectionChanged: (state, action: { payload: boolean }) => {
      state.connected = action.payload;
    },
    messageUpdated: (state, action: { payload: ChatMessage }) => {
      const items = state.byConversation[action.payload.conversationId] ?? [];
      const index = items.findIndex((message) => message.id === action.payload.id);
      if (index >= 0) items[index] = action.payload;
    },
    messageRemoved: (state, action: { payload: { conversationId: string; messageId: string } }) => {
      const messages = state.byConversation[action.payload.conversationId] ?? [];
      messages.forEach((message) => {
        if (message.replyTo === action.payload.messageId) {
          message.replyPreview = undefined;
          message.replyUnavailable = true;
        }
      });
      state.byConversation[action.payload.conversationId] = messages.filter((message) => message.id !== action.payload.messageId);
    },
  },
  extraReducers: (builder) =>
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const { conversationId, page, result } = action.payload;
        state.byConversation[conversationId] =
          page === 1
            ? result.items
            : [
                ...result.items,
                ...(state.byConversation[conversationId] ?? []),
              ];
        state.pages[conversationId] = page;
        state.totalPages[conversationId] = result.pagination.totalPages;
        state.loading = false;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Không thể tải tin nhắn";
      })
      .addCase(sendMessage.pending, (state) => {
        state.sending = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state) => {
        state.sending = false;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.sending = false;
        state.error = action.payload ?? "Không thể gửi tin nhắn";
      }),
});
export const {
  messageReceived,
  receiptReceived,
  typingReceived,
  connectionChanged,
  messageUpdated,
  messageRemoved,
} = slice.actions;
export default slice.reducer;
