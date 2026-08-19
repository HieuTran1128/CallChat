import 'dart:io';

class AppConfig {
  static const _definedUrl = String.fromEnvironment('API_URL');
  static String get apiUrl {
    if (_definedUrl.isNotEmpty)
      return _definedUrl.replaceFirst(RegExp(r'/$'), '');
    return Platform.isAndroid
        ? 'http://10.0.2.2:3000'
        : 'http://localhost:3000';
  }
}
