import 'package:flutter/material.dart';

import '../app_state.dart';
import '../models.dart';
import '../widgets.dart';
import 'chat_screen.dart';

class ContactsScreen extends StatefulWidget {
  const ContactsScreen({super.key, required this.state});
  final AppState state;
  @override
  State<ContactsScreen> createState() => _ContactsScreenState();
}

class _ContactsScreenState extends State<ContactsScreen> {
  final search = TextEditingController();
  List<User> results = [];
  Map<String, List<dynamic>> data = {};
  bool loading = true;
  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  Future<void> load() async {
    try {
      data = await widget.state.contactData();
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> doSearch() async {
    if (search.text.trim().isEmpty) return;
    try {
      results = await widget.state.searchUsers(search.text.trim());
      setState(() {});
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  User other(dynamic record) {
    final users = (record['participants'] as List)
        .map((e) => User.fromJson(Map<String, dynamic>.from(e)))
        .toList();
    return users.firstWhere(
      (u) => u.id != widget.state.user!.id,
      orElse: () => users.first,
    );
  }

  @override
  Widget build(BuildContext context) => CustomScrollView(
    slivers: [
      SliverAppBar.large(title: const Text('Liên hệ')),
      SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: SearchBar(
            controller: search,
            hintText: 'Tìm theo tên hoặc username',
            onSubmitted: (_) => doSearch(),
            trailing: [
              IconButton(onPressed: doSearch, icon: const Icon(Icons.search)),
            ],
          ),
        ),
      ),
      if (results.isNotEmpty)
        SliverList.builder(
          itemCount: results.length,
          itemBuilder: (c, i) {
            final u = results[i];
            return ListTile(
              leading: UserAvatar(u),
              title: Text(u.displayName),
              subtitle: Text('@${u.username}'),
              trailing: IconButton(
                onPressed: () async {
                  try {
                    await widget.state.sendFriendRequest(u.id);
                    if (c.mounted)
                      ScaffoldMessenger.of(c).showSnackBar(
                        const SnackBar(content: Text('Đã gửi lời mời')),
                      );
                  } catch (e) {
                    if (c.mounted) showError(c, e);
                  }
                },
                icon: const Icon(Icons.person_add),
              ),
            );
          },
        ),
      if (loading)
        const SliverFillRemaining(
          child: Center(child: CircularProgressIndicator()),
        )
      else ...[
        if ((data['incoming'] ?? []).isNotEmpty)
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Lời mời kết bạn',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ),
        SliverList.builder(
          itemCount: (data['incoming'] ?? []).length,
          itemBuilder: (c, i) {
            final record = data['incoming']![i], u = other(record);
            return ListTile(
              leading: UserAvatar(u),
              title: Text(u.displayName),
              trailing: Wrap(
                children: [
                  IconButton(
                    onPressed: () async {
                      await widget.state.rejectRequest(objectId(record));
                      load();
                    },
                    icon: const Icon(Icons.close),
                  ),
                  IconButton(
                    onPressed: () async {
                      await widget.state.acceptRequest(objectId(record));
                      load();
                    },
                    icon: const Icon(Icons.check),
                  ),
                ],
              ),
            );
          },
        ),
        const SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              'Bạn bè',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ),
        SliverList.builder(
          itemCount: (data['friends'] ?? []).length,
          itemBuilder: (c, i) {
            final u = other(data['friends']![i]);
            return ListTile(
              leading: UserAvatar(u),
              title: Text(u.displayName),
              subtitle: Text(
                u.status == 'ONLINE' ? 'Đang hoạt động' : 'Ngoại tuyến',
              ),
              onTap: () async {
                final conversation = await widget.state.direct(u.id);
                if (c.mounted)
                  Navigator.push(
                    c,
                    MaterialPageRoute(
                      builder: (_) => ChatScreen(
                        state: widget.state,
                        conversation: conversation,
                      ),
                    ),
                  );
              },
            );
          },
        ),
      ],
    ],
  );
}
