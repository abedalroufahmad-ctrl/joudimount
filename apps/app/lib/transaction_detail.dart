import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart' as intl;
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';

import 'api.dart';
import 'l10n/app_localizations.dart';
import 'transaction_form.dart';
import 'transaction_storage_page.dart';

class TransactionDetailsPage extends StatefulWidget {
  final String id;
  final String role;
  final String module;
  const TransactionDetailsPage({
    super.key,
    required this.id,
    required this.role,
    this.module = 'transactions',
  });

  @override
  State<TransactionDetailsPage> createState() => _TransactionDetailsPageState();
}

class _TransactionDetailsPageState extends State<TransactionDetailsPage> {
  String get _modulePath => '/api/${widget.module}';

  String _moduleTitle(AppLocalizations l10n) {
    if (widget.module == 'transfers') return l10n.transferDetails;
    if (widget.module == 'exports') return l10n.exportDetails;
    return l10n.details;
  }

  Map<String, dynamic>? tx;
  String error = '';
  bool loading = true;

  @override
  void initState() {
    super.initState();
    load();
  }

  Map<String, List<Map<String, dynamic>>> _groupAttachments(
      List<Map<String, dynamic>> attachments) {
    final out = <String, List<Map<String, dynamic>>>{};
    for (final a in attachments) {
      final category = (a['category'] ?? '').toString();
      final key = category.isEmpty
          ? AppLocalizations.of(context)!.uncategorized
          : _docCategoryLabel(category, AppLocalizations.of(context)!);
      out.putIfAbsent(key, () => <Map<String, dynamic>>[]).add(a);
    }
    return out;
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = '';
    });
    try {
      tx = await Api.get('$_modulePath/${widget.id}') as Map<String, dynamic>;
    } catch (e) {
      error = e.toString();
    } finally {
      setState(() => loading = false);
    }
  }

  String _declarationHeaderTitle(
      Map<String, dynamic> t, AppLocalizations l10n) {
    final d1 = (t['declarationNumber'] ?? '').toString().trim();
    final d2 = (t['declarationNumber2'] ?? '').toString().trim();
    if (d1.isEmpty && d2.isEmpty) return l10n.details;
    if (d2.isEmpty) return d1;
    if (d1.isEmpty) return d2;
    return '$d1 · $d2';
  }

  Future<void> _action(String name) async {
    try {
      await Api.post('$_modulePath/${widget.id}/$name', {});
      await load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _delete() async {
    final l10n = AppLocalizations.of(context)!;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.deleteTransaction),
        content: Text(l10n.confirmDeleteTransaction),
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
    if (ok != true) return;
    try {
      await Api.delete('$_modulePath/${widget.id}');
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _openShippingPaper() async {
    final l10n = AppLocalizations.of(context)!;
    final t = tx!;
    final isRtl = Directionality.of(context) == TextDirection.rtl;
    final forceLatinTemplate =
        Localizations.localeOf(context).languageCode == 'ar';
    final heading =
        forceLatinTemplate ? 'Shipping Paper' : l10n.shippingPaperHeading;
    final subheading = forceLatinTemplate
        ? 'Please process and release this shipment as soon as possible.'
        : l10n.shippingPaperSub;
    // Embed Unicode fonts to keep Arabic/English text readable on all viewers.
    final pw.Font arabicFont;
    try {
      arabicFont = pw.Font.ttf(
          await rootBundle.load('assets/fonts/NotoSansArabic-Regular.ttf'));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${l10n.pdfFontLoadErrorPrefix}: $e')),
      );
      return;
    }
    final pdfTheme = pw.ThemeData.withFont(
      base: arabicFont,
      bold: arabicFont,
      italic: arabicFont,
      boldItalic: arabicFont,
      fontFallback: [pw.Font.helvetica()],
    );
    final pdf = pw.Document();
    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        theme: pdfTheme,
        textDirection: isRtl ? pw.TextDirection.rtl : pw.TextDirection.ltr,
        build: (ctx) => [
          pw.Text(
            heading,
            style: pw.TextStyle(
              fontSize: 20,
              fontWeight: pw.FontWeight.bold,
            ),
          ),
          pw.SizedBox(height: 6),
          pw.Text(
            subheading,
            style: const pw.TextStyle(fontSize: 12),
          ),
          pw.SizedBox(height: 12),
          _pdfRow(
              forceLatinTemplate
                  ? 'To shipping company'
                  : l10n.toShippingCompany,
              '${t['shippingCompanyName']}'),
          _pdfRow(forceLatinTemplate ? 'From client' : l10n.fromClient,
              '${t['clientName']}'),
          _pdfRow(forceLatinTemplate ? 'Declaration' : l10n.declaration,
              '${t['declarationNumber']}'),
          if ((t['declarationNumber2'] ?? '').toString().trim().isNotEmpty)
            _pdfRow(
              forceLatinTemplate
                  ? 'Declaration (2)'
                  : '${l10n.declaration} (2)',
              '${t['declarationNumber2']}',
            ),
          if ((t['declarationType'] ?? '').toString().trim().isNotEmpty)
            _pdfRow(
                forceLatinTemplate
                    ? 'Declaration type (1)'
                    : l10n.txDeclarationType1,
                '${t['declarationType']}'),
          if ((t['declarationType2'] ?? '').toString().trim().isNotEmpty)
            _pdfRow(
                forceLatinTemplate
                    ? 'Declaration type (2)'
                    : l10n.txDeclarationType2,
                '${t['declarationType2']}'),
          _pdfRow(forceLatinTemplate ? 'Airway bill' : l10n.airwayBillShort,
              '${t['airwayBill']}'),
          _pdfRow(forceLatinTemplate ? 'HS code' : l10n.hsCode,
              '${t['hsCode']}'),
          _pdfRow(forceLatinTemplate ? 'Origin' : l10n.origin,
              '${t['originCountry']}'),
          _pdfRow(forceLatinTemplate ? 'Value (AED)' : l10n.valueAed,
              '${t['invoiceValue']}'),
          _pdfRow(
              forceLatinTemplate ? 'Release code' : l10n.releaseCode,
              '${t['releaseCode'] ?? (forceLatinTemplate ? 'Not issued' : l10n.notIssued)}'),
          if (t['goodsWeightKg'] != null)
            _pdfRow(forceLatinTemplate ? 'Weight (kg)' : l10n.weightKg,
                '${t['goodsWeightKg']}'),
          if (t['goodsQuantity'] != null)
            _pdfRow(forceLatinTemplate ? 'Quantity' : l10n.quantity,
                '${t['goodsQuantity']}'),
          pw.SizedBox(height: 8),
          pw.Text(
            forceLatinTemplate ? 'Goods' : l10n.goods,
            style: pw.TextStyle(
              fontWeight: pw.FontWeight.bold,
            ),
          ),
          pw.SizedBox(height: 4),
          pw.Text(
            '${t['goodsDescription']}',
          ),
        ],
      ),
    );
    final bytes = await pdf.save();
    try {
      await Printing.layoutPdf(onLayout: (format) async => bytes);
    } on MissingPluginException catch (_) {
      // Desktop Linux embeds can miss native print/share plugins.
      _showUnsupportedShareMessage();
    } on UnimplementedError {
      _showUnsupportedShareMessage();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  pw.Widget _pdfRow(String k, String v) => pw.Padding(
        padding: const pw.EdgeInsets.only(bottom: 4),
        child: pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.SizedBox(
              width: 140,
              child: pw.Text(
                '$k:',
                style: pw.TextStyle(
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
            ),
            pw.Expanded(
              child: pw.Text(
                v,
              ),
            ),
          ],
        ),
      );

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final cs = Theme.of(context).colorScheme;
    final locale = Localizations.localeOf(context).toLanguageTag();
    final numberFormat = intl.NumberFormat.decimalPattern(locale);
    final canEdit = widget.role != 'accountant';
    final canAccounting =
        widget.role == 'manager' || widget.role == 'accountant';
    final paid = tx?['paymentStatus'] == 'paid';
    final doc = tx?['documentStatus']?.toString() ?? '';
    final canRelease =
        paid && (doc == 'original_received' || doc == 'telex_release');

    return Scaffold(
      appBar: AppBar(
        title: Text(_moduleTitle(l10n)),
        actions: [
          if (tx != null && canEdit)
            IconButton(
              icon: const Icon(Icons.edit),
              onPressed: () async {
                final r = await Navigator.of(context).push<bool>(
                  MaterialPageRoute(
                    builder: (_) => TransactionFormPage(
                      role: widget.role,
                      transactionId: widget.id,
                      module: widget.module,
                    ),
                  ),
                );
                if (r == true) {
                  await load();
                  if (mounted) setState(() {});
                }
              },
            ),
          if (tx != null)
            IconButton(
              icon: const Icon(Icons.picture_as_pdf_outlined),
              tooltip: l10n.shippingPaper,
              onPressed: _openShippingPaper,
            ),
          if (tx != null && canEdit)
            IconButton(
              icon: const Icon(Icons.delete_outline),
              onPressed: _delete,
            ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error.isNotEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Card(
                      color: cs.errorContainer,
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Text(error,
                            style: TextStyle(color: cs.onErrorContainer)),
                      ),
                    ),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.all(12),
                  children: [
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF1e3a8a), Color(0xFF2563eb)],
                          begin: Alignment.topRight,
                          end: Alignment.bottomLeft,
                        ),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        children: [
                          const CircleAvatar(
                            backgroundColor: Color(0x33FFFFFF),
                            child: Icon(Icons.receipt_long_outlined,
                                color: Colors.white),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              _declarationHeaderTitle(tx!, l10n),
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    _kv(l10n.client, '${tx!['clientName']}'),
                    _kv(
                        l10n.txStage,
                        _stageLabel(
                            '${tx!['transactionStage'] ?? 'PREPARATION'}', l10n)),
                    if ('${tx!['transactionStage'] ?? ''}' == 'STORAGE' &&
                        (widget.module == 'transactions' ||
                            widget.module == 'transfers'))
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: FilledButton(
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => TransactionStoragePage(
                                  role: widget.role,
                                  transactionId: widget.id,
                                  module: widget.module,
                                ),
                              ),
                            );
                          },
                          child: Text(l10n.storageLinkFromDetails),
                        ),
                      ),
                    _kv(l10n.shippingCompany, '${tx!['shippingCompanyName']}'),
                    if ('${tx!['transactionStage'] ?? 'PREPARATION'}' !=
                        'PREPARATION') ...[
                      _kv(l10n.txDeclarationNumber1,
                          '${tx!['declarationNumber']}'),
                      if (tx!['declarationNumber2'] != null &&
                          tx!['declarationNumber2']
                              .toString()
                              .trim()
                              .isNotEmpty)
                        _kv(l10n.txDeclarationNumber2,
                            '${tx!['declarationNumber2']}'),
                      if (tx!['declarationDate'] != null)
                        _kv(
                            l10n.txDeclarationDate,
                            _formatDateTime(
                                '${tx!['declarationDate']}', locale)),
                      if (tx!['declarationType'] != null &&
                          tx!['declarationType'].toString().isNotEmpty)
                        _kv(l10n.txDeclarationType1,
                            '${tx!['declarationType']}'),
                      if (tx!['declarationType2'] != null &&
                          tx!['declarationType2'].toString().isNotEmpty)
                        _kv(l10n.txDeclarationType2,
                            '${tx!['declarationType2']}'),
                      if (tx!['portType'] != null &&
                          tx!['portType'].toString().isNotEmpty)
                        _kv(l10n.txPortType, '${tx!['portType']}'),
                    ],
                    if (tx!['shippingCompanyId'] != null &&
                        tx!['shippingCompanyId'].toString().isNotEmpty)
                      _kv(l10n.shippingCompanyIdOptional,
                          '${tx!['shippingCompanyId']}'),
                    _kv(l10n.airwayBill, '${tx!['airwayBill']}'),
                    _kv(l10n.hsCode, '${tx!['hsCode']}'),
                    _kv(l10n.goods, '${tx!['goodsDescription']}'),
                    _kv(l10n.origin, '${tx!['originCountry']}'),
                    _kv(
                      l10n.invoiceValue,
                      '${numberFormat.format(tx!['invoiceValue'] ?? 0)} ${tx!['invoiceCurrency'] ?? 'AED'}',
                    ),
                    _kv(l10n.document, _docStatusLabel('${tx!['documentStatus']}', l10n)),
                    _kv(l10n.status, '${tx!['clearanceStatus']}'),
                    _kv(l10n.payment, _paymentStatusLabel('${tx!['paymentStatus']}', l10n)),
                    if ((tx!['portOfLading'] != null && tx!['portOfLading'].toString().isNotEmpty) ||
                        (tx!['portOfDischarge'] != null && tx!['portOfDischarge'].toString().isNotEmpty) ||
                        (tx!['destination'] != null && tx!['destination'].toString().isNotEmpty)) ...[
                      const SizedBox(height: 8),
                      Text(l10n.txTransferDetailsSection,
                          style: Theme.of(context).textTheme.titleSmall),
                      if (tx!['portOfLading'] != null && tx!['portOfLading'].toString().isNotEmpty)
                        _kv(l10n.txPortOfLading, '${tx!['portOfLading']}'),
                      if (tx!['portOfDischarge'] != null && tx!['portOfDischarge'].toString().isNotEmpty)
                        _kv(l10n.txPortOfDischarge, '${tx!['portOfDischarge']}'),
                      if (tx!['destination'] != null && tx!['destination'].toString().isNotEmpty)
                        _kv(l10n.txDestination, '${tx!['destination']}'),
                      const SizedBox(height: 8),
                    ],
                    if (tx!['containerCount'] != null)
                      _kv(l10n.txContainerCount, '${tx!['containerCount']}'),
                    if (tx!['containerSize'] != null && tx!['containerSize'].toString().isNotEmpty)
                      _kv(l10n.txContainerSize, '${tx!['containerSize']}'),
                    if (tx!['goodsWeightKg'] != null)
                      _kv(l10n.txGoodsWeightKg, '${tx!['goodsWeightKg']}'),
                    if (tx!['invoiceToWeightRateAedPerKg'] != null)
                      _kv(l10n.txRateAedPerKg,
                          '${tx!['invoiceToWeightRateAedPerKg']}'),
                    if (tx!['containerArrivalDate'] != null)
                      _kv(l10n.txContainerArrival,
                          '${tx!['containerArrivalDate']}'),
                    if (tx!['documentArrivalDate'] != null)
                      _kv(l10n.txDocumentArrival,
                          '${tx!['documentArrivalDate']}'),
                    if (tx!['documentPostalNumber'] != null && tx!['documentPostalNumber'].toString().isNotEmpty)
                      _kv(l10n.txDocumentPostalNumber, '${tx!['documentPostalNumber']}'),
                    if ('${tx!['transactionStage'] ?? 'PREPARATION'}' !=
                            'PREPARATION' &&
                        tx!['fileNumber'] != null &&
                        tx!['fileNumber'].toString().isNotEmpty)
                      _kv(l10n.txFileNumber, '${tx!['fileNumber']}'),
                    if (tx!['containerNumbers'] is List &&
                        (tx!['containerNumbers'] as List).isNotEmpty)
                      _kv(
                          l10n.containerNumbers,
                          (tx!['containerNumbers'] as List)
                              .map((e) => '$e')
                              .join(', ')),
                    if (tx!['unitCount'] != null)
                      _kv(l10n.txNumberOfUnits, '${tx!['unitCount']}'),
                    if (tx!['unitNumber'] != null)
                      _kv(l10n.txUnitNumber, '${tx!['unitNumber']}'),
                    _kv(l10n.stopTransaction, tx!['isStopped'] == true ? l10n.optionYes : l10n.optionNo),
                    if (tx!['isStopped'] == true &&
                        tx!['stopReason'] != null &&
                        tx!['stopReason'].toString().isNotEmpty)
                      _kv(l10n.stopReason, '${tx!['stopReason']}'),
                    if (tx!['goodsQuantity'] != null)
                      _kv(l10n.txGoodsQty, '${tx!['goodsQuantity']}'),
                    if (tx!['goodsQuality'] != null)
                      _kv(l10n.txGoodsQuality,
                          _qualityLabel('${tx!['goodsQuality']}', l10n)),
                    if (tx!['goodsUnit'] != null)
                      _kv(l10n.txGoodsUnit,
                          _unitLabel('${tx!['goodsUnit']}', l10n)),
                    if ('${tx!['transactionStage'] ?? ''}' == 'TRANSPORTATION' &&
                        ((tx!['transportationTo'] != null && tx!['transportationTo'].toString().isNotEmpty) ||
                        (tx!['trachNo'] != null && tx!['trachNo'].toString().isNotEmpty) ||
                        (tx!['transportationCompany'] != null && tx!['transportationCompany'].toString().isNotEmpty) ||
                        (tx!['transportationFrom'] != null && tx!['transportationFrom'].toString().isNotEmpty) ||
                        (tx!['transportationToLocation'] != null && tx!['transportationToLocation'].toString().isNotEmpty) ||
                        (tx!['tripCharge'] != null) ||
                        (tx!['waitingCharge'] != null) ||
                        (tx!['maccrikCharge'] != null))) ...[
                      const SizedBox(height: 8),
                      Text(l10n.txTransportationSection,
                          style: Theme.of(context).textTheme.titleSmall),
                      if (tx!['transportationTo'] != null && tx!['transportationTo'].toString().isNotEmpty)
                        _kv(l10n.txTransportationTo, '${tx!['transportationTo']}'),
                      if (tx!['trachNo'] != null && tx!['trachNo'].toString().isNotEmpty)
                        _kv(l10n.txTrachNo, '${tx!['trachNo']}'),
                      if (tx!['transportationCompany'] != null && tx!['transportationCompany'].toString().isNotEmpty)
                        _kv(l10n.txTransportationCompany, '${tx!['transportationCompany']}'),
                      if (tx!['transportationFrom'] != null && tx!['transportationFrom'].toString().isNotEmpty)
                        _kv(l10n.txTransportationFrom, '${tx!['transportationFrom']}'),
                      if (tx!['transportationToLocation'] != null && tx!['transportationToLocation'].toString().isNotEmpty)
                        _kv(l10n.txTransportationToLocation, '${tx!['transportationToLocation']}'),
                      if (tx!['tripCharge'] != null)
                        _kv(l10n.txTripCharge, '${tx!['tripCharge']}'),
                      if (tx!['waitingCharge'] != null)
                        _kv(l10n.txWaitingCharge, '${tx!['waitingCharge']}'),
                      if (tx!['maccrikCharge'] != null)
                        _kv(l10n.txMaccrikCharge, '${tx!['maccrikCharge']}'),
                      const SizedBox(height: 8),
                    ],
                    if (tx!['storageEntryDate'] != null &&
                        tx!['storageEntryDate'].toString().isNotEmpty)
                      _kv(l10n.storageEntryDate,
                          tx!['storageEntryDate'].toString()),
                    if (tx!['storageWorkersWages'] != null)
                      _kv(l10n.storageWorkersWages,
                          '${tx!['storageWorkersWages']}'),
                    if (tx!['storageWorkersCompany'] != null &&
                        tx!['storageWorkersCompany'].toString().isNotEmpty)
                      _kv(l10n.storageWorkersCompany,
                          '${tx!['storageWorkersCompany']}'),
                    if (tx!['storageStoreName'] != null &&
                        tx!['storageStoreName'].toString().isNotEmpty)
                      _kv(l10n.storageStoreName, '${tx!['storageStoreName']}'),
                    if (tx!['storageSizeCbm'] != null)
                      _kv(l10n.storageSizeCbm, '${tx!['storageSizeCbm']}'),
                    if (tx!['storageFreightVehicleNumbers'] != null &&
                        tx!['storageFreightVehicleNumbers']
                            .toString()
                            .isNotEmpty)
                      _kv(l10n.storageFreightVehicleNumbers,
                          '${tx!['storageFreightVehicleNumbers']}'),
                    if (tx!['storageCrossPackaging'] != null &&
                        tx!['storageCrossPackaging'].toString().isNotEmpty)
                      _kv(l10n.storageCrossPackaging,
                          '${tx!['storageCrossPackaging']}'),
                    if (tx!['storageUnity'] != null &&
                        tx!['storageUnity'].toString().isNotEmpty)
                      _kv(l10n.storageUnity, '${tx!['storageUnity']}'),
                    if (tx!['storageSealNumber'] != null &&
                        tx!['storageSealNumber'].toString().isNotEmpty)
                      _kv(l10n.storageSealNumber,
                          '${tx!['storageSealNumber']}'),
                    _kv(l10n.createdAt,
                        _formatDateTime('${tx!['createdAt']}', locale)),
                    const SizedBox(height: 12),
                    if ((tx!['documentAttachments'] as List?)?.isNotEmpty ??
                        false) ...[
                      Text(l10n.documentPhotosSection,
                          style: Theme.of(context).textTheme.titleSmall),
                      const SizedBox(height: 8),
                      ..._groupAttachments((tx!['documentAttachments'] as List)
                              .cast<Map<String, dynamic>>())
                          .entries
                          .expand(
                            (entry) => [
                              Padding(
                                padding:
                                    const EdgeInsets.only(top: 6, bottom: 2),
                                child: Text(
                                  entry.key,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w700),
                                ),
                              ),
                              ...entry.value.map(_attachmentTile),
                            ],
                          ),
                    ],
                    const SizedBox(height: 12),
                    if (widget.module == 'transactions' &&
                        (widget.role == 'manager' || widget.role == 'employee'))
                      FilledButton.tonal(
                        onPressed: () => _action('original-bl'),
                        child: Text(l10n.originalBl),
                      ),
                    if (canAccounting) ...[
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          FilledButton(
                            onPressed: paid ? null : () => _action('pay'),
                            child: Text(l10n.markPaid),
                          ),
                          FilledButton(
                            onPressed:
                                !canRelease ? null : () => _action('release'),
                            child: Text(l10n.release),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
    );
  }

  Widget _attachmentTile(Map<String, dynamic> a) {
    final path = (a['path'] ?? '').toString();
    final name = (a['originalName'] ?? '').toString();
    final category = (a['category'] ?? '').toString();
    final isImg =
        RegExp(r'\.(png|jpe?g|gif|webp)$', caseSensitive: false).hasMatch(name);
    return Card(
      child: ListTile(
        title: Text(
            category.isEmpty ? name : '$name (${_docCategoryLabel(category, AppLocalizations.of(context)!)})'),
        onTap: () => _openAttachment(path, name),
        subtitle: isImg
            ? SizedBox(
                height: 120,
                child: FutureBuilder(
                  future: Api.getBytes(path),
                  builder: (context, snap) {
                    if (snap.hasError) return Text('${snap.error}');
                    if (!snap.hasData)
                      return const Center(child: CircularProgressIndicator());
                    return Image.memory(snap.data!, fit: BoxFit.contain);
                  },
                ),
              )
            : const Text('PDF / file (tap to open)'),
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

  String _docStatusLabel(String status, AppLocalizations l10n) {
    if (status == 'copy_received') return l10n.txDocumentStatusCopy;
    if (status == 'original_received') return l10n.txDocumentStatusOriginal;
    if (status == 'telex_release') return l10n.txDocumentStatusTelex;
    return status;
  }

  String _paymentStatusLabel(String status, AppLocalizations l10n) {
    if (status == 'pending') return l10n.txPaymentPending;
    if (status == 'paid') return l10n.txPaymentPaid;
    return status;
  }

  String _formatDateTime(String raw, String locale) {
    final dt = DateTime.tryParse(raw);
    if (dt == null) return raw;
    return intl.DateFormat.yMd(locale).add_jm().format(dt.toLocal());
  }

  String _unitLabel(String unit, AppLocalizations l10n) {
    switch (unit) {
      case 'kg':
        return l10n.txUnitKg;
      case 'ton':
        return l10n.txUnitTon;
      case 'piece':
        return l10n.txUnitPiece;
      case 'carton':
        return l10n.txUnitCarton;
      case 'pallet':
        return l10n.txUnitPallet;
      case 'cbm':
        return l10n.txUnitCbm;
      case 'liter':
        return l10n.txUnitLiter;
      case 'set':
        return l10n.txUnitSet;
      default:
        return unit;
    }
  }

  String _qualityLabel(String quality, AppLocalizations l10n) {
    switch (quality) {
      case 'new':
        return l10n.txQualityNew;
      case 'like_new':
        return l10n.txQualityLikeNew;
      case 'used':
        return l10n.txQualityUsed;
      case 'refurbished':
        return l10n.txQualityRefurbished;
      case 'damaged':
        return l10n.txQualityDamaged;
      case 'mixed':
        return l10n.txQualityMixed;
      default:
        return quality;
    }
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

  Future<void> _openAttachment(String path, String name) async {
    try {
      final bytes = await Api.getBytes(path);
      final ext = name.toLowerCase();
      final mime = ext.endsWith('.pdf') ? 'application/pdf' : null;
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile.fromData(bytes, name: name, mimeType: mime)],
          title: name,
          subject: name,
        ),
      );
    } on UnimplementedError {
      _showUnsupportedShareMessage();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  void _showUnsupportedShareMessage() {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Sharing files is not supported on this Linux build yet.',
        ),
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
