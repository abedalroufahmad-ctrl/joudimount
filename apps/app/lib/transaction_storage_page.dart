import 'package:flutter/material.dart';

import 'api.dart';
import 'date_field.dart';
import 'l10n/app_localizations.dart';
import 'transaction_model.dart';

/// Warehouse card for imports/transfers in Storage stage (input / output / seal).
class TransactionStoragePage extends StatefulWidget {
  final String role;
  final String transactionId;
  final String module;

  const TransactionStoragePage({
    super.key,
    required this.role,
    required this.transactionId,
    required this.module,
  });

  @override
  State<TransactionStoragePage> createState() => _TransactionStoragePageState();
}

class _TransactionStoragePageState extends State<TransactionStoragePage> {
  String get _modulePath => '/api/${widget.module}';

  bool _loading = true;
  bool _saving = false;
  String _error = '';
  Transaction? _tx; // Changed to Transaction?

  String _subStage = 'INPUT';

  final _inDate = TextEditingController();
  final _inWages = TextEditingController();
  final _inCompany = TextEditingController();
  final _inStore = TextEditingController();
  final _inCbm = TextEditingController();
  final _inFare = TextEditingController();

  final _outDate = TextEditingController();
  final _outWages = TextEditingController();
  final _outCompany = TextEditingController();
  final _outStore = TextEditingController();
  final _outCbm = TextEditingController();
  final _outFare = TextEditingController();
  final _outVehicles = TextEditingController();
  final _outCross = TextEditingController();
  final _outUnity = TextEditingController();

  final _sealReplace = TextEditingController();
  final _sealEntryLock = TextEditingController();
  final _sealSwitch = TextEditingController();
  final _sealContainers = TextEditingController();
  final _sealOutLock = TextEditingController();
  final _sealUnits = TextEditingController();
  final _sealCompany = TextEditingController();
  final _sealWages = TextEditingController();

