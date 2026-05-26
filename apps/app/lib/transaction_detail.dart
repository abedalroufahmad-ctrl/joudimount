import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart' as intl;
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart'; // Corrected import
import 'package:path/path.dart' as p; // Import for path operations, if needed, otherwise remove

import 'api.dart';
import 'app_theme.dart';
import 'l10n/app_localizations.dart';
import 'transaction_labels.dart';
import 'transaction_form.dart';
import 'transaction_storage_page.dart';
import 'transaction_accounting_page.dart';
import 'transaction_model.dart';

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

  Transaction? tx; // Changed to Transaction?
  String error = '';
  bool loading = true;

  @override
  void initState() {
    super.initState();
    load();
  }

  Map<String, List<Map<String, dynamic>>> _groupAttachments(
      List<dynamic> attachments) {
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
      final data = await Api.get('$_modulePath/${widget.id}') as Map<String, dynamic>;
      tx = Transaction.fromJson(data); // Use Transaction.fromJson
    } catch (e) {
      error = e.toString();
    } finally {
      setState(() => loading = false);
    }
  }

  String _declarationHeaderTitle(
      Transaction t, AppLocalizations l10n) {
    final d1 = t.declarationNumber.trim();
    final d2 = (t.declarationNumber2 ?? '').trim();
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

  String _declarationTypeLabel(String value, AppLocalizations l10n) =>
      declarationTypeLabel(value, l10n);

  String _portTypeLabel(String value, AppLocalizations l10n) =>
      portTypeLabel(value, l10n);

  List<Widget> _buildDetailSections(
    AppLocalizations l10n,
    String locale,
    intl.NumberFormat numberFormat,
  ) {
    final t = tx!;
    final stage = t.transactionStage;
    final showCustoms = stage != 'PREPARATION';
    final showTransportation = stage == 'TRANSPORTATION' &&
        ((t.transportationTo?.trim().isNotEmpty ?? false) ||
            (t.trachNo?.trim().isNotEmpty ?? false) ||
            (t.transportationCompany?.trim().isNotEmpty ?? false) ||
            (t.transportationFrom?.trim().isNotEmpty ?? false) ||
            (t.transportationToLocation?.trim().isNotEmpty ?? false) ||
            t.tripCharge != null ||
            t.waitingCharge != null ||
            t.maccrikCharge != null);
    final showTransfer = (t.portOfLading?.trim().isNotEmpty ?? false) ||
        (t.portOfDischarge?.trim().isNotEmpty ?? false) ||
        (t.destination?.trim().isNotEmpty ?? false);

    final snapshotRows = <Widget>[
      _detailRow(l10n.createdAt, _formatDateTime(t.createdAt.toIso8601String(), locale)),
      _detailRow(l10n.txDeclarationNumber1, t.declarationNumber),
      _detailRowOptional(l10n.txDeclarationNumber2, t.declarationNumber2, locale),
      _detailRowOptional(l10n.txFileNumber, t.fileNumber, locale),
      _detailRow(l10n.status, t.clearanceStatus),
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
      if (widget.role == 'manager' || widget.role == 'accountant')
        Padding(
          padding: const EdgeInsets.only(top: 4),
          child: FilledButton.tonal(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => TransactionAccountingPage(
                    role: widget.role,
                    transactionId: widget.id,
                    module: widget.module,
                  ),
                ),
              );
            },
            child: Text(l10n.accountingLinkFromDetails),
          ),
        ),
      _detailRowOptional(l10n.releaseCode, t.releaseCode, locale),
    ];

    final partiesRows = <Widget>[
      _detailRow(l10n.client, t.clientName),
      _detailRow(l10n.shippingCompany, t.shippingCompanyName),
      _detailRowOptional(l10n.shippingCompanyIdOptional, t.shippingCompanyId, locale),
    ];

    final customsRows = <Widget>[
      _detailRow(l10n.txDeclarationNumber1, t.declarationNumber),
      _detailRowOptional(l10n.txDeclarationNumber2, t.declarationNumber2, locale),
      _detailRowOptional(l10n.txDeclarationDate, t.declarationDate?.toIso8601String(), locale, dateTime: true),
      if (t.declarationType != null && t.declarationType!.isNotEmpty)
        _detailRow(l10n.txDeclarationType1,
            _declarationTypeLabel(t.declarationType!, l10n)),
      if (t.declarationType2 != null && t.declarationType2!.isNotEmpty)
        _detailRow(l10n.txDeclarationType2,
            _declarationTypeLabel(t.declarationType2!, l10n)),
      if (t.portType != null && t.portType!.isNotEmpty)
        _detailRow(l10n.txPortType, _portTypeLabel(t.portType!, l10n)),
    ];

    final transferRows = <Widget>[
      _detailRowOptional(l10n.txPortOfLading, t.portOfLading, locale),
      _detailRowOptional(l10n.txPortOfDischarge, t.portOfDischarge, locale),
      _detailRowOptional(l10n.txDestination, t.destination, locale),
    ];

    final shipmentRows = <Widget>[
      _detailRow(l10n.airwayBill, t.airwayBill),
      _detailRow(l10n.hsCode, t.hsCode),
      _detailRow(l10n.goods, t.goodsDescription),
      _detailRow(l10n.origin, t.originCountry),
      _detailRow(
        l10n.invoiceValue,
        '${numberFormat.format(t.invoiceValue)} ${t.invoiceCurrency ?? 'AED'}',
      ),
    ];

    final cargoRows = <Widget>[
      _detailRowOptional(l10n.txOrderDate, t.orderDate?.toIso8601String(), locale, dateTime: true),
      _detailRowOptional(l10n.txContainerSize, t.containerSize, locale),
      _detailRowOptional(l10n.txContainerCount, t.containerCount, locale),
      _detailRowOptional(l10n.txGoodsWeightKg, t.goodsWeightKg, locale),
      _detailRowOptional(l10n.txRateAedPerKg, t.invoiceToWeightRateAedPerKg, locale),
      _detailRowOptional(l10n.txContainerArrival, t.containerArrivalDate?.toIso8601String(), locale, dateTime: true),
      _detailRowOptional(l10n.txDocumentArrival, t.documentArrivalDate?.toIso8601String(), locale, dateTime: true),
      if (t.containerNumbers != null && t.containerNumbers!.isNotEmpty)
        _detailRow(
          l10n.containerNumbers,
          (t.containerNumbers!).map((e) => '$e').join(', '),
        ),
      _detailRowOptional(l10n.txNumberOfUnits, t.unitCount, locale),
      _detailRowOptional(l10n.txUnitNumber, t.unitNumber, locale),
    ];

    final transportationRows = <Widget>[
      _detailRowOptional(l10n.txTransportationTo, t.transportationTo, locale),
      _detailRowOptional(l10n.txTrachNo, t.trachNo, locale),
      _detailRowOptional(l10n.txTransportationCompany, t.transportationCompany, locale),
      _detailRowOptional(l10n.txTransportationFrom, t.transportationFrom, locale),
      _detailRowOptional(l10n.txTransportationToLocation, t.transportationToLocation, locale),
      _detailRowOptional(l10n.txTripCharge, t.tripCharge, locale),
      _detailRowOptional(l10n.txWaitingCharge, t.waitingCharge, locale),
      _detailRowOptional(l10n.txMaccrikCharge, t.maccrikCharge, locale),
    ];

    final workflowRows = <Widget>[
      _detailRowOptional(l10n.txDocumentPostalNumber, t.documentPostalNumber, locale),
      _detailRow(l10n.document, _docStatusLabel(t.documentStatus, l10n)),
      _detailRow(l10n.payment, _paymentStatusLabel(t.paymentStatus, l10n)),
      _detailRow(l10n.stopTransaction,
          t.isStopped == true ? l10n.optionYes : l10n.optionNo),
      _detailRowOptional(l10n.stopReason, t.stopReason, locale),
      _detailRowOptional(l10n.txGoodsQty, t.goodsQuantity, locale), // Changed from t.goods?.goodsQuantity
      if (t.goodsQuality != null) // Changed from t.goods?.goodsQuality
        _detailRow(l10n.txGoodsQuality, _qualityLabel(t.goodsQuality!, l10n)), // Changed from t.goods!.goodsQuality!
      if (t.goodsUnit != null) // Changed from t.goods?.goodsUnit
        _detailRow(l10n.txGoodsUnit, _unitLabel(t.goodsUnit!, l10n)), // Changed from t.goods!.goodsUnit!
    ];

    final attachmentWidgets = <Widget>[];
    if (t.documentAttachments?.isNotEmpty ?? false) {
      attachmentWidgets.addAll(
        _groupAttachments(t.documentAttachments!)
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
    final rtlLabels =
        Directionality.of(context) == TextDirection.rtl;
    final pw.Font latinFont = pw.Font.helvetica();
    pw.Font arabicFont;
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

    const cellPadding = pw.EdgeInsets.symmetric(horizontal: 10, vertical: 7);
    final needsLatinGlyphs = RegExp(r'[\x00-\x7F]');

    pw.TextSpan pdfSpan(
      String part,
      pw.Font font, {
      bool bold = false,
      double size = 10,
    }) {
      return pw.TextSpan(
        text: part,
        style: pw.TextStyle(
          font: font,
          fontSize: size,
          fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal,
        ),
      );
    }

    pw.Widget pdfMixedText(
      String text, {
      bool bold = false,
      double size = 10,
      pw.TextDirection direction = pw.TextDirection.rtl,
      pw.TextAlign align = pw.TextAlign.right,
    }) {
      final pw.Alignment alignment;
      switch (align) {
        case pw.TextAlign.center:
          alignment = pw.Alignment.center;
          break;
        case pw.TextAlign.left:
          alignment = pw.Alignment.centerLeft;
          break;
        default:
          alignment = pw.Alignment.centerRight;
      }

      final spans = <pw.TextSpan>[];
      final latinRuns = RegExp(r'[\x00-\x7F]+');
      var index = 0;
      for (final match in latinRuns.allMatches(text)) {
        if (match.start > index) {
          spans.add(pdfSpan(
            text.substring(index, match.start),
            arabicFont,
            bold: bold,
            size: size,
          ));
        }
        spans.add(pdfSpan(
          match.group(0)!,
          latinFont,
          bold: bold,
          size: size,
        ));
        index = match.end;
      }
      if (index < text.length) {
        spans.add(pdfSpan(
          text.substring(index),
          arabicFont,
          bold: bold,
          size: size,
        ));
      }

      return pw.Padding(
        padding: cellPadding,
        child: pw.Directionality(
          textDirection: direction,
          child: pw.Align(
            alignment: alignment,
            child: pw.RichText(
              textAlign: align,
              text: pw.TextSpan(children: spans),
            ),
          ),
        ),
      );
    }

    pw.Widget arabicText(
      String text, {
      bool bold = false,
      double size = 10,
      pw.TextAlign align = pw.TextAlign.right,
    }) {
      final pw.Alignment alignment;
      switch (align) {
        case pw.TextAlign.center:
          alignment = pw.Alignment.center;
          break;
        case pw.TextAlign.left:
          alignment = pw.Alignment.centerLeft;
          break;
        default:
          alignment = pw.Alignment.centerRight;
      }
      return needsLatinGlyphs.hasMatch(text)
          ? pdfMixedText(
              text,
              bold: bold,
              size: size,
              direction: pw.TextDirection.rtl,
              align: align,
            )
          : pw.Padding(
              padding: cellPadding,
              child: pw.Directionality(
                textDirection: pw.TextDirection.rtl,
                child: pw.Align(
                  alignment: alignment,
                  child: pw.Text(
                    text,
                    style: pw.TextStyle(
                      font: arabicFont,
                      fontSize: size,
                      fontWeight:
                          bold ? pw.FontWeight.bold : pw.FontWeight.normal,
                    ),
                    textAlign: align,
                  ),
                ),
              ),
            );
    }

    pw.Widget latinText(
      String text, {
      bool bold = false,
      double size = 10,
      pw.TextAlign align = pw.TextAlign.left,
    }) {
      final pw.Alignment alignment;
      switch (align) {
        case pw.TextAlign.center:
          alignment = pw.Alignment.center;
          break;
        case pw.TextAlign.right:
          alignment = pw.Alignment.centerRight;
          break;
        default:
          alignment = pw.Alignment.centerLeft;
      }
      return pw.Padding(
        padding: cellPadding,
        child: pw.Directionality(
          textDirection: pw.TextDirection.ltr,
          child: pw.Align(
            alignment: alignment,
            child: pw.Text(
              text,
              style: pw.TextStyle(
                font: latinFont,
                fontSize: size,
                fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal,
              ),
              textAlign: align,
            ),
          ),
        ),
      );
    }

    pw.Widget labelCell(String label) =>
        rtlLabels ? arabicText(label, bold: true) : latinText(label, bold: true);

    pw.Widget valueCell(String value) {
      final hasLatin = RegExp(r'[A-Za-z]').hasMatch(value);
      if (hasLatin || !rtlLabels) {
        return latinText(value);
      }
      return arabicText(value, align: pw.TextAlign.right);
    }

    pw.TableRow dataRow(String label, String value) {
      return pw.TableRow(
        children: rtlLabels
            ? [valueCell(value), labelCell(label)]
            : [labelCell(label), valueCell(value)],
      );
    }

    final rows = <pw.TableRow>[
      dataRow('${l10n.toShippingCompany}:', tx!.shippingCompanyName),
      dataRow('${l10n.fromClient}:', tx!.clientName),
      dataRow('${l10n.declaration}:', tx!.declarationNumber),
      if (tx!.declarationNumber2?.trim().isNotEmpty ?? false)
        dataRow('${l10n.txDeclarationNumber2}:', tx!.declarationNumber2!),
      if (tx!.declarationType?.trim().isNotEmpty ?? false)
        dataRow(
          '${l10n.txDeclarationType1}:',
          declarationTypeLabel(tx!.declarationType!, l10n),
        ),
      if (tx!.declarationType2?.trim().isNotEmpty ?? false)
        dataRow(
          '${l10n.txDeclarationType2}:',
          declarationTypeLabel(tx!.declarationType2!, l10n),
        ),
      dataRow('${l10n.airwayBillShort}:', tx!.airwayBill),
      dataRow('${l10n.hsCode}:', tx!.hsCode),
      dataRow('${l10n.origin}:', tx!.originCountry),
      dataRow('${l10n.valueAed}:', tx!.invoiceValue.toString()),
      dataRow(
        '${l10n.releaseCode}:',
        tx!.releaseCode ?? l10n.notIssued,
      ),
      if (tx!.goodsWeightKg != null)
        dataRow('${l10n.weightKg}:', tx!.goodsWeightKg.toString()),
      if (tx!.goodsQuantity != null) // Changed from tx!.goods?.goodsQuantity
        dataRow('${l10n.quantity}:', tx!.goodsQuantity.toString()), // Changed from tx!.goods!.goodsQuantity.toString()
    ];

    final pdf = pw.Document(
      theme: pw.ThemeData.withFont(base: latinFont, bold: latinFont),
    );
    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(36),
        textDirection: pw.TextDirection.ltr,
        theme: pw.ThemeData.withFont(
          base: latinFont,
          bold: latinFont,
        ),
        build: (context) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.stretch,
          children: [
            pw.Container(
              padding:
                  const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 14),
              decoration: pw.BoxDecoration(
                border: pw.Border.all(color: PdfColors.grey700, width: 1),
              ),
              child: pw.Column(
                children: [
                  rtlLabels
                      ? arabicText(
                          l10n.shippingPaperHeading,
                          bold: true,
                          size: 18,
                          align: pw.TextAlign.center,
                        )
                      : latinText(
                          l10n.shippingPaperHeading,
                          bold: true,
                          size: 18,
                          align: pw.TextAlign.center,
                        ),
                  pw.SizedBox(height: 6),
                  rtlLabels
                      ? arabicText(
                          l10n.shippingPaperSub,
                          size: 10,
                          align: pw.TextAlign.center,
                        )
                      : latinText(
                          l10n.shippingPaperSub,
                          size: 10,
                          align: pw.TextAlign.center,
                        ),
                ],
              ),
            ),
            pw.SizedBox(height: 14),
            pw.Table(
              border: pw.TableBorder.all(color: PdfColors.grey600, width: 0.6),
              columnWidths: rtlLabels
                  ? {
                      0: const pw.FlexColumnWidth(),
                      1: const pw.FixedColumnWidth(190),
                    }
                  : {
                      0: const pw.FixedColumnWidth(190),
                      1: const pw.FlexColumnWidth(),
                    },
              defaultVerticalAlignment: pw.TableCellVerticalAlignment.middle,
              children: rows,
            ),
            pw.SizedBox(height: 12),
            pw.Container(
              width: double.infinity,
              padding: const pw.EdgeInsets.fromLTRB(10, 8, 10, 8),
              decoration: pw.BoxDecoration(
                border: pw.Border.all(color: PdfColors.grey600, width: 0.6),
              ),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.stretch,
                children: [
                  labelCell('${l10n.goods}:'),
                  valueCell(tx!.goodsDescription),
                ],
              ),
            ),
          ],
        ),
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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final cs = Theme.of(context).colorScheme;
    final locale = Localizations.localeOf(context).toLanguageTag();
    final numberFormat = intl.NumberFormat.decimalPattern(locale);
    final stage = tx?.transactionStage ?? 'PREPARATION';
    final canWorkRecord = tx != null && roleCanWorkAtStage(widget.role, stage);
    final canEdit =
        widget.role == 'manager' || (widget.role != 'accountant' && canWorkRecord);
    final canDelete = widget.role == 'manager' || widget.role == 'employee';
    final canAccounting =
        widget.role == 'manager' || widget.role == 'accountant';
    final paid = tx?.paymentStatus == 'paid';
    final doc = tx?.documentStatus ?? '';
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
          if (tx != null && canEdit && canDelete)
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
                      subtitle: tx!.clientName,
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: [
                        StageBadgeChip(
                          stage: tx!.transactionStage,
                          label: _stageLabel(
                              tx!.transactionStage,
                              l10n),
                        ),
                        Chip(
                          label: Text(tx!.clearanceStatus),
                          visualDensity: VisualDensity.compact,
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ..._buildDetailSections(l10n, locale, numberFormat),
                    const SizedBox(height: 12),
                    if (widget.module == 'transactions' &&
                        (widget.role == 'manager' ||
                            (widget.role == 'employee' &&
                                roleCanWorkAtStage(widget.role, stage))))
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
      final ext = p.extension(name).toLowerCase(); // Use path.extension
      final mime = ext == '.pdf' ? 'application/pdf' : null;

      await Share.shareXFiles( // Changed to Share.shareXFiles
        [XFile.fromData(bytes, name: name, mimeType: mime)],
        subject: name,
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
