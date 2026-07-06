import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';

/// Brand palette aligned with the web app.
abstract final class AppColors {
  static const brand50 = Color(0xFFEFF6FF);
  static const brand100 = Color(0xFFDBEAFE);
  static const brand600 = Color(0xFF2563EB);
  static const brand700 = Color(0xFF1D4ED8);
  static const brand800 = Color(0xFF1E3A8A);
  static const surface = Color(0xFFF8FAFC);
  static const textMuted = Color(0xFF64748B);
}

abstract final class AppDarkColors {
  static const brand50 = Color(0xFF1E3A8A); // Darker shade of brand for contrast
  static const brand100 = Color(0xFF1E40AF); // Darker shade
  static const brand600 = Color(0xFF3B82F6);
  static const brand700 = Color(0xFF60A5FA);
  static const brand800 = Color(0xFF93C5FD);
  static const surface = Color(0xFF111827); // Dark surface
  static const textMuted = Color(0xFFA1A1AA); // Lighter muted text for dark bg
}

abstract final class AppGradients {
  static const hero = LinearGradient(
    colors: [AppColors.brand800, AppColors.brand600],
    begin: Alignment.topRight,
    end: Alignment.bottomLeft,
  );
}

ThemeData buildAppTheme({required bool isArabic, required Brightness brightness}) {
  final isDark = brightness == Brightness.dark;
  final effectiveBrand800 = isDark ? AppDarkColors.brand800 : AppColors.brand800;
  final effectiveBrand700 = isDark ? AppDarkColors.brand700 : AppColors.brand700;
  final effectiveBrand600 = isDark ? AppDarkColors.brand600 : AppColors.brand600;
  final effectiveSurface = isDark ? AppDarkColors.surface : AppColors.surface;
  final effectiveTextMuted = isDark ? AppDarkColors.textMuted : AppColors.textMuted;
  final effectiveError = isDark ? Colors.red.shade700 : Colors.red.shade700; // Define dark mode error color if needed
  final effectiveErrorContainer = isDark ? Colors.red.shade900 : Colors.red.shade100;
  final effectiveOnErrorContainer = isDark ? Colors.white : Colors.red.shade900;

  final base = ColorScheme.fromSeed(
    seedColor: effectiveBrand800,
    brightness: brightness,
  );
  return ThemeData(
    useMaterial3: true,
    fontFamily: isArabic ? 'NotoSansArabic' : null,
    colorScheme: base.copyWith(
      primary: effectiveBrand700,
      onPrimary: Colors.white,
      surface: effectiveSurface,
      error: effectiveError,
      errorContainer: effectiveErrorContainer,
      onErrorContainer: effectiveOnErrorContainer,
    ),
    scaffoldBackgroundColor: effectiveSurface,
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        TargetPlatform.android: ZoomPageTransitionsBuilder(),
        TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
      },
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: isDark ? AppDarkColors.surface : Colors.white,
      foregroundColor: effectiveBrand800,
      centerTitle: false,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      surfaceTintColor: Colors.transparent,
    ),
    cardTheme: CardThemeData(
      color: isDark ? AppDarkColors.brand50 : Colors.white,
      elevation: 0,
      margin: const EdgeInsets.symmetric(vertical: 6),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: isDark ? Colors.grey.shade800 : Colors.grey.shade200),
      ),
    ),
    listTileTheme: const ListTileThemeData(
      contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 4),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: isDark ? AppDarkColors.brand50 : Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: isDark ? Colors.grey.shade700 : Colors.grey.shade300),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: isDark ? Colors.grey.shade700 : Colors.grey.shade300),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: const BorderRadius.all(Radius.circular(14)),
        borderSide: BorderSide(color: effectiveBrand600, width: 1.2),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: effectiveBrand700,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: effectiveBrand800,
        side: BorderSide(color: effectiveBrand600),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      backgroundColor: isDark ? AppDarkColors.brand700 : AppColors.brand700,
      contentTextStyle: TextStyle(color: Colors.white),
    ),
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: isDark ? AppDarkColors.surface : Colors.white,
      selectedItemColor: effectiveBrand700,
      unselectedItemColor: effectiveTextMuted,
      type: BottomNavigationBarType.fixed,
      elevation: 8,
    ),
    dividerTheme: DividerThemeData(color: isDark ? Colors.grey.shade700 : Colors.grey.shade200, thickness: 1),
  );
}

/// Gradient header used on list tabs and detail screens.
class PageHeroBanner extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;

  const PageHeroBanner({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: AppGradients.hero,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.brand800.withValues(alpha: 0.22),
            blurRadius: 12,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: Colors.white.withValues(alpha: 0.2),
            child: Icon(icon, color: Colors.white),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (subtitle != null && subtitle!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle!,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.9),
                      fontSize: 13,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class StageBadgeChip extends StatelessWidget {
  final String stage;
  final String label;

  const StageBadgeChip({super.key, required this.stage, required this.label});

  static (Color bg, Color fg, Color border) colorsFor(String stage) {
    switch (stage) {
      case 'CUSTOMS_CLEARANCE':
        return (
          const Color(0xFFFFF7ED),
          const Color(0xFFC2410C),
          const Color(0xFFFED7AA),
        );
      case 'STORAGE':
        return (
          const Color(0xFFF0FDF4),
          const Color(0xFF15803D),
          const Color(0xFFBBF7D0),
        );
      case 'TRANSPORTATION':
        return (
          AppColors.brand50,
          AppColors.brand700,
          AppColors.brand100,
        );
      default:
        return (
          const Color(0xFFF1F5F9),
          const Color(0xFF475569),
          const Color(0xFFE2E8F0),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final (bg, fg, border) = colorsFor(stage);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: border),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: fg,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class EmptyStateCard extends StatelessWidget {
  final IconData icon;
  final String message;

  const EmptyStateCard({
    super.key,
    this.icon = Icons.inbox_outlined,
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 40, color: AppColors.textMuted),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade700, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }
}
