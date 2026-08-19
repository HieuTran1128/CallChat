import 'package:flutter/material.dart';

import 'app_state.dart';
import 'screens/auth_screen.dart';
import 'screens/home_screen.dart';

class CallChatApp extends StatefulWidget {
  const CallChatApp({super.key});
  @override
  State<CallChatApp> createState() => _CallChatAppState();
}

class _CallChatAppState extends State<CallChatApp> {
  late final AppState state = AppState();
  @override
  void dispose() {
    state.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    title: 'CallChat',
    theme: ThemeData(
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xff5865f2),
        brightness: Brightness.light,
      ),
      useMaterial3: true,
      inputDecorationTheme: const InputDecorationTheme(
        border: OutlineInputBorder(),
        filled: true,
      ),
    ),
    home: ListenableBuilder(
      listenable: state,
      builder: (_, __) {
        if (state.restoring)
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        return state.user == null
            ? AuthScreen(state: state)
            : HomeScreen(state: state);
      },
    ),
  );
}
