import 'package:flutter/material.dart';

import 'api.dart';
import 'app_theme.dart';
import 'l10n/app_localizations.dart';
import 'transaction_detail.dart';
import 'transaction_form.dart';
import 'transaction_storage_page.dart';
import 'transaction_accounting_page.dart';
import 'transaction_model.dart'; // Import the Transaction model

class TransactionsTab extends StatefulWidget {
  final String role;
  final String module;
  const TransactionsTab(
      {super.key, required this.role, this.module = 'transactions'});

  @override
  State<TransactionsTab> createState() => _TransactionsTabState();
}

class _TransactionsTabState extends State<TransactionsTab> {
  List<Transaction> _items = []; // Changed to List<Transaction>
  bool _loading = true;
  String _error = '';
  String _query = '';
  String _status = 'all';
  String _stage = 'all';

  String get _modulePath => '/api/${widget.module}';

  String _moduleTitle(AppLocalizations l10n) {
    if (widget.module == 'transfers') return l10n.transfers;
    if (widget.module == 'exports') return l10n.exports;
    return l10n.transactions;
  }

  @override
  void initState() {
    super.initState();
    if (widget.role == 'warehouse') {
      _stage = 'STORAGE';
    }
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final data = await Api.get(_modulePath) as List<dynamic>;
      _items = data
          .map((e) => Transaction.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(); // Cast to Transaction objects
    } catch (e) {
      _error = e.toString();
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final cs = Theme.of(context).colorScheme;
    final statuses = _items
        .map((e) => e.clearanceStatus)
        .where((e) => e.isNotEmpty)
        .toSet()
        .toList();
    final stages = _items
        .map((e) => e.transactionStage)
        .where((e) => e.isNotEmpty)
        .toSet()
        .toList();
    final filtered = _items.where((tx) {
      final q = _query.toLowerCase();
      final matchesQ = q.isEmpty ||
          tx.clientName.toLowerCase().contains(q) ||
          tx.shippingCompanyName.toLowerCase().contains(q) ||
          (tx.declarationNumber).toLowerCase().contains(q) ||
          (tx.declarationNumber2 ?? '').toLowerCase().contains(q) ||
          (tx.airwayBill).toLowerCase().contains(q);
      final matchesS = _status == 'all' || tx.clearanceStatus == _status;
      final stage = tx.transactionStage;
      final effectiveStage = widget.role == 'warehouse' ? 'STORAGE' : _stage;
      final matchesStage = effectiveStage == 'all' || stage == effectiveStage;
      return matchesQ && matchesS && matchesStage;
    }).toList();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              PageHeroBanner(
                icon: widget.module == 'transfers'
                    ? Icons.swap_horiz_outlined
                    : widget.module == 'exports'
                        ? Icons.outbox_outlined
                        : Icons.receipt_long_outlined,
                title: _moduleTitle(l10n),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      decoration: InputDecoration(
                          prefixIcon: const Icon(Icons.search),
                          hintText: l10n.search),
                      onChanged: (v) => setState(() => _query = v),
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (widget.role == 'manager' || widget.role == 'employee')
                    FilledButton.icon(
                      onPressed: () async {
                        final created = await Navigator.of(context).push<bool>(
                          MaterialPageRoute(
                            builder: (_) => TransactionFormPage(
                              role: widget.role,
                              module: widget.module,
                            ),
                          ),
                        );
                        if (created == true) _load();
                      },
                      icon: const Icon(Icons.add),
                      label: Text(l10n.newLabel),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: DropdownButtonFormField<String>(
                          key: ValueKey('tx-list-status-$_status'),
                          isExpanded: true,
                          initialValue: _status,
                          items: ['all', ...statuses]
                              .map((e) => DropdownMenuItem(
                                  value: e,
                                  child: Text(e == 'all' ? l10n.allStatuses : e,
                                      overflow: TextOverflow.ellipsis)))
                              .toList(),
                          onChanged: (v) => setState(() => _status = v ?? 'all'),
                        )),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: DropdownButtonFormField<String>(
                          key: ValueKey('tx-list-stage-$_stage'),
                          isExpanded: true,
                          initialValue: _stage,
                          items: ['all', ...stages].map((e) {
                            String label = e;
                            if (e == 'all') {
                              label = l10n.allStages;
                            } else if (e == 'PREPARATION') {
                              label = l10n.stagePreparation;
                            } else if (e == 'CUSTOMS_CLEARANCE') {
                              label = l10n.stageCustomsClearance;
                            } else if (e == 'STORAGE') {
                              label = l10n.stageStorage;
                            } else if (e == 'TRANSPORTATION') {
                              label = l10n.stageTransportation;
                            }
                            return DropdownMenuItem(
                                value: e,
                                child:
                                    Text(label, overflow: TextOverflow.ellipsis));
                          }).toList(),
                          onChanged: widget.role == 'warehouse'
                              ? null
                              : (v) => setState(() => _stage = v ?? 'all'),
                        )),
                  ),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _load,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              child: _loading
                  ? const Padding(
                      key: ValueKey('loading'),
                      padding: EdgeInsets.all(20),
                      child: Center(child: CircularProgressIndicator()))
                  : _error.isNotEmpty
                      ? ListView(
                          key: const ValueKey('error'),
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          children: [
                            Card(
                              color: cs.errorContainer,
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Text(_error,
                                    style: TextStyle(color: cs.onErrorContainer)),
                              ),
                            )
                          ],
                        )
                      : filtered.isEmpty
                          ? ListView(
                              key: const ValueKey('empty'),
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              children: [
                                EmptyStateCard(message: l10n.noMatch),
                              ],
                            )
                          : ListView.builder(
                              key: const ValueKey('list'),
                              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                              itemCount: filtered.length,
                              itemBuilder: (context, index) {
                                final tx = filtered[index];
                                final stage = tx.transactionStage;
                                String stageLabel = stage;
                                if (stage == 'PREPARATION') {
                                  stageLabel = l10n.stagePreparation;
                                } else if (stage == 'CUSTOMS_CLEARANCE') {
                                  stageLabel = l10n.stageCustomsClearance;
                                } else if (stage == 'STORAGE') {
                                  stageLabel = l10n.stageStorage;
                                } else if (stage == 'TRANSPORTATION') {
                                  stageLabel = l10n.stageTransportation;
                                }
                                final showStorage = stage == 'STORAGE' &&
                                    (widget.module == 'transactions' ||
                                        widget.module == 'transfers');
                                final showAccounting = widget.role == 'manager' ||
                                    widget.role == 'accountant';
                                return Card(
                                  child: ListTile(
                                    title: Text(
                                      tx.clientName,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w600),
                                    ),
                                    subtitle: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const SizedBox(height: 4),
                                        Text(
                                          tx.shippingCompanyName,
                                          style: TextStyle(
                                            fontSize: 13,
                                            color: Colors.grey.shade700,
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        Wrap(
                                          spacing: 6,
                                          runSpacing: 4,
                                          children: [
                                            StageBadgeChip(
                                              stage: stage,
                                              label: stageLabel,
                                            ),
                                            Text(
                                              tx.clearanceStatus,
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: Colors.grey.shade600,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                    isThreeLine: true,
                                    trailing: (showStorage || showAccounting)
                                        ? Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              if (showAccounting)
                                                IconButton(
                                                  icon: const Icon(
                                                      Icons.calculate_outlined),
                                                  tooltip: AppLocalizations.of(
                                                          context)!
                                                      .accountingOpenCard,
                                                  onPressed: () {
                                                    Navigator.of(context).push(
                                                      MaterialPageRoute<void>(
                                                        builder: (_) =>
                                                            TransactionAccountingPage(
                                                          role: widget.role,
                                                          transactionId: tx.id,
                                                          module: widget.module,
                                                        ),
                                                      ),
                                                    );
                                                  },
                                                ),
                                              if (showStorage)
                                                IconButton(
                                                  icon: const Icon(
                                                      Icons.warehouse_outlined),
                                                  tooltip: AppLocalizations.of(
                                                          context)!
                                                      .storageOpenCard,
                                                  onPressed: () {
                                                    Navigator.of(context).push(
                                                      MaterialPageRoute<void>(
                                                        builder: (_) =>
                                                            TransactionStoragePage(
                                                          role: widget.role,
                                                          transactionId: tx.id,
                                                          module: widget.module,
                                                        ),
                                                      ),
                                                    );
                                                  },
                                                ),
                                            ],
                                          )
                                        : null,
                                    onTap: () async {
                                      await Navigator.of(context).push<bool>(
                                        MaterialPageRoute(
                                          builder: (_) => TransactionDetailsPage(
                                            id: tx.id,
                                            role: widget.role,
                                            module: widget.module,
                                          ),
                                        ),
                                      );
                                      _load();
                                    },
                                  ),
                                );
                              },
                            ),
            ),
          ),
        ),
      ],
    );
  }
}