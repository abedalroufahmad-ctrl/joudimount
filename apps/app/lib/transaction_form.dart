import 'dart:convert';
import 'dart:math' as math;

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'api.dart';
import 'app_theme.dart';
import 'date_field.dart';
import 'l10n/app_localizations.dart';
import 'transaction_labels.dart';
import 'transaction_storage_page.dart';

/// New or edit transaction — aligned with web TransactionForm.
bool roleCanWorkAtStage(String role, String stage) {
  if (role == 'manager') return true;
  if (role == 'employee') {
    return stage == 'PREPARATION' || stage == 'CUSTOMS_CLEARANCE';
  }
  if (role == 'employee2') {
    return stage == 'TRANSPORTATION' || stage == 'STORAGE';
  }
  return false;
}

List<String> stageOptionsForRole(String role, List<String> options) {
  if (role == 'manager') return options;
  return options.where((s) => roleCanWorkAtStage(role, s)).toList();
}

class TransactionFormPage extends StatefulWidget {
  final String role;
  final String? transactionId;
  final String module;

  const TransactionFormPage({
    super.key,
    required this.role,
    this.transactionId,
    this.module = 'transactions',
  });

  @override
  State<TransactionFormPage> createState() => _TransactionFormPageState();
}

class _TransactionFormPageState extends State<TransactionFormPage> {
  static const List<String> _stageOptions = [
    'PREPARATION',
    'CUSTOMS_CLEARANCE',
    'TRANSPORTATION',
    'STORAGE',
  ];
  static const List<String> _exportStageOptions = [
    'PREPARATION',
    'CUSTOMS_CLEARANCE',
    'TRANSPORTATION',
  ];
  static const List<String> _importDeclarationTypeOptions = [
    'Import',
    'Import to Free Zone',
    'Import for Re-Export',
    'Temporary Import',
    'Transitin',
    'Transitin from GCC',
  ];
  static const List<String> _transferDeclarationTypeOptions = ['Transfer'];
  static const List<String> _exportDeclarationTypeOptions = [
    'Export',
    'Transit out',
    'Export to GCC',
  ];
  static const List<String> _documentCategoryOptions = [
    'bill_of_lading',
    'certificate_of_origin',
    'invoice',
    'packing_list',
  ];
  static const List<String> _portTypeOptions = [
    'Seaports',
    'Free Zones',
    'Mainland'
  ];

  List<String> get _stageOptionsForModule =>
      widget.module == 'exports' ? _exportStageOptions : _stageOptions;

  List<String> _declarationTypeOptionsForModule() {
    switch (widget.module) {
      case 'transfers':
        return _transferDeclarationTypeOptions;
      case 'exports':
        return _exportDeclarationTypeOptions;
      default:
        return _importDeclarationTypeOptions;
    }
  }

  List<String> _declarationDropdownOptions(String current) {
    final base = _declarationTypeOptionsForModule();
    if (current.isNotEmpty && !base.contains(current)) {
      return [current, ...base];
    }
    return base;
  }

  List<String> _portTypeDropdownOptions() {
    if (_portType.isNotEmpty && !_portTypeOptions.contains(_portType)) {
      return [_portType, ..._portTypeOptions];
    }
    return _portTypeOptions;
  }

  final _client = TextEditingController();
  final _shippingName = TextEditingController();
  final _shippingId = TextEditingController();
  final _declarationNumberInput = TextEditingController();
  final _declarationNumberInput2 = TextEditingController();
  final _declarationDateInput = TextEditingController();
  final _orderDate = TextEditingController();
  String _declarationType = '';
  String _declarationType2 = '';
  String _portType = '';
  final _containerSize = TextEditingController();
  final _portOfLading = TextEditingController();
  final _portOfDischarge = TextEditingController();
  final _destination = TextEditingController();
  final _transportationTo = TextEditingController();
  final _trachNo = TextEditingController();
  final _transportationCompany = TextEditingController();
  final _transportationFrom = TextEditingController();
  final _transportationToLocation = TextEditingController();
  final _tripCharge = TextEditingController();
  final _waitingCharge = TextEditingController();
  final _maccrikCharge = TextEditingController();
  final _awb = TextEditingController();
  final _hs = TextEditingController();
  final _goods = TextEditingController();
  final _origin = TextEditingController(text: 'AE');
  final _value = TextEditingController(text: '1000');
  String _currency = 'AED';
  final _rate = TextEditingController();
  final _weight = TextEditingController();
  final _containers = TextEditingController();
  final _containerArrival = TextEditingController();
  final _documentArrival = TextEditingController();
  final _fileNumber = TextEditingController();
  final _documentPostalNumber = TextEditingController();
  final _containerNumbers = TextEditingController();
  final _unitCount = TextEditingController();
  final _unitNumber = TextEditingController();
  final _stopReason = TextEditingController();
  final _qty = TextEditingController();
  String? _quality;
  String? _unit = 'cbm';
  bool _isStopped = false;
  String _docStatus = 'copy_received';
  String _paymentStatus = 'pending';
  List<PlatformFile> _picked = [];
  List<String?> _pickedCategories = [];
  List<Map<String, dynamic>> _retainedDocs = [];
  List<Map<String, dynamic>> _clients = [];
  List<Map<String, dynamic>> _shipping = [];
  bool _saving = false;
  String _error = '';
  bool _loadingTx = false;
  String? _releaseCode;
  String? _clearanceStatus;
  String _stage = 'PREPARATION';
  String get _modulePath => '/api/${widget.module}';

