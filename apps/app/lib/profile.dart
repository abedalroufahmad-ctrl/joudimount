import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart' as intl;
import 'package:shared_preferences/shared_preferences.dart';

import 'api.dart';
import 'app_theme.dart';
import 'l10n/app_localizations.dart';
import 'user_model.dart'; // Import the new User model

class ProfileTab extends StatefulWidget {
  final User user; // Change to User
  final Future<void> Function() onLogout;
  final ValueChanged<User> onUserUpdated; // Change to User

  const ProfileTab({
    super.key,
    required this.user,
    required this.onLogout,
    required this.onUserUpdated,
  });

  @override
  State<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> {
  User? _profile; // Change to User?
  bool _loading = true;
  bool _saving = false;
  bool _editing = false;
  String _error = '';
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  String _roleLabel(String role, AppLocalizations l10n) {
    switch (role) {
      case 'manager':
        return l10n.roleManager;
      case 'employee2':
        return l10n.roleEmployee2;
      case 'accountant':
        return l10n.roleAccountant;
      default:
        return l10n.roleEmployee;
    }
  }

  String _formatDate(DateTime? raw, String locale) {
    if (raw == null) return '—';
    return intl.DateFormat.yMMMd(locale).add_jm().format(raw.toLocal());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final data = await Api.get('/api/auth/me') as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        _profile = User.fromJson(data); // Use User.fromJson
        _name.text = _profile!.name; // Access from User object
        _email.text = _profile!.email; // Access from User object
        _password.clear();
      });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _startEdit() {
    final profile = _profile;
    if (profile == null) return;
    setState(() {
      _editing = true;
      _error = '';
      _name.text = profile.name; // Access from User object
      _email.text = profile.email; // Access from User object
      _password.clear();
    });
  }

  void _cancelEdit() {
    final profile = _profile;
    setState(() {
      _editing = false;
      _error = '';
      if (profile != null) {
        _name.text = profile.name; // Access from User object
        _email.text = profile.email; // Access from User object
      }
      _password.clear();
    });
  }

  Future<void> _save() async {
    final name = _name.text.trim();
    final email = _email.text.trim();
    final password = _password.text;
    if (name.length < 2) {
      setState(() => _error = 'Name is too short');
      return;
    }
    if (email.isEmpty) {
      setState(() => _error = 'Email is required');
      return;
    }
    setState(() {
      _saving = true;
      _error = '';
    });
    try {
      final body = <String, dynamic>{
        'name': name,
        'email': email,
      };
      if (password.isNotEmpty) body['password'] = password;
      final data = await Api.put('/api/auth/me', body) as Map<String, dynamic>;
      final updatedUser = User.fromJson(data['user'] as Map<String, dynamic>); // Use User.fromJson
      final prefs = await SharedPreferences.getInstance();
      if (data['token'] != null) {
        await prefs.setString('token', data['token'] as String);
      }
      await prefs.setString('user', jsonEncode(updatedUser.toJson())); // Save User object
      if (!mounted) return;
      setState(() {
        _profile = updatedUser;
        _editing = false;
        _password.clear();
      });
      widget.onUserUpdated(updatedUser); // Pass User object
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context)!.profileUpdated)),
      );
    } catch (e) {
      final l10n = AppLocalizations.of(context)!;
      final raw = e.toString();
      if (raw.contains('email_taken')) {
        setState(() => _error = l10n.employeesEmailTaken);
      } else {
        setState(() => _error = raw);
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 2,
            child: Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                color: AppColors.textMuted,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(value, textAlign: TextAlign.end),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context).toLanguageTag();
    final profile = _profile;
    final name = (profile?.name ?? widget.user.name).trim(); // Access from User object
    final initial = name.isEmpty ? '?' : name[0].toUpperCase();

    if (_loading && profile == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        PageHeroBanner(
          icon: Icons.person_outline,
          title: l10n.profile,
          subtitle: name,
        ),
        const SizedBox(height: 10),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: AppColors.brand50,
                      foregroundColor: AppColors.brand800,
                      child: Text(
                        initial,
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            style: Theme.of(context)
                                .textTheme
                                .titleLarge
                                ?.copyWith(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(profile?.email ?? widget.user.email),
                          const SizedBox(height: 4),
                          Text(
                            _roleLabel(
                              profile?.role ?? widget.user.role,
                              l10n,
                            ),
                            style: const TextStyle(color: AppColors.textMuted),
                          ),
                        ],
                      ),
                    ),
                    if (!_editing)
                      IconButton(
                        tooltip: l10n.edit,
                        onPressed: profile == null ? null : _startEdit,
                        icon: const Icon(Icons.edit_outlined),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 10),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  _editing ? l10n.profileEditTitle : l10n.profileAccountInfo,
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.bold),
                ),
                const Divider(height: 24),
                if (_editing) ...[
                  TextField(
                    controller: _name,
                    decoration: InputDecoration(labelText: l10n.employeeName),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    decoration: InputDecoration(labelText: l10n.employeeEmail),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _password,
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: l10n.employeePassword,
                      helperText: l10n.passwordHintEdit,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _saving ? null : _cancelEdit,
                          child: Text(l10n.cancel),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton(
                          onPressed: _saving ? null : _save,
                          child: Text(_saving ? l10n.saving : l10n.save),
                        ),
                      ),
                    ],
                  ),
                ] else if (profile != null) ...[
                  _detailRow(l10n.employeeName, profile.name),
                  _detailRow(l10n.employeeEmail, profile.email),
                  _detailRow(
                    l10n.employeeRole,
                    _roleLabel(profile.role, l10n),
                  ),
                  _detailRow(l10n.profileAccountId, profile.id),
                  _detailRow(
                    l10n.profileMemberSince,
                    _formatDate(profile.createdAt, locale),
                  ),
                  _detailRow(
                    l10n.profileLastUpdated,
                    _formatDate(profile.updatedAt, locale),
                  ),
                ],
              ],
            ),
          ),
        ),
        if (_error.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(_error, style: const TextStyle(color: Colors.red)),
        ],
        const SizedBox(height: 12),
        FilledButton.tonal(
          onPressed: () async => widget.onLogout(),
          child: Text(l10n.logout),
        ),
      ],
    );
  }
}