import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api.dart';
import 'app_lang.dart';
import 'app_theme.dart';
import 'client_detail.dart';
import 'employees.dart';
import 'home_dashboard.dart';
import 'l10n/app_localizations.dart';
import 'location_map_picker.dart';
import 'notifications.dart';
import 'profile.dart';
import 'shipping_detail.dart';
import 'transactions_list.dart';

void main() {
  runApp(const TrackerMobileApp());
}

class TrackerMobileApp extends StatefulWidget {
  const TrackerMobileApp({super.key});

  @override
  State<TrackerMobileApp> createState() => _TrackerMobileAppState();
}

class _TrackerMobileAppState extends State<TrackerMobileApp> {
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    Lang.load().then((_) {
      if (mounted) setState(() => _ready = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) {
      return const MaterialApp(
          home: Scaffold(body: Center(child: CircularProgressIndicator())));
    }
    return ValueListenableBuilder<String>(
      valueListenable: Lang.locale,
      builder: (context, value, _) {
        final isArabic = value.toLowerCase().startsWith('ar');
        return MaterialApp(
          title: 'Transaction Tracker Mobile',
          debugShowCheckedModeBanner: false,
          theme: buildAppTheme(isArabic: isArabic),
          locale: Locale(value),
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: const AuthGate(),
        );
      },
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  bool _loading = true;
  Map<String, dynamic>? _user;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final prefs = await SharedPreferences.getInstance();
    final rememberMe = prefs.getBool('remember_me') ?? true;
    if (rememberMe) {
      final userRaw = prefs.getString('user');
      if (userRaw != null) {
        _user = jsonDecode(userRaw) as Map<String, dynamic>;
      }
    } else {
      await prefs.remove('token');
      await prefs.remove('user');
    }
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    Widget child;
    if (_loading) {
      child = const Scaffold(
          key: ValueKey('loading'),
          body: Center(child: CircularProgressIndicator()));
    } else if (_user == null) {
      child = LoginPage(
          key: const ValueKey('login'),
          onLogin: (user) => setState(() => _user = user));
    } else {
      child = HomePage(
        key: const ValueKey('home'),
        user: _user!,
        onLogout: () => setState(() => _user = null),
      );
    }
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 300),
      child: child,
    );
  }
}

class LoginPage extends StatefulWidget {
  final ValueChanged<Map<String, dynamic>> onLogin;
  const LoginPage({super.key, required this.onLogin});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _loading = false;
  bool _rememberMe = true;
  String _error = '';

  @override
  void initState() {
    super.initState();
    _loadRememberMe();
  }

