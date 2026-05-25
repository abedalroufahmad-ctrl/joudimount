import 'package:flutter/material.dart';

import 'api.dart';
import 'l10n/app_localizations.dart';

class TransactionAccountingPage extends StatefulWidget {
  final String role;
  final String transactionId;
  final String module;

  const TransactionAccountingPage({
    super.key,
    required this.role,
    required this.transactionId,
    required this.module,
  });

  @override
  State<TransactionAccountingPage> createState() => _TransactionAccountingPageState();
}

class _TransactionAccountingPageState extends State<TransactionAccountingPage> {
  String get _modulePath => '/api/${widget.module}';

  bool _loading = true;
  bool _saving = false;
  String _error = '';
  Map<String, dynamic>? _header;
  Map<String, String> _fixedStr = {};
  List<Map<String, dynamic>> _customFields = [];

  bool get _canEdit => widget.role == 'manager' || widget.role == 'accountant';

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _bindFixed(Map<String, dynamic> fixed) {
    String n(dynamic v) => v == null ? '' : v.toString();
    _fixedStr = {
      'invoiceValue': n(fixed['invoiceValue']),
      'invoiceCurrency': (fixed['invoiceCurrency'] ?? 'AED').toString(),
      'tripCharge': n(fixed['tripCharge']),
      'waitingCharge': n(fixed['waitingCharge']),
      'maccrikCharge': n(fixed['maccrikCharge']),
      'paymentStatus': (fixed['paymentStatus'] ?? 'pending').toString(),
      'storageInputWorkersWages': n(fixed['storageInputWorkersWages']),
      'storageExitWorkersWages': n(fixed['storageExitWorkersWages']),
      'storageSealWorkersWages': n(fixed['storageSealWorkersWages']),
      'storageInputLoadingEquipmentFare': n(fixed['storageInputLoadingEquipmentFare']),
      'storageExitLoadingEquipmentFare': n(fixed['storageExitLoadingEquipmentFare']),
    };
  }

