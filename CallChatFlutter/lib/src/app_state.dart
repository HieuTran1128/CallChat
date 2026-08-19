import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'api_client.dart';
import 'models.dart';
import 'realtime_service.dart';

class AppState extends ChangeNotifier {
  final api = ApiClient();
  final realtime = RealtimeService();
  final _storage = const FlutterSecureStorage();
  StreamSubscription<RealtimeEvent>? _subscription;
  User? user;
  String? token, error;
  bool restoring = true, busy = false;
  List<Conversation> conversations = [];
  List<CallRecord> calls = [];
  CallRecord? incomingCall;

  AppState() {
    _subscription = realtime.events.stream.listen(_onEvent);
    restore();
  }
  Future<void> restore() async {
    token = await _storage.read(key: 'callchat_access_token');
    if (token != null) {
      api.token = token;
      try {
        user = User.fromJson(
          Map<String, dynamic>.from(await api.request('/auth/me')),
        );
        await _startSession();
      } catch (_) {
        await logout();
      }
    }
    restoring = false;
    notifyListeners();
  }

  Future<bool> login(String identifier, String password) => _authenticate(
    '/auth/login',
    {'identifier': identifier, 'password': password},
  );
  Future<bool> register(
    String username,
    String email,
    String displayName,
    String password,
  ) => _authenticate('/auth/register', {
    'username': username,
    'email': email,
    'displayName': displayName,
    'password': password,
  });
  Future<bool> _authenticate(String path, Map<String, String> body) async {
    busy = true;
    error = null;
    notifyListeners();
    try {
      final data = Map<String, dynamic>.from(
        await api.request(path, method: 'POST', body: body),
      );
      token = '${data['accessToken']}';
      user = User.fromJson(Map<String, dynamic>.from(data['user']));
      api.token = token;
      await _storage.write(key: 'callchat_access_token', value: token);
      await _startSession();
      return true;
    } catch (e) {
      error = '$e';
      return false;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> _startSession() async {
    realtime.connect(token!);
    await Future.wait([loadConversations(), loadCalls()]);
  }

  Future<void> logout() async {
    realtime.disconnect();
    await _storage.delete(key: 'callchat_access_token');
    token = null;
    api.token = null;
    user = null;
    conversations = [];
    notifyListeners();
  }

  Future<void> loadConversations() async {
    conversations = (await api.request('/conversations') as List)
        .map((e) => Conversation.fromJson(Map<String, dynamic>.from(e)))
        .toList();
    notifyListeners();
  }

  Future<List<ChatMessage>> messages(String id, {int page = 1}) async {
    final data = Map<String, dynamic>.from(
      await api.request('/conversations/$id/messages?page=$page&limit=30'),
    );
    return (data['items'] as List)
        .map((e) => ChatMessage.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Conversation> direct(String userId) async {
    final value = Conversation.fromJson(
      Map<String, dynamic>.from(
        await api.request('/conversations/direct/$userId', method: 'POST'),
      ),
    );
    await loadConversations();
    return value;
  }

  Future<List<User>> searchUsers(String text) async => (await api.request(
    '/users/search?q=${Uri.encodeQueryComponent(text)}',
  ) as List).map((e) => User.fromJson(Map<String, dynamic>.from(e))).toList();
  Future<void> sendFriendRequest(String id) async {
    await api.request('/contacts/requests/$id', method: 'POST');
  }

  Future<Map<String, List<dynamic>>> contactData() async => {
    'friends': await api.request('/contacts/friends'),
    'incoming': await api.request('/contacts/requests/incoming'),
    'outgoing': await api.request('/contacts/requests/outgoing'),
  };
  Future<void> acceptRequest(String id) async {
    await api.request('/contacts/requests/$id/accept', method: 'PATCH');
  }

  Future<void> rejectRequest(String id) async {
    await api.request('/contacts/requests/$id/reject', method: 'PATCH');
  }

  Future<void> loadCalls() async {
    calls = (await api.request('/calls') as List)
        .map((e) => CallRecord.fromJson(Map<String, dynamic>.from(e)))
        .toList();
    notifyListeners();
  }

  Future<CallRecord> initiateCall(String receiverId, String type) async {
    final ack = await realtime.emitAck('call:initiate', {
      'receiverId': receiverId,
      'type': type,
    });
    return CallRecord.fromJson(Map<String, dynamic>.from(ack['call']));
  }

  void _onEvent(RealtimeEvent event) {
    if (event.name == 'message:new') {
      loadConversations();
    }
    if (event.name == 'call:incoming')
      incomingCall = CallRecord.fromJson(Map<String, dynamic>.from(event.data));
    if (['call:rejected', 'call:ended'].contains(event.name)) {
      incomingCall = null;
      loadCalls();
    }
    notifyListeners();
  }

  @override
  void dispose() {
    _subscription?.cancel();
    realtime.dispose();
    super.dispose();
  }
}
