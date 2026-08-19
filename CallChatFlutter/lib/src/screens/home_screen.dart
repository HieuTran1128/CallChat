import 'package:flutter/material.dart';

import '../app_state.dart';
import 'calls_screen.dart';
import 'contacts_screen.dart';
import 'conversations_screen.dart';
import 'profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.state});
  final AppState state;
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int index = 0;
  @override
  Widget build(BuildContext context) {
    final pages = [
      ConversationsScreen(state: widget.state),
      ContactsScreen(state: widget.state),
      CallsScreen(state: widget.state),
      ProfileScreen(state: widget.state),
    ];
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            if (widget.state.incomingCall != null)
              MaterialBanner(
                content: Text(
                  'Cuộc gọi ${widget.state.incomingCall!.type == 'VIDEO' ? 'video' : 'thoại'} từ ${widget.state.incomingCall!.caller.displayName}',
                ),
                leading: const Icon(Icons.call),
                actions: [
                  TextButton(
                    onPressed: () async {
                      await widget.state.realtime.emitAck('call:reject', {
                        'callId': widget.state.incomingCall!.id,
                      });
                      widget.state.incomingCall = null;
                    },
                    child: const Text('TỪ CHỐI'),
                  ),
                  FilledButton(
                    onPressed: () async {
                      final call = widget.state.incomingCall!;
                      await widget.state.realtime.emitAck('call:accept', {
                        'callId': call.id,
                      });
                      if (context.mounted)
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => ActiveCallScreen(
                              state: widget.state,
                              call: call,
                              incoming: true,
                            ),
                          ),
                        );
                    },
                    child: const Text('NGHE'),
                  ),
                ],
              ),
            Expanded(
              child: IndexedStack(index: index, children: pages),
            ),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) => setState(() => index = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.chat_bubble_outline),
            selectedIcon: Icon(Icons.chat_bubble),
            label: 'Tin nhắn',
          ),
          NavigationDestination(
            icon: Icon(Icons.people_outline),
            selectedIcon: Icon(Icons.people),
            label: 'Liên hệ',
          ),
          NavigationDestination(
            icon: Icon(Icons.call_outlined),
            selectedIcon: Icon(Icons.call),
            label: 'Cuộc gọi',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Cá nhân',
          ),
        ],
      ),
    );
  }
}
