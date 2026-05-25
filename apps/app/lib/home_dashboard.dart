import 'package:flutter/material.dart';

import 'api.dart';
import 'app_lang.dart';
import 'app_theme.dart';
import 'l10n/app_localizations.dart';
import 'notifications.dart';
import 'main.dart'; // To access ClientFormPage and ShippingFormPage
import 'transaction_detail.dart';
import 'transaction_form.dart';

/// Home dashboard layout inspired by modern RTL mobile dashboards (banner, search, grid, recent list).
class DashboardHome extends StatefulWidget {
  final Map<String, dynamic> user;
  final String role;
  final ValueChanged<int> onSwitchTab;
  final VoidCallback onOpenProfile;

  const DashboardHome({
    super.key,
    required this.user,
    required this.role,
    required this.onSwitchTab,
    required this.onOpenProfile,
  });

  @override
  State<DashboardHome> createState() => _DashboardHomeState();
}

class _DashboardHomeState extends State<DashboardHome> {
  final _searchCtrl = TextEditingController();
  List<Map<String, dynamic>> _recent = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadRecent();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadRecent() async {
    setState(() => _loading = true);
    try {
      final data = await Api.get('/api/transactions?limit=8') as List<dynamic>;
      if (mounted) setState(() => _recent = data.cast<Map<String, dynamic>>());
    } catch (_) {
      if (mounted) setState(() => _recent = []);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openNewTransaction() async {
    final ok = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => TransactionFormPage(
          role: widget.role,
          module: 'transactions',
        ),
      ),
    );
    if (ok == true && mounted) _loadRecent();
  }

