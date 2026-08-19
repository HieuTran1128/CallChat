String objectId(dynamic value) {
  if (value is String) return value;
  if (value is Map) return '${value['_id'] ?? value['id'] ?? ''}';
  return '';
}

class User {
  const User({
    required this.id,
    required this.username,
    required this.displayName,
    this.email = '',
    this.avatarUrl,
    this.status = 'OFFLINE',
    this.role = 'USER',
  });
  final String id, username, displayName, email, status, role;
  final String? avatarUrl;
  factory User.fromJson(Map<String, dynamic> json) => User(
    id: objectId(json),
    username: '${json['username'] ?? ''}',
    displayName: '${json['displayName'] ?? json['username'] ?? ''}',
    email: '${json['email'] ?? ''}',
    avatarUrl: json['avatarUrl'] as String?,
    status: '${json['status'] ?? 'OFFLINE'}',
    role: '${json['role'] ?? 'USER'}',
  );
}

class Conversation {
  Conversation({
    required this.id,
    required this.participants,
    this.lastMessage,
    this.unreadCount = 0,
  });
  final String id;
  final List<User> participants;
  Map<String, dynamic>? lastMessage;
  int unreadCount;
  factory Conversation.fromJson(Map<String, dynamic> json) => Conversation(
    id: objectId(json),
    participants: ((json['participants'] as List?) ?? [])
        .map((e) => User.fromJson(Map<String, dynamic>.from(e)))
        .toList(),
    lastMessage: json['lastMessage'] == null
        ? null
        : Map<String, dynamic>.from(json['lastMessage']),
    unreadCount: (json['unreadCount'] as num?)?.toInt() ?? 0,
  );
  User other(String me) => participants.firstWhere(
    (u) => u.id != me,
    orElse: () => participants.first,
  );
}

class ChatMessage {
  ChatMessage({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.content,
    required this.createdAt,
    this.type = 'TEXT',
    this.attachments = const [],
    this.reactions = const [],
    this.editedAt,
  });
  final String id, conversationId, senderId, content, type;
  final DateTime createdAt;
  final List<dynamic> attachments, reactions;
  final String? editedAt;
  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
    id: objectId(json),
    conversationId: objectId(json['conversationId']),
    senderId: objectId(json['senderId']),
    content: '${json['content'] ?? ''}',
    type: '${json['type'] ?? 'TEXT'}',
    createdAt: DateTime.tryParse('${json['createdAt']}') ?? DateTime.now(),
    attachments: (json['attachments'] as List?) ?? const [],
    reactions: (json['reactions'] as List?) ?? const [],
    editedAt: json['editedAt'] as String?,
  );
}

class CallRecord {
  const CallRecord({
    required this.id,
    required this.caller,
    required this.receiver,
    required this.type,
    required this.status,
  });
  final String id, type, status;
  final User caller, receiver;
  factory CallRecord.fromJson(Map<String, dynamic> json) => CallRecord(
    id: objectId(json),
    caller: User.fromJson(Map<String, dynamic>.from(json['callerId'])),
    receiver: User.fromJson(Map<String, dynamic>.from(json['receiverId'])),
    type: '${json['type']}',
    status: '${json['status']}',
  );
}
