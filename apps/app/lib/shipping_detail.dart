import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'api.dart';
import 'app_theme.dart';
import 'l10n/app_localizations.dart';

class ShippingCompanyDetailPage extends StatefulWidget {
  final String id;
  const ShippingCompanyDetailPage({super.key, required this.id});

  @override
  State<ShippingCompanyDetailPage> createState() =>
      _ShippingCompanyDetailPageState();
}

class _ShippingCompanyDetailPageState extends State<ShippingCompanyDetailPage> {
  Map<String, dynamic>? _item;
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
      final data = await Api.get('/api/shipping-companies/${widget.id}')
          as Map<String, dynamic>;
      if (mounted) setState(() => _item = data);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openMap(double lat, double lng) async {
    final uri = Uri.parse(
        'https://www.openstreetmap.org/?mlat=$lat&mlon=$lng#map=14/$lat/$lng');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final cs = Theme.of(context).colorScheme;
    final s = _item;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.shipping)),
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
              : s == null
                  ? const SizedBox.shrink()
                  : ListView(
                      padding: const EdgeInsets.all(12),
                      children: [
                        PageHeroBanner(
                          icon: Icons.local_shipping_outlined,
                          title: s['companyName'].toString(),
                          subtitle: '${s['code'] ?? ''}',
                        ),
                        const SizedBox(height: 10),
                        _kv(l10n.companyName, '${s['companyName']}'),
                        _kv(l10n.code, '${s['code']}'),
                        _kv(l10n.contactName, '${s['contactName'] ?? '—'}'),
                        _kv(l10n.phone, '${s['phone'] ?? '—'}'),
                        _kv(l10n.shippingEmailOptional, '${s['email'] ?? '—'}'),
                        if ((s['dispatchFormTemplate'] ?? '')
                            .toString()
                            .trim()
                            .isNotEmpty)
                          _kv('Dispatch template',
                              '${s['dispatchFormTemplate']}'),
                        if (s['latitude'] != null && s['longitude'] != null)
                          Card(
                            child: ListTile(
                              title: Text(l10n.latitudeOptional,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600)),
                              subtitle:
                                  Text('${s['latitude']}, ${s['longitude']}'),
                              trailing: IconButton(
                                icon: const Icon(Icons.map_outlined),
                                tooltip: 'OpenStreetMap',
                                onPressed: () => _openMap(
                                  (s['latitude'] as num).toDouble(),
                                  (s['longitude'] as num).toDouble(),
                                ),
                              ),
                            ),
                          ),
                        if ((s['location'] ?? '')
                            .toString()
                            .trim()
                            .isNotEmpty)
                          _kv(l10n.shippingLocationOptional, '${s['location']}'),
                        _kv(l10n.shippingStatus, '${s['status']}'),
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