  Future<void> _loadRememberMe() async {
    final prefs = await SharedPreferences.getInstance();
    final remember = prefs.getBool('remember_me') ?? true;
    final savedEmail = prefs.getString('remembered_email') ?? '';
    if (!mounted) return;
    setState(() {
      _rememberMe = remember;
      if (savedEmail.isNotEmpty) {
        _emailCtrl.text = savedEmail;
      } else {
        _emailCtrl.text = 'manager@tracker.local';
      }
      if (_passCtrl.text.isEmpty) {
        _passCtrl.text = '123456';
      }
    });
  }

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final data = await Api.post('/api/auth/login', {
        'email': _emailCtrl.text.trim(),
        'password': _passCtrl.text,
      }) as Map<String, dynamic>;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', data['token'] as String);
      await prefs.setString('user', jsonEncode(data['user']));
      await prefs.setBool('remember_me', _rememberMe);
      if (_rememberMe) {
        await prefs.setString('remembered_email', _emailCtrl.text.trim());
      } else {
        await prefs.remove('remembered_email');
      }
      widget.onLogin(data['user'] as Map<String, dynamic>);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFE8F0FA), AppColors.surface],
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
              Positioned(
                top: 8,
                right: 8,
                child: PopupMenuButton<String>(
                  tooltip: l10n.language,
                  icon: const Icon(Icons.language, color: AppColors.brand800),
                  onSelected: Lang.setLocale,
                  itemBuilder: (_) => [
                    PopupMenuItem(value: 'ar', child: Text(l10n.languageAr)),
                    PopupMenuItem(value: 'en', child: Text(l10n.languageEn)),
                  ],
                ),
              ),
              Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    shrinkWrap: true,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 20, vertical: 22),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          gradient: AppGradients.hero,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.brand800.withValues(alpha: 0.25),
                              blurRadius: 16,
                              offset: const Offset(0, 6),
                            ),
                          ],
                        ),
                        child: Column(
                          children: [
                            Image.asset(
                              'assets/images/logo.png',
                              height: 64,
                              fit: BoxFit.contain,
                            ),
                            const SizedBox(height: 10),
                            Text(
                              l10n.loginBannerTitle,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      Card(
                        elevation: 2,
                        shadowColor: AppColors.brand800.withValues(alpha: 0.08),
                        child: Padding(
                          padding: const EdgeInsets.all(18),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text(
                                l10n.login,
                                style: Theme.of(context)
                                    .textTheme
                                    .headlineSmall
                                    ?.copyWith(fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 16),
                              TextField(
                                controller: _emailCtrl,
                                keyboardType: TextInputType.emailAddress,
                                decoration: InputDecoration(
                                  labelText: l10n.email,
                                  prefixIcon: const Icon(Icons.email_outlined),
                                ),
                              ),
                              const SizedBox(height: 12),
                              TextField(
                                controller: _passCtrl,
                                decoration: InputDecoration(
                                  labelText: l10n.password,
                                  prefixIcon: const Icon(Icons.lock_outline),
                                ),
                                obscureText: true,
                              ),
                              CheckboxListTile(
                                contentPadding: EdgeInsets.zero,
                                dense: true,
                                controlAffinity: ListTileControlAffinity.leading,
                                value: _rememberMe,
                                onChanged: _loading
                                    ? null
                                    : (v) =>
                                        setState(() => _rememberMe = v ?? true),
                                title: Text(l10n.rememberMe),
                              ),
                              if (_error.isNotEmpty) ...[
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: Colors.red.shade50,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: Colors.red.shade200),
                                  ),
                                  child: Text(
                                    _error,
                                    style: TextStyle(color: Colors.red.shade800),
                                  ),
                                ),
                              ],
                              const SizedBox(height: 12),
                              FilledButton(
                                onPressed: _loading ? null : _submit,
                                child: Padding(
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 2),
                                  child: Text(
                                      _loading ? l10n.signingIn : l10n.login),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class HomePage extends StatefulWidget {
  final Map<String, dynamic> user;
  final VoidCallback onLogout;
  const HomePage({super.key, required this.user, required this.onLogout});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _index = 0;
  late Map<String, dynamic> _user;

  @override
  void initState() {
    super.initState();
    _user = Map<String, dynamic>.from(widget.user);
    NotificationService.instance.start();
  }

  void _onUserUpdated(Map<String, dynamic> user) {
    setState(() => _user = user);
  }

  Future<void> _logout() async {
    try {
      await Api.post('/api/auth/logout', {});
    } catch (_) {}
    await NotificationService.instance.stop();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('user');
    widget.onLogout();
  }

  String _appBarTitle(AppLocalizations l10n) {
    switch (_index) {
      case 1:
        return l10n.transactions;
      case 2:
        return l10n.transfers;
      case 3:
        return l10n.exports;
      case 4:
        return l10n.clients;
      case 5:
        return l10n.shipping;
      case 6:
        return l10n.employees;
      case 7:
        return l10n.profile;
      default:
        return l10n.tracker;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final role = _user['role'] as String? ?? 'employee';
    final pages = [
      DashboardHome(
        user: _user,
        role: role,
        onSwitchTab: (i) => setState(() => _index = i),
        onOpenProfile: () => setState(() => _index = 7),
      ),
      TransactionsTab(role: role, module: 'transactions'),
      TransactionsTab(role: role, module: 'transfers'),
      TransactionsTab(role: role, module: 'exports'),
      ClientsTab(role: role),
      ShippingTab(role: role),
      EmployeesTab(role: role),
      ProfileTab(
        user: _user,
        onLogout: _logout,
        onUserUpdated: _onUserUpdated,
      ),
    ];

    final userName = (_user['name'] ?? '').toString().trim();

    return Scaffold(
      appBar: _index == 0
          ? null
          : AppBar(
              title: Text(_appBarTitle(l10n)),
              actions: [
                if (userName.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: Center(
                      child: Text(
                        userName,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: Lang.locale.value,
                      items: [
                        DropdownMenuItem(
                            value: 'ar', child: Text(l10n.languageAr)),
                        DropdownMenuItem(
                            value: 'en', child: Text(l10n.languageEn)),
                      ],
                      onChanged: (v) {
                        if (v != null) Lang.setLocale(v);
                      },
                    ),
                  ),
                ),
              ],
            ),
      body: FadeIndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysHide,
        onDestinationSelected: (v) => setState(() => _index = v),
        destinations: [
          NavigationDestination(
              icon: const Icon(Icons.dashboard_outlined),
              label: l10n.dashboardTab),
          NavigationDestination(
              icon: const Icon(Icons.receipt_long_outlined),
              label: l10n.transactions),
          NavigationDestination(
              icon: const Icon(Icons.swap_horiz_outlined),
              label: l10n.transfers),
          NavigationDestination(
              icon: const Icon(Icons.outbox_outlined),
              label: l10n.exports),
          NavigationDestination(
              icon: const Icon(Icons.groups_outlined),
              label: l10n.clients),
          NavigationDestination(
              icon: const Icon(Icons.local_shipping_outlined),
              label: l10n.shipping),
          NavigationDestination(
              icon: const Icon(Icons.badge_outlined),
              label: l10n.employees),
          NavigationDestination(
              icon: const Icon(Icons.person_outline),
              label: l10n.profile),
        ],
      ),
    );
  }
}

class ClientsTab extends StatefulWidget {
  final String role;
  const ClientsTab({super.key, required this.role});

  @override
  State<ClientsTab> createState() => _ClientsTabState();
}

class _ClientsTabState extends State<ClientsTab> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  String _error = '';

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
      final data = await Api.get('/api/clients') as List<dynamic>;
      _items = data.cast<Map<String, dynamic>>();
    } catch (e) {
      _error = e.toString();
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _createClient() async {
    final created = await Navigator.of(context)
        .push<bool>(MaterialPageRoute(builder: (_) => const ClientFormPage()));
    if (created == true) _load();
  }

  Future<void> _editClient(Map<String, dynamic> client) async {
    final updated = await Navigator.of(context).push<bool>(
        MaterialPageRoute(builder: (_) => ClientFormPage(existing: client)));
    if (updated == true) _load();
  }

  Future<void> _deleteClient(String id) async {
    final l10n = AppLocalizations.of(context)!;
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        content: Text(l10n.confirmDelete),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(l10n.cancel)),
          FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(l10n.delete)),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await Api.delete('/api/clients/$id');
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  String _clientListSubtitle(Map<String, dynamic> c, AppLocalizations l10n) {
    String dash(dynamic v) {
      final s = (v ?? '').toString().trim();
      return s.isEmpty ? '—' : s;
    }

    final idPart = dash(c['immigrationCode']);
    final emailPart = dash(c['email']);
    final countryPart = dash(c['country']);
    return '${l10n.phone}: ${c['trn']} • ${l10n.immigrationCode}: $idPart • ${l10n.clientEmail}: $emailPart • ${l10n.country}: $countryPart • ${l10n.status}: ${c['status']}';
  }

  String _entityId(Map<String, dynamic> item) {
    return (item['id'] ?? item['_id'] ?? '').toString();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isManager = widget.role == 'manager';
    final cs = Theme.of(context).colorScheme;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              PageHeroBanner(
                icon: Icons.groups_outlined,
                title: l10n.clients,
              ),
              const SizedBox(height: 10),
              if (isManager)
                FilledButton.icon(
                    onPressed: _createClient,
                    icon: const Icon(Icons.add),
                    label: Text(l10n.addClient)),
              if (!isManager)
                Text(l10n.managerOnlyClients,
                    style: const TextStyle(color: Colors.grey)),
            ],
          ),
        ),
        Expanded(
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
                    : _items.isEmpty
                        ? ListView(
                            key: const ValueKey('empty'),
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            children: [
                              Card(
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Text(
                                    l10n.noMatch,
                                    style: TextStyle(color: Colors.grey.shade700),
                                  ),
                                ),
                              )
                            ],
                          )
                        : ListView.builder(
                            key: const ValueKey('list'),
                            padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                            itemCount: _items.length,
                            itemBuilder: (context, index) {
                              final c = _items[index];
                              return Card(
                                child: ListTile(
                                  onTap: () {
                                    Navigator.of(context).push<void>(
                                      MaterialPageRoute(
                                          builder: (_) => ClientDetailPage(
                                              id: _entityId(c))),
                                    );
                                  },
                                  title: Text('${c['companyName']}'),
                                  subtitle:
                                      Text(_clientListSubtitle(c, l10n)),
                                  trailing: isManager
                                      ? PopupMenuButton<String>(
                                          onSelected: (value) {
                                            if (value == 'edit') {
                                              _editClient(c);
                                            } else if (value == 'delete') {
                                              _deleteClient(_entityId(c));
                                            }
                                          },
                                          itemBuilder: (_) => [
                                            PopupMenuItem(
                                                value: 'edit',
                                                child: Text(l10n.edit)),
                                            PopupMenuItem(
                                                value: 'delete',
                                                child: Text(l10n.delete)),
                                          ],
                                        )
                                      : null,
                                ),
                              );
                            },
                          ),
          ),
        ),
      ],
    );
  }
}