  String _moduleNoun(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    if (widget.module == 'transfers') return l10n.moduleTransferSingular;
    if (widget.module == 'exports') return l10n.moduleExportSingular;
    return l10n.moduleImportSingular;
  }

  String _newLabel(BuildContext context) {
    return AppLocalizations.of(context)!.newLabel;
  }

  String _editLabel(BuildContext context) {
    return AppLocalizations.of(context)!.edit;
  }

  bool get _isEdit {
    final id = widget.transactionId?.trim();
    return id != null && id.isNotEmpty && id.toLowerCase() != 'new';
  }

  @override
  void initState() {
    super.initState();
    _loadLookups();
    if (_isEdit) _loadTransaction();
  }

  Future<void> _loadLookups() async {
    try {
      final c = await Api.get('/api/clients') as List<dynamic>;
      final s = await Api.get('/api/shipping-companies') as List<dynamic>;
      if (mounted) {
        setState(() {
          _clients = c.cast<Map<String, dynamic>>();
          _shipping = s.cast<Map<String, dynamic>>();
        });
      }
    } catch (_) {}
  }

  String _isoToDateInput(dynamic iso) {
    if (iso == null) return '';
    final s = iso.toString();
    if (s.length >= 10) return s.substring(0, 10);
    return '';
  }