  bool get _canEdit => widget.role != 'accountant';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _inDate.dispose();
    _inWages.dispose();
    _inCompany.dispose();
    _inStore.dispose();
    _inCbm.dispose();
    _inFare.dispose();
    _outDate.dispose();
    _outWages.dispose();
    _outCompany.dispose();
    _outStore.dispose();
    _outCbm.dispose();
    _outFare.dispose();
    _outVehicles.dispose();
    _outCross.dispose();
    _outUnity.dispose();
    _sealReplace.dispose();
    _sealEntryLock.dispose();
    _sealSwitch.dispose();
    _sealContainers.dispose();
    _sealOutLock.dispose();
    _sealUnits.dispose();
    _sealCompany.dispose();
    _sealWages.dispose();
    super.dispose();
  }

  String _iso(DateTime? v) {
    if (v == null) return '';
    return v.toIso8601String().substring(0, 10);
  }

  String _numStr(num? v) {
    if (v == null) return '';
    return v.toString();
  }

  void _fillFromTx(Transaction tx) {
    _subStage = (tx.storageSubStage ?? 'INPUT');
    if (!['INPUT', 'OUTPUT', 'SEAL'].contains(_subStage)) _subStage = 'INPUT';

    _inDate.text = _iso(tx.storageInputEntryDate ?? tx.storageEntryDate);
    _inWages.text =
        _numStr(tx.storageInputWorkersWages ?? tx.storageWorkersWages);
    _inCompany.text =
        (tx.storageInputWorkersCompany ?? tx.storageWorkersCompany ?? '')
            .toString();
    _inStore.text =
        (tx.storageInputStoreName ?? tx.storageStoreName ?? '')
            .toString();
    _inCbm.text = _numStr(tx.storageInputVolumeCbm ?? tx.storageSizeCbm);
    _inFare.text = _numStr(tx.storageInputLoadingEquipmentFare);

    _outDate.text = _iso(tx.storageExitEntryDate ?? tx.storageEntryDate);
    _outWages.text =
        _numStr(tx.storageExitWorkersWages ?? tx.storageWorkersWages);
    _outCompany.text =
        (tx.storageExitWorkersCompany ?? tx.storageWorkersCompany ?? '')
            .toString();
    _outStore.text =
        (tx.storageExitStoreName ?? tx.storageStoreName ?? '').toString();
    _outCbm.text = _numStr(tx.storageExitVolumeCbm ?? tx.storageSizeCbm);
    _outFare.text = _numStr(tx.storageExitLoadingEquipmentFare);
    _outVehicles.text = (tx.storageExitFreightVehicleNumbers ??
            tx.storageFreightVehicleNumbers ??
            '')
        .toString();
    _outCross.text =
        (tx.storageExitCrossPackaging ?? tx.storageCrossPackaging ?? '')
            .toString();
    _outUnity.text =
        (tx.storageExitUnity ?? tx.storageUnity ?? '').toString();

    _sealReplace.text = (tx.storageSealReplaceContainers ?? '').toString();
    _sealEntryLock.text = (tx.storageSealEntryLockNumbers ?? '').toString();
    _sealSwitch.text = _iso(tx.storageSealSwitchDate);
    _sealContainers.text =
        (tx.storageSealEntryContainerNumbers ?? '').toString();
    _sealOutLock.text = (tx.storageSealOutLockNumbers ?? '').toString();
    _sealUnits.text = _numStr(num.tryParse(tx.storageSealUnitCount ?? ''));
    _sealCompany.text = (tx.storageSealWorkersCompany ?? '').toString();
    _sealWages.text = _numStr(tx.storageSealWorkersWages);
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final data = await Api.get('$_modulePath/${widget.transactionId}')
          as Map<String, dynamic>;
      if (mounted) {
        setState(() {
          _tx = Transaction.fromJson(data);
          _fillFromTx(_tx!);
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  void _putStr(Map<String, dynamic> m, String key, TextEditingController c) {
    final t = c.text.trim();
    if (t.isNotEmpty) m[key] = t;
  }

  void _putNum(Map<String, dynamic> m, String key, TextEditingController c) {
    final t = c.text.trim();
    if (t.isEmpty) return;
    final n = num.tryParse(t);
    if (n != null) m[key] = n;
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context)!;
    if (!_canEdit) return;
    setState(() {
      _saving = true;
      _error = '';
    });
    try {
      final body = <String, dynamic>{'storageSubStage': _subStage};
      _putStr(body, 'storageInputEntryDate', _inDate);
      _putNum(body, 'storageInputWorkersWages', _inWages);
      _putStr(body, 'storageInputWorkersCompany', _inCompany);
      _putStr(body, 'storageInputStoreName', _inStore);
      _putNum(body, 'storageInputVolumeCbm', _inCbm);
      _putNum(body, 'storageInputLoadingEquipmentFare', _inFare);

      _putStr(body, 'storageExitEntryDate', _outDate);
      _putNum(body, 'storageExitWorkersWages', _outWages);
      _putStr(body, 'storageExitWorkersCompany', _outCompany);
      _putStr(body, 'storageExitStoreName', _outStore);
      _putNum(body, 'storageExitVolumeCbm', _outCbm);
      _putNum(body, 'storageExitLoadingEquipmentFare', _outFare);
      _putStr(body, 'storageExitFreightVehicleNumbers', _outVehicles);
      _putStr(body, 'storageExitCrossPackaging', _outCross);
      _putStr(body, 'storageExitUnity', _outUnity);

      _putStr(body, 'storageSealReplaceContainers', _sealReplace);
      _putStr(body, 'storageSealEntryLockNumbers', _sealEntryLock);
      _putStr(body, 'storageSealSwitchDate', _sealSwitch);
      _putStr(body, 'storageSealEntryContainerNumbers', _sealContainers);
      _putStr(body, 'storageSealOutLockNumbers', _sealOutLock);
      _putNum(body, 'storageSealUnitCount', _sealUnits);
      _putStr(body, 'storageSealWorkersCompany', _sealCompany);
      _putNum(body, 'storageSealWorkersWages', _sealWages);

      final data = await Api.put('$_modulePath/${widget.transactionId}', body)
          as Map<String, dynamic>;
      if (mounted) {
        setState(() {
          _tx = Transaction.fromJson(data);
          _fillFromTx(_tx!);
        });
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(l10n.save)));
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _field(TextEditingController c, String label,
      {TextInputType keyboard = TextInputType.text,
      int maxLines = 1,
      bool enabled = true}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: TextField(
        controller: c,
        enabled: enabled,
        keyboardType: keyboard,
        maxLines: maxLines,
        decoration: InputDecoration(labelText: label),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final cs = Theme.of(context).colorScheme;
    final dec = _tx?.declarationNumber ?? '';
    final atStorage = (_tx?.transactionStage ?? '') == 'STORAGE';

    return Scaffold(
      appBar: AppBar(
        title: Text(dec.isEmpty
            ? l10n.storageCardTitle
            : '${l10n.storageCardTitle} · $dec'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(12),
              children: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text(l10n.storageBackToTransaction),
                ),
                if (_error.isNotEmpty)
                  Card(
                    color: cs.errorContainer,
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text(_error,
                          style: TextStyle(color: cs.onErrorContainer)),
                    ),
                  ),
                if (_tx != null && !atStorage)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(l10n.storageWrongStage,
                        style: TextStyle(color: Colors.grey.shade700)),
                  ),
                if (_tx != null) ...[
                  _kv(l10n.client, _tx!.clientName),
                  if (atStorage) ...[
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: [
                        ChoiceChip(
                          label: Text(l10n.storageSubInput),
                          selected: _subStage == 'INPUT',
                          onSelected: !_canEdit
                              ? null
                              : (selected) {
                                  if (selected)
                                    setState(() => _subStage = 'INPUT');
                                },
                        ),
                        ChoiceChip(
                          label: Text(l10n.storageSubOutput),
                          selected: _subStage == 'OUTPUT',
                          onSelected: !_canEdit
                              ? null
                              : (selected) {
                                  if (selected)
                                    setState(() => _subStage = 'OUTPUT');
                                },
                        ),
                        ChoiceChip(
                          label: Text(l10n.storageSubSeal),
                          selected: _subStage == 'SEAL',
                          onSelected: !_canEdit
                              ? null
                              : (selected) {
                                  if (selected)
                                    setState(() => _subStage = 'SEAL');
                                },
                        ),
                      ],
                    ),
                    if (_subStage == 'INPUT') ...[
                      const SizedBox(height: 8),
                      Text(l10n.storageSectionInput,
                          style: Theme.of(context).textTheme.titleSmall),
                      ApiDateField(
                        controller: _inDate,
                        label: l10n.storageEntryDate,
                        enabled: _canEdit,
                      ),
                      _field(_inWages, l10n.storageWorkersWages,
                          keyboard: const TextInputType.numberWithOptions(
                              decimal: true),
                          enabled: _canEdit),
                      _field(_inCompany, l10n.storageWorkersCompany,
                          enabled: _canEdit),
                      _field(_inStore, l10n.storageStoreName,
                          enabled: _canEdit),
                      _field(_inCbm, l10n.storageSizeCbm,
                          keyboard: const TextInputType.numberWithOptions(
                              decimal: true),
                          enabled: _canEdit),
                      _field(_inFare, l10n.storageLoadingEquipmentFare,
                          keyboard: const TextInputType.numberWithOptions(
                              decimal: true),
                          enabled: _canEdit),
                    ],
                    if (_subStage == 'OUTPUT') ...[
                      const SizedBox(height: 8),
                      Text(l10n.storageSectionExit,
                          style: Theme.of(context).textTheme.titleSmall),
                      ApiDateField(
                        controller: _outDate,
                        label: l10n.storageEntryDate,
                        enabled: _canEdit,
                      ),
                      _field(_outWages, l10n.storageWorkersWages,
                          keyboard: const TextInputType.numberWithOptions(
                              decimal: true),
                          enabled: _canEdit),
                      _field(_outCompany, l10n.storageWorkersCompany,
                          enabled: _canEdit),
                      _field(_outStore, l10n.storageStoreName,
                          enabled: _canEdit),
                      _field(_outCbm, l10n.storageSizeCbm,
                          keyboard: const TextInputType.numberWithOptions(
                              decimal: true),
                          enabled: _canEdit),
                      _field(_outFare, l10n.storageLoadingEquipmentFare,
                          keyboard: const TextInputType.numberWithOptions(
                              decimal: true),
                          enabled: _canEdit),
                      _field(_outVehicles, l10n.storageFreightVehicleNumbers,
                          maxLines: 3, enabled: _canEdit),
                      _field(_outCross, l10n.storageCrossPackaging,
                          enabled: _canEdit),
                      _field(_outUnity, l10n.storageUnity, enabled: _canEdit),
                    ],
                    if (_subStage == 'SEAL') ...[
                      const SizedBox(height: 8),
                      Text(l10n.storageSectionSeal,
                          style: Theme.of(context).textTheme.titleSmall),
                      _field(_sealReplace, l10n.storageEntryContainerNumbers,
                          maxLines: 3, enabled: _canEdit),
                      _field(_sealEntryLock, l10n.storageEntryLockNumbers,
                          maxLines: 3, enabled: _canEdit),
                      ApiDateField(
                        controller: _sealSwitch,
                        label: l10n.storageSwitchDate,
                        enabled: _canEdit,
                      ),
                      _field(_sealContainers, l10n.storageOutContainerNumbers,
                          maxLines: 3, enabled: _canEdit),
                      _field(_sealOutLock, l10n.storageOutLockNumbers,
                          maxLines: 3, enabled: _canEdit),
                      _field(_sealUnits, l10n.storageSealUnitCount,
                          enabled: _canEdit),
                      _field(_sealCompany, l10n.storageWorkersCompany,
                          enabled: _canEdit),
                      _field(_sealWages, l10n.storageWorkersWages,
                          keyboard: const TextInputType.numberWithOptions(
                              decimal: true),
                          enabled: _canEdit),
                    ],
                    if (!_canEdit)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(l10n.storageAccountantReadOnly,
                            style: Theme.of(context).textTheme.bodySmall),
                      ),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed:
                          (!_canEdit || _saving || !atStorage) ? null : _save,
                      child: Text(_saving ? l10n.saving : l10n.save),
                    ),
                  ],
                ],
              ],
            ),
    );
  }

  Widget _kv(String k, String v) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
              width: 120,
              child:
                  Text(k, style: const TextStyle(fontWeight: FontWeight.w600))),
          Expanded(child: Text(v)),
        ],
      ),
    );
  }
}