class ClientFormPage extends StatefulWidget {
  final Map<String, dynamic>? existing;
  const ClientFormPage({super.key, this.existing});

  @override
  State<ClientFormPage> createState() => _ClientFormPageState();
}

class _ClientFormPageState extends State<ClientFormPage> {
  late final TextEditingController _name;
  late final TextEditingController _trn;
  late final TextEditingController _imm;
  late final TextEditingController _email;
  late final TextEditingController _country;
  late final TextEditingController _credit;
  String _status = 'active';
  bool _saving = false;
  String _error = '';

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _name = TextEditingController(text: (e?['companyName'] ?? '').toString());
    _trn = TextEditingController(text: (e?['trn'] ?? '').toString());
    _imm =
        TextEditingController(text: (e?['immigrationCode'] ?? '').toString());
    _email = TextEditingController(text: (e?['email'] ?? '').toString());
    _country = TextEditingController(text: (e?['country'] ?? '').toString());
    _credit = TextEditingController(text: (e?['creditLimit'] ?? 0).toString());
    _status = (e?['status'] ?? 'active').toString();
  }

  String get _existingId =>
      (widget.existing?['id'] ?? widget.existing?['_id'] ?? '').toString();

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = '';
    });
    try {
      final body = {
        'companyName': _name.text.trim(),
        'trn': _trn.text.trim(),
        'immigrationCode': _imm.text.trim(),
        'email': _email.text.trim(),
        'country': _country.text.trim(),
        'creditLimit': double.tryParse(_credit.text.trim()) ?? 0,
        'status': _status,
      };
      final id = _existingId;
      if (id.isNotEmpty) {
        await Api.put('/api/clients/$id', body);
      } else {
        await Api.post('/api/clients', body);
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isEdit = widget.existing != null;
    return Scaffold(
      appBar: AppBar(title: Text(isEdit ? l10n.edit : l10n.addClient)),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: TextField(
                  controller: _name,
                  decoration: InputDecoration(labelText: l10n.companyName))),
          Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: TextField(
                controller: _trn,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(labelText: l10n.trn),
              )),
          Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: TextField(
                  controller: _imm,
                  decoration:
                      InputDecoration(labelText: l10n.immigrationCode))),
          Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(labelText: l10n.clientEmail),
              )),
          Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: TextField(
                  controller: _country,
                  decoration: InputDecoration(labelText: l10n.country))),
          Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: TextField(
                  controller: _credit,
                  decoration: InputDecoration(labelText: l10n.creditLimit))),
          Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: DropdownButtonFormField<String>(
                key: ValueKey('client-status-$_status'),
                decoration: InputDecoration(labelText: l10n.clientStatus),
                initialValue: _status,
                items: [
                  DropdownMenuItem(
                      value: 'active', child: Text(l10n.statusActive)),
                  DropdownMenuItem(
                      value: 'suspended', child: Text(l10n.statusSuspended)),
                ],
                onChanged: (v) => setState(() => _status = v ?? 'active'),
              )),
          if (_error.isNotEmpty)
            Text(_error, style: const TextStyle(color: Colors.red)),
          const SizedBox(height: 8),
          FilledButton(
              onPressed: _saving ? null : _save,
              child: Text(_saving ? l10n.saving : l10n.save)),
        ],
      ),
    );
  }
}

