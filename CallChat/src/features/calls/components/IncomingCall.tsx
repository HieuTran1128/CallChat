import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { callChanged, callFinished, callFailed, normalizeCall } from "../callsSlice";
import type { CallRecord } from "../callTypes";
import { acceptCall, rejectCall } from "../../../shared/services/socket";
import { startCallTone, stopCallTone } from "../../../shared/services/callAudio";
import { useEffect } from "react";

export function IncomingCall() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const call = useAppSelector((state) => state.calls.incoming);

  useEffect(() => {
    if (call) startCallTone("incoming");
    else stopCallTone();
    return stopCallTone;
  }, [call]);
  if (!call) return null;

  async function accept() {
    stopCallTone();
    try {
      const accepted = normalizeCall(await acceptCall<CallRecord>(call!.id));
      dispatch(callChanged(accepted));
      navigate(`/call/${accepted.id}`);
    } catch (error) {
      dispatch(callFailed(error instanceof Error ? error.message : "Không thể nhận cuộc gọi"));
    }
  }

  async function reject() {
    stopCallTone();
    try {
      const rejected = normalizeCall(await rejectCall<CallRecord>(call!.id));
      dispatch(callFinished(rejected));
    } catch (error) {
      dispatch(callFailed(error instanceof Error ? error.message : "Không thể từ chối cuộc gọi"));
    }
  }

  return (
    <div className="incoming-call">
      <div className="incoming-call-avatar">
        {call.callerId.avatarUrl ? (
          <img src={call.callerId.avatarUrl} alt="" />
        ) : (
          call.callerId.displayName[0].toUpperCase()
        )}
      </div>
      <div>
        <strong>{call.callerId.displayName}</strong>
        <small>
          Cuộc gọi {call.type === "VIDEO" ? "video" : "thoại"} đến…
        </small>
      </div>
      <button className="call-reject" onClick={() => void reject()}>
        Từ chối
      </button>
      <button className="call-accept" onClick={() => void accept()}>
        Nhận
      </button>
    </div>
  );
}