  Future<void> _loadTransaction() async {
    setState(() {
      _loadingTx = true;
      _error = '';
    });
    try {
      final tx = await Api.get('$_modulePath/${widget.transactionId}')
          as Map<String, dynamic>;
      _client.text = (tx['clientName'] ?? '').toString();
      _shippingName.text = (tx['shippingCompanyName'] ?? '').toString();
      _shippingId.text = (tx['shippingCompanyId'] ?? '').toString();
      _declarationNumberInput.text = (tx['declarationNumber'] ?? '').toString();
      _declarationNumberInput2.text =
          (tx['declarationNumber2'] ?? '').toString();
      _declarationDateInput.text = _isoToDateInput(tx['declarationDate']);
      final loadedDeclarationType = (tx['declarationType'] ?? '').toString();
      _declarationType = loadedDeclarationType;
      final loadedDeclarationType2 = (tx['declarationType2'] ?? '').toString();
      _declarationType2 = loadedDeclarationType2;
      final loadedPortType = (tx['portType'] ?? '').toString();
      _portType = loadedPortType;
      _orderDate.text = _isoToDateInput(tx['orderDate']);
      _containerSize.text = (tx['containerSize'] ?? '').toString();
      _portOfLading.text = (tx['portOfLading'] ?? '').toString();
      _portOfDischarge.text = (tx['portOfDischarge'] ?? '').toString();
      _destination.text = (tx['destination'] ?? '').toString();
      _transportationTo.text = _isoToDateInput(tx['transportationTo']);
      _trachNo.text = (tx['trachNo'] ?? '').toString();
      _transportationCompany.text = (tx['transportationCompany'] ?? '').toString();
      _transportationFrom.text = (tx['transportationFrom'] ?? '').toString();
      _transportationToLocation.text = (tx['transportationToLocation'] ?? '').toString();
      if (tx['tripCharge'] != null) _tripCharge.text = tx['tripCharge'].toString();
      if (tx['waitingCharge'] != null) _waitingCharge.text = tx['waitingCharge'].toString();
      if (tx['maccrikCharge'] != null) _maccrikCharge.text = tx['maccrikCharge'].toString();
      _awb.text = (tx['airwayBill'] ?? '').toString();
      _hs.text = (tx['hsCode'] ?? '').toString();
      _goods.text = (tx['goodsDescription'] ?? '').toString();
      _origin.text = (tx['originCountry'] ?? 'AE').toString();
      _value.text = (tx['invoiceValue'] ?? '').toString();
      final loadedCurrency =
          (tx['invoiceCurrency'] ?? 'AED').toString().toUpperCase();
      _currency = const ['AED', 'USD', 'EUR', 'SAR'].contains(loadedCurrency)
          ? loadedCurrency
          : 'AED';
      _docStatus = (tx['documentStatus'] ?? 'copy_received').toString();
      _paymentStatus = (tx['paymentStatus'] ?? 'pending').toString();
      if (tx['invoiceToWeightRateAedPerKg'] != null) {
        _rate.text = tx['invoiceToWeightRateAedPerKg'].toString();
      }
      if (tx['goodsWeightKg'] != null)
        _weight.text = tx['goodsWeightKg'].toString();
      if (tx['containerCount'] != null)
        _containers.text = tx['containerCount'].toString();
      _containerArrival.text = _isoToDateInput(tx['containerArrivalDate']);
      _documentArrival.text = _isoToDateInput(tx['documentArrivalDate']);
      _fileNumber.text = (tx['fileNumber'] ?? '').toString();
      _documentPostalNumber.text = (tx['documentPostalNumber'] ?? '').toString();
      final nums = tx['containerNumbers'];
      if (nums is List) {
        _containerNumbers.text = nums.map((e) => e.toString()).join(', ');
      }
      if (tx['unitCount'] != null) _unitCount.text = tx['unitCount'].toString();
      if (tx['unitNumber'] != null) _unitNumber.text = tx['unitNumber'].toString();
      _isStopped = tx['isStopped'] == true;
      _stopReason.text = (tx['stopReason'] ?? '').toString();
      if (tx['goodsQuantity'] != null)
        _qty.text = tx['goodsQuantity'].toString();
      _quality = tx['goodsQuality']?.toString();
      if (_quality != null && _quality!.isEmpty) _quality = null;
      _unit = tx['goodsUnit']?.toString();
      if (_unit != null && _unit!.isEmpty) _unit = null;
      _releaseCode = tx['releaseCode']?.toString();
      _clearanceStatus = tx['clearanceStatus']?.toString();
      final loadedStage = (tx['transactionStage'] ?? 'PREPARATION').toString();
      _stage = _stageOptionsForModule.contains(loadedStage)
          ? loadedStage
          : 'PREPARATION';
      final att = tx['documentAttachments'];
      if (att is List) {
        _retainedDocs = att.cast<Map<String, dynamic>>();
      }
      _picked = [];
      _pickedCategories = [];
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loadingTx = false);
    }
  }

  Map<String, dynamic> _jsonBody() {
    final mod = widget.module;
    final destination = _destination.text.trim();
    final portOfDischarge = _portOfDischarge.text.trim();
    final portOfLading = _portOfLading.text.trim();
    final effectiveShippingCompanyName = mod == 'transactions'
        ? _shippingName.text.trim()
        : (destination.isNotEmpty
            ? destination
            : (portOfDischarge.isNotEmpty ? portOfDischarge : 'N/A'));
    final effectiveAirwayBill = mod == 'transactions'
        ? _awb.text.trim()
        : (portOfLading.isNotEmpty ? portOfLading : 'N/A');
    final parsedInvoice = double.tryParse(_value.text.trim()) ?? 0;
    final effectiveInvoiceValue =
        mod == 'transactions' ? parsedInvoice : math.max(1, parsedInvoice);

    final body = <String, dynamic>{
      'clientName': _client.text.trim(),
      'shippingCompanyName': effectiveShippingCompanyName,
      'declarationNumber': _declarationNumberInput.text.trim(),
      'declarationNumber2': _declarationNumberInput2.text.trim(),
      'declarationDate': _declarationDateInput.text.trim(),
      'declarationType': _declarationType.trim(),
      'declarationType2': _declarationType2.trim(),
      'portType': _portType.trim(),
      'airwayBill': effectiveAirwayBill,
      'hsCode': _hs.text.trim(),
      'goodsDescription': _goods.text.trim(),
      'originCountry': _origin.text.trim().toUpperCase(),
      'invoiceValue': effectiveInvoiceValue,
      'invoiceCurrency': _currency,
      'documentStatus': _docStatus,
      'paymentStatus': _paymentStatus,
    };
    final sid = _shippingId.text.trim();
    if (sid.isNotEmpty) body['shippingCompanyId'] = sid;
    if (_declarationNumberInput.text.trim().isEmpty)
      body.remove('declarationNumber');
    if (_declarationNumberInput2.text.trim().isEmpty)
      body.remove('declarationNumber2');
    if (_declarationDateInput.text.trim().isEmpty)
      body.remove('declarationDate');
    if (_orderDate.text.trim().isNotEmpty) body['orderDate'] = _orderDate.text.trim();
    if (_declarationType.trim().isEmpty) body.remove('declarationType');
    if (_declarationType2.trim().isEmpty) body.remove('declarationType2');
    if (_portType.trim().isEmpty) body.remove('portType');
    
    void addS(String k, TextEditingController c) {
      final v = c.text.trim();
      if (v.isNotEmpty) body[k] = v;
    }

    addS('containerSize', _containerSize);
    addS('portOfLading', _portOfLading);
    addS('portOfDischarge', _portOfDischarge);
    addS('destination', _destination);
    addS('transportationTo', _transportationTo);
    addS('trachNo', _trachNo);
    addS('transportationCompany', _transportationCompany);
    addS('transportationFrom', _transportationFrom);
    addS('transportationToLocation', _transportationToLocation);

    void addD(String k, TextEditingController c) {
      final v = double.tryParse(c.text.trim());
      if (v != null) body[k] = v;
    }

    void addI(String k, TextEditingController c) {
      final v = int.tryParse(c.text.trim());
      if (v != null) body[k] = v;
    }

    final parsedWeight = double.tryParse(_weight.text.trim());
    if (parsedWeight == null) {
      final invoice = double.tryParse(_value.text.trim());
      final rate = double.tryParse(_rate.text.trim());
      if (invoice != null && rate != null && rate > 0) {
        body['goodsWeightKg'] = invoice / rate;
      }
    }
    addD('invoiceToWeightRateAedPerKg', _rate);
    addD('goodsWeightKg', _weight);
    addI('containerCount', _containers);
    addD('goodsQuantity', _qty);
    addD('tripCharge', _tripCharge);
    addD('waitingCharge', _waitingCharge);
    addD('maccrikCharge', _maccrikCharge);
    addI('unitNumber', _unitNumber);

    if (_quality != null && _quality!.isNotEmpty)
      body['goodsQuality'] = _quality;
    if (_unit != null && _unit!.isNotEmpty) body['goodsUnit'] = _unit;
    if (_containerArrival.text.trim().isNotEmpty)
      body['containerArrivalDate'] = _containerArrival.text.trim();
    if (_documentArrival.text.trim().isNotEmpty)
      body['documentArrivalDate'] = _documentArrival.text.trim();
    if (_fileNumber.text.trim().isNotEmpty)
      body['fileNumber'] = _fileNumber.text.trim();
    if (_documentPostalNumber.text.trim().isNotEmpty)
      body['documentPostalNumber'] = _documentPostalNumber.text.trim();
    final containerNumbers = _containerNumbers.text
        .split(RegExp(r'[\n,]+'))
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toList();
    if (containerNumbers.isNotEmpty)
      body['containerNumbers'] = containerNumbers;
    final unitCount = _unitCount.text.trim();
    if (unitCount.isNotEmpty) body['unitCount'] = unitCount;
    body['isStopped'] = _isStopped;
    if (_stopReason.text.trim().isNotEmpty)
      body['stopReason'] = _stopReason.text.trim();
    return body;
  }

  Map<String, String> _multipartStringFields() {
    final b = _jsonBody();
    return b.map((k, v) => MapEntry(k, v == null ? '' : v.toString()));
  }

  List<Map<String, dynamic>> _filterClients() {
    final q = _client.text.trim().toLowerCase();
    if (q.isEmpty) return [];
    return _clients
        .where((c) {
          final name = (c['companyName'] ?? '').toString().toLowerCase();
          final trn = (c['trn'] ?? '').toString().toLowerCase();
          final imm = (c['immigrationCode'] ?? '').toString().toLowerCase();
          return name.contains(q) || trn.contains(q) || imm.contains(q);
        })
        .take(12)
        .toList();
  }

  List<Map<String, dynamic>> _filterShipping() {
    final q = _shippingName.text.trim().toLowerCase();
    if (q.isEmpty) return [];
    return _shipping
        .where((s) {
          final name = (s['companyName'] ?? '').toString().toLowerCase();
          final code = (s['code'] ?? '').toString().toLowerCase();
          return name.contains(q) || code.contains(q);
        })
        .take(12)
        .toList();
  }

  Map<String, List<Map<String, dynamic>>> _groupRetainedDocs(AppLocalizations l10n) {
    final out = <String, List<Map<String, dynamic>>>{};
    for (final d in _retainedDocs) {
      final raw = (d['category'] ?? '').toString();
      final key = raw.isEmpty ? l10n.uncategorized : _docCategoryLabel(raw, l10n);
      out.putIfAbsent(key, () => <Map<String, dynamic>>[]).add(d);
    }
    return out;
  }

  Future<void> _pickFiles() async {
    final r = await FilePicker.pickFiles(
      allowMultiple: true,
      type: FileType.custom,
      allowedExtensions: const ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'],
    );
    if (r == null || r.files.isEmpty) return;
    setState(() {
      _picked = r.files;
      _pickedCategories = List<String?>.filled(_picked.length, null);
    });
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context)!;
    setState(() {
      _saving = true;
      _error = '';
    });
    try {
      if (_isEdit) {
        final storageWarehouseOnly = _stage == 'STORAGE' &&
            (widget.module == 'transactions' || widget.module == 'transfers');
        if (storageWarehouseOnly && _picked.isNotEmpty) {
          throw Exception(l10n.storageNoUploadAtStage);
        }
        final fields = _multipartStringFields();
        fields['existingAttachments'] = jsonEncode(_retainedDocs);
        if (_picked.isNotEmpty) {
          if (_pickedCategories.any((c) => c == null || c.isEmpty)) {
            throw Exception(l10n.uploadCategoryRequired);
          }
          fields['documentPhotoCategories'] = jsonEncode(_pickedCategories);
        }
        await Api.putMultipart(
          '$_modulePath/${widget.transactionId}',
          fields,
          storageWarehouseOnly ? <PlatformFile>[] : _picked,
        );
      } else {
        if (_picked.isEmpty) {
          await Api.post(_modulePath, _jsonBody());
        } else {
          if (_pickedCategories.any((c) => c == null || c.isEmpty)) {
            throw Exception(l10n.uploadCategoryRequired);
          }
          final fields = _multipartStringFields();
          fields['documentPhotoCategories'] = jsonEncode(_pickedCategories);
          await Api.postMultipart(_modulePath, fields, _picked);
        }
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _saving = false);
    }
  }

  Future<void> _changeStage(String value) async {
    if (!_isEdit) return;
    try {
      await Api.post(
          '$_modulePath/${widget.transactionId}/stage', {'stage': value});
      if (mounted) await _loadTransaction();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  void dispose() {
    _client.dispose();
    _shippingName.dispose();
    _shippingId.dispose();
    _declarationNumberInput.dispose();
    _declarationNumberInput2.dispose();
    _declarationDateInput.dispose();
    _orderDate.dispose();
    _containerSize.dispose();
    _portOfLading.dispose();
    _portOfDischarge.dispose();
    _destination.dispose();
    _transportationTo.dispose();
    _trachNo.dispose();
    _transportationCompany.dispose();
    _transportationFrom.dispose();
    _transportationToLocation.dispose();
    _tripCharge.dispose();
    _waitingCharge.dispose();
    _maccrikCharge.dispose();
    _awb.dispose();
    _hs.dispose();
    _goods.dispose();
    _origin.dispose();
    _value.dispose();
    _rate.dispose();
    _weight.dispose();
    _containers.dispose();
    _containerArrival.dispose();
    _documentArrival.dispose();
    _fileNumber.dispose();
    _documentPostalNumber.dispose();
    _containerNumbers.dispose();
    _unitCount.dispose();
    _unitNumber.dispose();
    _stopReason.dispose();
    _qty.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final cs = Theme.of(context).colorScheme;
    if (_loadingTx) {
      return Scaffold(
        appBar: AppBar(
            title: Text(_isEdit
                ? '${_editLabel(context)} ${_moduleNoun(context)}'
                : '${_newLabel(context)} ${_moduleNoun(context)}')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    if ((widget.role == 'accountant' || widget.role == 'employee2') &&
        !_isEdit) {
      return Scaffold(
        appBar: AppBar(
            title: Text('${_newLabel(context)} ${_moduleNoun(context)}')),
        body: Center(
            child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(l10n.accountantNoTransactionForm,
                    textAlign: TextAlign.center))),
      );
    }

    final clientOpts = _filterClients();
    final shipOpts = _filterShipping();
    final invoice = double.tryParse(_value.text.trim());
    final rate = double.tryParse(_rate.text.trim());
    final derivedWeight =
        (invoice != null && rate != null && rate > 0) ? (invoice / rate) : null;
    final storageWarehouseOnly = _isEdit &&
        _stage == 'STORAGE' &&
        (widget.module == 'transactions' || widget.module == 'transfers');
    
    final showTransportationSection = _isEdit && _stage == 'TRANSPORTATION';
    final isManager = widget.role == 'manager';
    final isEmployee = widget.role == 'employee';
    final isEmployee2 = widget.role == 'employee2';
    final canWorkStage = roleCanWorkAtStage(widget.role, _stage);
    final transportationEditableEffective = showTransportationSection &&
        !storageWarehouseOnly &&
        (isManager || (isEmployee2 && canWorkStage));
    final prepEditable = (!_isEdit ||
            _stage == 'PREPARATION' ||
            _stage == 'CUSTOMS_CLEARANCE') &&
        !storageWarehouseOnly &&
        (isManager || isEmployee);
    final customsEditable = (!_isEdit ||
            _stage == 'PREPARATION' ||
            _stage == 'CUSTOMS_CLEARANCE') &&
        !storageWarehouseOnly &&
        (isManager || isEmployee);
    final storageEditable = (!_isEdit || _stage == 'STORAGE') &&
        !storageWarehouseOnly &&
        (isManager || (isEmployee2 && _stage == 'STORAGE'));
    final canSetStage = isManager || canWorkStage;
    final selectableStages = stageOptionsForRole(widget.role, _stageOptionsForModule);
    final showCustomsDeclarationSection = _isEdit && _stage != 'PREPARATION';
    final groupedRetained = _groupRetainedDocs(l10n);

    final isTransferOrExport =
        widget.module == 'transfers' || widget.module == 'exports';

    Widget sectionCard(String title, List<Widget> children) {
      if (children.isEmpty) return const SizedBox.shrink();
      return Card(
        margin: const EdgeInsets.only(bottom: 12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const Divider(height: 20),
              ...children,
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
          title: Text(_isEdit
              ? '${_editLabel(context)} ${_moduleNoun(context)}'
              : '${_newLabel(context)} ${_moduleNoun(context)}')),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          PageHeroBanner(
            icon: Icons.edit_note_outlined,
            title: _isEdit
                ? '${_editLabel(context)} ${_moduleNoun(context)}'
                : '${_newLabel(context)} ${_moduleNoun(context)}',
          ),
          const SizedBox(height: 10),
          if (_isEdit)
            sectionCard(l10n.txReadOnlyFields, [
              DropdownButtonFormField<String>(
                key: ValueKey('tx-stage-$_stage'),
                decoration: InputDecoration(labelText: l10n.txStage),
                initialValue: _stage,
                items: selectableStages
                    .map((s) => DropdownMenuItem(
                        value: s, child: Text(_stageLabel(s, l10n))))
                    .toList(),
                onChanged: !canSetStage
                    ? null
                    : (v) {
                        if (v != null && v != _stage) _changeStage(v);
                      },
              ),
              if ((_releaseCode ?? '').isNotEmpty)
                _readonlyField(l10n.releaseCode, _releaseCode!),
              if ((_clearanceStatus ?? '').isNotEmpty)
                _readonlyField(l10n.status, _clearanceStatus!),
              if (showCustomsDeclarationSection)
                _field(_fileNumber, l10n.txFileNumber, enabled: customsEditable),
            ]),
          sectionCard(l10n.txPartiesSection, [
          _field(_client, l10n.client,
              enabled: prepEditable, onChanged: (_) => setState(() {})),
          if (clientOpts.isNotEmpty)
            Card(
              child: Column(
                children: clientOpts
                    .map(
                      (c) => ListTile(
                        dense: true,
                        title: Text('${c['companyName']}'),
                        subtitle: Text(
                            '${c['trn'] ?? ''} ${c['immigrationCode'] ?? ''}'
                                .trim()),
                        onTap: !prepEditable
                            ? null
                            : () {
                                _client.text = c['companyName'].toString();
                                setState(() {});
                              },
                      ),
                    )
                    .toList(),
              ),
            ),
          Text(l10n.typeToSearch, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 8),
          _field(_shippingName, l10n.shippingCompany,
              enabled: prepEditable, onChanged: (_) => setState(() {})),
          if (shipOpts.isNotEmpty)
            Card(
              child: Column(
                children: shipOpts
                    .map(
                      (s) => ListTile(
                        dense: true,
                        title: Text('${s['companyName']}'),
                        subtitle: Text('${s['code'] ?? ''}'),
                        onTap: !prepEditable
                            ? null
                            : () {
                                _shippingName.text =
                                    s['companyName'].toString();
                                _shippingId.text = s['id']?.toString() ?? '';
                                setState(() {});
                              },
                      ),
                    )
                    .toList(),
              ),
            ),
          _field(_shippingId, l10n.shippingCompanyIdOptional,
              enabled: prepEditable),
          ]),
          if (showCustomsDeclarationSection)
            sectionCard(l10n.txCustomsDeclaration, [
            _field(_declarationNumberInput, l10n.txDeclarationNumber1,
                enabled: customsEditable, maxLength: 120),
            ApiDateField(
              controller: _declarationDateInput,
              label: l10n.txDeclarationDate,
              enabled: customsEditable,
            ),
            Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: DropdownButtonFormField<String>(
                  key: ValueKey(
                      'tx-declaration-type-${_declarationType.isEmpty ? 'none' : _declarationType}'),
                  decoration:
                      InputDecoration(labelText: l10n.txDeclarationType1),
                  initialValue:
                      _declarationType.isEmpty ? null : _declarationType,
                  items: [
                    DropdownMenuItem<String>(
                        value: null, child: Text(l10n.optionalSelect)),
                    ..._declarationDropdownOptions(_declarationType).map(
                      (type) => DropdownMenuItem<String>(
                          value: type,
                          child: Text(declarationTypeLabel(type, l10n))),
                    ),
                  ],
                  onChanged: customsEditable
                      ? (v) => setState(() => _declarationType = v ?? '')
                      : null,
                )),
            _field(_declarationNumberInput2, l10n.txDeclarationNumber2,
                enabled: customsEditable, maxLength: 120),
            Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: DropdownButtonFormField<String>(
                  key: ValueKey(
                      'tx-declaration-type2-${_declarationType2.isEmpty ? 'none' : _declarationType2}'),
                  decoration:
                      InputDecoration(labelText: l10n.txDeclarationType2),
                  initialValue:
                      _declarationType2.isEmpty ? null : _declarationType2,
                  items: [
                    DropdownMenuItem<String>(
                        value: null, child: Text(l10n.optionalSelect)),
                    ..._declarationDropdownOptions(_declarationType2).map(
                      (type) => DropdownMenuItem<String>(
                          value: type,
                          child: Text(declarationTypeLabel(type, l10n))),
                    ),
                  ],
                  onChanged: customsEditable
                      ? (v) => setState(() => _declarationType2 = v ?? '')
                      : null,
                )),
            Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: DropdownButtonFormField<String>(
                  key: ValueKey(
                      'tx-port-type-${_portType.isEmpty ? 'none' : _portType}'),
                  decoration: InputDecoration(labelText: l10n.txPortType),
                  initialValue: _portType.isEmpty ? null : _portType,
                  items: [
                    DropdownMenuItem<String>(
                        value: null, child: Text(l10n.optionalSelect)),
                    ..._portTypeDropdownOptions().map(
                      (type) => DropdownMenuItem<String>(
                          value: type, child: Text(portTypeLabel(type, l10n))),
                    ),
                  ],
                  onChanged: customsEditable
                      ? (v) => setState(() => _portType = v ?? '')
                      : null,
                )),
            ]),
          if (isTransferOrExport)
            sectionCard(
              widget.module == 'exports'
                  ? l10n.exportDetails
                  : l10n.txTransferDetailsSection,
              [
                _field(_portOfLading, l10n.txPortOfLading, enabled: prepEditable),
                _field(_portOfDischarge, l10n.txPortOfDischarge, enabled: prepEditable),
                _field(_destination, l10n.txDestination, enabled: prepEditable),
              ],
            ),
          sectionCard(l10n.txShipmentCoreSection, [
          _field(_awb, l10n.airwayBill, enabled: prepEditable),
          _field(_hs, l10n.hsCode, enabled: prepEditable),
          _field(_origin, l10n.originCountry, enabled: prepEditable),
          Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: DropdownButtonFormField<String>(
                key: ValueKey('tx-currency-$_currency'),
                decoration: InputDecoration(labelText: l10n.txCurrency),
                initialValue: _currency,
                items: const [
                  DropdownMenuItem(value: 'AED', child: Text('AED')),
                  DropdownMenuItem(value: 'USD', child: Text('USD')),
                  DropdownMenuItem(value: 'EUR', child: Text('EUR')),
                  DropdownMenuItem(value: 'SAR', child: Text('SAR')),
                ],
                onChanged: prepEditable
                    ? (v) => setState(() => _currency = v ?? 'AED')
                    : null,
              )),
          _field(_value, l10n.invoiceValue,
              keyboard: const TextInputType.numberWithOptions(decimal: true),
              enabled: prepEditable),
          _field(_rate, l10n.txRateAedPerKg,
              keyboard: const TextInputType.numberWithOptions(decimal: true),
              enabled: prepEditable),
          ApiDateField(
            controller: _orderDate,
            label: l10n.txOrderDate,
            enabled: prepEditable,
          ),
          _field(_goods, l10n.goodsDescription,
              maxLines: 3, enabled: prepEditable),
          if (!_isEdit)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: TextFormField(
                controller: _unitCount,
                enabled: storageEditable,
                decoration: InputDecoration(labelText: l10n.txNumberOfUnits),
              ),
            ),
          ]),
          sectionCard(l10n.txCargoContainersSection, [
          _field(_weight, l10n.txGoodsWeightKg,
              keyboard: const TextInputType.numberWithOptions(decimal: true),
              enabled: prepEditable),
          if (derivedWeight != null && _weight.text.trim().isEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                  '${l10n.weightKg}: ${derivedWeight.toStringAsFixed(3)}',
                  style: Theme.of(context).textTheme.bodySmall),
            ),
          _field(_containers, l10n.txContainerCount,
              keyboard: TextInputType.number, enabled: prepEditable),
          ApiDateField(
            controller: _containerArrival,
            label: l10n.txContainerArrival,
            enabled: customsEditable,
          ),
          _field(_qty, l10n.txGoodsQty,
              keyboard: const TextInputType.numberWithOptions(decimal: true),
              enabled: prepEditable),
          Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: DropdownButtonFormField<String?>(
                key: ValueKey('tx-quality-${_quality ?? 'none'}'),
                decoration: InputDecoration(labelText: l10n.txGoodsQuality),
                initialValue: _quality,
                items: [
                  DropdownMenuItem<String?>(
                      value: null, child: Text(l10n.optionalSelect)),
                  DropdownMenuItem(
                      value: 'new', child: Text(l10n.txQualityNew)),
                  DropdownMenuItem(
                      value: 'like_new', child: Text(l10n.txQualityLikeNew)),
                  DropdownMenuItem(
                      value: 'used', child: Text(l10n.txQualityUsed)),
                  DropdownMenuItem(
                      value: 'refurbished',
                      child: Text(l10n.txQualityRefurbished)),
                  DropdownMenuItem(
                      value: 'damaged', child: Text(l10n.txQualityDamaged)),
                  DropdownMenuItem(
                      value: 'mixed', child: Text(l10n.txQualityMixed)),
                ],
                onChanged:
                    prepEditable ? (v) => setState(() => _quality = v) : null,
              )),
          if (_isEdit)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: DropdownButtonFormField<String?>(
                          key: ValueKey('tx-unit-edit-${_unit ?? 'none'}'),
                          decoration:
                              InputDecoration(labelText: l10n.txGoodsUnit),
                          initialValue: _unit,
                          items: [
                            DropdownMenuItem<String?>(
                                value: null, child: Text(l10n.optionalSelect)),
                            DropdownMenuItem(
                                value: 'kg', child: Text(l10n.txUnitKg)),
                            DropdownMenuItem(
                                value: 'ton', child: Text(l10n.txUnitTon)),
                            DropdownMenuItem(
                                value: 'piece', child: Text(l10n.txUnitPiece)),
                            DropdownMenuItem(
                                value: 'carton',
                                child: Text(l10n.txUnitCarton)),
                            DropdownMenuItem(
                                value: 'pallet',
                                child: Text(l10n.txUnitPallet)),
                            DropdownMenuItem(
                                value: 'cbm', child: Text(l10n.txUnitCbm)),
                            DropdownMenuItem(
                                value: 'liter', child: Text(l10n.txUnitLiter)),
                            DropdownMenuItem(
                                value: 'set', child: Text(l10n.txUnitSet)),
                          ],
                          onChanged: prepEditable
                              ? (v) => setState(() => _unit = v)
                              : null,
                        )),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: TextFormField(
                        controller: _unitCount,
                        enabled: storageEditable,
                        decoration:
                            InputDecoration(labelText: l10n.txNumberOfUnits),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          if (isTransferOrExport)
            _field(_containerSize, l10n.txContainerSize, enabled: prepEditable),
          ApiDateField(
            controller: _documentArrival,
            label: l10n.txDocumentArrival,
            enabled: customsEditable,
          ),
          _field(_containerNumbers, l10n.containerNumbers,
              maxLines: 3, enabled: storageEditable),
          if (isTransferOrExport)
            _field(_unitNumber, l10n.txUnitNumber,
                keyboard: TextInputType.number, enabled: storageEditable),
          ]),
          sectionCard(l10n.txWorkflowSection, [
          _field(_documentPostalNumber, l10n.txDocumentPostalNumber, enabled: customsEditable),
          Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: DropdownButtonFormField<bool>(
                key: ValueKey('tx-stop-$_isStopped'),
                decoration: InputDecoration(labelText: l10n.stopTransaction),
                initialValue: _isStopped,
                items: [
                  DropdownMenuItem(value: false, child: Text(l10n.optionNo)),
                  DropdownMenuItem(value: true, child: Text(l10n.optionYes)),
                ],
                onChanged: storageEditable
                    ? (v) => setState(() => _isStopped = v ?? false)
                    : null,
              )),
          if (_isStopped)
            _field(_stopReason, l10n.stopReason,
                maxLines: 2, enabled: storageEditable),
          Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: DropdownButtonFormField<String>(
                key: ValueKey('tx-doc-status-$_docStatus'),
                decoration: InputDecoration(labelText: l10n.documentStatus),
                initialValue: _docStatus,
                items: [
                  DropdownMenuItem(
                      value: 'copy_received',
                      child: Text(l10n.txDocumentStatusCopy)),
                  DropdownMenuItem(
                      value: 'original_received',
                      child: Text(l10n.txDocumentStatusOriginal)),
                  DropdownMenuItem(
                      value: 'telex_release',
                      child: Text(l10n.txDocumentStatusTelex)),
                ],
                onChanged: customsEditable
                    ? (v) => setState(() => _docStatus = v ?? 'copy_received')
                    : null,
              )),
          Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: DropdownButtonFormField<String>(
                key: ValueKey('tx-payment-status-$_paymentStatus'),
                decoration: InputDecoration(labelText: l10n.paymentStatus),
                initialValue: _paymentStatus,
                items: [
                  DropdownMenuItem(
                      value: 'pending', child: Text(l10n.txPaymentPending)),
                  DropdownMenuItem(
                      value: 'paid', child: Text(l10n.txPaymentPaid)),
                ],
                onChanged: (!customsEditable ||
                        widget.role == 'employee' ||
                        widget.role == 'employee2')
                    ? null
                    : (v) => setState(() => _paymentStatus = v ?? 'pending'),
              )),
          ]),
          if (storageWarehouseOnly && widget.transactionId != null) ...[
            const SizedBox(height: 8),
            Text(l10n.storageReadOnlyHint,
                style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => TransactionStoragePage(
                      role: widget.role,
                      transactionId: widget.transactionId!,
                      module: widget.module,
                    ),
                  ),
                );
              },
              child: Text(l10n.storageOpenDedicatedPage),
            ),
          ],
          if (showTransportationSection)
            sectionCard(l10n.txTransportationSection, [
            _field(_transportationTo, l10n.txTransportationTo,
                enabled: transportationEditableEffective),
            _field(_trachNo, l10n.txTrachNo,
                enabled: transportationEditableEffective),
            _field(_transportationCompany, l10n.txTransportationCompany,
                enabled: transportationEditableEffective),
            _field(_transportationFrom, l10n.txTransportationFrom,
                enabled: transportationEditableEffective),
            _field(_transportationToLocation, l10n.txTransportationToLocation,
                enabled: transportationEditableEffective),
            _field(_tripCharge, l10n.txTripCharge,
                keyboard: const TextInputType.numberWithOptions(decimal: true),
                enabled: transportationEditableEffective),
            _field(_waitingCharge, l10n.txWaitingCharge,
                keyboard: const TextInputType.numberWithOptions(decimal: true),
                enabled: transportationEditableEffective),
            _field(_maccrikCharge, l10n.txMaccrikCharge,
                keyboard: const TextInputType.numberWithOptions(decimal: true),
                enabled: transportationEditableEffective),
            ]),
          sectionCard(l10n.txAttachmentsSection, [
          Text(l10n.txAttachDocs, style: Theme.of(context).textTheme.bodySmall),
          if (_isEdit && _retainedDocs.isNotEmpty)
            ...groupedRetained.entries.map(
              (entry) => Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 8, bottom: 4),
                    child: Text(
                      entry.key,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                  ...entry.value.map(
                    (d) {
                      final path = (d['path'] ?? '').toString();
                      final name = (d['originalName'] ?? '').toString();
                      final isImg = RegExp(r'\.(png|jpe?g|gif|webp)$',
                              caseSensitive: false)
                          .hasMatch(name);
                      return Card(
                        child: ListTile(
                          leading: isImg
                              ? SizedBox(
                                  width: 48,
                                  height: 48,
                                  child: FutureBuilder(
                                    future: Api.getBytes(path),
                                    builder: (context, snap) {
                                      if (snap.hasData) {
                                        return ClipRRect(
                                          borderRadius:
                                              BorderRadius.circular(8),
                                          child: Image.memory(snap.data!,
                                              fit: BoxFit.cover),
                                        );
                                      }
                                      return const Icon(Icons.image_outlined);
                                    },
                                  ),
                                )
                              : const Icon(Icons.picture_as_pdf_outlined),
                          title: Text(name),
                          trailing: IconButton(
                            icon: const Icon(Icons.close),
                            onPressed: prepEditable
                                ? () => setState(() => _retainedDocs
                                    .removeWhere((x) => x['path'] == d['path']))
                                : null,
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          OutlinedButton.icon(
              onPressed: prepEditable ? _pickFiles : null,
              icon: const Icon(Icons.attach_file),
              label: Text(l10n.txPickFiles)),
          if (_picked.isNotEmpty) ...[
            Text('${_picked.length} ${l10n.txPickFiles}'),
            const SizedBox(height: 8),
            ...List.generate(_picked.length, (idx) {
              final f = _picked[idx];
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: DropdownButtonFormField<String?>(
                      key: ValueKey(
                          'doc-cat-$idx-${_pickedCategories[idx] ?? 'none'}'),
                      decoration:
                          InputDecoration(labelText: '${f.name} — ${l10n.selectCategory}'),
                      initialValue: _pickedCategories[idx],
                      items: [
                        DropdownMenuItem<String?>(
                          value: null,
                          child: Text(l10n.selectCategory),
                        ),
                    ..._documentCategoryOptions.map(
                      (c) => DropdownMenuItem<String?>(
                          value: c, child: Text(_docCategoryLabel(c, l10n))),
                    ),
                      ],
                      onChanged: prepEditable
                          ? (v) => setState(() => _pickedCategories[idx] = v)
                          : null,
                    )),
              );
            }),
          ],
          ]),
          if (_error.isNotEmpty)
            Card(
              color: cs.errorContainer,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child:
                    Text(_error, style: TextStyle(color: cs.onErrorContainer)),
              ),
            ),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: (_saving || storageWarehouseOnly) ? null : _save,
            child: Text(_saving ? l10n.saving : l10n.save),
          ),
        ],
      ),
    );
  }

  String _stageLabel(String stage, AppLocalizations l10n) {
    switch (stage) {
      case 'PREPARATION':
        return l10n.stagePreparation;
      case 'CUSTOMS_CLEARANCE':
        return l10n.stageCustomsClearance;
      case 'STORAGE':
        return l10n.stageStorage;
      case 'TRANSPORTATION':
        return l10n.stageTransportation;
      default:
        return stage;
    }
  }

  Widget _field(TextEditingController c, String label,
      {TextInputType keyboard = TextInputType.text,
      int maxLines = 1,
      int? maxLength,
      bool enabled = true,
      void Function(String)? onChanged}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextField(
        controller: c,
        enabled: enabled,
        keyboardType: keyboard,
        maxLines: maxLines,
        maxLength: maxLength,
        onChanged: onChanged,
        decoration: InputDecoration(
          labelText: label,
          counterText: maxLength != null ? '' : null,
        ),
      ),
    );
  }

  Widget _readonlyField(String label, String value) {
    return Card(
      child: ListTile(
        title: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(value),
      ),
    );
  }

  String _docCategoryLabel(String value, AppLocalizations l10n) {
    switch (value) {
      case 'bill_of_lading':
        return l10n.docBillOfLading;
      case 'certificate_of_origin':
        return l10n.docCertificateOfOrigin;
      case 'invoice':
        return l10n.docInvoice;
      case 'packing_list':
        return l10n.docPackingList;
      default:
        return value;
    }
  }
}