class ShippingTab extends StatefulWidget {
  final String role;
  const ShippingTab({super.key, required this.role});

  @override
  State<ShippingTab> createState() => _ShippingTabState();
}

class _ShippingTabState extends State<ShippingTab> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  String _error = '';

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
      final data = await Api.get('/api/shipping-companies') as List<dynamic>;
      _items = data.cast<Map<String, dynamic>>();
    } catch (e) {
      _error = e.toString();
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _createShipping() async {
    final created = await Navigator.of(context).push<bool>(
        MaterialPageRoute(builder: (_) => const ShippingFormPage()));
    if (created == true) _load();
  }

  Future<void> _editShipping(Map<String, dynamic> shipping) async {
    final updated = await Navigator.of(context).push<bool>(MaterialPageRoute(
        builder: (_) => ShippingFormPage(existing: shipping)));
    if (updated == true) _load();
  }

  Future<void> _deleteShipping(String id) async {
    final l10n = AppLocalizations.of(context)!;
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        content: Text(l10n.confirmDelete),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(l10n.cancel)),
          FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(l10n.delete)),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await Api.delete('/api/shipping-companies/$id');
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  String _entityId(Map<String, dynamic> item) {
    return (item['id'] ?? item['_id'] ?? '').toString();
  }

  String _shippingSubtitle(Map<String, dynamic> s) {
    final email = (s['email'] ?? '').toString().trim();
    final lat = s['latitude'];
    final lng = s['longitude'];
    final loc = (lat != null && lng != null) ? ' • $lat, $lng' : '';
    final em = email.isNotEmpty ? ' • $email' : '';
    return 'Code: ${s['code']} • Status: ${s['status']}$em$loc';
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isManager = widget.role == 'manager';
    final cs = Theme.of(context).colorScheme;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              PageHeroBanner(
                icon: Icons.local_shipping_outlined,
                title: l10n.shipping,
              ),
              const SizedBox(height: 10),
              if (isManager)
                FilledButton.icon(
                    onPressed: _createShipping,
                    icon: const Icon(Icons.add),
                    label: Text(l10n.addShipping)),
              if (!isManager)
                Text(l10n.managerOnlyShipping,
                    style: const TextStyle(color: Colors.grey)),
            ],
          ),
        ),
        Expanded(
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
                    : _items.isEmpty
                        ? ListView(
                            key: const ValueKey('empty'),
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            children: [
                              Card(
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Text(
                                    l10n.noMatch,
                                    style: TextStyle(color: Colors.grey.shade700),
                                  ),
                                ),
                              )
                            ],
                          )
                        : ListView.builder(
                            key: const ValueKey('list'),
                            padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                            itemCount: _items.length,
                            itemBuilder: (context, index) {
                              final s = _items[index];
                              return Card(
                                child: ListTile(
                                  onTap: () {
                                    Navigator.of(context).push<void>(
                                      MaterialPageRoute(
                                          builder: (_) =>
                                              ShippingCompanyDetailPage(
                                                  id: _entityId(s))),
                                    );
                                  },
                                  title: Text('${s['companyName']}'),
                                  subtitle: Text(_shippingSubtitle(s)),
                                  trailing: isManager
                                      ? PopupMenuButton<String>(
                                          onSelected: (value) {
                                            if (value == 'edit') {
                                              _editShipping(s);
                                            } else if (value == 'delete') {
                                              _deleteShipping(_entityId(s));
                                            }
                                          },
                                          itemBuilder: (_) => [
                                            PopupMenuItem(
                                                value: 'edit',
                                                child: Text(l10n.edit)),
                                            PopupMenuItem(
                                                value: 'delete',
                                                child: Text(l10n.delete)),
                                          ],
                                        )
                                      : null,
                                ),
                              );
                            },
                          ),
          ),
        ),
      ],
    );
  }
}

