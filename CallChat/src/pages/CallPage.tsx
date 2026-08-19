import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { answerConsumed, callCleared, callErrorCleared, callFailed, callFinished, callStarted, candidateConsumed, normalizeCall, offerConsumed } from "../features/calls/callsSlice";
import type { CallRecord, CallType } from "../features/calls/callTypes";
import { endCall, initiateCall, sendCallAnswer, sendCallOffer, sendIceCandidate } from "../shared/services/socket";
import { startCallTone, stopCallTone, unlockCallAudio } from "../shared/services/callAudio";

const rtcConfiguration: RTCConfiguration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export function CallPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { callId } = useParams();
  const [params] = useSearchParams();
  const user = useAppSelector((state) => state.auth.user)!;
  const { current, offer, answer, candidates, error } = useAppSelector((state) => state.calls);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const startedRef = useRef(false);
  const processingCandidatesRef = useRef(new Set<string>());
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [remoteDescriptionReady, setRemoteDescriptionReady] = useState(false);

  const otherUser = current ? (current.callerId.id === user.id ? current.receiverId : current.callerId) : null;

  const createPeer = useCallback(async (call: CallRecord) => {
    if (peerRef.current) return peerRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: call.type === "VIDEO" });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    const peer = new RTCPeerConnection(rtcConfiguration);
    peerRef.current = peer;
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    peer.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        void remoteVideoRef.current.play().then(() => setSoundBlocked(false)).catch(() => setSoundBlocked(true));
      }
    };
    peer.onicecandidate = (event) => {
      if (event.candidate) void sendIceCandidate(call.id, event.candidate.toJSON()).catch(() => dispatch(callFailed("Không thể gửi ICE candidate")));
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "failed") dispatch(callFailed("Kết nối WebRTC thất bại"));
    };
    return peer;
  }, [dispatch]);

  useEffect(() => {
    if (callId !== "new" || startedRef.current) return;
    const receiverId = params.get("userId");
    const type: CallType = params.get("type") === "AUDIO" ? "AUDIO" : "VIDEO";
    if (!receiverId) { navigate("/chat", { replace: true }); return; }
    startedRef.current = true;
    void initiateCall<CallRecord>(receiverId, type)
      .then(async (rawCall) => {
        const call = normalizeCall(rawCall);
        dispatch(callStarted(call));
        navigate(`/call/${call.id}`, { replace: true });
        const peer = await createPeer(call);
        const description = await peer.createOffer();
        await peer.setLocalDescription(description);
        await sendCallOffer(call.id, description);
      })
      .catch((reason: unknown) => dispatch(callFailed(reason instanceof Error ? reason.message : "Không thể bắt đầu cuộc gọi")));
  }, [callId, createPeer, dispatch, navigate, params]);

  useEffect(() => {
    if (!current || ["ENDED", "REJECTED", "MISSED"].includes(current.status)) return;
    void createPeer(current).catch((reason: unknown) => dispatch(callFailed(reason instanceof Error ? reason.message : "Không thể truy cập camera hoặc micro")));
  }, [createPeer, current, dispatch]);

  useEffect(() => {
    if (current?.status === "RINGING" && current.callerId.id === user.id)
      startCallTone("outgoing");
    else stopCallTone();
    return stopCallTone;
  }, [current?.callerId.id, current?.status, user.id]);

  useEffect(() => {
    if (!offer || offer.callId !== current?.id) return;
    void createPeer(current).then(async (peer) => {
      await peer.setRemoteDescription(offer.offer!);
      setRemoteDescriptionReady(true);
      dispatch(callErrorCleared());
      const description = await peer.createAnswer();
      await peer.setLocalDescription(description);
      await sendCallAnswer(current.id, description);
      dispatch(offerConsumed());
    }).catch((reason: unknown) => dispatch(callFailed(reason instanceof Error ? reason.message : "Không thể trả lời cuộc gọi")));
  }, [createPeer, current, dispatch, offer]);

  useEffect(() => {
    if (!answer || answer.callId !== current?.id || !peerRef.current) return;
    void peerRef.current.setRemoteDescription(answer.answer!).then(() => {
      setRemoteDescriptionReady(true);
      dispatch(callErrorCleared());
      dispatch(answerConsumed());
    }).catch(() => dispatch(callFailed("Không thể thiết lập kết nối cuộc gọi")));
  }, [answer, current?.id, dispatch]);

  useEffect(() => {
    if (!peerRef.current || !current || !remoteDescriptionReady) return;
    candidates.filter((candidate) => candidate.callId === current.id).forEach((signal) => {
      const key = JSON.stringify(signal.candidate);
      if (processingCandidatesRef.current.has(key)) return;
      processingCandidatesRef.current.add(key);
      void peerRef.current!.addIceCandidate(signal.candidate!).then(() => {
        dispatch(candidateConsumed(signal));
        processingCandidatesRef.current.delete(key);
      }).catch(() => {
        processingCandidatesRef.current.delete(key);
        dispatch(callFailed("Không thể thêm ICE candidate"));
      });
    });
  }, [candidates, current, dispatch, remoteDescriptionReady]);

  useEffect(() => () => {
    stopCallTone();
    peerRef.current?.close();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function hangUp() {
    stopCallTone();
    if (current && ["RINGING", "ONGOING"].includes(current.status)) {
      try { dispatch(callFinished(normalizeCall(await endCall<CallRecord>(current.id)))); }
      catch (reason) { dispatch(callFailed(reason instanceof Error ? reason.message : "Không thể kết thúc cuộc gọi")); }
    }
    peerRef.current?.close();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    dispatch(callCleared());
    navigate("/chat");
  }

  function toggleMute() {
    unlockCallAudio();
    const next = !muted;
    localStreamRef.current?.getAudioTracks().forEach((track) => (track.enabled = !next));
    setMuted(next);
  }
  function toggleCamera() {
    const next = !cameraOff;
    localStreamRef.current?.getVideoTracks().forEach((track) => (track.enabled = !next));
    setCameraOff(next);
  }
  function enableSound() {
    unlockCallAudio();
    void remoteVideoRef.current?.play().then(() => setSoundBlocked(false));
  }

  return <section className="call-page">
    <div className="remote-stage">
      <video ref={remoteVideoRef} autoPlay playsInline />
      <div className="call-person">
        <div className="call-person-avatar">{otherUser?.avatarUrl ? <img src={otherUser.avatarUrl} alt="" /> : otherUser?.displayName?.[0] ?? "?"}</div>
        <h1>{otherUser?.displayName ?? "Đang tạo cuộc gọi…"}</h1>
        <p>{current?.status === "ONGOING" ? "Đang gọi" : current?.status === "REJECTED" ? "Cuộc gọi bị từ chối" : current?.status === "ENDED" || current?.status === "MISSED" ? "Cuộc gọi đã kết thúc" : "Đang đổ chuông…"}</p>
        {error && <small className="call-error">{error}</small>}
        {soundBlocked && <button className="enable-call-sound" onClick={enableSound}>Bật âm thanh cuộc gọi</button>}
      </div>
      {current?.type === "VIDEO" && <video className="local-video" ref={localVideoRef} autoPlay muted playsInline />}
    </div>
    <div className="call-controls">
      <button className={muted ? "off" : ""} onClick={toggleMute}>🎙️<span>{muted ? "Bật mic" : "Tắt mic"}</span></button>
      {current?.type === "VIDEO" && <button className={cameraOff ? "off" : ""} onClick={toggleCamera}>📹<span>{cameraOff ? "Bật camera" : "Tắt camera"}</span></button>}
      <button className="hang-up" onClick={() => void hangUp()}>📞<span>Kết thúc</span></button>
    </div>
  </section>;
}
