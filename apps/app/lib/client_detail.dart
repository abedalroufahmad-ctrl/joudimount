import 'package:flutter/material.dart';

import 'api.dart';
import 'app_theme.dart';
import 'l10n/app_localizations.dart';

class ClientDetailPage extends StatefulWidget {
  final String id;
  const ClientDetailPage({super.key, required this.id});

  @override
  State<ClientDetailPage> createState() => _ClientDetailPageState();
}

class _ClientDetailPageState extends State<ClientDetailPage> {
  Map<String, dynamic>? _client;
  String _error = '';
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final data =
          await Api.get('/api/clients/${widget.id}') as Map<String, dynamic>;
      if (mounted) setState(() => _client = data);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.clients)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error.isNotEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Card(
                      color: cs.errorContainer,
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Text(_error,
                            style: TextStyle(color: cs.onErrorContainer)),
                      ),
                    ),
                  ),
                )
              : _client == null
                  ? const SizedBox.shrink()
                  : ListView(
                      padding: const EdgeInsets.all(12),
                      children: [
                        PageHeroBanner(
                          icon: Icons.groups_outlined,
                          title: _client!['companyName'].toString(),
                        ),
                        const SizedBox(height: 10),
                        _kv(l10n.companyName, '${_client!['companyName']}'),
                        _kv(l10n.trn, '${_client!['trn']}'),
                        _kv(l10n.immigrationCode,
                            '${_client!['immigrationCode'] ?? '—'}'),
                        _kv(l10n.clientEmail, '${_client!['email'] ?? '—'}'),
                        _kv(l10n.country, '${_client!['country'] ?? '—'}'),
                        _kv(l10n.creditLimit, '${_client!['creditLimit']}'),
                        _kv(l10n.clientStatus, '${_client!['status']}'),
                      ],
                    ),
    );
  }

  Widget _kv(String k, String v) => Card(
        child: ListTile(
          title: Text(k, style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: Text(v),
        ),
      );
}
