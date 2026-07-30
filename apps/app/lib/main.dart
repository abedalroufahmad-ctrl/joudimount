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
import 'shipping_detail.dart'; // Ensure this exists if ShippingTab is used.
import 'transactions_list.dart';
import 'user_model.dart'; // Import the new User model

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
          theme: buildAppTheme(isArabic: isArabic, brightness: MediaQuery.of(context).platformBrightness),
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
  User? _user; // Change to User?

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
        _user = User.fromJson(jsonDecode(userRaw) as Map<String, dynamic>); // Use User.fromJson
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
  final ValueChanged<User> onLogin; // Change to User
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
      widget.onLogin(User.fromJson(data['user'] as Map<String, dynamic>)); // Use User.fromJson
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
                              color: AppColors.brand800.withOpacity(0.25),
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
                        shadowColor: AppColors.brand800.withOpacity(0.08),
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
                                  prefixIcon: const Icon(Icons.lock_outlined),
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
  final User user; // Change to User
  final VoidCallback onLogout;
  const HomePage({super.key, required this.user, required this.onLogout});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _index = 0;
  late User _user; // Change to User

  @override
  void initState() {
    super.initState();
    _user = widget.user; // No need for Map.from if it's already a User object
    NotificationService.instance.start();
  }

  void _onUserUpdated(User user) { // Change to User
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

  String _appBarTitle(AppLocalizations l10n, String moduleId) {
    switch (moduleId) {
      case 'transactions':
        return l10n.transactions;
      case 'transfers':
        return l10n.transfers;
      case 'exports':
        return l10n.exports;
      case 'clients':
        return l10n.clients;
      case 'shipping':
        return l10n.shipping;
      case 'employees':
        return l10n.employees;
      case 'profile':
        return l10n.profile;
      default:
        return l10n.tracker;
    }
  }

  List<({String id, Widget page, NavigationDestination dest})> _navEntries(
    AppLocalizations l10n,
    String role,
  ) {
    final entries = <({String id, Widget page, NavigationDestination dest})>[
      (
        id: 'home',
        page: DashboardHome(
          user: _user,
          role: role,
          onOpenModule: (module) {
            final idx = _moduleIndex(role, module);
            if (idx != null) setState(() => _index = idx);
          },
          onOpenProfile: () {
            final idx = _moduleIndex(role, 'profile');
            if (idx != null) setState(() => _index = idx);
          },
        ),
        dest: NavigationDestination(
          icon: const Icon(Icons.dashboard_outlined),
          label: l10n.dashboardTab,
        ),
      ),
      (
        id: 'transactions',
        page: TransactionsTab(role: role, module: 'transactions'),
        dest: NavigationDestination(
          icon: const Icon(Icons.receipt_long_outlined),
          label: l10n.transactions,
        ),
      ),
      (
        id: 'transfers',
        page: TransactionsTab(role: role, module: 'transfers'),
        dest: NavigationDestination(
          icon: const Icon(Icons.swap_horiz_outlined),
          label: l10n.transfers,
        ),
      ),
    ];

    if (role != 'warehouse') {
      entries.addAll([
        (
          id: 'exports',
          page: TransactionsTab(role: role, module: 'exports'),
          dest: NavigationDestination(
            icon: const Icon(Icons.outbox_outlined),
            label: l10n.exports,
          ),
        ),
        (
          id: 'clients',
          page: ClientsTab(role: role),
          dest: NavigationDestination(
            icon: const Icon(Icons.groups_outlined),
            label: l10n.clients,
          ),
        ),
        (
          id: 'shipping',
          page: Center(child: Text(l10n.shipping)),
          dest: NavigationDestination(
            icon: const Icon(Icons.local_shipping_outlined),
            label: l10n.shipping,
          ),
        ),
        (
          id: 'employees',
          page: EmployeesTab(role: role),
          dest: NavigationDestination(
            icon: const Icon(Icons.badge_outlined),
            label: l10n.employees,
          ),
        ),
      ]);
    }

    entries.add((
      id: 'profile',
      page: ProfileTab(
        user: _user,
        onLogout: _logout,
        onUserUpdated: _onUserUpdated,
      ),
      dest: NavigationDestination(
        icon: const Icon(Icons.person_outlined),
        label: l10n.profile,
      ),
    ));
    return entries;
  }

  int? _moduleIndex(String role, String module) {
    final ids = <String>['home', 'transactions', 'transfers'];
    if (role != 'warehouse') {
      ids.addAll(['exports', 'clients', 'shipping', 'employees']);
    }
    ids.add('profile');
    final i = ids.indexOf(module);
    return i >= 0 ? i : null;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final role = _user.role;
    final entries = _navEntries(l10n, role);
    final index = _index.clamp(0, entries.length - 1);
    if (index != _index) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() => _index = index);
      });
    }
    final pages = entries.map((e) => e.page).toList();
    final destinations = entries.map((e) => e.dest).toList();
    final userName = _user.name.trim();

    return Scaffold(
      appBar: index == 0
          ? null
          : AppBar(
              title: Text(_appBarTitle(l10n, entries[index].id)),
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
      body: IndexedStack(index: index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysHide,
        onDestinationSelected: (v) => setState(() => _index = v),
        destinations: destinations,
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
        .push<bool>(MaterialPageRoute(builder: (_) => Container()));
    if (created == true) _load();
  }

  Future<void> _editClient(Map<String, dynamic> client) async {
    final updated = await Navigator.of(context).push<bool>(
        MaterialPageRoute(builder: (_) => Container()));
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
