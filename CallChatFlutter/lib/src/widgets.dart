import 'package:flutter/material.dart';

import 'models.dart';

class UserAvatar extends StatelessWidget {
  const UserAvatar(this.user, {super.key, this.radius = 24});
  final User user;
  final double radius;
  @override
  Widget build(BuildContext context) => CircleAvatar(
    radius: radius,
    backgroundImage: user.avatarUrl == null
        ? null
        : NetworkImage(user.avatarUrl!),
    child: user.avatarUrl == null
        ? Text(
            user.displayName.isEmpty ? '?' : user.displayName[0].toUpperCase(),
          )
        : null,
  );
}

void showError(BuildContext context, Object error) =>
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text('$error')));
