import 'dart:async';
import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../app_state.dart';
import '../models.dart';
import '../realtime_service.dart';
import '../widgets.dart';
import 'calls_screen.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({
    super.key,
    required this.state,
    required this.conversation,
  });
  final AppState state;
  final Conversation conversation;
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final input = TextEditingController();
  final scroll = ScrollController();
  List<ChatMessage> items = [];
  bool loading = true, sending = false, otherTyping = false;
  StreamSubscription<RealtimeEvent>? subscription;
  Timer? typingTimer;
  User get other => widget.conversation.other(widget.state.user!.id);

  @override
  void initState() {
    super.initState();
    load();
    widget.state.realtime.join(widget.conversation.id);
    widget.state.realtime.read(widget.conversation.id);
    subscription = widget.state.realtime.events.stream.listen(onEvent);
  }

  Future<void> load() async {
    try {
      items = await widget.state.messages(widget.conversation.id);
      items.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  void onEvent(RealtimeEvent event) {
    if (event.name == 'message:new') {
      final message = ChatMessage.fromJson(
        Map<String, dynamic>.from(event.data),
      );
      if (message.conversationId == widget.conversation.id &&
          !items.any((m) => m.id == message.id))
        setState(() => items.add(message));
    } else if (event.name == 'typing:update' &&
        event.data['conversationId'] == widget.conversation.id) {
      setState(() => otherTyping = event.data['isTyping'] == true);
    } else if (event.name == 'message:removed') {
      setState(
        () =>
            items.removeWhere((m) => m.id == objectId(event.data['messageId'])),
      );
    }
  }

  Future<void> send({List<dynamic> attachments = const []}) async {
    final text = input.text.trim();
    if (text.isEmpty && attachments.isEmpty) return;
    setState(() => sending = true);
    input.clear();
    widget.state.realtime.typing(widget.conversation.id, false);
    try {
      await widget.state.realtime.emitAck('message:send', {
        'conversationId': widget.conversation.id,
        'content': text,
        'attachments': attachments,
      });
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  Future<void> attach() async {
    final selected = await FilePicker.platform.pickFiles(allowMultiple: true);
    if (selected == null) return;
    setState(() => sending = true);
    try {
      final files = selected.paths.whereType<String>().map(File.new).toList();
      final uploaded = await widget.state.api.upload(
        '/conversations/${widget.conversation.id}/messages/attachments',
        files,
      );
      await send(attachments: uploaded);
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  void changed(String value) {
    widget.state.realtime.typing(widget.conversation.id, true);
    typingTimer?.cancel();
    typingTimer = Timer(
      const Duration(seconds: 2),
      () => widget.state.realtime.typing(widget.conversation.id, false),
    );
  }

  @override
  void dispose() {
    subscription?.cancel();
    typingTimer?.cancel();
    input.dispose();
    scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      leadingWidth: 32,
      title: Row(
        children: [
          UserAvatar(other, radius: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(other.displayName, style: const TextStyle(fontSize: 16)),
                Text(
                  otherTyping
                      ? 'đang nhập...'
                      : other.status == 'ONLINE'
                      ? 'Đang hoạt động'
                      : 'Ngoại tuyến',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
      actions: [
        IconButton(
          onPressed: () => startCall('AUDIO'),
          icon: const Icon(Icons.call),
        ),
        IconButton(
          onPressed: () => startCall('VIDEO'),
          icon: const Icon(Icons.videocam),
        ),
      ],
    ),
    body: Column(
      children: [
        Expanded(
          child: loading
              ? const Center(child: CircularProgressIndicator())
              : ListView.builder(
                  controller: scroll,
                  padding: const EdgeInsets.all(12),
                  itemCount: items.length,
                  itemBuilder: (context, index) {
                    final message = items[index],
                        mine = message.senderId == widget.state.user!.id;
                    return Align(
                      alignment: mine
                          ? Alignment.centerRight
                          : Alignment.centerLeft,
                      child: GestureDetector(
                        onLongPress: mine ? () => remove(message) : null,
                        child: Container(
                          margin: const EdgeInsets.symmetric(vertical: 3),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 9,
                          ),
                          constraints: BoxConstraints(
                            maxWidth: MediaQuery.sizeOf(context).width * .76,
                          ),
                          decoration: BoxDecoration(
                            color: mine
                                ? Theme.of(context).colorScheme.primaryContainer
                                : Theme.of(context)
                                      .colorScheme
                                      .surfaceContainerHighest,
                            borderRadius: BorderRadius.circular(18),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (message.attachments.isNotEmpty)
                                Text('📎 ${message.attachments.length} tệp'),
                              if (message.content.isNotEmpty)
                                Text(message.content),
                              if (message.editedAt != null)
                                Text(
                                  'đã sửa',
                                  style: Theme.of(context).textTheme.labelSmall,
                                ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(8, 6, 8, 8),
            child: Row(
              children: [
                IconButton(
                  onPressed: sending ? null : attach,
                  icon: const Icon(Icons.attach_file),
                ),
                Expanded(
                  child: TextField(
                    controller: input,
                    onChanged: changed,
                    minLines: 1,
                    maxLines: 5,
                    decoration: const InputDecoration(
                      hintText: 'Nhập tin nhắn...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.all(Radius.circular(24)),
                      ),
                    ),
                  ),
                ),
                IconButton.filled(
                  onPressed: sending ? null : send,
                  icon: sending
                      ? const SizedBox.square(
                          dimension: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.send),
                ),
              ],
            ),
          ),
        ),
      ],
    ),
  );
  Future<void> remove(ChatMessage message) async {
    final ok =
        await showDialog<bool>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: const Text('Xóa tin nhắn?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext, false),
                child: const Text('Hủy'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(dialogContext, true),
                child: const Text('Xóa với mọi người'),
              ),
            ],
          ),
        ) ??
        false;
    if (ok)
      await widget.state.realtime.emitAck('message:remove', {
        'messageId': message.id,
      });
  }

  Future<void> startCall(String type) async {
    try {
      final call = await widget.state.initiateCall(other.id, type);
      if (mounted)
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ActiveCallScreen(
              state: widget.state,
              call: call,
              incoming: false,
            ),
          ),
        );
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }
}
