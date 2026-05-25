import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ar.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale) : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate = _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates = <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('en')
  ];

  /// No description provided for @login.
  ///
  /// In en, this message translates to:
  /// **'Login'**
  String get login;

  /// No description provided for @email.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get email;

  /// No description provided for @password.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get password;

  /// No description provided for @signingIn.
  ///
  /// In en, this message translates to:
  /// **'Signing in...'**
  String get signingIn;

  /// No description provided for @tracker.
  ///
  /// In en, this message translates to:
  /// **'Tracker'**
  String get tracker;

  /// No description provided for @dashboardTab.
  ///
  /// In en, this message translates to:
  /// **'Dashboard'**
  String get dashboardTab;

  /// No description provided for @transactions.
  ///
  /// In en, this message translates to:
  /// **'Import'**
  String get transactions;

  /// No description provided for @clients.
  ///
  /// In en, this message translates to:
  /// **'Clients'**
  String get clients;

  /// No description provided for @shipping.
  ///
  /// In en, this message translates to:
  /// **'Shipping'**
  String get shipping;

  /// No description provided for @profile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profile;

  /// No description provided for @search.
  ///
  /// In en, this message translates to:
  /// **'Search...'**
  String get search;

  /// No description provided for @allStatuses.
  ///
  /// In en, this message translates to:
  /// **'All statuses'**
  String get allStatuses;

  /// No description provided for @allStages.
  ///
  /// In en, this message translates to:
  /// **'All stages'**
  String get allStages;

  /// No description provided for @allChannels.
  ///
  /// In en, this message translates to:
  /// **'All channels'**
  String get allChannels;

  /// No description provided for @newLabel.
  ///
  /// In en, this message translates to:
  /// **'New'**
  String get newLabel;

  /// No description provided for @noMatch.
  ///
  /// In en, this message translates to:
  /// **'No matching import records'**
  String get noMatch;

  /// No description provided for @details.
  ///
  /// In en, this message translates to:
  /// **'Import Details'**
  String get details;

  /// No description provided for @client.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get client;

  /// No description provided for @shippingCompany.
  ///
  /// In en, this message translates to:
  /// **'Shipping Company'**
  String get shippingCompany;

  /// No description provided for @declaration.
  ///
  /// In en, this message translates to:
  /// **'Declaration'**
  String get declaration;

  /// No description provided for @status.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get status;

  /// No description provided for @channel.
  ///
  /// In en, this message translates to:
  /// **'Channel'**
  String get channel;

  /// No description provided for @createdAt.
  ///
  /// In en, this message translates to:
  /// **'Created At'**
  String get createdAt;

  /// No description provided for @duty.
  ///
  /// In en, this message translates to:
  /// **'Duty'**
  String get duty;

  /// No description provided for @markPaid.
  ///
  /// In en, this message translates to:
  /// **'Mark Paid'**
  String get markPaid;

  /// No description provided for @release.
  ///
  /// In en, this message translates to:
  /// **'Release'**
  String get release;

  /// No description provided for @newTransaction.
  ///
  /// In en, this message translates to:
  /// **'New Import'**
  String get newTransaction;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @saving.
  ///
  /// In en, this message translates to:
  /// **'Saving...'**
  String get saving;

  /// No description provided for @addClient.
  ///
  /// In en, this message translates to:
  /// **'Add Client'**
  String get addClient;

  /// No description provided for @managerOnlyClients.
  ///
  /// In en, this message translates to:
  /// **'Manager only can edit/modify clients.'**
  String get managerOnlyClients;

  /// No description provided for @addShipping.
  ///
  /// In en, this message translates to:
  /// **'Add Shipping Company'**
  String get addShipping;

  /// No description provided for @managerOnlyShipping.
  ///
  /// In en, this message translates to:
  /// **'Manager only can edit/modify shipping companies.'**
  String get managerOnlyShipping;

  /// No description provided for @logout.
  ///
  /// In en, this message translates to:
  /// **'Logout'**
  String get logout;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @edit.
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get edit;

  /// No description provided for @delete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get delete;

  /// No description provided for @confirmDelete.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to delete?'**
  String get confirmDelete;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @companyName.
  ///
  /// In en, this message translates to:
  /// **'Company Name'**
  String get companyName;

  /// No description provided for @trn.
  ///
  /// In en, this message translates to:
  /// **'Contact phone number'**
  String get trn;

  /// No description provided for @immigrationCode.
  ///
  /// In en, this message translates to:
  /// **'Client ID'**
  String get immigrationCode;

  /// No description provided for @clientEmail.
  ///
  /// In en, this message translates to:
  /// **'Client email'**
  String get clientEmail;

  /// No description provided for @country.
  ///
  /// In en, this message translates to:
  /// **'Country'**
  String get country;

  /// No description provided for @creditLimit.
  ///
  /// In en, this message translates to:
  /// **'Credit Limit'**
  String get creditLimit;

  /// No description provided for @code.
  ///
  /// In en, this message translates to:
  /// **'Code'**
  String get code;

  /// No description provided for @contactName.
  ///
  /// In en, this message translates to:
  /// **'Contact Name'**
  String get contactName;

  /// No description provided for @phone.
  ///
  /// In en, this message translates to:
  /// **'Phone'**
  String get phone;

  /// No description provided for @originCountry.
  ///
  /// In en, this message translates to:
  /// **'Origin Country'**
  String get originCountry;

  /// No description provided for @airwayBill.
  ///
  /// In en, this message translates to:
  /// **'Airway Bill'**
  String get airwayBill;

  /// No description provided for @hsCode.
  ///
  /// In en, this message translates to:
  /// **'HS Code'**
  String get hsCode;

  /// No description provided for @goodsDescription.
  ///
  /// In en, this message translates to:
  /// **'Goods Description'**
  String get goodsDescription;

  /// No description provided for @invoiceValue.
  ///
  /// In en, this message translates to:
  /// **'Invoice Value'**
  String get invoiceValue;

  /// No description provided for @shippingCompanyIdOptional.
  ///
  /// In en, this message translates to:
  /// **'Shipping Company ID (optional)'**
  String get shippingCompanyIdOptional;

  /// No description provided for @shippingEmailOptional.
  ///
  /// In en, this message translates to:
  /// **'Email (optional)'**
  String get shippingEmailOptional;

  /// No description provided for @shippingLocationOptional.
  ///
  /// In en, this message translates to:
  /// **'Location (optional)'**
  String get shippingLocationOptional;

  /// No description provided for @latitudeOptional.
  ///
  /// In en, this message translates to:
  /// **'Latitude (optional)'**
  String get latitudeOptional;

  /// No description provided for @longitudeOptional.
  ///
  /// In en, this message translates to:
  /// **'Longitude (optional)'**
  String get longitudeOptional;

  /// No description provided for @txRateAedPerKg.
  ///
  /// In en, this message translates to:
  /// **'Invoice→weight rate AED/kg (optional)'**
  String get txRateAedPerKg;

  /// No description provided for @txGoodsWeightKg.
  ///
  /// In en, this message translates to:
  /// **'Goods weight kg (optional)'**
  String get txGoodsWeightKg;

  /// No description provided for @txContainerCount.
  ///
  /// In en, this message translates to:
  /// **'Number of containers (optional)'**
  String get txContainerCount;

  /// No description provided for @txContainerArrival.
  ///
  /// In en, this message translates to:
  /// **'Container arrival date'**
  String get txContainerArrival;

  /// No description provided for @txDocumentArrival.
  ///
  /// In en, this message translates to:
  /// **'Document arrival date'**
  String get txDocumentArrival;

  /// No description provided for @txDocumentPostal.
  ///
  /// In en, this message translates to:
  /// **'Document postal number'**
  String get txDocumentPostal;

  /// No description provided for @txGoodsQty.
  ///
  /// In en, this message translates to:
  /// **'Goods size (optional)'**
  String get txGoodsQty;

  /// No description provided for @txGoodsQuality.
  ///
  /// In en, this message translates to:
  /// **'Quality'**
  String get txGoodsQuality;

  /// No description provided for @txGoodsUnit.
  ///
  /// In en, this message translates to:
  /// **'Unit of measurement'**
  String get txGoodsUnit;

  /// No description provided for @txUnitsType.
  ///
  /// In en, this message translates to:
  /// **'Units type'**
  String get txUnitsType;

  /// No description provided for @txNumberOfUnits.
  ///
  /// In en, this message translates to:
  /// **'Number of units'**
  String get txNumberOfUnits;

  /// No description provided for @txAttachDocs.
  ///
  /// In en, this message translates to:
  /// **'Document photos (optional)'**
  String get txAttachDocs;

  /// No description provided for @txPickFiles.
  ///
  /// In en, this message translates to:
  /// **'Choose files'**
  String get txPickFiles;

  /// No description provided for @txQualityNew.
  ///
  /// In en, this message translates to:
  /// **'New'**
  String get txQualityNew;

  /// No description provided for @txQualityLikeNew.
  ///
  /// In en, this message translates to:
  /// **'Like new'**
  String get txQualityLikeNew;

  /// No description provided for @txQualityUsed.
  ///
  /// In en, this message translates to:
  /// **'Used'**
  String get txQualityUsed;

  /// No description provided for @txQualityRefurbished.
  ///
  /// In en, this message translates to:
  /// **'Refurbished'**
  String get txQualityRefurbished;

  /// No description provided for @txQualityDamaged.
  ///
  /// In en, this message translates to:
  /// **'Damaged'**
  String get txQualityDamaged;

  /// No description provided for @txQualityMixed.
  ///
  /// In en, this message translates to:
  /// **'Mixed'**
  String get txQualityMixed;

  /// No description provided for @txUnitKg.
  ///
  /// In en, this message translates to:
  /// **'kg'**
  String get txUnitKg;

  /// No description provided for @txUnitTon.
  ///
  /// In en, this message translates to:
  /// **'ton'**
  String get txUnitTon;

  /// No description provided for @txUnitPiece.
  ///
  /// In en, this message translates to:
  /// **'piece'**
  String get txUnitPiece;

  /// No description provided for @txUnitCarton.
  ///
  /// In en, this message translates to:
  /// **'carton'**
  String get txUnitCarton;

  /// No description provided for @txUnitPallet.
  ///
  /// In en, this message translates to:
  /// **'pallet'**
  String get txUnitPallet;

  /// No description provided for @txUnitCbm.
  ///
  /// In en, this message translates to:
  /// **'CBM'**
  String get txUnitCbm;

  /// No description provided for @txUnitLiter.
  ///
  /// In en, this message translates to:
  /// **'liter'**
  String get txUnitLiter;

  /// No description provided for @txUnitSet.
  ///
  /// In en, this message translates to:
  /// **'set'**
  String get txUnitSet;

  /// No description provided for @employees.
  ///
  /// In en, this message translates to:
  /// **'Employees'**
  String get employees;

  /// No description provided for @employeesTitle.
  ///
  /// In en, this message translates to:
  /// **'Employee section'**
  String get employeesTitle;

  /// No description provided for @employeeName.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get employeeName;

  /// No description provided for @employeeEmail.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get employeeEmail;

  /// No description provided for @employeePassword.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get employeePassword;

  /// No description provided for @employeeRole.
  ///
  /// In en, this message translates to:
  /// **'Role'**
  String get employeeRole;

  /// No description provided for @managerOnlyEmployees.
  ///
  /// In en, this message translates to:
  /// **'Only the manager can add, edit, or delete employees.'**
  String get managerOnlyEmployees;

  /// No description provided for @addEmployee.
  ///
  /// In en, this message translates to:
  /// **'Add employee'**
  String get addEmployee;

  /// No description provided for @passwordHintEdit.
  ///
  /// In en, this message translates to:
  /// **'Leave blank to keep current password'**
  String get passwordHintEdit;

  /// No description provided for @cancelEdit.
  ///
  /// In en, this message translates to:
  /// **'Cancel edit'**
  String get cancelEdit;

  /// No description provided for @goTracker.
  ///
  /// In en, this message translates to:
  /// **'Go to import'**
  String get goTracker;

  /// No description provided for @roleFromAccount.
  ///
  /// In en, this message translates to:
  /// **'Your role is determined by your login account.'**
  String get roleFromAccount;

  /// No description provided for @currentRole.
  ///
  /// In en, this message translates to:
  /// **'Current role'**
  String get currentRole;

  /// No description provided for @editTransaction.
  ///
  /// In en, this message translates to:
  /// **'Edit import'**
  String get editTransaction;

  /// No description provided for @documentStatus.
  ///
  /// In en, this message translates to:
  /// **'Document status'**
  String get documentStatus;

  /// No description provided for @paymentStatus.
  ///
  /// In en, this message translates to:
  /// **'Payment status'**
  String get paymentStatus;

  /// No description provided for @document.
  ///
  /// In en, this message translates to:
  /// **'Document'**
  String get document;

  /// No description provided for @payment.
  ///
  /// In en, this message translates to:
  /// **'Payment'**
  String get payment;

  /// No description provided for @releaseCode.
  ///
  /// In en, this message translates to:
  /// **'Release code'**
  String get releaseCode;

  /// No description provided for @notIssued.
  ///
  /// In en, this message translates to:
  /// **'Not issued'**
  String get notIssued;

  /// No description provided for @risk.
  ///
  /// In en, this message translates to:
  /// **'Risk'**
  String get risk;

  /// No description provided for @goods.
  ///
  /// In en, this message translates to:
  /// **'Goods'**
  String get goods;

  /// No description provided for @origin.
  ///
  /// In en, this message translates to:
  /// **'Origin'**
  String get origin;

  /// No description provided for @deleteTransaction.
  ///
  /// In en, this message translates to:
  /// **'Delete import'**
  String get deleteTransaction;

  /// No description provided for @confirmDeleteTransaction.
  ///
  /// In en, this message translates to:
  /// **'Delete this import record?'**
  String get confirmDeleteTransaction;

  /// No description provided for @shippingPaper.
  ///
  /// In en, this message translates to:
  /// **'Shipping paper form'**
  String get shippingPaper;

  /// No description provided for @shippingPaperHeading.
  ///
  /// In en, this message translates to:
  /// **'Shipping / release cover sheet'**
  String get shippingPaperHeading;

  /// No description provided for @shippingPaperSub.
  ///
  /// In en, this message translates to:
  /// **'Edit below, then print or share.'**
  String get shippingPaperSub;

  /// No description provided for @printAction.
  ///
  /// In en, this message translates to:
  /// **'Print / PDF'**
  String get printAction;

  /// No description provided for @close.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get close;

  /// No description provided for @typeToSearch.
  ///
  /// In en, this message translates to:
  /// **'Type to search and pick from the list'**
  String get typeToSearch;

  /// No description provided for @documentPhotosSection.
  ///
  /// In en, this message translates to:
  /// **'Document attachments'**
  String get documentPhotosSection;

  /// No description provided for @removeAttachment.
  ///
  /// In en, this message translates to:
  /// **'Remove'**
  String get removeAttachment;

  /// No description provided for @toShippingCompany.
  ///
  /// In en, this message translates to:
  /// **'To (shipping company)'**
  String get toShippingCompany;

  /// No description provided for @fromClient.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get fromClient;

  /// No description provided for @additionalNotes.
  ///
  /// In en, this message translates to:
  /// **'Additional notes'**
  String get additionalNotes;

  /// No description provided for @airwayBillShort.
  ///
  /// In en, this message translates to:
  /// **'Airway bill'**
  String get airwayBillShort;

  /// No description provided for @valueAed.
  ///
  /// In en, this message translates to:
  /// **'Value (AED)'**
  String get valueAed;

  /// No description provided for @weightKg.
  ///
  /// In en, this message translates to:
  /// **'Weight (kg)'**
  String get weightKg;

  /// No description provided for @quantity.
  ///
  /// In en, this message translates to:
  /// **'Goods size'**
  String get quantity;

  /// No description provided for @clientStatus.
  ///
  /// In en, this message translates to:
  /// **'Client status'**
  String get clientStatus;

  /// No description provided for @statusActive.
  ///
  /// In en, this message translates to:
  /// **'active'**
  String get statusActive;

  /// No description provided for @statusSuspended.
  ///
  /// In en, this message translates to:
  /// **'suspended'**
  String get statusSuspended;

  /// No description provided for @shippingStatus.
  ///
  /// In en, this message translates to:
  /// **'Company status'**
  String get shippingStatus;

  /// No description provided for @statusInactive.
  ///
  /// In en, this message translates to:
  /// **'inactive'**
  String get statusInactive;

  /// No description provided for @originalBl.
  ///
  /// In en, this message translates to:
  /// **'Original BL received'**
  String get originalBl;

  /// No description provided for @txDocumentStatusCopy.
  ///
  /// In en, this message translates to:
  /// **'Copy received'**
  String get txDocumentStatusCopy;

  /// No description provided for @txDocumentStatusOriginal.
  ///
  /// In en, this message translates to:
  /// **'Original received'**
  String get txDocumentStatusOriginal;

  /// No description provided for @txDocumentStatusTelex.
  ///
  /// In en, this message translates to:
  /// **'Telex release'**
  String get txDocumentStatusTelex;

  /// No description provided for @txPaymentPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get txPaymentPending;

  /// No description provided for @txPaymentPaid.
  ///
  /// In en, this message translates to:
  /// **'Paid'**
  String get txPaymentPaid;

  /// No description provided for @roleManager.
  ///
  /// In en, this message translates to:
  /// **'manager'**
  String get roleManager;

  /// No description provided for @roleEmployee.
  ///
  /// In en, this message translates to:
  /// **'employee'**
  String get roleEmployee;

  /// No description provided for @roleAccountant.
  ///
  /// In en, this message translates to:
  /// **'accountant'**
  String get roleAccountant;

  /// No description provided for @optionalSelect.
  ///
  /// In en, this message translates to:
  /// **'— select —'**
  String get optionalSelect;

  /// No description provided for @rememberMe.
  ///
  /// In en, this message translates to:
  /// **'Remember me'**
  String get rememberMe;

  /// No description provided for @accountantNoTransactionForm.
  ///
  /// In en, this message translates to:
  /// **'Accountant role cannot create or edit import records in this form.'**
  String get accountantNoTransactionForm;

  /// No description provided for @saveDisabledLocked.
  ///
  /// In en, this message translates to:
  /// **'Save is disabled for transportation stages.'**
  String get saveDisabledLocked;

  /// No description provided for @transfers.
  ///
  /// In en, this message translates to:
  /// **'Transfers'**
  String get transfers;

  /// No description provided for @exports.
  ///
  /// In en, this message translates to:
  /// **'Exports'**
  String get exports;

  /// No description provided for @languageAr.
  ///
  /// In en, this message translates to:
  /// **'Arabic'**
  String get languageAr;

  /// No description provided for @languageEn.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get languageEn;

  /// No description provided for @dashboardWelcomePrefix.
  ///
  /// In en, this message translates to:
  /// **'Hello, '**
  String get dashboardWelcomePrefix;

  /// No description provided for @dashboardSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search import records, clients, declarations...'**
  String get dashboardSearchHint;

  /// No description provided for @dashboardRecentImports.
  ///
  /// In en, this message translates to:
  /// **'Recent import records'**
  String get dashboardRecentImports;

  /// No description provided for @dashboardViewAll.
  ///
  /// In en, this message translates to:
  /// **'View all'**
  String get dashboardViewAll;

  /// No description provided for @dashboardNewImport.
  ///
  /// In en, this message translates to:
  /// **'New Import'**
  String get dashboardNewImport;

  /// No description provided for @dashboardImport.
  ///
  /// In en, this message translates to:
  /// **'Import'**
  String get dashboardImport;

  /// No description provided for @dashboardNewTransfer.
  ///
  /// In en, this message translates to:
  /// **'New Transfer'**
  String get dashboardNewTransfer;

  /// No description provided for @dashboardNewExport.
  ///
  /// In en, this message translates to:
  /// **'New Export'**
  String get dashboardNewExport;

  /// No description provided for @dashboardTrackImportRecords.
  ///
  /// In en, this message translates to:
  /// **'Track import records'**
  String get dashboardTrackImportRecords;

  /// No description provided for @dashboardAddClient.
  ///
  /// In en, this message translates to:
  /// **'Add client'**
  String get dashboardAddClient;

  /// No description provided for @dashboardShippingCo.
  ///
  /// In en, this message translates to:
  /// **'Shipping co.'**
  String get dashboardShippingCo;

  /// No description provided for @dashboardHelpSupport.
  ///
  /// In en, this message translates to:
  /// **'Help & support'**
  String get dashboardHelpSupport;

  /// No description provided for @dashboardMessagesSoon.
  ///
  /// In en, this message translates to:
  /// **'Messages coming soon'**
  String get dashboardMessagesSoon;

  /// No description provided for @dashboardNoNewNotifications.
  ///
  /// In en, this message translates to:
  /// **'No new notifications'**
  String get dashboardNoNewNotifications;

  /// No description provided for @dashboardNoImportRecordsYet.
  ///
  /// In en, this message translates to:
  /// **'No import records yet. Create one from the grid above.'**
  String get dashboardNoImportRecordsYet;

  /// No description provided for @moduleImportSingular.
  ///
  /// In en, this message translates to:
  /// **'Import'**
  String get moduleImportSingular;

  /// No description provided for @moduleTransferSingular.
  ///
  /// In en, this message translates to:
  /// **'Transfer'**
  String get moduleTransferSingular;

  /// No description provided for @moduleExportSingular.
  ///
  /// In en, this message translates to:
  /// **'Export'**
  String get moduleExportSingular;

  /// No description provided for @optionYes.
  ///
  /// In en, this message translates to:
  /// **'Yes'**
  String get optionYes;

  /// No description provided for @optionNo.
  ///
  /// In en, this message translates to:
  /// **'No'**
  String get optionNo;

  /// No description provided for @selectCategory.
  ///
  /// In en, this message translates to:
  /// **'Select category'**
  String get selectCategory;

  /// No description provided for @transferDetails.
  ///
  /// In en, this message translates to:
  /// **'Transfer Details'**
  String get transferDetails;

  /// No description provided for @exportDetails.
  ///
  /// In en, this message translates to:
  /// **'Export Details'**
  String get exportDetails;

  /// No description provided for @uncategorized.
  ///
  /// In en, this message translates to:
  /// **'Uncategorized'**
  String get uncategorized;

  /// No description provided for @loginBannerTitle.
  ///
  /// In en, this message translates to:
  /// **'Track shipments with confidence'**
  String get loginBannerTitle;

  /// No description provided for @shippingDispatchTemplateOptional.
  ///
  /// In en, this message translates to:
  /// **'Dispatch Template (optional)'**
  String get shippingDispatchTemplateOptional;

  /// No description provided for @shippingLatLngBothOrEmpty.
  ///
  /// In en, this message translates to:
  /// **'Enter both latitude and longitude, or leave both empty.'**
  String get shippingLatLngBothOrEmpty;

  /// No description provided for @shippingInvalidLatLng.
  ///
  /// In en, this message translates to:
  /// **'Invalid latitude or longitude.'**
  String get shippingInvalidLatLng;

  /// No description provided for @containerNumbers.
  ///
  /// In en, this message translates to:
  /// **'Container Numbers'**
  String get containerNumbers;

  /// No description provided for @stopTransaction.
  ///
  /// In en, this message translates to:
  /// **'Stop Transaction'**
  String get stopTransaction;

  /// No description provided for @stopReason.
  ///
  /// In en, this message translates to:
  /// **'Stop Reason'**
  String get stopReason;

  /// No description provided for @uploadCategoryRequired.
  ///
  /// In en, this message translates to:
  /// **'Please select a category for each uploaded document.'**
  String get uploadCategoryRequired;

  /// No description provided for @storageNoUploadAtStage.
  ///
  /// In en, this message translates to:
  /// **'New document uploads are not allowed at Storage stage.'**
  String get storageNoUploadAtStage;

  /// No description provided for @storageSectionTitle.
  ///
  /// In en, this message translates to:
  /// **'Storage (entry / exit / seal)'**
  String get storageSectionTitle;

  /// No description provided for @storageEntryDate.
  ///
  /// In en, this message translates to:
  /// **'Entry date'**
  String get storageEntryDate;

  /// No description provided for @storageWorkersWages.
  ///
  /// In en, this message translates to:
  /// **'Workers wages'**
  String get storageWorkersWages;

  /// No description provided for @storageWorkersCompany.
  ///
  /// In en, this message translates to:
  /// **'Workers company'**
  String get storageWorkersCompany;

  /// No description provided for @storageStoreName.
  ///
  /// In en, this message translates to:
  /// **'Store name'**
  String get storageStoreName;

  /// No description provided for @storageSizeCbm.
  ///
  /// In en, this message translates to:
  /// **'Size (CBM m³)'**
  String get storageSizeCbm;

  /// No description provided for @storageFreightVehicleNumbers.
  ///
  /// In en, this message translates to:
  /// **'Freight vehicle numbers'**
  String get storageFreightVehicleNumbers;

  /// No description provided for @storageCrossPackaging.
  ///
  /// In en, this message translates to:
  /// **'Cross packaging'**
  String get storageCrossPackaging;

  /// No description provided for @storageUnity.
  ///
  /// In en, this message translates to:
  /// **'Unit'**
  String get storageUnity;

  /// No description provided for @storageSealNumber.
  ///
  /// In en, this message translates to:
  /// **'Seal / stamp number'**
  String get storageSealNumber;

  /// No description provided for @storageReadOnlyHint.
  ///
  /// In en, this message translates to:
  /// **'At Storage stage use the storage card for warehouse data. Fields here are read-only.'**
  String get storageReadOnlyHint;

  /// No description provided for @storageCardTitle.
  ///
  /// In en, this message translates to:
  /// **'Storage card'**
  String get storageCardTitle;

  /// No description provided for @storageBackToTransaction.
  ///
  /// In en, this message translates to:
  /// **'Back to transaction'**
  String get storageBackToTransaction;

  /// No description provided for @storageSubInput.
  ///
  /// In en, this message translates to:
  /// **'Input'**
  String get storageSubInput;

  /// No description provided for @storageSubOutput.
  ///
  /// In en, this message translates to:
  /// **'Output'**
  String get storageSubOutput;

  /// No description provided for @storageSubSeal.
  ///
  /// In en, this message translates to:
  /// **'Seal'**
  String get storageSubSeal;

  /// No description provided for @storageSectionInput.
  ///
  /// In en, this message translates to:
  /// **'A — Input (entry) data'**
  String get storageSectionInput;

  /// No description provided for @storageSectionExit.
  ///
  /// In en, this message translates to:
  /// **'B — Exit data'**
  String get storageSectionExit;

  /// No description provided for @storageSectionSeal.
  ///
  /// In en, this message translates to:
  /// **'C — Seal'**
  String get storageSectionSeal;

  /// No description provided for @storageLoadingEquipmentFare.
  ///
  /// In en, this message translates to:
  /// **'Loading equipment fare'**
  String get storageLoadingEquipmentFare;

  /// No description provided for @storageReplaceContainers.
  ///
  /// In en, this message translates to:
  /// **'Replace containers'**
  String get storageReplaceContainers;

  /// No description provided for @storageEntryLockNumbers.
  ///
  /// In en, this message translates to:
  /// **'Entry lock numbers'**
  String get storageEntryLockNumbers;

  /// No description provided for @storageOutContainerNumbers.
  ///
  /// In en, this message translates to:
  /// **'Out container numbers'**
  String get storageOutContainerNumbers;

  /// No description provided for @storageOutLockNumbers.
  ///
  /// In en, this message translates to:
  /// **'Out lock numbers'**
  String get storageOutLockNumbers;

  /// No description provided for @storageSwitchDate.
  ///
  /// In en, this message translates to:
  /// **'Switch date'**
  String get storageSwitchDate;

  /// No description provided for @storageEntryContainerNumbers.
  ///
  /// In en, this message translates to:
  /// **'Entry container numbers'**
  String get storageEntryContainerNumbers;

  /// No description provided for @storageSealUnitCount.
  ///
  /// In en, this message translates to:
  /// **'Number of units'**
  String get storageSealUnitCount;

  /// No description provided for @storageOpenCard.
  ///
  /// In en, this message translates to:
  /// **'Storage'**
  String get storageOpenCard;

  /// No description provided for @accountingOpenCard.
  ///
  /// In en, this message translates to:
  /// **'Accounting'**
  String get accountingOpenCard;

  /// No description provided for @accountingCardTitle.
  ///
  /// In en, this message translates to:
  /// **'Accounting card'**
  String get accountingCardTitle;

  /// No description provided for @accountingFixedSection.
  ///
  /// In en, this message translates to:
  /// **'Amounts due (from record)'**
  String get accountingFixedSection;

  /// No description provided for @accountingFixedHint.
  ///
  /// In en, this message translates to:
  /// **'Manager and accountant can edit and save all fields.'**
  String get accountingFixedHint;

  /// No description provided for @accountingCustomSection.
  ///
  /// In en, this message translates to:
  /// **'Additional fields'**
  String get accountingCustomSection;

  /// No description provided for @accountingFieldTitle.
  ///
  /// In en, this message translates to:
  /// **'Field title'**
  String get accountingFieldTitle;

  /// No description provided for @accountingFieldValue.
  ///
  /// In en, this message translates to:
  /// **'Value'**
  String get accountingFieldValue;

  /// No description provided for @accountingEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'Empty title'**
  String get accountingEmptyTitle;

  /// No description provided for @accountingAddField.
  ///
  /// In en, this message translates to:
  /// **'Add field'**
  String get accountingAddField;

  /// No description provided for @accountingNoCustomFields.
  ///
  /// In en, this message translates to:
  /// **'No additional fields yet. Tap “Add field” to create one.'**
  String get accountingNoCustomFields;

  /// No description provided for @accountingRemoveField.
  ///
  /// In en, this message translates to:
  /// **'Remove'**
  String get accountingRemoveField;

  /// No description provided for @accountingSaved.
  ///
  /// In en, this message translates to:
  /// **'Saved.'**
  String get accountingSaved;

  /// No description provided for @accountingTotal.
  ///
  /// In en, this message translates to:
  /// **'Total (amounts + additional fields)'**
  String get accountingTotal;

  /// No description provided for @accountingStorageInputWages.
  ///
  /// In en, this message translates to:
  /// **'Input workers wages'**
  String get accountingStorageInputWages;

  /// No description provided for @accountingStorageExitWages.
  ///
  /// In en, this message translates to:
  /// **'Exit workers wages'**
  String get accountingStorageExitWages;

  /// No description provided for @accountingStorageSealWages.
  ///
  /// In en, this message translates to:
  /// **'Seal workers wages'**
  String get accountingStorageSealWages;

  /// No description provided for @accountingStorageInputFare.
  ///
  /// In en, this message translates to:
  /// **'Input loading equipment fare'**
  String get accountingStorageInputFare;

  /// No description provided for @accountingStorageExitFare.
  ///
  /// In en, this message translates to:
  /// **'Exit loading equipment fare'**
  String get accountingStorageExitFare;

  /// No description provided for @storageWrongStage.
  ///
  /// In en, this message translates to:
  /// **'This record is not in the Storage stage.'**
  String get storageWrongStage;

  /// No description provided for @storageAccountantReadOnly.
  ///
  /// In en, this message translates to:
  /// **'Accountants can view this screen only.'**
  String get storageAccountantReadOnly;

  /// No description provided for @storageOpenDedicatedPage.
  ///
  /// In en, this message translates to:
  /// **'Open storage card (input / output / seal)'**
  String get storageOpenDedicatedPage;

  /// No description provided for @storageLinkFromDetails.
  ///
  /// In en, this message translates to:
  /// **'Storage card'**
  String get storageLinkFromDetails;

  /// No description provided for @accountingLinkFromDetails.
  ///
  /// In en, this message translates to:
  /// **'Accounting card'**
  String get accountingLinkFromDetails;

  /// No description provided for @pdfFontLoadErrorPrefix.
  ///
  /// In en, this message translates to:
  /// **'Could not load PDF font'**
  String get pdfFontLoadErrorPrefix;

  /// No description provided for @txStage.
  ///
  /// In en, this message translates to:
  /// **'Transaction Stage'**
  String get txStage;

  /// No description provided for @txReadOnlyFields.
  ///
  /// In en, this message translates to:
  /// **'Read-only Transaction Fields'**
  String get txReadOnlyFields;

  /// No description provided for @txFileNumber.
  ///
  /// In en, this message translates to:
  /// **'File Number'**
  String get txFileNumber;

  /// No description provided for @txCustomsDeclaration.
  ///
  /// In en, this message translates to:
  /// **'Customs Declaration'**
  String get txCustomsDeclaration;

  /// No description provided for @txDeclarationNumber1.
  ///
  /// In en, this message translates to:
  /// **'Declaration Number (1)'**
  String get txDeclarationNumber1;

  /// No description provided for @txDeclarationDate.
  ///
  /// In en, this message translates to:
  /// **'Declaration Date'**
  String get txDeclarationDate;

  /// No description provided for @txDeclarationType1.
  ///
  /// In en, this message translates to:
  /// **'Declaration Type (1)'**
  String get txDeclarationType1;

  /// No description provided for @txDeclarationNumber2.
  ///
  /// In en, this message translates to:
  /// **'Declaration Number (2)'**
  String get txDeclarationNumber2;

  /// No description provided for @txDeclarationType2.
  ///
  /// In en, this message translates to:
  /// **'Declaration Type (2)'**
  String get txDeclarationType2;

  /// No description provided for @txPortType.
  ///
  /// In en, this message translates to:
  /// **'Port Type'**
  String get txPortType;

  /// No description provided for @txCurrency.
  ///
  /// In en, this message translates to:
  /// **'Currency'**
  String get txCurrency;

  /// No description provided for @stagePreparation.
  ///
  /// In en, this message translates to:
  /// **'Preparation'**
  String get stagePreparation;

  /// No description provided for @stageCustomsClearance.
  ///
  /// In en, this message translates to:
  /// **'Customs clearance'**
  String get stageCustomsClearance;

  /// No description provided for @stageStorage.
  ///
  /// In en, this message translates to:
  /// **'Storage'**
  String get stageStorage;

  /// No description provided for @stageTransportation.
  ///
  /// In en, this message translates to:
  /// **'Transportation'**
  String get stageTransportation;

  /// No description provided for @docBillOfLading.
  ///
  /// In en, this message translates to:
  /// **'Bill of Lading'**
  String get docBillOfLading;

  /// No description provided for @docCertificateOfOrigin.
  ///
  /// In en, this message translates to:
  /// **'Certificate of Origin'**
  String get docCertificateOfOrigin;

  /// No description provided for @docInvoice.
  ///
  /// In en, this message translates to:
  /// **'Invoice'**
  String get docInvoice;

  /// No description provided for @docPackingList.
  ///
  /// In en, this message translates to:
  /// **'Packing List'**
  String get docPackingList;

  /// No description provided for @txContainerSize.
  ///
  /// In en, this message translates to:
  /// **'Container size'**
  String get txContainerSize;

  /// No description provided for @txUnitNumber.
  ///
  /// In en, this message translates to:
  /// **'Unit number'**
  String get txUnitNumber;

  /// No description provided for @txDocumentPostalNumber.
  ///
  /// In en, this message translates to:
  /// **'Document postal number'**
  String get txDocumentPostalNumber;

  /// No description provided for @txPortOfLading.
  ///
  /// In en, this message translates to:
  /// **'Port of lading'**
  String get txPortOfLading;

  /// No description provided for @txPortOfDischarge.
  ///
  /// In en, this message translates to:
  /// **'Port of discharge'**
  String get txPortOfDischarge;

  /// No description provided for @txDestination.
  ///
  /// In en, this message translates to:
  /// **'Destination'**
  String get txDestination;

  /// No description provided for @txTransferDetailsSection.
  ///
  /// In en, this message translates to:
  /// **'Transfer Details'**
  String get txTransferDetailsSection;

  /// No description provided for @txTransportationSection.
  ///
  /// In en, this message translates to:
  /// **'Transportation'**
  String get txTransportationSection;

  /// No description provided for @txTransportationTo.
  ///
  /// In en, this message translates to:
  /// **'The appointment'**
  String get txTransportationTo;

  /// No description provided for @txTrachNo.
  ///
  /// In en, this message translates to:
  /// **'TrachNo'**
  String get txTrachNo;

  /// No description provided for @txTransportationCompany.
  ///
  /// In en, this message translates to:
  /// **'Company transportation'**
  String get txTransportationCompany;

  /// No description provided for @txTransportationFrom.
  ///
  /// In en, this message translates to:
  /// **'From'**
  String get txTransportationFrom;

  /// No description provided for @txTransportationToLocation.
  ///
  /// In en, this message translates to:
  /// **'To'**
  String get txTransportationToLocation;

  /// No description provided for @txTripCharge.
  ///
  /// In en, this message translates to:
  /// **'Trip Charge'**
  String get txTripCharge;

  /// No description provided for @txWaitingCharge.
  ///
  /// In en, this message translates to:
  /// **'Waiting charge'**
  String get txWaitingCharge;

  /// No description provided for @txMaccrikCharge.
  ///
  /// In en, this message translates to:
  /// **'Maccrik charge'**
  String get txMaccrikCharge;

  /// No description provided for @txPartiesSection.
  ///
  /// In en, this message translates to:
  /// **'Parties'**
  String get txPartiesSection;

  /// No description provided for @txShipmentCoreSection.
  ///
  /// In en, this message translates to:
  /// **'Basic shipment data'**
  String get txShipmentCoreSection;

  /// No description provided for @txCargoContainersSection.
  ///
  /// In en, this message translates to:
  /// **'Goods & containers'**
  String get txCargoContainersSection;

  /// No description provided for @txWorkflowSection.
  ///
  /// In en, this message translates to:
  /// **'Workflow & status'**
  String get txWorkflowSection;

  /// No description provided for @txAttachmentsSection.
  ///
  /// In en, this message translates to:
  /// **'Document attachments'**
  String get txAttachmentsSection;

  /// No description provided for @txOrderDate.
  ///
  /// In en, this message translates to:
  /// **'Order date'**
  String get txOrderDate;

  /// No description provided for @roleEmployee2.
  ///
  /// In en, this message translates to:
  /// **'Employee 2'**
  String get roleEmployee2;

  /// No description provided for @shippingViewOnMap.
  ///
  /// In en, this message translates to:
  /// **'View on map'**
  String get shippingViewOnMap;

  /// No description provided for @shippingViewLocation.
  ///
  /// In en, this message translates to:
  /// **'View location'**
  String get shippingViewLocation;

  /// No description provided for @employeesEmailTaken.
  ///
  /// In en, this message translates to:
  /// **'This email is already in use.'**
  String get employeesEmailTaken;

  /// No description provided for @employeesLastManagerRole.
  ///
  /// In en, this message translates to:
  /// **'Cannot change the role of the only manager.'**
  String get employeesLastManagerRole;

  /// No description provided for @employeesLastManagerDelete.
  ///
  /// In en, this message translates to:
  /// **'Cannot delete the only manager.'**
  String get employeesLastManagerDelete;

  /// No description provided for @employeesDeleteSelfError.
  ///
  /// In en, this message translates to:
  /// **'You cannot delete your own account.'**
  String get employeesDeleteSelfError;

  /// No description provided for @txDeclTypeImport.
  ///
  /// In en, this message translates to:
  /// **'Import'**
  String get txDeclTypeImport;

  /// No description provided for @txDeclTypeImportFreeZone.
  ///
  /// In en, this message translates to:
  /// **'Import to Free Zone'**
  String get txDeclTypeImportFreeZone;

  /// No description provided for @txDeclTypeImportReExport.
  ///
  /// In en, this message translates to:
  /// **'Import for Re-Export'**
  String get txDeclTypeImportReExport;

  /// No description provided for @txDeclTypeTemporaryImport.
  ///
  /// In en, this message translates to:
  /// **'Temporary Import'**
  String get txDeclTypeTemporaryImport;

  /// No description provided for @txDeclTypeTransfer.
  ///
  /// In en, this message translates to:
  /// **'Transfer'**
  String get txDeclTypeTransfer;

  /// No description provided for @txDeclTypeExport.
  ///
  /// In en, this message translates to:
  /// **'Export'**
  String get txDeclTypeExport;

  /// No description provided for @txDeclTypeTransitOut.
  ///
  /// In en, this message translates to:
  /// **'Transit out'**
  String get txDeclTypeTransitOut;

  /// No description provided for @txDeclTypeExportGcc.
  ///
  /// In en, this message translates to:
  /// **'Export to GCC'**
  String get txDeclTypeExportGcc;

  /// No description provided for @txDeclTypeTransitin.
  ///
  /// In en, this message translates to:
  /// **'Transitin'**
  String get txDeclTypeTransitin;

  /// No description provided for @txDeclTypeTransitinGcc.
  ///
  /// In en, this message translates to:
  /// **'Transitin from GCC'**
  String get txDeclTypeTransitinGcc;

  /// No description provided for @txPortSeaports.
  ///
  /// In en, this message translates to:
  /// **'Seaports'**
  String get txPortSeaports;

  /// No description provided for @txPortFreeZones.
  ///
  /// In en, this message translates to:
  /// **'Free Zones'**
  String get txPortFreeZones;

  /// No description provided for @txPortMainland.
  ///
  /// In en, this message translates to:
  /// **'Mainland'**
  String get txPortMainland;

  /// No description provided for @profileAccountInfo.
  ///
  /// In en, this message translates to:
  /// **'Account information'**
  String get profileAccountInfo;

  /// No description provided for @profileEditTitle.
  ///
  /// In en, this message translates to:
  /// **'Edit profile'**
  String get profileEditTitle;

  /// No description provided for @profileMemberSince.
  ///
  /// In en, this message translates to:
  /// **'Member since'**
  String get profileMemberSince;

  /// No description provided for @profileLastUpdated.
  ///
  /// In en, this message translates to:
  /// **'Last updated'**
  String get profileLastUpdated;

  /// No description provided for @profileAccountId.
  ///
  /// In en, this message translates to:
  /// **'Account ID'**
  String get profileAccountId;

  /// No description provided for @profileUpdated.
  ///
  /// In en, this message translates to:
  /// **'Profile updated'**
  String get profileUpdated;

  /// No description provided for @notificationsTitle.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notificationsTitle;

  /// No description provided for @notificationsMarkAllRead.
  ///
  /// In en, this message translates to:
  /// **'Mark all read'**
  String get notificationsMarkAllRead;

  /// No description provided for @notificationsClearList.
  ///
  /// In en, this message translates to:
  /// **'Clear list'**
  String get notificationsClearList;
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) => <String>['ar', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {


  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar': return AppLocalizationsAr();
    case 'en': return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.'
  );
}
