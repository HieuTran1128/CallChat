import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'config.dart';

class ApiException implements Exception {
  ApiException(this.message);
  final String message;
  @override
  String toString() => message;
}

class ApiClient {
  String? token;
  Future<dynamic> request(
    String path, {
    String method = 'GET',
    Object? body,
  }) async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (token != null) headers['Authorization'] = 'Bearer $token';
    final uri = Uri.parse('${AppConfig.apiUrl}$path');
    try {
      final request = http.Request(method, uri)..headers.addAll(headers);
      if (body != null) request.body = jsonEncode(body);
      final response = await http.Response.fromStream(
        await request.send().timeout(const Duration(seconds: 20)),
      );
      if (response.statusCode < 200 || response.statusCode >= 300) {
        dynamic error;
        try {
          error = jsonDecode(response.body);
        } catch (_) {}
        final raw = error is Map ? error['message'] : null;
        throw ApiException(
          raw is List ? raw.join('. ') : '${raw ?? 'Yêu cầu không thành công'}',
        );
      }
      if (response.statusCode == 204 || response.body.isEmpty) return null;
      return jsonDecode(response.body);
    } on SocketException {
      throw ApiException('Không kết nối được backend');
    }
  }

  Future<List<dynamic>> upload(
    String path,
    List<File> files, {
    String field = 'files',
  }) async {
    final request = http.MultipartRequest(
      'POST',
      Uri.parse('${AppConfig.apiUrl}$path'),
    );
    request.headers['Authorization'] = 'Bearer $token';
    for (final file in files) {
      request.files.add(await http.MultipartFile.fromPath(field, file.path));
    }
    final response = await http.Response.fromStream(await request.send());
    if (response.statusCode < 200 || response.statusCode >= 300)
      throw ApiException('Không thể tải tệp lên');
    return List<dynamic>.from(jsonDecode(response.body));
  }
}
