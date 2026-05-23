import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart' as intl;
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';

import 'api.dart';
import 'app_theme.dart';
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

  Widget _detailSection(String title, List<Widget> children) {
    final visible = children.where((w) => w is! SizedBox).toList();
    if (visible.isEmpty) return const SizedBox.shrink();
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    )),
            const Divider(height: 20),
            ...visible,
          ],
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 2),
            Text(value),
          ],
        ),
      );

  Widget _detailRowOptional(String label, dynamic value, String locale,
      {bool dateTime = false}) {
    if (value == null) return const SizedBox.shrink();
    final text = value.toString().trim();
    if (text.isEmpty) return const SizedBox.shrink();
  final display = dateTime ? _formatDateTime(text, locale) : text;
    return _detailRow(label, display);
  }

  String _declarationTypeLabel(String value) {
    const map = {
      'Import': 'Import',
      'Import to Free Zone': 'Import to Free Zone',
      'Import for Re-Export': 'Import for Re-Export',
      'Temporary Import': 'Temporary Import',
      'Transfer': 'Transfer',
      'Export': 'Export',
      'Transit out': 'Transit out',
      'Export to GCC': 'Export to GCC',
      'Transitin': 'Transitin',
      'Transitin from GCC': 'Transitin from GCC',
    };
    return map[value] ?? value;
  }

  String _portTypeLabel(String value) {
    const map = {
      'Seaports': 'Seaports',
      'Free Zones': 'Free Zones',
      'Mainland': 'Mainland',
    };
    return map[value] ?? value;
  }

  List<Widget> _buildDetailSections(
    AppLocalizations l10n,
    String locale,
    intl.NumberFormat numberFormat,
  ) {
    final t = tx!;
    final stage = '${t['transactionStage'] ?? 'PREPARATION'}';
    final showCustoms = stage != 'PREPARATION';
    final showTransportation = stage == 'TRANSPORTATION' &&
        ((t['transportationTo']?.toString().trim().isNotEmpty ?? false) ||
            (t['trachNo']?.toString().trim().isNotEmpty ?? false) ||
            (t['transportationCompany']?.toString().trim().isNotEmpty ?? false) ||
            (t['transportationFrom']?.toString().trim().isNotEmpty ?? false) ||
            (t['transportationToLocation']?.toString().trim().isNotEmpty ?? false) ||
            t['tripCharge'] != null ||
            t['waitingCharge'] != null ||
            t['maccrikCharge'] != null);
    final showTransfer = (t['portOfLading']?.toString().trim().isNotEmpty ?? false) ||
        (t['portOfDischarge']?.toString().trim().isNotEmpty ?? false) ||
        (t['destination']?.toString().trim().isNotEmpty ?? false);

    final snapshotRows = <Widget>[
      _detailRow(l10n.createdAt, _formatDateTime('${t['createdAt']}', locale)),
      _detailRow(l10n.txDeclarationNumber1, '${t['declarationNumber']}'),
      _detailRowOptional(l10n.txDeclarationNumber2, t['declarationNumber2'], locale),
      _detailRowOptional(l10n.txFileNumber, t['fileNumber'], locale),
      _detailRow(l10n.status, '${t['clearanceStatus']}'),
      _detailRow(l10n.txStage, _stageLabel(stage, l10n)),
      if (stage == 'STORAGE' &&
          (widget.module == 'transactions' || widget.module == 'transfers'))
        Padding(
          padding: const EdgeInsets.only(top: 4),
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
      _detailRowOptional(l10n.releaseCode, t['releaseCode'], locale),
    ];

    final partiesRows = <Widget>[
      _detailRow(l10n.client, '${t['clientName']}'),
      _detailRow(l10n.shippingCompany, '${t['shippingCompanyName']}'),
      _detailRowOptional(l10n.shippingCompanyIdOptional, t['shippingCompanyId'], locale),
    ];

    final customsRows = <Widget>[
      _detailRow(l10n.txDeclarationNumber1, '${t['declarationNumber']}'),
      _detailRowOptional(l10n.txDeclarationNumber2, t['declarationNumber2'], locale),
      _detailRowOptional(l10n.txDeclarationDate, t['declarationDate'], locale, dateTime: true),
      if (t['declarationType'] != null && t['declarationType'].toString().isNotEmpty)
        _detailRow(l10n.txDeclarationType1, _declarationTypeLabel('${t['declarationType']}')),
      if (t['declarationType2'] != null && t['declarationType2'].toString().isNotEmpty)
        _detailRow(l10n.txDeclarationType2, _declarationTypeLabel('${t['declarationType2']}')),
      if (t['portType'] != null && t['portType'].toString().isNotEmpty)
        _detailRow(l10n.txPortType, _portTypeLabel('${t['portType']}')),
    ];

    final transferRows = <Widget>[
      _detailRowOptional(l10n.txPortOfLading, t['portOfLading'], locale),
      _detailRowOptional(l10n.txPortOfDischarge, t['portOfDischarge'], locale),
      _detailRowOptional(l10n.txDestination, t['destination'], locale),
    ];

    final shipmentRows = <Widget>[
      _detailRow(l10n.airwayBill, '${t['airwayBill']}'),
      _detailRow(l10n.hsCode, '${t['hsCode']}'),
      _detailRow(l10n.goods, '${t['goodsDescription']}'),
      _detailRow(l10n.origin, '${t['originCountry']}'),
      _detailRow(
        l10n.invoiceValue,
        '${numberFormat.format(t['invoiceValue'] ?? 0)} ${t['invoiceCurrency'] ?? 'AED'}',
      ),
    ];

    final cargoRows = <Widget>[
      _detailRowOptional(l10n.txOrderDate, t['orderDate'], locale, dateTime: true),
      _detailRowOptional(l10n.txContainerSize, t['containerSize'], locale),
      _detailRowOptional(l10n.txContainerCount, t['containerCount'], locale),
      _detailRowOptional(l10n.txGoodsWeightKg, t['goodsWeightKg'], locale),
      _detailRowOptional(l10n.txRateAedPerKg, t['invoiceToWeightRateAedPerKg'], locale),
      _detailRowOptional(l10n.txContainerArrival, t['containerArrivalDate'], locale, dateTime: true),
      _detailRowOptional(l10n.txDocumentArrival, t['documentArrivalDate'], locale, dateTime: true),
      if (t['containerNumbers'] is List && (t['containerNumbers'] as List).isNotEmpty)
        _detailRow(
          l10n.containerNumbers,
          (t['containerNumbers'] as List).map((e) => '$e').join(', '),
        ),
      _detailRowOptional(l10n.txNumberOfUnits, t['unitCount'], locale),
      _detailRowOptional(l10n.txUnitNumber, t['unitNumber'], locale),
    ];

    final transportationRows = <Widget>[
      _detailRowOptional(l10n.txTransportationTo, t['transportationTo'], locale),
      _detailRowOptional(l10n.txTrachNo, t['trachNo'], locale),
      _detailRowOptional(l10n.txTransportationCompany, t['transportationCompany'], locale),
      _detailRowOptional(l10n.txTransportationFrom, t['transportationFrom'], locale),
      _detailRowOptional(l10n.txTransportationToLocation, t['transportationToLocation'], locale),
      _detailRowOptional(l10n.txTripCharge, t['tripCharge'], locale),
      _detailRowOptional(l10n.txWaitingCharge, t['waitingCharge'], locale),
      _detailRowOptional(l10n.txMaccrikCharge, t['maccrikCharge'], locale),
    ];

    final workflowRows = <Widget>[
      _detailRowOptional(l10n.txDocumentPostalNumber, t['documentPostalNumber'], locale),
      _detailRow(l10n.document, _docStatusLabel('${t['documentStatus']}', l10n)),
      _detailRow(l10n.payment, _paymentStatusLabel('${t['paymentStatus']}', l10n)),
      _detailRow(l10n.stopTransaction,
          t['isStopped'] == true ? l10n.optionYes : l10n.optionNo),
      _detailRowOptional(l10n.stopReason, t['stopReason'], locale),
      _detailRowOptional(l10n.txGoodsQty, t['goodsQuantity'], locale),
      if (t['goodsQuality'] != null)
        _detailRow(l10n.txGoodsQuality, _qualityLabel('${t['goodsQuality']}', l10n)),
      if (t['goodsUnit'] != null)
        _detailRow(l10n.txGoodsUnit, _unitLabel('${t['goodsUnit']}', l10n)),
    ];

    final attachmentWidgets = <Widget>[];
    if ((t['documentAttachments'] as List?)?.isNotEmpty ?? false) {
      attachmentWidgets.addAll(
        _groupAttachments(
                (t['documentAttachments'] as List).cast<Map<String, dynamic>>())
            .entries
            .expand(
              (entry) => [
                Padding(
                  padding: const EdgeInsets.only(top: 6, bottom: 2),
                  child: Text(entry.key,
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
                ...entry.value.map(_attachmentTile),
              ],
            ),
      );
    }

    return [
      _detailSection(l10n.txReadOnlyFields, snapshotRows),
      _detailSection(l10n.txPartiesSection, partiesRows),
      if (showCustoms) _detailSection(l10n.txCustomsDeclaration, customsRows),
      if (showTransfer) _detailSection(l10n.txTransferDetailsSection, transferRows),
      _detailSection(l10n.txShipmentCoreSection, shipmentRows),
      _detailSection(l10n.txCargoContainersSection, cargoRows),
      if (showTransportation)
        _detailSection(l10n.txTransportationSection, transportationRows),
      _detailSection(l10n.txWorkflowSection, workflowRows),
      if (attachmentWidgets.isNotEmpty)
        _detailSection(l10n.txAttachmentsSection, attachmentWidgets),
    ];
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
                    PageHeroBanner(
                      icon: Icons.receipt_long_outlined,
                      title: _declarationHeaderTitle(tx!, l10n),
                      subtitle: '${tx!['clientName']}',
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: [
                        StageBadgeChip(
                          stage: '${tx!['transactionStage'] ?? 'PREPARATION'}',
                          label: _stageLabel(
                              '${tx!['transactionStage'] ?? 'PREPARATION'}',
                              l10n),
                        ),
                        Chip(
                          label: Text('${tx!['clearanceStatus']}'),
                          visualDensity: VisualDensity.compact,
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ..._buildDetailSections(l10n, locale, numberFormat),
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
}
