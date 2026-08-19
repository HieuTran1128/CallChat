import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

import '../app_state.dart';
import '../models.dart';
import '../realtime_service.dart';
import '../widgets.dart';

class CallsScreen extends StatelessWidget {
  const CallsScreen({super.key, required this.state});
  final AppState state;
  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: state.loadCalls,
    child: CustomScrollView(
      slivers: [
        const SliverAppBar.large(title: Text('Cuộc gọi')),
        if (state.calls.isEmpty)
          const SliverFillRemaining(
            child: Center(child: Text('Chưa có lịch sử cuộc gọi')),
          )
        else
          SliverList.builder(
            itemCount: state.calls.length,
            itemBuilder: (c, i) {
              final call = state.calls[i],
                  incoming = call.receiver.id == state.user!.id,
                  other = incoming ? call.caller : call.receiver;
              return ListTile(
                leading: UserAvatar(other),
                title: Text(other.displayName),
                subtitle: Text(
                  '${incoming ? 'Cuộc gọi đến' : 'Cuộc gọi đi'} · ${call.status}',
                ),
                trailing: Icon(
                  call.type == 'VIDEO' ? Icons.videocam : Icons.call,
                ),
              );
            },
          ),
      ],
    ),
  );
}

class ActiveCallScreen extends StatefulWidget {
  const ActiveCallScreen({
    super.key,
    required this.state,
    required this.call,
    required this.incoming,
  });
  final AppState state;
  final CallRecord call;
  final bool incoming;
  @override
  State<ActiveCallScreen> createState() => _ActiveCallScreenState();
}

class _ActiveCallScreenState extends State<ActiveCallScreen> {
  RTCPeerConnection? peer;
  MediaStream? localStream;
  final local = RTCVideoRenderer(), remote = RTCVideoRenderer();
  StreamSubscription<RealtimeEvent>? sub;
  bool muted = false,
      camera = true,
      ready = false,
      accepted = false,
      offered = false;
  Map<String, dynamic>? pendingOffer;
  User get other => widget.call.caller.id == widget.state.user!.id
      ? widget.call.receiver
      : widget.call.caller;
  @override
  void initState() {
    super.initState();
    sub = widget.state.realtime.events.stream.listen(signal);
    setup();
  }

  Future<void> setup() async {
    await local.initialize();
    await remote.initialize();
    localStream = await navigator.mediaDevices.getUserMedia({
      'audio': true,
      'video': widget.call.type == 'VIDEO',
    });
    local.srcObject = localStream;
    peer = await createPeerConnection({
      'iceServers': [
        {
          'urls': ['stun:stun.l.google.com:19302'],
        },
      ],
    });
    for (final track in localStream!.getTracks()) {
      await peer!.addTrack(track, localStream!);
    }
    peer!.onTrack = (event) {
      if (event.streams.isNotEmpty) {
        remote.srcObject = event.streams.first;
        if (mounted) setState(() {});
      }
    };
    peer!.onIceCandidate = (candidate) {
      if (candidate.candidate != null)
        widget.state.realtime.emitAck('call:ice-candidate', {
          'callId': widget.call.id,
          'candidate': candidate.toMap(),
        });
    };
    if (accepted && !widget.incoming) await sendOffer();
    if (pendingOffer != null) await handleOffer(pendingOffer!);
    if (mounted) setState(() => ready = true);
  }

  Future<void> sendOffer() async {
    if (peer == null || offered) return;
    offered = true;
    final offer = await peer!.createOffer();
    await peer!.setLocalDescription(offer);
    await widget.state.realtime.emitAck('call:offer', {
      'callId': widget.call.id,
      'offer': offer.toMap(),
    });
  }

  Future<void> handleOffer(Map<String, dynamic> offer) async {
    if (peer == null) {
      pendingOffer = offer;
      return;
    }
    pendingOffer = null;
    await peer!.setRemoteDescription(
      RTCSessionDescription(offer['sdp'], offer['type']),
    );
    final answer = await peer!.createAnswer();
    await peer!.setLocalDescription(answer);
    await widget.state.realtime.emitAck('call:answer', {
      'callId': widget.call.id,
      'answer': answer.toMap(),
    });
  }

  Future<void> signal(RealtimeEvent e) async {
    final data = e.data;
    if (data is! Map) return;
    final eventCallId = data['callId'] == null
        ? objectId(data)
        : '${data['callId']}';
    if (eventCallId != widget.call.id) return;
    if (e.name == 'call:accepted') {
      accepted = true;
      if (!widget.incoming) await sendOffer();
    } else if (e.name == 'call:offer') {
      final offer = Map<String, dynamic>.from(data['offer']);
      await handleOffer(offer);
    } else if (e.name == 'call:answer') {
      final answer = Map<String, dynamic>.from(data['answer']);
      await peer!.setRemoteDescription(
        RTCSessionDescription(answer['sdp'], answer['type']),
      );
    } else if (e.name == 'call:ice-candidate') {
      final value = Map<String, dynamic>.from(data['candidate']);
      await peer!.addCandidate(
        RTCIceCandidate(
          value['candidate'],
          value['sdpMid'],
          value['sdpMLineIndex'],
        ),
      );
    } else if (e.name == 'call:ended' || e.name == 'call:rejected') {
      if (mounted) Navigator.pop(context);
    }
  }

  Future<void> hangup() async {
    try {
      await widget.state.realtime.emitAck('call:end', {
        'callId': widget.call.id,
      });
    } finally {
      if (mounted) Navigator.pop(context);
    }
  }

  @override
  void dispose() {
    sub?.cancel();
    for (final t in localStream?.getTracks() ?? <MediaStreamTrack>[]) {
      t.stop();
    }
    peer?.close();
    local.dispose();
    remote.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: const Color(0xff12131a),
    body: SafeArea(
      child: Stack(
        children: [
          Positioned.fill(
            child: widget.call.type == 'VIDEO' && remote.srcObject != null
                ? RTCVideoView(
                    remote,
                    objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                  )
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      UserAvatar(other, radius: 64),
                      const SizedBox(height: 20),
                      Text(
                        other.displayName,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 28,
                        ),
                      ),
                      Text(
                        ready ? 'Đang kết nối...' : 'Đang chuẩn bị...',
                        style: const TextStyle(color: Colors.white70),
                      ),
                    ],
                  ),
          ),
          if (widget.call.type == 'VIDEO')
            Positioned(
              right: 16,
              top: 16,
              width: 110,
              height: 160,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: RTCVideoView(local, mirror: true),
              ),
            ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 36,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton.filled(
                  onPressed: () {
                    muted = !muted;
                    for (final t in localStream?.getAudioTracks() ?? []) {
                      t.enabled = !muted;
                    }
                    setState(() {});
                  },
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.white24,
                    foregroundColor: Colors.white,
                  ),
                  icon: Icon(muted ? Icons.mic_off : Icons.mic),
                ),
                if (widget.call.type == 'VIDEO') ...[
                  const SizedBox(width: 20),
                  IconButton.filled(
                    onPressed: () {
                      camera = !camera;
                      for (final t in localStream?.getVideoTracks() ?? []) {
                        t.enabled = camera;
                      }
                      setState(() {});
                    },
                    style: IconButton.styleFrom(
                      backgroundColor: Colors.white24,
                      foregroundColor: Colors.white,
                    ),
                    icon: Icon(camera ? Icons.videocam : Icons.videocam_off),
                  ),
                ],
                const SizedBox(width: 20),
                IconButton.filled(
                  onPressed: hangup,
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                  ),
                  icon: const Icon(Icons.call_end),
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}
