import 'dart:async';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api.dart';
import 'app_theme.dart';
import 'client_detail.dart';
import 'l10n/app_localizations.dart';
import 'shipping_detail.dart';
import 'transaction_detail.dart';

class AppNotification {
  final String id;
  final String actorName;
  final String action;
  final String entityType;
  final String? entityId;
  final String title;
  final String message;
  final bool read;
  final String createdAt;

  AppNotification({
    required this.id,
    required this.actorName,
    required this.action,
    required this.entityType,
    this.entityId,
    required this.title,
    required this.message,
    required this.read,
    required this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: '${json['id']}',
      actorName: '${json['actorName'] ?? ''}',
      action: '${json['action'] ?? ''}',
      entityType: '${json['entityType'] ?? ''}',
      entityId: json['entityId']?.toString(),
      title: '${json['title'] ?? ''}',
      message: '${json['message'] ?? ''}',
      read: json['read'] == true,
      createdAt: '${json['createdAt'] ?? ''}',
    );
  }

  String? get transactionModule {
    switch (entityType) {
      case 'transfer':
        return 'transfers';
      case 'export':
        return 'exports';
      case 'transaction':
        return 'transactions';
      default:
        return null;
    }
  }
}

class NotificationService {
  NotificationService._();
  static final NotificationService instance = NotificationService._();

  final ValueNotifier<int> unreadCount = ValueNotifier(0);
  final ValueNotifier<List<AppNotification>> items = ValueNotifier([]);
  Timer? _pollTimer;
  bool _initialized = false;

  Future<void> start() async {
    if (_initialized) return;
    _initialized = true;
    await refresh();
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 30), (_) => refresh());
    await _tryRegisterFcm();
  }

  Future<void> stop() async {
    _pollTimer?.cancel();
    _pollTimer = null;
    _initialized = false;
    unreadCount.value = 0;
    items.value = [];
    await _tryUnregisterFcm();
  }

  Future<void> refresh() async {
    try {
      final list = await Api.get('/api/notifications?limit=50') as List;
      items.value = list
          .map((e) => AppNotification.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
      final countData =
          await Api.get('/api/notifications/unread-count') as Map<String, dynamic>;
      unreadCount.value = (countData['count'] as num?)?.toInt() ?? 0;
    } catch (_) {
      /* ignore when offline */
    }
  }

  Future<void> markRead(String id) async {
    await Api.post('/api/notifications/$id/read', {});
    _setReadLocal(id);
  }

  void _setReadLocal(String id) {
    var changed = false;
    items.value = items.value.map((n) {
      if (n.id == id && !n.read) {
        changed = true;
        return AppNotification(
          id: n.id,
          actorName: n.actorName,
          action: n.action,
          entityType: n.entityType,
          entityId: n.entityId,
          title: n.title,
          message: n.message,
          read: true,
          createdAt: n.createdAt,
        );
      }
      return n;
    }).toList();
    if (changed) unreadCount.value = (unreadCount.value - 1).clamp(0, 999);
  }

  Future<void> markAllRead() async {
    await Api.post('/api/notifications/read-all', {});
    items.value = items.value
        .map(
          (n) => AppNotification(
            id: n.id,
            actorName: n.actorName,
            action: n.action,
            entityType: n.entityType,
            entityId: n.entityId,
            title: n.title,
            message: n.message,
            read: true,
            createdAt: n.createdAt,
          ),
        )
        .toList();
    unreadCount.value = 0;
  }

  Future<void> clearAll() async {
    await Api.post('/api/notifications/clear', {});
    items.value = [];
    unreadCount.value = 0;
  }

  Future<void> _tryRegisterFcm() async {
    try {
      final dynamic messaging = null;
      if (messaging == null) return;
    } catch (_) {
      /* FCM not configured */
    }
  }

  Future<void> _tryUnregisterFcm() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('fcm_token');
    if (token == null || token.isEmpty) return;
    try {
      await Api.delete('/api/devices/fcm?token=${Uri.encodeComponent(token)}');
    } catch (_) {
      /* ignore */
    }
    await prefs.remove('fcm_token');
  }
}

Future<void> registerFcmTokenIfAvailable(String token) async {
  if (token.trim().isEmpty) return;
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString('fcm_token', token);
  try {
    await Api.post('/api/devices/fcm', {'token': token});
  } catch (_) {
    /* API may be offline */
  }
}

void _openNotificationTarget(
  BuildContext context, {
  required AppNotification notification,
  required String role,
  ValueChanged<int>? onSwitchTab,
}) {
  final entityId = notification.entityId?.trim();
  final module = notification.transactionModule;

  if (module != null && entityId != null && entityId.isNotEmpty) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => TransactionDetailsPage(
          id: entityId,
          role: role,
          module: module,
        ),
      ),
    );
    return;
  }

  switch (notification.entityType) {
    case 'client':
      if (entityId != null && entityId.isNotEmpty) {
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => ClientDetailPage(id: entityId),
          ),
        );
      }
      return;
    case 'shipping_company':
      if (entityId != null && entityId.isNotEmpty) {
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => ShippingCompanyDetailPage(id: entityId),
          ),
        );
      }
      return;
    case 'employee':
      onSwitchTab?.call(6);
      return;
    default:
      return;
  }
}

void showNotificationsSheet(
  BuildContext context, {
  required String role,
  ValueChanged<int>? onSwitchTab,
}) {
  final l10n = AppLocalizations.of(context)!;
  final service = NotificationService.instance;
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (ctx) {
      return Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        l10n.notificationsTitle,
                        style: Theme.of(ctx).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                    ),
                    ValueListenableBuilder<List<AppNotification>>(
                      valueListenable: service.items,
                      builder: (_, list, __) {
                        if (list.isEmpty) return const SizedBox.shrink();
                        return Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            TextButton(
                              onPressed: () => service.markAllRead(),
                              child: Text(l10n.notificationsMarkAllRead),
                            ),
                            TextButton(
                              onPressed: () async {
                                await service.clearAll();
                              },
                              child: Text(
                                l10n.notificationsClearList,
                                style: const TextStyle(color: Colors.red),
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ],
                ),
              ),
              ValueListenableBuilder<List<AppNotification>>(
                valueListenable: service.items,
                builder: (_, list, __) {
                  if (list.isEmpty) {
                    return Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(l10n.dashboardNoNewNotifications),
                    );
                  }
                  return Flexible(
                    child: ListView.builder(
                      shrinkWrap: true,
                      itemCount: list.length,
                      itemBuilder: (_, i) {
                        final n = list[i];
                        return ListTile(
                          leading: CircleAvatar(
                            backgroundColor:
                                n.read ? Colors.grey.shade200 : AppColors.brand50,
                            foregroundColor: AppColors.brand800,
                            child: Text(
                              n.actorName.isNotEmpty
                                  ? n.actorName[0].toUpperCase()
                                  : '?',
                            ),
                          ),
                          title: Text(
                            n.title,
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          subtitle: Text(n.message),
                          trailing: n.read
                              ? const Icon(Icons.chevron_right)
                              : const Icon(Icons.circle, size: 10, color: AppColors.brand600),
                          onTap: () async {
                            if (!n.read) await service.markRead(n.id);
                            if (!ctx.mounted) return;
                            Navigator.pop(ctx);
                            if (!context.mounted) return;
                            _openNotificationTarget(
                              context,
                              notification: n,
                              role: role,
                              onSwitchTab: onSwitchTab,
                            );
                          },
                        );
                      },
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      );
    },
  );
}
