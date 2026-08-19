import 'package:flutter/material.dart';

import '../app_state.dart';
import '../widgets.dart';
import 'chat_screen.dart';

class ConversationsScreen extends StatelessWidget {
  const ConversationsScreen({super.key, required this.state});
  final AppState state;
  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: state.loadConversations,
    child: CustomScrollView(
      slivers: [
        SliverAppBar.large(
          title: const Text('Tin nhắn'),
          actions: [
            IconButton(
              onPressed: state.loadConversations,
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        if (state.conversations.isEmpty)
          const SliverFillRemaining(
            child: Center(
              child: Text(
                'Chưa có cuộc trò chuyện\nHãy tìm bạn trong mục Liên hệ',
                textAlign: TextAlign.center,
              ),
            ),
          )
        else
          SliverList.builder(
            itemCount: state.conversations.length,
            itemBuilder: (context, i) {
              final item = state.conversations[i],
                  other = item.other(state.user!.id),
                  preview =
                      '${item.lastMessage?['content'] ?? 'Bắt đầu trò chuyện'}';
              return ListTile(
                leading: UserAvatar(other),
                title: Text(
                  other.displayName,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text(
                  preview.isEmpty ? 'Đã gửi tệp đính kèm' : preview,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                trailing: item.unreadCount > 0
                    ? Badge(label: Text('${item.unreadCount}'))
                    : null,
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) =>
                        ChatScreen(state: state, conversation: item),
                  ),
                ),
              );
            },
          ),
      ],
    ),
  );
}
