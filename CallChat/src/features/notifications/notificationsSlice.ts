import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface ChatNotification {
  id: string;
  conversationId: string;
  title: string;
  body: string;
}

interface NotificationsState {
  items: ChatNotification[];
}

const initialState: NotificationsState = { items: [] };

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    notificationAdded: (state, action: PayloadAction<ChatNotification>) => {
      state.items.unshift(action.payload);
      state.items = state.items.slice(0, 4);
    },
    notificationDismissed: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    conversationNotificationsDismissed: (
      state,
      action: PayloadAction<string>,
    ) => {
      state.items = state.items.filter(
        (item) => item.conversationId !== action.payload,
      );
    },
  },
});

export const {
  notificationAdded,
  notificationDismissed,
  conversationNotificationsDismissed,
} = notificationsSlice.actions;
export default notificationsSlice.reducer;