  Map<String, dynamic> _fixedPayload() {
    final out = <String, dynamic>{
      'invoiceCurrency': _fixedStr['invoiceCurrency'] ?? 'AED',
      'paymentStatus': _fixedStr['paymentStatus'] ?? 'pending',
    };
    void addNum(String key) {
      final t = (_fixedStr[key] ?? '').trim();
      if (t.isEmpty) return;
      final n = double.tryParse(t);
      if (n != null && n >= 0) out[key] = n;
    }

    addNum('invoiceValue');
    addNum('tripCharge');
    addNum('waitingCharge');
    addNum('maccrikCharge');
    addNum('storageInputWorkersWages');
    addNum('storageExitWorkersWages');
    addNum('storageSealWorkersWages');
    addNum('storageInputLoadingEquipmentFare');
    addNum('storageExitLoadingEquipmentFare');
    return out;
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final data = await Api.get('$_modulePath/${widget.transactionId}/accounting')
          as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        _header = data;
        final fixed = data['fixed'] as Map<String, dynamic>?;
        if (fixed != null) _bindFixed(fixed);
        _customFields = (data['customFields'] as List<dynamic>? ?? [])
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _newFieldId() => '${DateTime.now().microsecondsSinceEpoch}';

  void _addField() {
    setState(() {
      _customFields = [
        ..._customFields,
        {'id': _newFieldId(), 'title': '', 'value': ''},
      ];
    });
  }

  void _removeField(int index) {
    if (_customFields.length <= 1) return;
    setState(() {
      _customFields = [..._customFields]..removeAt(index);
    });
  }

  void _patchFixed(String key, String value) {
    setState(() => _fixedStr[key] = value);
  }

  Future<void> _save() async {
    if (!_canEdit) return;
    setState(() {
      _saving = true;
      _error = '';
    });
    try {
      final payload = {
        'fixed': _fixedPayload(),
        'customFields': _customFields
            .map((f) => {
                  'id': (f['id'] ?? _newFieldId()).toString(),
                  'title': (f['title'] ?? '').toString(),
                  'value': (f['value'] ?? '').toString(),
                })
            .toList(),
      };
      final data = await Api.put(
        '$_modulePath/${widget.transactionId}/accounting',
        payload,
      ) as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        _header = data;
        final fixed = data['fixed'] as Map<String, dynamic>?;
        if (fixed != null) _bindFixed(fixed);
        _customFields = (data['customFields'] as List<dynamic>? ?? [])
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context)!.accountingSaved)),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _numField(String key, String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextFormField(
        key: ValueKey('fixed-$key-${_fixedStr[key]}'),
        initialValue: _fixedStr[key] ?? '',
        decoration: InputDecoration(labelText: label),
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        enabled: _canEdit,
        onChanged: _canEdit ? (v) => _patchFixed(key, v) : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.accountingCardTitle)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_error.isNotEmpty)
                  Card(
                    color: Theme.of(context).colorScheme.errorContainer,
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text(_error),
                    ),
                  ),
                if (_header != null)
                  Text(
                    '${_header!['clientName']} · ${_header!['declarationNumber']}',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                const SizedBox(height: 16),
                Text(l10n.accountingFixedSection,
                    style: Theme.of(context).textTheme.titleSmall),
                const SizedBox(height: 8),
                Text(l10n.accountingFixedHint,
                    style: Theme.of(context).textTheme.bodySmall),
                _numField('invoiceValue', l10n.invoiceValue),
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: DropdownButtonFormField<String>(
                    value: _fixedStr['invoiceCurrency'] ?? 'AED',
                    decoration: InputDecoration(labelText: l10n.txCurrency),
                    items: const [
                      DropdownMenuItem(value: 'AED', child: Text('AED')),
                      DropdownMenuItem(value: 'USD', child: Text('USD')),
                      DropdownMenuItem(value: 'EUR', child: Text('EUR')),
                      DropdownMenuItem(value: 'SAR', child: Text('SAR')),
                    ],
                    onChanged: !_canEdit
                        ? null
                        : (v) => _patchFixed('invoiceCurrency', v ?? 'AED'),
                  ),
                ),
                _numField('tripCharge', l10n.txTripCharge),
                _numField('waitingCharge', l10n.txWaitingCharge),
                _numField('maccrikCharge', l10n.txMaccrikCharge),
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: DropdownButtonFormField<String>(
                    value: _fixedStr['paymentStatus'] ?? 'pending',
                    decoration: InputDecoration(labelText: l10n.paymentStatus),
                    items: [
                      DropdownMenuItem(
                          value: 'pending', child: Text(l10n.txPaymentPending)),
                      DropdownMenuItem(
                          value: 'paid', child: Text(l10n.txPaymentPaid)),
                    ],
                    onChanged: !_canEdit
                        ? null
                        : (v) => _patchFixed('paymentStatus', v ?? 'pending'),
                  ),
                ),
                _numField('storageInputWorkersWages', l10n.accountingStorageInputWages),
                _numField('storageExitWorkersWages', l10n.accountingStorageExitWages),
                _numField('storageSealWorkersWages', l10n.accountingStorageSealWages),
                _numField('storageInputLoadingEquipmentFare', l10n.accountingStorageInputFare),
                _numField('storageExitLoadingEquipmentFare', l10n.accountingStorageExitFare),
                const SizedBox(height: 20),
                Text(l10n.accountingCustomSection,
                    style: Theme.of(context).textTheme.titleSmall),
                const SizedBox(height: 12),
                ..._customFields.asMap().entries.map((entry) {
                  final i = entry.key;
                  final f = entry.value;
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        children: [
                          TextFormField(
                            key: ValueKey('acct-title-${f['id']}'),
                            initialValue: (f['title'] ?? '').toString(),
                            decoration: InputDecoration(
                              labelText: l10n.accountingFieldTitle,
                              hintText: l10n.accountingEmptyTitle,
                            ),
                            enabled: _canEdit,
                            onChanged: _canEdit
                                ? (v) => _customFields[i]['title'] = v
                                : null,
                          ),
                          const SizedBox(height: 8),
                          TextFormField(
                            key: ValueKey('acct-val-${f['id']}'),
                            initialValue: (f['value'] ?? '').toString(),
                            decoration:
                                InputDecoration(labelText: l10n.accountingFieldValue),
                            enabled: _canEdit,
                            onChanged: _canEdit
                                ? (v) => _customFields[i]['value'] = v
                                : null,
                          ),
                          if (_canEdit && _customFields.length > 1)
                            Align(
                              alignment: AlignmentDirectional.centerEnd,
                              child: TextButton(
                                onPressed: () => _removeField(i),
                                child: Text(l10n.accountingRemoveField),
                              ),
                            ),
                        ],
                      ),
                    ),
                  );
                }),
                if (_canEdit) ...[
                  OutlinedButton.icon(
                    onPressed: _addField,
                    icon: const Icon(Icons.add),
                    label: Text(l10n.accountingAddField),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _saving ? null : _save,
                    child: _saving
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(l10n.save),
                  ),
                ],
              ],
            ),
    );
  }
}
