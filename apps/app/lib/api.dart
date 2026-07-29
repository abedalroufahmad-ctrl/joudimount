import 'dart:convert';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, TargetPlatform;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class Api {
  static const int _defaultPort = 4000;
  static const String _defaultLanBase = 'http://192.168.227.197:4000';

  static void _clearSessionIfUnauthorized(int statusCode) {
    if (statusCode != 401) return;
    SharedPreferences.getInstance().then((prefs) async {
      await prefs.remove('token');
      await prefs.remove('user');
    });
  }

  /// Optional override: use a **real** LAN IP, e.g.
  /// `flutter run --dart-define=API_BASE=http://192.168.0.108:4000`
  /// (do not use the words `your_pc_lan_ip` — that was documentation, not a hostname).
  static const String _apiBaseFromEnv = String.fromEnvironment('API_BASE');

  static bool _isInvalidApiBasePlaceholder(String raw) {
    final s = raw.trim().toLowerCase();
    if (s.isEmpty) return true;
    // Common mistake: copying doc text instead of an actual IP.
    if (s.contains('your_pc') || s.contains('<') || s.contains('>'))
      return true;
    final uri = Uri.tryParse(raw.trim());
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) return true;
    return false;
  }

  static String _normalizeBase(String raw) {
    final t = raw.trim();
    return t.endsWith('/') ? t.substring(0, t.length - 1) : t;
  }

  static List<String> get _baseUrls {
    if (_apiBaseFromEnv.isNotEmpty &&
        !_isInvalidApiBasePlaceholder(_apiBaseFromEnv)) {
      return [_normalizeBase(_apiBaseFromEnv)];
    }
    const localhost = 'http://localhost:$_defaultPort';
    const emulator = 'http://10.0.2.2:$_defaultPort';

    // Dual-host defaults:
    // - desktop/web: localhost, then LAN
    // - Android: LAN, then emulator alias, then localhost/reverse.
    final candidates = defaultTargetPlatform == TargetPlatform.android
        ? <String>[_defaultLanBase, emulator, localhost]
        : <String>[localhost, _defaultLanBase];
    final out = <String>[];
    for (final raw in candidates) {
      final v = _normalizeBase(raw);
      final uri = Uri.tryParse(v);
      if (uri == null || !uri.hasScheme || uri.host.isEmpty) continue;
      if (!out.contains(v)) out.add(v);
    }
    return out;
  }

  static String get baseUrl => _baseUrls.first;

  static Uri _uriFor(String base, String path) {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return Uri.parse(path);
    }
    return Uri.parse('$base$path');
  }

  static String? _workingBaseUrl;

  static Future<http.Response> _sendWithFallback(
    Future<http.Response> Function(Uri uri) sender, {
    required String path,
  }) async {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return sender(Uri.parse(path));
    }

    if (_workingBaseUrl != null) {
      try {
        return await sender(_uriFor(_workingBaseUrl!, path));
      } catch (_) {
        // If the cached URL fails, clear it and try the fallback loop again.
        _workingBaseUrl = null;
      }
    }

    Object? lastError;
    for (final base in _baseUrls) {
      final uri = _uriFor(base, path);
      try {
        // Use a short timeout for the fallback ping so it doesn't hang the app for 60 seconds
        // when trying an unreachable LAN IP.
        final res = await sender(uri).timeout(const Duration(seconds: 3));
        _workingBaseUrl = base;
        return res;
      } catch (e) {
        lastError = e;
      }
    }
    throw Exception(
      'Could not reach API on any configured host (${_baseUrls.join(', ')}): $lastError',
    );
  }

  static Future<Map<String, String>> _authHeaders(
      {bool jsonBody = true}) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    final headers = <String, String>{};
    if (jsonBody) headers['Content-Type'] = 'application/json';
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  static Future<dynamic> get(String path) async {
    final headers = await _authHeaders();
    final res = await _sendWithFallback(
      (uri) => http.get(uri, headers: headers),
      path: path,
    );
    return _handle(res);
  }

  static final Map<String, Uint8List> _byteCache = {};

  /// Authenticated GET for binary assets (e.g. document attachment images).
  static Future<Uint8List> getBytes(String path) async {
    if (_byteCache.containsKey(path)) return _byteCache[path]!;
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    final headers = <String, String>{};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    final res = await _sendWithFallback(
      (uri) => http.get(uri, headers: headers),
      path: path,
    );
    if (res.statusCode >= 200 && res.statusCode < 300) {
      _byteCache[path] = res.bodyBytes;
      return res.bodyBytes;
    }
    _clearSessionIfUnauthorized(res.statusCode);
    throw Exception('Failed to load asset');
  }

  static Future<dynamic> post(String path, Map<String, dynamic> body) async {
    final headers = await _authHeaders();
    final res = await _sendWithFallback(
      (uri) => http.post(uri, headers: headers, body: jsonEncode(body)),
      path: path,
    );
    return _handle(res);
  }

  static Future<dynamic> put(String path, Map<String, dynamic> body) async {
    final headers = await _authHeaders();
    final res = await _sendWithFallback(
      (uri) => http.put(uri, headers: headers, body: jsonEncode(body)),
      path: path,
    );
    return _handle(res);
  }

  static Future<dynamic> delete(String path) async {
    final headers = await _authHeaders();
    final res = await _sendWithFallback(
      (uri) => http.delete(uri, headers: headers),
      path: path,
    );
    return _handle(res);
  }

  static Future<void> _attachFiles(
      http.MultipartRequest req, List<PlatformFile> files, String fieldName) async {
    for (final pf in files) {
      if (pf.path != null) {
        req.files.add(
            await http.MultipartFile.fromPath(fieldName, pf.path!));
      } else if (pf.bytes != null) {
        req.files.add(http.MultipartFile.fromBytes(
          fieldName,
          pf.bytes!,
          filename: pf.name,
        ));
      }
    }
  }

  static Future<dynamic> postMultipart(
      String path, Map<String, String> fields, List<PlatformFile> files, {String fileFieldName = 'documentPhotos'}) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    final res = await _sendWithFallback((uri) async {
      final req = http.MultipartRequest('POST', uri);
      if (token != null && token.isNotEmpty) {
        req.headers['Authorization'] = 'Bearer $token';
      }
      fields.forEach((k, v) => req.fields[k] = v);
      await _attachFiles(req, files, fileFieldName);
      final streamed = await req.send();
      return http.Response.fromStream(streamed);
    }, path: path);
    return _handle(res);
  }

  static Future<dynamic> putMultipart(
      String path, Map<String, String> fields, List<PlatformFile> files, {String fileFieldName = 'documentPhotos'}) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    final res = await _sendWithFallback((uri) async {
      final req = http.MultipartRequest('PUT', uri);
      if (token != null && token.isNotEmpty) {
        req.headers['Authorization'] = 'Bearer $token';
      }
      fields.forEach((k, v) => req.fields[k] = v);
      await _attachFiles(req, files, fileFieldName);
      final streamed = await req.send();
      return http.Response.fromStream(streamed);
    }, path: path);
    return _handle(res);
  }

  static dynamic _handle(http.Response res) {
    _clearSessionIfUnauthorized(res.statusCode);
    dynamic body;
    if (res.body.isNotEmpty) {
      try {
        body = jsonDecode(res.body);
      } catch (_) {
        body = res.body;
      }
    }
    if (res.statusCode >= 200 && res.statusCode < 300) return body;
    if (body is Map && body['error'] != null) {
      final e = body['error'];
      throw Exception(e is String ? e : jsonEncode(e));
    }
    throw Exception('Request failed (${res.statusCode})');
  }
}
