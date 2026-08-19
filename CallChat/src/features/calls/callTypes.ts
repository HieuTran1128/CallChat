import type { ContactUser } from "../contacts/contactsTypes";

export type CallType = "AUDIO" | "VIDEO";
export type CallStatus =
  | "RINGING"
  | "ONGOING"
  | "REJECTED"
  | "ENDED"
  | "MISSED";

export interface CallRecord {
  id: string;
  callerId: ContactUser;
  receiverId: ContactUser;
  type: CallType;
  status: CallStatus;
  answeredAt?: string;
  endedAt?: string;
  durationSeconds: number;
  createdAt: string;
}

export type CallSignal = {
  callId: string;
  fromUserId: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};
