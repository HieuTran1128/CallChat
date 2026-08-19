import 'package:flutter/material.dart';

import '../app_state.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, required this.state});
  final AppState state;
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final form = GlobalKey<FormState>();
  final identifier = TextEditingController(),
      email = TextEditingController(),
      name = TextEditingController(),
      password = TextEditingController();
  bool register = false;
  @override
  void dispose() {
    identifier.dispose();
    email.dispose();
    name.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (!form.currentState!.validate()) return;
    final ok = register
        ? await widget.state.register(
            identifier.text.trim(),
            email.text.trim(),
            name.text.trim(),
            password.text,
          )
        : await widget.state.login(identifier.text.trim(), password.text);
    if (!ok && mounted)
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(widget.state.error ?? 'Có lỗi xảy ra')),
      );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Form(
              key: form,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.forum_rounded,
                    size: 72,
                    color: Color(0xff5865f2),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'CallChat',
                    style: Theme.of(context).textTheme.headlineLarge
                        ?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  Text(
                    register ? 'Tạo tài khoản mới' : 'Chào mừng bạn quay lại',
                  ),
                  const SizedBox(height: 28),
                  TextFormField(
                    controller: identifier,
                    decoration: InputDecoration(
                      labelText: register
                          ? 'Tên đăng nhập'
                          : 'Email hoặc tên đăng nhập',
                      prefixIcon: const Icon(Icons.person),
                    ),
                    validator: (v) => v == null || v.trim().isEmpty
                        ? 'Không được để trống'
                        : null,
                  ),
                  const SizedBox(height: 12),
                  if (register) ...[
                    TextFormField(
                      controller: email,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        prefixIcon: Icon(Icons.email),
                      ),
                      validator: (v) => v != null && v.contains('@')
                          ? null
                          : 'Email không hợp lệ',
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: name,
                      decoration: const InputDecoration(
                        labelText: 'Tên hiển thị',
                        prefixIcon: Icon(Icons.badge),
                      ),
                      validator: (v) => v == null || v.trim().length < 2
                          ? 'Nhập ít nhất 2 ký tự'
                          : null,
                    ),
                    const SizedBox(height: 12),
                  ],
                  TextFormField(
                    controller: password,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Mật khẩu',
                      prefixIcon: Icon(Icons.lock),
                    ),
                    validator: (v) => v == null || v.length < 8
                        ? 'Mật khẩu cần ít nhất 8 ký tự'
                        : null,
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: widget.state.busy ? null : submit,
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: widget.state.busy
                            ? const SizedBox.square(
                                dimension: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : Text(register ? 'Đăng ký' : 'Đăng nhập'),
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: () => setState(() => register = !register),
                    child: Text(
                      register
                          ? 'Đã có tài khoản? Đăng nhập'
                          : 'Chưa có tài khoản? Đăng ký',
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
