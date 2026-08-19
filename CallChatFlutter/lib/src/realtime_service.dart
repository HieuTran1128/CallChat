import 'dart:async';

import 'package:socket_io_client/socket_io_client.dart' as io;

import 'config.dart';

class RealtimeService {
  io.Socket? _socket;
  final events = StreamController<RealtimeEvent>.broadcast();
  bool get connected => _socket?.connected == true;
  void connect(String token) {
    disconnect();
    _socket = io.io(
      '${AppConfig.apiUrl}/presence',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .enableReconnection()
          .disableAutoConnect()
          .build(),
    );
    for (final name in [
      'presence:update',
      'message:new',
      'message:receipt',
      'typing:update',
      'message:updated',
      'message:removed',
      'message:deleted-for-me',
      'call:incoming',
      'call:accepted',
      'call:rejected',
      'call:ended',
      'call:offer',
      'call:answer',
      'call:ice-candidate',
    ]) {
      _socket!.on(name, (data) => events.add(RealtimeEvent(name, data)));
    }
    _socket!.connect();
  }

  void join(String id) =>
      _socket?.emit('conversation:join', {'conversationId': id});
  void typing(String id, bool active) => _socket?.emit(
    active ? 'typing:start' : 'typing:stop',
    {'conversationId': id},
  );
  void read(String id) => _socket?.emit('message:read', {'conversationId': id});
  Future<dynamic> emitAck(String event, Map<String, dynamic> data) {
    final completer = Completer<dynamic>();
    if (!connected) return Future.error('Mất kết nối tới máy chủ');
    _socket!.emitWithAck(
      event,
      data,
      ack: (response) {
        if (response is Map && response['ok'] == true)
          completer.complete(response);
        else
          completer.completeError(
            response is Map
                ? '${response['error'] ?? 'Không thể xử lý'}'
                : 'Không thể xử lý',
          );
      },
    );
    return completer.future.timeout(const Duration(seconds: 15));
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
  }

  void dispose() {
    disconnect();
    events.close();
  }
}

class RealtimeEvent {
  const RealtimeEvent(this.name, this.data);
  final String name;
  final dynamic data;
}
