import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { apiRequest } from "../../shared/services/api";
import type { CallRecord, CallSignal } from "./callTypes";

type ApiCall = Omit<CallRecord, "id"> & { id?: string; _id?: string };
export const normalizeCall = (call: ApiCall): CallRecord => ({
  ...call,
  id: call.id ?? call._id ?? "",
  callerId: {
    ...call.callerId,
    id: call.callerId.id ?? (call.callerId as { _id?: string })._id ?? "",
  },
  receiverId: {
    ...call.receiverId,
    id: call.receiverId.id ?? (call.receiverId as { _id?: string })._id ?? "",
  },
});

interface CallsState {
  current: CallRecord | null;
  incoming: CallRecord | null;
  history: CallRecord[];
  offer: CallSignal | null;
  answer: CallSignal | null;
  candidates: CallSignal[];
  error: string | null;
}

const initialState: CallsState = {
  current: null,
  incoming: null,
  history: [],
  offer: null,
  answer: null,
  candidates: [],
  error: null,
};

export const fetchCallHistory = createAsyncThunk(
  "calls/history",
  async (currentUserId: string) => ({
    currentUserId,
    calls: await apiRequest<ApiCall[]>("/calls").then((calls) =>
      calls.map(normalizeCall),
    ),
  }),
);

const slice = createSlice({
  name: "calls",
  initialState,
  reducers: {
    incomingCallReceived: (state, action: PayloadAction<CallRecord>) => {
      state.incoming = action.payload;
    },
    callStarted: (state, action: PayloadAction<CallRecord>) => {
      state.current = action.payload;
      state.incoming = null;
      state.error = null;
    },
    callChanged: (state, action: PayloadAction<CallRecord>) => {
      state.current = action.payload;
      state.incoming = null;
    },
    callFinished: (state, action: PayloadAction<CallRecord>) => {
      if (state.current?.id === action.payload.id) state.current = action.payload;
      if (state.incoming?.id === action.payload.id) state.incoming = null;
    },
    offerReceived: (state, action: PayloadAction<CallSignal>) => {
      state.offer = action.payload;
    },
    answerReceived: (state, action: PayloadAction<CallSignal>) => {
      state.answer = action.payload;
    },
    candidateReceived: (state, action: PayloadAction<CallSignal>) => {
      state.candidates.push(action.payload);
    },
    offerConsumed: (state) => {
      state.offer = null;
    },
    answerConsumed: (state) => {
      state.answer = null;
    },
    candidateConsumed: (state, action: PayloadAction<CallSignal>) => {
      state.candidates = state.candidates.filter(
        (item) => item !== action.payload,
      );
    },
    callCleared: (state) => {
      state.current = null;
      state.offer = null;
      state.answer = null;
      state.candidates = [];
    },
    callFailed: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    callErrorCleared: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) =>
    builder.addCase(fetchCallHistory.fulfilled, (state, action) => {
      state.history = action.payload.calls;
      const ringing = action.payload.calls.find(
        (call) =>
          call.status === "RINGING" &&
          call.receiverId.id === action.payload.currentUserId,
      );
      if (!state.current) state.incoming = ringing ?? null;
    }),
});

export const {
  incomingCallReceived,
  callStarted,
  callChanged,
  callFinished,
  offerReceived,
  answerReceived,
  candidateReceived,
  offerConsumed,
  answerConsumed,
  candidateConsumed,
  callCleared,
  callFailed,
  callErrorCleared,
} = slice.actions;
export default slice.reducer;
