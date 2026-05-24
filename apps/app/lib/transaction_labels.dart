import 'l10n/app_localizations.dart';

String declarationTypeLabel(String value, AppLocalizations l10n) {
  switch (value) {
    case 'Import':
      return l10n.txDeclTypeImport;
    case 'Import to Free Zone':
      return l10n.txDeclTypeImportFreeZone;
    case 'Import for Re-Export':
      return l10n.txDeclTypeImportReExport;
    case 'Temporary Import':
      return l10n.txDeclTypeTemporaryImport;
    case 'Transfer':
      return l10n.txDeclTypeTransfer;
    case 'Export':
      return l10n.txDeclTypeExport;
    case 'Transit out':
      return l10n.txDeclTypeTransitOut;
    case 'Export to GCC':
      return l10n.txDeclTypeExportGcc;
    case 'Transitin':
      return l10n.txDeclTypeTransitin;
    case 'Transitin from GCC':
      return l10n.txDeclTypeTransitinGcc;
    default:
      return value;
  }
}

String portTypeLabel(String value, AppLocalizations l10n) {
  switch (value) {
    case 'Seaports':
      return l10n.txPortSeaports;
    case 'Free Zones':
      return l10n.txPortFreeZones;
    case 'Mainland':
      return l10n.txPortMainland;
    default:
      return value;
  }
}