  Future<void> _openNewTransfer() async {
    final ok = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => TransactionFormPage(
          role: widget.role,
          module: 'transfers',
        ),
      ),
    );
    if (ok == true && mounted) _loadRecent();
  }

  Future<void> _openNewExport() async {
    final ok = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => TransactionFormPage(
          role: widget.role,
          module: 'exports',
        ),
      ),
    );
    if (ok == true && mounted) _loadRecent();
  }

  String _userName() {
    final n = widget.user['name'];
    if (n is String && n.trim().isNotEmpty) return n.trim();
    final e = widget.user['email'];
    if (e is String && e.contains('@')) return e.split('@').first;
    return '—';
  }

  String _avatarLetter() {
    final n = _userName();
    if (n.isEmpty || n == '—') return '?';
    final first = n.runes.first;
    return String.fromCharCode(first).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final canCreateTransaction =
        widget.role == 'manager' || widget.role == 'employee';
    final isRtl = Directionality.of(context) == TextDirection.rtl;
    final welcomePrefix = l10n.dashboardWelcomePrefix;
    final searchHint = l10n.dashboardSearchHint;
    final sectionTitle = l10n.dashboardRecentImports;
    final viewAll = l10n.dashboardViewAll;

    final gridItems = <_GridItem>[
      _GridItem(
        label: canCreateTransaction
            ? l10n.dashboardNewImport
            : l10n.dashboardImport,
        icon: Icons.add_circle_outline,
        color: const Color(0xFFE8B339),
        onTap: canCreateTransaction
            ? _openNewTransaction
            : () => widget.onSwitchTab(1),
      ),
      _GridItem(
        label: l10n.dashboardNewTransfer,
        icon: Icons.swap_horiz_outlined,
        color: const Color(0xFF22C55E),
        onTap: canCreateTransaction
            ? _openNewTransfer
            : () => widget.onSwitchTab(2),
      ),
      _GridItem(
        label: l10n.dashboardNewExport,
        icon: Icons.outbox_outlined,
        color: const Color(0xFF0EA5E9),
        onTap:
            canCreateTransaction ? _openNewExport : () => widget.onSwitchTab(3),
      ),
      _GridItem(
        label: l10n.clients,
        icon: Icons.groups_outlined,
        color: const Color(0xFF3B82F6),
        onTap: () => widget.onSwitchTab(4),
      ),
      _GridItem(
        label: l10n.shipping,
        icon: Icons.local_shipping_outlined,
        color: const Color(0xFF8B5CF6),
        onTap: () => widget.onSwitchTab(5),
      ),
      _GridItem(
        label: l10n.dashboardImport,
        icon: Icons.receipt_long_outlined,
        color: const Color(0xFFF97316),
        onTap: () => widget.onSwitchTab(1),
      ),
      _GridItem(
        label: l10n.dashboardTrackImportRecords,
        icon: Icons.track_changes_outlined,
        color: const Color(0xFF14B8A6),
        onTap: () => widget.onSwitchTab(1),
      ),
      _GridItem(
        label: l10n.dashboardAddClient,
        icon: Icons.person_add_alt_1_outlined,
        color: const Color(0xFFEC4899),
        onTap: () async {
          if (widget.role != 'manager') {
            widget.onSwitchTab(4);
            return;
          }
          final ok = await Navigator.of(context).push<bool>(
            MaterialPageRoute(builder: (_) => const ClientFormPage()),
          );
          if (ok == true) {
            widget.onSwitchTab(4);
          }
        },
      ),
      _GridItem(
        label: l10n.dashboardShippingCo,
        icon: Icons.add_business_outlined,
        color: const Color(0xFF64748B),
        onTap: () async {
          if (widget.role != 'manager') {
            widget.onSwitchTab(5);
            return;
          }
          final ok = await Navigator.of(context).push<bool>(
            MaterialPageRoute(builder: (_) => const ShippingFormPage()),
          );
          if (ok == true) {
            widget.onSwitchTab(5);
          }
        },
      ),
      _GridItem(
        label: l10n.dashboardHelpSupport,
        icon: Icons.support_agent_outlined,
        color: const Color(0xFFFB923C),
        onTap: () => widget.onSwitchTab(7),
      ),
    ];

    return RefreshIndicator(
      onRefresh: _loadRecent,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        l10n.tracker,
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1e3a8a),
                        ),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          PopupMenuButton<String>(
                            tooltip: l10n.language,
                            icon: const Icon(Icons.language,
                                color: Color(0xFF1e3a8a)),
                            onSelected: Lang.setLocale,
                            itemBuilder: (_) => [
                              PopupMenuItem(
                                  value: 'ar', child: Text(l10n.languageAr)),
                              PopupMenuItem(
                                  value: 'en', child: Text(l10n.languageEn)),
                            ],
                          ),
                          IconButton(
                            tooltip: l10n.profile,
                            icon: const Icon(Icons.person_outline,
                                color: Color(0xFF1e3a8a)),
                            onPressed: widget.onOpenProfile,
                          ),
                          IconButton(
                            icon: const Icon(Icons.local_offer_outlined,
                                color: Color(0xFF1e3a8a)),
                            onPressed: () => widget.onSwitchTab(1),
                          ),
                          IconButton(
                            icon: const Icon(Icons.chat_bubble_outline,
                                color: Color(0xFF1e3a8a)),
                            onPressed: () =>
                                ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                  content: Text(l10n.dashboardMessagesSoon)),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _WelcomeBanner(
                    rtl: isRtl,
                    welcomeText: '$welcomePrefix${_userName()}!',
                    avatarLetter: _avatarLetter(),
                    onBell: () => showNotificationsSheet(
                      context,
                      role: widget.role,
                      onSwitchTab: widget.onSwitchTab,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _searchCtrl,
                          onSubmitted: (_) => widget.onSwitchTab(1),
                          decoration: InputDecoration(
                            filled: true,
                            fillColor: Colors.white,
                            hintText: searchHint,
                            prefixIcon: const Icon(Icons.search,
                                color: Color(0xFF64748B)),
                            suffixIcon: IconButton(
                              icon: const Icon(Icons.tune,
                                  size: 22, color: Color(0xFF94a3b8)),
                              onPressed: () => widget.onSwitchTab(1),
                            ),
                            contentPadding:
                                const EdgeInsets.symmetric(vertical: 12),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(28),
                              borderSide:
                                  BorderSide(color: Colors.grey.shade300),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(28),
                              borderSide:
                                  BorderSide(color: Colors.grey.shade300),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Material(
                        color: const Color(0xFF1e3a8a),
                        borderRadius: BorderRadius.circular(12),
                        child: InkWell(
                          onTap: () => widget.onSwitchTab(1),
                          borderRadius: BorderRadius.circular(12),
                          child: const SizedBox(
                            width: 48,
                            height: 48,
                            child: Icon(Icons.bookmark_outline,
                                color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 4,
                        mainAxisSpacing: 14,
                        crossAxisSpacing: 10,
                        childAspectRatio: 0.72,
                      ),
                      itemCount: gridItems.length,
                      itemBuilder: (context, i) {
                        final item = gridItems[i];
                        return _StaggeredAnim(
                          index: i,
                          child: InkWell(
                            onTap: item.onTap,
                            borderRadius: BorderRadius.circular(12),
                            child: Column(
                              children: [
                                Container(
                                  width: 52,
                                  height: 52,
                                  decoration: BoxDecoration(
                                    color: item.color.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                  child: Icon(item.icon,
                                      color: item.color, size: 26),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  item.label,
                                  textAlign: TextAlign.center,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                      fontSize: 11,
                                      height: 1.15,
                                      fontWeight: FontWeight.w500),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        sectionTitle,
                        style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0f172a)),
                      ),
                      TextButton.icon(
                        onPressed: () => widget.onSwitchTab(1),
                        icon: Icon(
                            isRtl ? Icons.chevron_left : Icons.chevron_right,
                            size: 18),
                        label: Text(viewAll),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                ],
              ),
            ),
          ),
          if (_loading)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                  child: Padding(
                      padding: EdgeInsets.all(24),
                      child: CircularProgressIndicator())),
            )
          else if (_recent.isEmpty)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                child: EmptyStateCard(
                  icon: Icons.receipt_long_outlined,
                  message: l10n.dashboardNoImportRecordsYet,
                ),
              ),
            )
          else
            SliverToBoxAdapter(
              child: SizedBox(
                height: 132,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _recent.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (context, i) {
                    final tx = _recent[i];
                    final id = '${tx['id'] ?? tx['_id'] ?? ''}';
                    final d1 =
                        (tx['declarationNumber'] ?? '').toString().trim();
                    final d2 =
                        (tx['declarationNumber2'] ?? '').toString().trim();
                    final dec = d1.isEmpty && d2.isEmpty
                        ? '—'
                        : d2.isEmpty
                            ? d1
                            : d1.isEmpty
                                ? d2
                                : '$d1 · $d2';
                    final client = (tx['clientName'] ?? '').toString();
                    return _StaggeredAnim(
                      index: i,
                      child: SizedBox(
                        width: 160,
                        child: Card(
                          elevation: 1,
                          shadowColor:
                              AppColors.brand800.withValues(alpha: 0.08),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(16),
                            onTap: id.isEmpty
                                ? null
                                : () {
                                    Navigator.of(context).push<void>(
                                      MaterialPageRoute(
                                          builder: (_) =>
                                              TransactionDetailsPage(
                                                  id: id, role: widget.role)),
                                    );
                                  },
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    dec,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 14),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    client,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey.shade700),
                                  ),
                                  const Spacer(),
                                  Text(
                                    (tx['clearanceStatus'] ?? '').toString(),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                        fontSize: 11,
                                        color: AppColors.brand700,
                                        fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),
    );
  }
}

class _GridItem {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  _GridItem(
      {required this.label,
      required this.icon,
      required this.color,
      required this.onTap});
}

class _WelcomeBanner extends StatelessWidget {
  final bool rtl;
  final String welcomeText;
  final String avatarLetter;
  final VoidCallback onBell;

  const _WelcomeBanner({
    required this.rtl,
    required this.welcomeText,
    required this.avatarLetter,
    required this.onBell,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: AppGradients.hero,
        boxShadow: [
          BoxShadow(
            color: AppColors.brand800.withValues(alpha: 0.35),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Material(
            color: Colors.white.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(10),
            child: InkWell(
              onTap: onBell,
              borderRadius: BorderRadius.circular(10),
              child: SizedBox(
                width: 44,
                height: 44,
                child: ValueListenableBuilder<int>(
                  valueListenable: NotificationService.instance.unreadCount,
                  builder: (_, count, __) {
                    return Stack(
                      alignment: Alignment.center,
                      children: [
                        const Icon(Icons.notifications_none_rounded, color: Colors.white),
                        if (count > 0)
                          Positioned(
                            top: 6,
                            right: 6,
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: const BoxDecoration(
                                color: Colors.red,
                                shape: BoxShape.circle,
                              ),
                              constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                              child: Text(
                                count > 99 ? '99+' : '$count',
                                style: const TextStyle(color: Colors.white, fontSize: 9),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ),
                      ],
                    );
                  },
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              welcomeText,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w600),
              textAlign: rtl ? TextAlign.right : TextAlign.left,
            ),
          ),
          const SizedBox(width: 12),
          CircleAvatar(
            radius: 26,
            backgroundColor: Colors.white.withValues(alpha: 0.25),
            child: Text(
              avatarLetter,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }
}

class _StaggeredAnim extends StatefulWidget {
  final Widget child;
  final int index;
  const _StaggeredAnim({required this.child, required this.index});
  @override
  State<_StaggeredAnim> createState() => _StaggeredAnimState();
}

class _StaggeredAnimState extends State<_StaggeredAnim>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 350));
    _anim = CurvedAnimation(parent: _ctrl, curve: Curves.easeOut);
    Future.delayed(Duration(milliseconds: 40 * widget.index), () {
      if (mounted) _ctrl.forward();
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(0, 20 * (1 - _anim.value)),
          child: Opacity(
            opacity: _anim.value,
            child: child,
          ),
        );
      },
      child: widget.child,
    );
  }
}