class ShippingFormPage extends StatefulWidget {
  final Map<String, dynamic>? existing;
  const ShippingFormPage({super.key, this.existing});

  @override
  State<ShippingFormPage> createState() => _ShippingFormPageState();
}

class _ShippingFormPageState extends State<ShippingFormPage> {
  late final TextEditingController _name;
  late final TextEditingController _code;
  late final TextEditingController _contact;
  late final TextEditingController _phone;
  late final TextEditingController _email;
  late final TextEditingController _dispatchTemplate;
  double? _latitude;
  double? _longitude;
  String _shipStatus = 'active';
  bool _saving = false;
  String _error = '';

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _name = TextEditingController(text: (e?['companyName'] ?? '').toString());
    _code = TextEditingController(text: (e?['code'] ?? '').toString());
    _contact =
        TextEditingController(text: (e?['contactName'] ?? '').toString());
    _phone = TextEditingController(text: (e?['phone'] ?? '').toString());
    _email = TextEditingController(text: (e?['email'] ?? '').toString());
    _dispatchTemplate = TextEditingController(
        text: (e?['dispatchFormTemplate'] ?? '').toString());
    _latitude = e != null && e['latitude'] != null ? (e['latitude'] as num).toDouble() : null;
    _longitude = e != null && e['longitude'] != null ? (e['longitude'] as num).toDouble() : null;
    _shipStatus = (e?['status'] ?? 'active').toString();
  }

  String get _existingId =>
      (widget.existing?['id'] ?? widget.existing?['_id'] ?? '').toString();

  @override
  void dispose() {
    _name.dispose();
    _code.dispose();
    _contact.dispose();
    _phone.dispose();
    _email.dispose();
    _dispatchTemplate.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context)!;
    setState(() {
      _saving = true;
      _error = '';
    });
    try {
      if ((_latitude == null && _longitude != null) || (_latitude != null && _longitude == null)) {
        setState(() => _error = l10n.shippingLatLngBothOrEmpty);
        return;
      }
      final body = <String, dynamic>{
        'companyName': _name.text.trim(),
        'code': _code.text.trim(),
        'contactName': _contact.text.trim(),
        'phone': _phone.text.trim(),
        'status': _shipStatus,
      };
      final em = _email.text.trim();
      if (em.isNotEmpty) {
        body['email'] = em;
      } else if (_existingId.isNotEmpty) {
        body['email'] = null;
      }
      final tpl = _dispatchTemplate.text.trim();
      if (tpl.isNotEmpty) {
        body['dispatchFormTemplate'] = tpl;
      } else if (_existingId.isNotEmpty) {
        body['dispatchFormTemplate'] = null;
      }
      if (_latitude != null && _longitude != null) {
        body['latitude'] = _latitude;
        body['longitude'] = _longitude;
      } else if (_existingId.isNotEmpty) {
        body['latitude'] = null;
        body['longitude'] = null;
      }
      final id = _existingId;
      if (id.isNotEmpty) {
        await Api.put('/api/shipping-companies/$id', body);
      } else {
        await Api.post('/api/shipping-companies', body);
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isEdit = widget.existing != null;
    return Scaffold(
      appBar: AppBar(title: Text(isEdit ? l10n.edit : l10n.addShipping)),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: TextField(
                  controller: _name,
                  decoration: InputDecoration(labelText: l10n.companyName))),
          Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: TextField(
                  controller: _code,
                  decoration: InputDecoration(labelText: l10n.code))),
          Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: TextField(
                  controller: _contact,
                  decoration: InputDecoration(labelText: l10n.contactName))),
          Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: TextField(
                  controller: _phone,
                  decoration: InputDecoration(labelText: l10n.phone))),
          Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration:
                    InputDecoration(labelText: l10n.shippingEmailOptional),
              )),
          Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: TextField(
                controller: _dispatchTemplate,
                minLines: 3,
                maxLines: 5,
                decoration: InputDecoration(
                    labelText: l10n.shippingDispatchTemplateOptional),
              )),
          Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: LocationMapPicker(
                latitude: _latitude,
                longitude: _longitude,
                onChanged: (lat, lng) => setState(() {
                  _latitude = lat;
                  _longitude = lng;
                }),
              )),
          Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: DropdownButtonFormField<String>(
                key: ValueKey('shipping-status-$_shipStatus'),
                decoration: InputDecoration(labelText: l10n.shippingStatus),
                initialValue: _shipStatus,
                items: [
                  DropdownMenuItem(
                      value: 'active', child: Text(l10n.statusActive)),
                  DropdownMenuItem(
                      value: 'inactive', child: Text(l10n.statusInactive)),
                ],
                onChanged: (v) => setState(() => _shipStatus = v ?? 'active'),
              )),
          if (_error.isNotEmpty)
            Text(_error, style: const TextStyle(color: Colors.red)),
          const SizedBox(height: 8),
          FilledButton(
              onPressed: _saving ? null : _save,
              child: Text(_saving ? l10n.saving : l10n.save)),
        ],
      ),
    );
  }
}

class FadeIndexedStack extends StatefulWidget {
  final int index;
  final List<Widget> children;
  final Duration duration;

  const FadeIndexedStack({
    super.key,
    required this.index,
    required this.children,
    this.duration = const Duration(milliseconds: 250),
  });

  @override
  State<FadeIndexedStack> createState() => _FadeIndexedStackState();
}

class _FadeIndexedStackState extends State<FadeIndexedStack>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.duration);
    _controller.forward();
  }

  @override
  void didUpdateWidget(FadeIndexedStack oldWidget) {
    if (widget.index != oldWidget.index) {
      _controller.forward(from: 0.0);
    }
    super.didUpdateWidget(oldWidget);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _controller,
      child: IndexedStack(
        index: widget.index,
        children: widget.children,
      ),
    );
  }
}
