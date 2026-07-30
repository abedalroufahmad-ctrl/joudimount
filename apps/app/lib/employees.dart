import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api.dart';
import 'app_theme.dart';
import 'l10n/app_localizations.dart';

class EmployeesTab extends StatefulWidget {
  final String role;
  const EmployeesTab({super.key, required this.role});

  @override
  State<EmployeesTab> createState() => _EmployeesTabState();
}

class _EmployeesTabState extends State<EmployeesTab> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  String _error = '';
  String? _editingId;
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  String _role = 'employee';

  String _employeeErrorMessage(Object error, AppLocalizations l10n) {
    final raw = error.toString();
    if (raw.contains('email_taken')) return l10n.employeesEmailTaken;
    if (raw.contains('last_manager_role')) return l10n.employeesLastManagerRole;
    if (raw.contains('last_manager_delete')) return l10n.employeesLastManagerDelete;
    if (raw.contains('delete_self')) return l10n.employeesDeleteSelfError;
    return raw;
  }

  String _roleLabel(String role, AppLocalizations l10n) {
    switch (role) {
      case 'manager':
        return l10n.roleManager;
      case 'employee2':
        return l10n.roleEmployee2;
      case 'warehouse':
        return l10n.roleWarehouse;
      case 'accountant':
        return l10n.roleAccountant;
      default:
        return l10n.roleEmployee;
    }
  }

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

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final data = await Api.get('/api/employees') as List<dynamic>;
      _items = data.cast<Map<String, dynamic>>();
    } catch (e) {
      _error = e.toString();
    } finally {
      setState(() => _loading = false);
    }
  }

  void _startEdit(Map<String, dynamic> e) {
    setState(() {
      _editingId = e['id']?.toString();
      _name.text = (e['name'] ?? '').toString();
      _email.text = (e['email'] ?? '').toString();
      _password.clear();
      _role = (e['role'] ?? 'employee').toString();
    });
  }

  void _cancelEdit() {
    setState(() {
      _editingId = null;
      _name.clear();
      _email.clear();
      _password.clear();
      _role = 'employee';
      _error = '';
    });
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context)!;
    setState(() => _error = '');
    try {
      final body = <String, dynamic>{
        'name': _name.text.trim(),
        'email': _email.text.trim(),
        'role': _role,
      };
      if (_editingId == null) {
        if (_password.text.length < 4) {
          setState(() => _error = l10n.employeePassword);
          return;
        }
        body['password'] = _password.text;
        await Api.post('/api/employees', body);
      } else {
        if (_password.text.isNotEmpty) body['password'] = _password.text;
        await Api.put('/api/employees/$_editingId', body);
      }
      _cancelEdit();
      await _load();
    } catch (e) {
      setState(() => _error = _employeeErrorMessage(e, l10n));
    }
  }

  Future<void> _delete(Map<String, dynamic> e) async {
    final l10n = AppLocalizations.of(context)!;
    final prefs = await SharedPreferences.getInstance();
    final selfRaw = prefs.getString('user');
    final selfId =
        selfRaw != null ? (jsonDecode(selfRaw) as Map)['id']?.toString() : null;
    final id = e['id']?.toString() ?? '';
    if (selfId != null && id == selfId) {
      setState(() => _error = 'You cannot delete your own account.');
      return;
    }
    if (!mounted) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        content: Text(l10n.confirmDelete),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: Text(l10n.cancel)),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: Text(l10n.delete)),
        ],
      ),
    );
    if (!mounted) return;
    if (ok != true) return;
    try {
      await Api.delete('/api/employees/$id');
      await _load();
    } catch (err) {
      if (mounted) setState(() => _error = _employeeErrorMessage(err, l10n));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isManager = widget.role == 'manager';
    final cs = Theme.of(context).colorScheme;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              PageHeroBanner(
                icon: Icons.badge_outlined,
                title: l10n.employeesTitle,
              ),
              const SizedBox(height: 10),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${l10n.currentRole}: ${_roleLabel(widget.role, l10n)}',
                          style: const TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Text(l10n.roleFromAccount,
                          style: TextStyle(color: Colors.grey.shade700)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 10),
              _RoleInfoCard(
                title: l10n.employeesManagerTitle,
                description: l10n.employeesManagerDesc,
                active: widget.role == 'manager',
              ),
              _RoleInfoCard(
                title: l10n.employeesEmployeeTitle,
                description: l10n.employeesEmployeeDesc,
                active: widget.role == 'employee',
              ),
              _RoleInfoCard(
                title: l10n.employeesEmployee2Title,
                description: l10n.employeesEmployee2Desc,
                active: widget.role == 'employee2',
              ),
              _RoleInfoCard(
                title: l10n.employeesWarehouseTitle,
                description: l10n.employeesWarehouseDesc,
                active: widget.role == 'warehouse',
              ),
              _RoleInfoCard(
                title: l10n.employeesAccountantTitle,
                description: l10n.employeesAccountantDesc,
                active: widget.role == 'accountant',
              ),
              const SizedBox(height: 10),
              if (!isManager)
                Text(l10n.managerOnlyEmployees,
                    style: const TextStyle(color: Colors.grey)),
              if (isManager) ...[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: TextField(
                                controller: _name,
                                decoration:
                                    InputDecoration(labelText: l10n.employeeName))),
                        const SizedBox(height: 8),
                        Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: TextField(
                                controller: _email,
                                decoration:
                                    InputDecoration(labelText: l10n.employeeEmail))),
                        const SizedBox(height: 8),
                        Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: TextField(
                              controller: _password,
                              obscureText: true,
                              decoration: InputDecoration(
                                labelText: l10n.employeePassword,
                                hintText:
                                    _editingId != null ? l10n.passwordHintEdit : null,
                              ),
                            )),
                        const SizedBox(height: 8),
                        Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: DropdownButtonFormField<String>(
                              key: ValueKey(
                                  'employee-role-${_editingId ?? 'new'}-$_role'),
                              decoration:
                                  InputDecoration(labelText: l10n.employeeRole),
                              initialValue: _role,
                              items: [
                                DropdownMenuItem(
                                    value: 'manager', child: Text(l10n.roleManager)),
                                DropdownMenuItem(
                                    value: 'employee',
                                    child: Text(l10n.roleEmployee)),
                                DropdownMenuItem(
                                    value: 'employee2', child: Text(l10n.roleEmployee2)),
                                DropdownMenuItem(
                                    value: 'warehouse',
                                    child: Text(l10n.roleWarehouse)),
                                DropdownMenuItem(
                                    value: 'accountant',
                                    child: Text(l10n.roleAccountant)),
                              ],
                              onChanged: (v) =>
                                  setState(() => _role = v ?? 'employee'),
                            )),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            FilledButton(onPressed: _save, child: Text(l10n.save)),
                            const SizedBox(width: 12),
                            if (_editingId != null)
                              OutlinedButton(
                                  onPressed: _cancelEdit,
                                  child: Text(l10n.cancelEdit)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              if (_error.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Card(
                    color: cs.errorContainer,
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child:
                          Text(_error, style: TextStyle(color: cs.onErrorContainer)),
                    ),
                  ),
                ),
            ],
          ),
        ),
        Expanded(
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            child: _loading
                ? const Padding(
                    key: ValueKey('loading'),
                    padding: EdgeInsets.all(20),
                    child: Center(child: CircularProgressIndicator()))
                : _items.isEmpty
                    ? ListView(
                        key: const ValueKey('empty'),
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        children: [
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Text(l10n.noMatch,
                                  style: TextStyle(color: Colors.grey.shade700)),
                            ),
                          )
                        ],
                      )
                    : ListView.builder(
                        key: const ValueKey('list'),
                        padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                        itemCount: _items.length,
                        itemBuilder: (context, index) {
                          final e = _items[index];
                          return Card(
                            child: ListTile(
                              title: Text('${e['name']}'),
                              subtitle: Text('${e['email']} • ${_roleLabel('${e['role']}', l10n)}'),
                              trailing: isManager
                                  ? Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        IconButton(
                                            icon: const Icon(Icons.edit),
                                            onPressed: () => _startEdit(e)),
                                        IconButton(
                                            icon: const Icon(Icons.delete_outline),
                                            onPressed: () => _delete(e)),
                                      ],
                                    )
                                  : null,
                            ),
                          );
                        },
                      ),
          ),
        ),
      ],
    );
  }
}

class _RoleInfoCard extends StatelessWidget {
  final String title;
  final String description;
  final bool active;

  const _RoleInfoCard({
    required this.title,
    required this.description,
    required this.active,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Card(
        color: active ? cs.primaryContainer : null,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: active ? cs.onPrimaryContainer : null,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                description,
                style: TextStyle(
                  color: active
                      ? cs.onPrimaryContainer.withValues(alpha: 0.9)
                      : Colors.grey.shade700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
