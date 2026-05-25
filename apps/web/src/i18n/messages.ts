export type Locale = "ar" | "en";

export const LOCALE_STORAGE_KEY = "app_locale";
export const DEFAULT_LOCALE: Locale = "ar";

export type MessageKey =
  | "lang.label"
  | "lang.ar"
  | "lang.en"
  | "app.title"
  | "app.tagline"
  | "app.loggedInAs"
  | "nav.home"
  | "nav.imports"
  | "nav.employeeSection"
  | "nav.clients"
  | "nav.shippingCompanies"
  | "nav.addTransaction"
  | "nav.logout"
  | "list.loadError"
  | "list.col.client"
  | "list.col.shippingCompany"
  | "list.col.declaration"
  | "list.col.status"
  | "list.col.channel"
  | "list.col.value"
  | "list.col.createdAt"
  | "list.col.storage"
  | "storagePage.title"
  | "storagePage.backToRecord"
  | "storagePage.subStage.input"
  | "storagePage.subStage.output"
  | "storagePage.subStage.seal"
  | "storagePage.section.input"
  | "storagePage.section.exit"
  | "storagePage.section.seal"
  | "storagePage.loadingEquipmentFare"
  | "storagePage.replaceContainers"
  | "storagePage.entryLockNumbers"
  | "storagePage.outContainerNumbers"
  | "storagePage.outLockNumbers"
  | "storagePage.switchDate"
  | "storagePage.entryContainerNumbers"
  | "storagePage.unitCount"
  | "storagePage.openCard"
  | "storagePage.wrongStage"
  | "storagePage.accountantReadOnly"
  | "details.linkStorage"
  | "form.storage.openDedicatedPage"
  | "list.empty"
  | "list.searchPlaceholder"
  | "list.filterAllStatuses"
  | "list.filterAllChannels"
  | "list.noResults"
  | "notFound.title"
  | "notFound.dashboard"
  | "login.title"
  | "login.subtitle"
  | "login.email"
  | "login.password"
  | "login.submit"
  | "login.submitting"
  | "login.error"
  | "login.demoHint"
  | "employees.title"
  | "employees.currentRole"
  | "employees.roleFromAccount"
  | "employees.managerTitle"
  | "employees.managerDesc"
  | "employees.employeeTitle"
  | "employees.employeeDesc"
  | "employees.employee2Title"
  | "employees.employee2Desc"
  | "employees.accountantTitle"
  | "employees.accountantDesc"
  | "employees.goTracker"
  | "employees.back"
  | "employees.managerOnly"
  | "employees.name"
  | "employees.email"
  | "employees.password"
  | "employees.passwordHintEdit"
  | "employees.role"
  | "employees.loadError"
  | "employees.saveError"
  | "employees.deleteError"
  | "employees.deleteConfirm"
  | "employees.create"
  | "employees.update"
  | "employees.edit"
  | "employees.delete"
  | "employees.cancelEdit"
  | "employees.empty"
  | "employees.actions"
  | "employees.emailTaken"
  | "employees.lastManagerRole"
  | "employees.lastManagerDelete"
  | "employees.deleteSelfError"
  | "form.back"
  | "form.newTitle"
  | "form.editTitle"
  | "form.accessLimitedTitle"
  | "form.accessLimitedBody"
  | "form.loadError"
  | "form.saveError"
  | "form.validationError"
  | "form.saveLockedHint"
  | "form.storage.sectionTitle"
  | "form.storage.entryDate"
  | "form.storage.workersWages"
  | "form.storage.workersCompany"
  | "form.storage.storeName"
  | "form.storage.sizeCbm"
  | "form.storage.freightVehicleNumbers"
  | "form.storage.crossPackaging"
  | "form.storage.unity"
  | "form.storage.sealNumber"
  | "form.storage.readOnlyHint"
  | "form.storage.noUploadError"
  | "form.clientName"
  | "form.shippingCompanyName"
  | "form.shippingCompanyId"
  | "form.airwayBill"
  | "form.hsCode"
  | "form.origin"
  | "form.invoiceValue"
  | "form.documentStatus"
  | "form.paymentStatus"
  | "form.goodsDescription"
  | "form.save"
  | "form.saving"
  | "form.invoiceToWeightRate"
  | "form.invoiceToWeightRateHint"
  | "form.goodsWeightKg"
  | "form.derivedWeight"
  | "form.containerCount"
  | "form.containerArrivalDate"
  | "form.documentArrivalDate"
  | "form.documentPostalNumber"
  | "form.goodsQuantity"
  | "form.goodsQuality"
  | "form.goodsUnit"
  | "form.unitsType"
  | "form.numberOfUnits"
  | "form.optionalSelect"
  | "form.quality.new"
  | "form.quality.like_new"
  | "form.quality.used"
  | "form.quality.refurbished"
  | "form.quality.damaged"
  | "form.quality.mixed"
  | "form.unit.kg"
  | "form.unit.ton"
  | "form.unit.piece"
  | "form.unit.carton"
  | "form.unit.pallet"
  | "form.unit.cbm"
  | "form.unit.liter"
  | "form.unit.set"
  | "form.documentPhotosHelp"
  | "form.documentPhotosSection"
  | "form.removeAttachment"
  | "form.filesSelected"
  | "details.title"
  | "details.back"
  | "details.edit"
  | "details.delete"
  | "details.deleting"
  | "details.markPaid"
  | "details.release"
  | "details.originalBl"
  | "details.loadError"
  | "details.deleteError"
  | "details.deleteConfirm"
  | "details.actionError"
  | "details.loading"
  | "details.client"
  | "details.shippingCompany"
  | "details.createdAt"
  | "details.declaration"
  | "details.airwayBill"
  | "details.hsCode"
  | "details.goods"
  | "details.origin"
  | "details.invoiceValue"
  | "details.currencySuffix"
  | "details.risk"
  | "details.channel"
  | "details.document"
  | "details.status"
  | "details.payment"
  | "details.releaseCode"
  | "details.notIssued"
  | "details.containerCount"
  | "details.goodsWeightKg"
  | "details.invoiceToWeightRate"
  | "details.containerArrivalDate"
  | "details.documentArrivalDate"
  | "details.documentPostalNumber"
  | "details.goodsQuantity"
  | "details.goodsQuality"
  | "details.goodsUnit"
  | "details.documentPhotos"
  | "details.openAttachment"
  | "role.manager"
  | "role.employee"
  | "role.employee2"
  | "role.accountant"
  | "clients.title"
  | "clients.back"
  | "clients.managerOnly"
  | "clients.loadError"
  | "clients.saveError"
  | "clients.deleteError"
  | "clients.deleteConfirm"
  | "clients.companyName"
  | "clients.trn"
  | "clients.immigrationCode"
  | "clients.clientEmail"
  | "clients.country"
  | "clients.creditLimit"
  | "clients.status"
  | "clients.actions"
  | "clients.create"
  | "clients.update"
  | "clients.edit"
  | "clients.delete"
  | "clients.empty"
  | "clients.active"
  | "clients.suspended"
  | "clients.detailTitle"
  | "clients.detailLoadError"
  | "shipping.title"
  | "shipping.back"
  | "shipping.managerOnly"
  | "shipping.loadError"
  | "shipping.saveError"
  | "shipping.deleteError"
  | "shipping.deleteConfirm"
  | "shipping.companyName"
  | "shipping.code"
  | "shipping.contactName"
  | "shipping.phone"
  | "shipping.email"
  | "shipping.dispatchFormTemplate"
  | "shipping.dispatchFormTemplateHint"
  | "shipping.location"
  | "shipping.mapClickHint"
  | "shipping.clearLocation"
  | "shipping.viewOnMap"
  | "shipping.status"
  | "shipping.actions"
  | "shipping.create"
  | "shipping.update"
  | "shipping.edit"
  | "shipping.delete"
  | "shipping.empty"
  | "shipping.active"
  | "shipping.inactive"
  | "shipping.detailTitle"
  | "shipping.detailLoadError"
  | "shipping.locationHint"
  | "shipping.viewLocation"
  | "form.typeToSearch"
  | "details.shippingPaperButton"
  | "details.shippingPaperTitle"
  | "details.shippingPaperHeading"
  | "details.shippingPaperSub"
  | "details.shippingPaperTo"
  | "details.shippingPaperFrom"
  | "details.shippingPaperMessage"
  | "details.shippingPaperMessagePlaceholder"
  | "details.shippingPaperPrint"
  | "details.shippingPaperClose"
  | "app.roleEmployee2"
  | "list.filterAllStages"
  | "list.paginationPrev"
  | "list.paginationNext"
  | "stage.PREPARATION"
  | "stage.CUSTOMS_CLEARANCE"
  | "stage.TRANSPORTATION"
  | "stage.STORAGE"
  | "docCategory.bill_of_lading"
  | "docCategory.certificate_of_origin"
  | "docCategory.invoice"
  | "docCategory.packing_list"
  | "docCategory.uncategorized"
  | "form.stage"
  | "form.snapshotReadOnly"
  | "form.stageChangeError"
  | "form.fileNumber"
  | "form.partiesSection"
  | "form.customsDeclarationSection"
  | "form.declarationNumber1"
  | "form.declarationNumber2"
  | "form.declarationDate"
  | "form.declarationType1"
  | "form.declarationType2"
  | "form.portType"
  | "form.shipmentCoreSection"
  | "form.currency"
  | "form.cargoContainersSection"
  | "form.containerNumbers"
  | "form.containerNumbersPlaceholder"
  | "form.workflowStatusSection"
  | "form.stopTransaction"
  | "form.stopReason"
  | "form.yes"
  | "form.no"
  | "form.selectDocumentCategory"
  | "form.categoryRequiredError"
  | "form.documentStatus.copy_received"
  | "form.documentStatus.original_received"
  | "form.documentStatus.telex_release"
  | "form.paymentStatus.pending"
  | "form.paymentStatus.paid"
  | "form.attachmentsSection"
  | "form.declarationType.import"
  | "form.declarationType.import_free_zone"
  | "form.declarationType.import_re_export"
  | "form.declarationType.temporary_import"
  | "form.declarationType.transfer"
  | "form.declarationType.export"
  | "form.declarationType.transit_out"
  | "form.declarationType.export_gcc"
  | "form.declarationType.transitin"
  | "form.declarationType.transitin_gcc"
  | "form.portType.seaports"
  | "form.portType.free_zones"
  | "form.portType.mainland"
  | "nav.transfers"
  | "nav.exports"
  | "nav.addTransfer"
  | "nav.addExport"
  | "transfer.app.title"
  | "transfer.app.tagline"
  | "transfer.list.loadError"
  | "transfer.form.newTitle"
  | "transfer.form.editTitle"
  | "transfer.details.title"
  | "export.app.title"
  | "export.app.tagline"
  | "export.list.loadError"
  | "export.form.newTitle"
  | "export.form.editTitle"
  | "export.form.exportDetails"
  | "export.details.title"
  | "dashboard.transactionsDesc"
  | "dashboard.transfersDesc"
  | "dashboard.exportsDesc"
  | "dashboard.toolsHeading"
  | "notifications.title"
  | "notifications.markAllRead"
  | "notifications.loading"
  | "notifications.empty"
  | "notifications.clearList"
  | "home.title"
  | "home.tagline"
  | "home.modulesHeading"
  | "home.openFullList"
  | "home.snapshotHint"
  | "home.activityHeading"
  | "home.paginationSummary"
  | "home.loadError"
  | "home.empty"
  | "home.col.module"
  | "home.loading"
  | "form.orderDate"
  | "form.containerSize"
  | "form.portOfLading"
  | "form.portOfDischarge"
  | "form.destination"
  | "form.unitNumber"
  | "transportation.sectionTitle"
  | "transportation.toUpper"
  | "transportation.trachNo"
  | "transportation.company"
  | "transportation.from"
  | "transportation.to"
  | "transportation.tripCharge"
  | "transportation.waitingCharge"
  | "transportation.maccrikCharge";

const messages: Record<Locale, Record<MessageKey, string>> = {
  ar: {
    "lang.label": "اللغة",
    "lang.ar": "العربية",
    "lang.en": "English",
    "app.title": "الإستيراد",
    "app.tagline": "إنشاء المعاملات وتعديلها وإدارتها بالكامل.",
    "app.loggedInAs": "مسجّل الدخول",
    "nav.home": "الرئيسية",
    "nav.imports": "الإستيراد",
    "nav.employeeSection": "قسم الموظفين",
    "nav.clients": "العملاء",
    "nav.shippingCompanies": "شركات الشحن",
    "nav.transfers": "قسم التحويل",
    "nav.exports": "قسم التصدير",
    "nav.addTransaction": "إضافة معاملة جديدة",
    "nav.addTransfer": "إضافة تحويل جديد",
    "nav.addExport": "إضافة تصدير جديد",
    "nav.logout": "تسجيل الخروج",
    "list.loadError": "تعذر تحميل المعاملات. هل يعمل الخادم على المنفذ 4000؟",
    "list.col.client": "العميل",
    "list.col.shippingCompany": "شركة الشحن",
    "list.col.declaration": "رقم الإقرار",
    "list.col.status": "الحالة",
    "list.col.channel": "القناة",
    "list.col.value": "القيمة (درهم)",
    "list.col.createdAt": "تاريخ الإنشاء",
    "list.col.storage": "التخزين",
    "storagePage.title": "بطاقة التخزين",
    "storagePage.backToRecord": "العودة إلى المعاملة",
    "storagePage.subStage.input": "إدخال",
    "storagePage.subStage.output": "إخراج",
    "storagePage.subStage.seal": "تبديل",
    "storagePage.section.input": "أ — بيانات الإدخال",
    "storagePage.section.exit": "ب — بيانات الإخراج",
    "storagePage.section.seal": "ج — التبديل",
    "storagePage.loadingEquipmentFare": "أجرة معدات التحميل",
    "storagePage.replaceContainers": "استبدال الحاويات",
    "storagePage.entryLockNumbers": "أرقام الأقفال الداخلة",
    "storagePage.outContainerNumbers": "أرقام الحاويات الخارجة",
    "storagePage.outLockNumbers": "أرقام الأقفال الخارجة",
    "storagePage.switchDate": "تاريخ التبديل",
    "storagePage.entryContainerNumbers": "أرقام الحاويات الداخله",
    "storagePage.unitCount": "عدد الوحدات",
    "storagePage.openCard": "بطاقة التخزين",
    "storagePage.wrongStage": "هذه المعاملة ليست في مرحلة التخزين.",
    "storagePage.accountantReadOnly": "عرض فقط لدور المحاسب.",
    "details.linkStorage": "بطاقة التخزين",
    "form.storage.openDedicatedPage": "فتح بطاقة التخزين (إدخال / إخراج / تبديل)",
    "list.empty": "لا توجد معاملات بعد. أضف أول معاملة.",
    "list.searchPlaceholder": "بحث تلقائي: عميل، شركة شحن، إقرار، بوليصة...",
    "list.filterAllStatuses": "كل الحالات",
    "list.filterAllChannels": "كل القنوات",
    "list.noResults": "لا توجد نتائج مطابقة للبحث/الفلاتر.",
    "notFound.title": "الصفحة غير موجودة",
    "notFound.dashboard": "الانتقال إلى لوحة التحكم",
    "login.title": "تسجيل الدخول",
    "login.subtitle": "سجّل الدخول للوصول إلى المعاملات.",
    "login.email": "البريد الإلكتروني",
    "login.password": "كلمة المرور",
    "login.submit": "دخول",
    "login.submitting": "جاري تسجيل الدخول…",
    "login.error": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    "login.demoHint":
      "حسابات تجريبية: manager@tracker.local / 123456، employee@tracker.local / 123456، accountant@tracker.local / 123456",
    "employees.title": "قسم الموظفين",
    "employees.currentRole": "الدور الحالي",
    "employees.roleFromAccount": "يُحدَّد الدور من حساب تسجيل الدخول.",
    "employees.managerTitle": "مدير",
    "employees.managerDesc": "صلاحيات كاملة: إنشاء، تعديل، حذف، الدفع، والإفراج.",
    "employees.employeeTitle": "موظف",
    "employees.employeeDesc": "إدارة المعاملات ما عدا المحاسبة والفوترة.",
    "employees.employee2Title": "موظف 2",
    "employees.employee2Desc": "إدارة بيانات التخليص الجمركي للمرحلة الثانية فقط.",
    "employees.accountantTitle": "محاسب",
    "employees.accountantDesc": "إدارة المحاسبة والفوترة (الدفع والإفراج).",
    "employees.goTracker": "الذهاب إلى المعاملات",
    "employees.back": "العودة",
    "employees.managerOnly": "إضافة الموظفين وتعديلهم وحذفهم متاح للمدير فقط.",
    "employees.name": "الاسم",
    "employees.email": "البريد الإلكتروني",
    "employees.password": "كلمة المرور",
    "employees.passwordHintEdit": "اتركه فارغًا للإبقاء على كلمة المرور الحالية.",
    "employees.role": "الدور",
    "employees.loadError": "تعذر تحميل الموظفين.",
    "employees.saveError": "تعذر حفظ بيانات الموظف.",
    "employees.deleteError": "تعذر حذف الموظف.",
    "employees.deleteConfirm": "حذف هذا الموظف؟",
    "employees.create": "إضافة موظف",
    "employees.update": "تحديث الموظف",
    "employees.edit": "تعديل",
    "employees.delete": "حذف",
    "employees.cancelEdit": "إلغاء",
    "employees.empty": "لا يوجد موظفون.",
    "employees.actions": "الإجراءات",
    "employees.emailTaken": "هذا البريد مستخدم بالفعل.",
    "employees.lastManagerRole": "لا يمكن تغيير دور المدير الوحيد.",
    "employees.lastManagerDelete": "لا يمكن حذف المدير الوحيد.",
    "employees.deleteSelfError": "لا يمكن حذف حسابك الحالي.",
    "form.back": "العودة للقائمة",
    "form.newTitle": "معاملة جديدة",
    "form.editTitle": "تعديل المعاملة",
    "form.accessLimitedTitle": "صلاحية محدودة",
    "form.accessLimitedBody": "دور المحاسب مقصور على عمليات المحاسبة والفوترة من صفحة تفاصيل المعاملة.",
    "form.loadError": "تعذر تحميل المعاملة",
    "form.saveError": "تعذر حفظ المعاملة",
    "form.validationError": "يرجى إكمال جميع الحقول المطلوبة. ستُظهر المتصفح الحقول غير الصالحة.",
    "form.saveLockedHint": "الحفظ معطل في مراحل التسليم الداخلي أو الخارجي.",
    "form.storage.sectionTitle": "التخزين (الإدخال / الإخراج / التبديل)",
    "form.storage.entryDate": "تاريخ الإدخال",
    "form.storage.workersWages": "أجور العمال",
    "form.storage.workersCompany": "شركة العمال",
    "form.storage.storeName": "اسم المستودع",
    "form.storage.sizeCbm": "الحجم (م³ CBM)",
    "form.storage.freightVehicleNumbers": "أرقام مركبات الشحن",
    "form.storage.crossPackaging": "التعبئة المتقاطعة",
    "form.storage.unity": "الوحدة",
    "form.storage.sealNumber": "رقم التبديل / الطابع",
    "form.storage.readOnlyHint": "في مرحلة التخزين تكون الحقول للقراءة فقط. عدّل بيانات المستودع من بطاقة التخزين.",
    "form.storage.noUploadError": "لا يمكن رفع مرفقات جديدة في مرحلة التخزين.",
    "form.clientName": "اسم العميل",
    "form.shippingCompanyName": "اسم شركة الشحن",
    "form.shippingCompanyId": "معرف شركة الشحن",
    "form.airwayBill": "بوليصة الشحن / الرقم",
    "form.hsCode": "رمز HS",
    "form.origin": "بلد المنشأ",
    "form.invoiceValue": "قيمة الفاتورة",
    "form.documentStatus": "حالة المستند",
    "form.paymentStatus": "حالة الدفع",
    "form.goodsDescription": "وصف البضائع",
    "form.save": "حفظ المعاملة",
    "form.saving": "جاري الحفظ…",
    "form.invoiceToWeightRate": "سعر التحويل (درهم لكل كجم)",
    "form.invoiceToWeightRateHint": "قسمة قيمة الفاتورة على هذا السعر = الوزن",
    "form.goodsWeightKg": "وزن البضائع (كجم)",
    "form.derivedWeight": "محسوب",
    "form.containerCount": "عدد الحاويات",
    "form.containerArrivalDate": "تاريخ وصول الحاوية",
    "form.documentArrivalDate": "تاريخ وصول المستندات",
    "form.documentPostalNumber": "الرقم البريدي للمستندات",
    "form.goodsQuantity": "قياسات البضائع",
    "form.goodsQuality": "جودة البضائع",
    "form.goodsUnit": "وحدة القياس",
    "form.unitsType": "نوع الوحدات",
    "form.numberOfUnits": "عدد الوحدات",
    "form.optionalSelect": "— اختر —",
    "form.quality.new": "جديد",
    "form.quality.like_new": "شبه جديد",
    "form.quality.used": "مستعمل",
    "form.quality.refurbished": "مجدّد",
    "form.quality.damaged": "تالف",
    "form.quality.mixed": "مختلط",
    "form.unit.kg": "كيلوغرام",
    "form.unit.ton": "طن",
    "form.unit.piece": "قطعة",
    "form.unit.carton": "كرتون",
    "form.unit.pallet": "منصّة",
    "form.unit.cbm": "م³ (CBM)",
    "form.unit.liter": "لتر",
    "form.unit.set": "طقم",
    "form.documentPhotosHelp": "إرفاق صور أو ملفات PDF للمستندات (اختياري).",
    "form.documentPhotosSection": "مرفقات المستندات",
    "form.removeAttachment": "إزالة",
    "form.filesSelected": "ملف(ات) جديدة للرفع",
    "details.title": "تفاصيل المعاملة",
    "details.back": "العودة للقائمة",
    "details.edit": "تعديل",
    "details.delete": "حذف",
    "details.deleting": "جاري الحذف…",
    "details.markPaid": "تمييز كمدفوع",
    "details.release": "إصدار الإفراج",
    "details.originalBl": "استلام بوليصة الشحن الأصلية",
    "details.loadError": "تعذر تحميل تفاصيل المعاملة.",
    "details.deleteError": "تعذر حذف المعاملة.",
    "details.deleteConfirm": "حذف هذه المعاملة؟",
    "details.actionError": "فشلت العملية. تحقق من الصلاحيات أو المتطلبات.",
    "details.loading": "جاري التحميل…",
    "details.client": "العميل",
    "details.shippingCompany": "شركة الشحن",
    "details.createdAt": "تاريخ الإنشاء",
    "details.declaration": "الإقرار",
    "details.airwayBill": "بوليصة الشحن",
    "details.hsCode": "رمز HS",
    "details.goods": "البضائع",
    "details.origin": "المنشأ",
    "details.invoiceValue": "قيمة الفاتورة",
    "details.currencySuffix": "درهم",
    "details.risk": "المخاطر",
    "details.channel": "القناة",
    "details.document": "المستند",
    "details.status": "الحالة",
    "details.payment": "الدفع",
    "details.releaseCode": "رمز الإفراج",
    "details.notIssued": "لم يُصدر",
    "details.containerCount": "عدد الحاويات",
    "details.goodsWeightKg": "وزن البضائع (كجم)",
    "details.invoiceToWeightRate": "سعر التحويل (درهم/كجم)",
    "details.containerArrivalDate": "وصول الحاوية",
    "details.documentArrivalDate": "وصول المستندات",
    "details.documentPostalNumber": "الرقم البريدي",
    "details.goodsQuantity": "قياسات البضائع",
    "details.goodsQuality": "الجودة",
    "details.goodsUnit": "وحدة القياس",
    "details.documentPhotos": "مرفقات المستندات",
    "details.openAttachment": "فتح",
    "role.manager": "مدير",
    "role.employee": "موظف",
    "role.employee2": "موظف 2",
    "role.accountant": "محاسب",
    "clients.title": "قسم العملاء",
    "clients.back": "العودة",
    "clients.managerOnly": "التعديل والإدارة متاحة للمدير فقط.",
    "clients.loadError": "تعذر تحميل العملاء.",
    "clients.saveError": "تعذر حفظ بيانات العميل.",
    "clients.deleteError": "تعذر حذف العميل.",
    "clients.deleteConfirm": "هل تريد حذف هذا العميل؟",
    "clients.companyName": "اسم الشركة",
    "clients.trn": "هاتف جهة الاتصال",
    "clients.immigrationCode": "معرّف العميل",
    "clients.clientEmail": "البريد الإلكتروني للعميل",
    "clients.country": "الدولة",
    "clients.creditLimit": "الحد الائتماني",
    "clients.status": "الحالة",
    "clients.actions": "الإجراءات",
    "clients.create": "إضافة عميل",
    "clients.update": "تحديث العميل",
    "clients.edit": "تعديل",
    "clients.delete": "حذف",
    "clients.empty": "لا يوجد عملاء.",
    "clients.active": "نشط",
    "clients.suspended": "موقوف",
    "clients.detailTitle": "تفاصيل العميل",
    "clients.detailLoadError": "تعذر تحميل بيانات العميل.",
    "shipping.title": "قسم شركات الشحن",
    "shipping.back": "العودة",
    "shipping.managerOnly": "التعديل والإدارة متاحة للمدير فقط.",
    "shipping.loadError": "تعذر تحميل شركات الشحن.",
    "shipping.saveError": "تعذر حفظ بيانات شركة الشحن.",
    "shipping.deleteError": "تعذر حذف شركة الشحن.",
    "shipping.deleteConfirm": "هل تريد حذف شركة الشحن هذه؟",
    "shipping.companyName": "اسم الشركة",
    "shipping.code": "الكود",
    "shipping.contactName": "اسم جهة الاتصال",
    "shipping.phone": "الهاتف",
    "shipping.email": "البريد الإلكتروني",
    "shipping.dispatchFormTemplate": "نموذج رسالة إرسال الشحن",
    "shipping.dispatchFormTemplateHint":
      "يُستخدم كنص افتراضي في حقل الملاحظات عند طباعة نموذج الإرسال لشركة الشحن؛ يمكن للموظف تعديله قبل الطباعة.",
    "shipping.location": "الموقع",
    "shipping.mapClickHint": "انقر على الخريطة لتحديد موقع المكتب.",
    "shipping.clearLocation": "إزالة الموقع",
    "shipping.viewOnMap": "عرض على الخريطة",
    "shipping.status": "الحالة",
    "shipping.actions": "الإجراءات",
    "shipping.create": "إضافة شركة شحن",
    "shipping.update": "تحديث شركة الشحن",
    "shipping.edit": "تعديل",
    "shipping.delete": "حذف",
    "shipping.empty": "لا توجد شركات شحن.",
    "shipping.active": "نشط",
    "shipping.inactive": "غير نشط",
    "shipping.detailTitle": "تفاصيل شركة الشحن",
    "shipping.detailLoadError": "تعذر تحميل بيانات شركة الشحن.",
    "shipping.locationHint": "يمكنك إدخال رابط خرائط أو النقر على الخريطة.",
    "shipping.viewLocation": "عرض الموقع",
    "form.typeToSearch": "اكتب للبحث والاختيار من القائمة",
    "details.shippingPaperButton": "نموذج ورقي لشركة الشحن",
    "details.shippingPaperTitle": "نموذج إرسال لشركة الشحن",
    "details.shippingPaperHeading": "مستند شحن / إخلاء",
    "details.shippingPaperSub": "يُعدّل أدناه ثم يُطبع لإرساله مع الشحنة.",
    "details.shippingPaperTo": "إلى (شركة الشحن)",
    "details.shippingPaperFrom": "العميل",
    "details.shippingPaperMessage": "رسالة",
    "details.shippingPaperMessagePlaceholder": "تعليمات التسليم، عنوان، هاتف، إلخ.",
    "details.shippingPaperPrint": "طباعة",
    "details.shippingPaperClose": "إغلاق",
    "app.roleEmployee2": "موظف 2",
    "list.filterAllStages": "كل المراحل",
    "list.paginationPrev": "السابق",
    "list.paginationNext": "التالي",
    "stage.PREPARATION": "التحضير",
    "stage.CUSTOMS_CLEARANCE": "التخليص الجمركي",
    "stage.TRANSPORTATION": "النقل",
    "stage.STORAGE": "التخزين",
    "docCategory.bill_of_lading": "بوليصة الشحن",
    "docCategory.certificate_of_origin": "شهادة المنشأ",
    "docCategory.invoice": "فاتورة",
    "docCategory.packing_list": "قائمة التعبئة",
    "docCategory.uncategorized": "غير مصنف",
    "form.stage": "مرحلة المعاملة",
    "form.snapshotReadOnly": "ملخص المعاملة (للقراءة فقط)",
    "form.stageChangeError": "فشل تغيير المرحلة",
    "form.fileNumber": "رقم الملف",
    "form.partiesSection": "الأطراف",
    "form.customsDeclarationSection": "الإقرار الجمركي",
    "form.declarationNumber1": "رقم الإقرار (1)",
    "form.declarationNumber2": "رقم الإقرار (2)",
    "form.declarationDate": "تاريخ الإقرار",
    "form.declarationType1": "نوع الإقرار (1)",
    "form.declarationType2": "نوع الإقرار (2)",
    "form.portType": "نوع المنفذ",
    "form.shipmentCoreSection": "بيانات الشحنة الأساسية",
    "form.currency": "العملة",
    "form.cargoContainersSection": "البضاعة والحاويات",
    "form.containerNumbers": "أرقام الحاويات",
    "form.containerNumbersPlaceholder": "مثال: MSKU1234567, TGHU9876543",
    "form.workflowStatusSection": "سير العمل والحالة",
    "form.stopTransaction": "إيقاف المعاملة",
    "form.stopReason": "سبب الإيقاف",
    "form.yes": "نعم",
    "form.no": "لا",
    "form.selectDocumentCategory": "اختر فئة المستند",
    "form.categoryRequiredError": "يرجى اختيار فئة لكل مستند مرفوع.",
    "form.documentStatus.copy_received": "تم استلام نسخة",
    "form.documentStatus.original_received": "تم استلام الأصل",
    "form.documentStatus.telex_release": "إفراج تيليكس",
    "form.paymentStatus.pending": "قيد الانتظار",
    "form.paymentStatus.paid": "مدفوع",
    "form.attachmentsSection": "المرفقات",
    "form.declarationType.import": "استيراد",
    "form.declarationType.import_free_zone": "استيراد إلى المنطقة الحرة",
    "form.declarationType.import_re_export": "استيراد لإعادة التصدير",
    "form.declarationType.temporary_import": "استيراد مؤقت",
    "form.declarationType.transfer": "تحويل",
    "form.declarationType.export": "تصدير",
    "form.declarationType.transit_out": "عبور خارجي",
    "form.declarationType.export_gcc": "تصدير إلى دول الخليج",
    "form.declarationType.transitin": "ترانزيت",
    "form.declarationType.transitin_gcc": "ترانزيت من دول الخليج",
    "form.portType.seaports": "الموانئ البحرية",
    "form.portType.free_zones": "المناطق الحرة",
    "form.portType.mainland": "البر الرئيسي",
    "transfer.app.title": "قسم التحويل",
    "transfer.app.tagline": "إدارة معاملات التحويل بشكل مستقل.",
    "transfer.list.loadError": "تعذر تحميل معاملات التحويل.",
    "transfer.form.newTitle": "تحويل جديد",
    "transfer.form.editTitle": "تعديل التحويل",
    "transfer.details.title": "تفاصيل التحويل",
    "export.app.title": "قسم التصدير",
    "export.app.tagline": "إدارة معاملات التصدير بشكل مستقل.",
    "export.list.loadError": "تعذر تحميل معاملات التصدير.",
    "export.form.newTitle": "تصدير جديد",
    "export.form.editTitle": "تعديل التصدير",
    "export.form.exportDetails": "تفاصيل التصدير",
    "export.details.title": "تفاصيل التصدير",
    "dashboard.transactionsDesc": "المعاملات الجمركية الرئيسية وسيرها الكامل.",
    "dashboard.transfersDesc": "عمليات التحويل بسجل مستقل وقواعد مستقلة.",
    "dashboard.exportsDesc": "ملفات التصدير بسجل مستقل وقواعد مستقلة.",
    "dashboard.toolsHeading": "الوحدات والبحث",
    "notifications.title": "الإشعارات",
    "notifications.markAllRead": "تعليم الكل كمقروء",
    "notifications.loading": "جاري التحميل…",
    "notifications.empty": "لا توجد إشعارات جديدة",
  "notifications.clearList": "مسح القائمة",
    "home.title": "لوحة المشروع",
    "home.tagline": "ملخص النشاط الأخير عبر الاستيراد والتحويل والتصدير.",
    "home.modulesHeading": "افتح قوائم السجلات",
    "home.openFullList": "عرض القائمة الكاملة",
    "home.snapshotHint": "الأرقام أدناه تعرض عدد أحدث السجلات المحمّلة لكل قسم (حتى 40 لكل منها)، وليس إجمالي المشروع.",
    "home.activityHeading": "أحدث حركة على السجلات",
    "home.paginationSummary": "صفحة {page} من {pages} ({total} سجل)",
    "home.loadError": "تعذّر تحميل تقرير النشاط.",
    "home.empty": "لا توجد سجلات حديثة في اللقطة الحالية.",
    "home.col.module": "القسم",
    "home.loading": "جاري التحميل…",
    "form.orderDate": "تاريخ الطلب",
    "form.containerSize": "حجم الحاوية",
    "form.portOfLading": "ميناء الشحن",
    "form.portOfDischarge": "ميناء التفريغ",
    "form.destination": "الوجهة",
    "form.unitNumber": "رقم الوحدة",
    "transportation.sectionTitle": "النقل",
    "transportation.toUpper": "الموعد",
    "transportation.trachNo": "رقم الشاحنة",
    "transportation.company": "شركة النقل",
    "transportation.from": "من",
    "transportation.to": "إلى",
    "transportation.tripCharge": "رسوم الرحلة",
    "transportation.waitingCharge": "رسوم الانتظار",
    "transportation.maccrikCharge": "رسوم ماكريك",
  },
  en: {
    "lang.label": "Language",
    "lang.ar": "العربية",
    "lang.en": "English",
    "app.title": "import",
    "app.tagline": "Create, edit, and fully manage transactions.",
    "app.loggedInAs": "Logged in as",
    "nav.home": "Home",
    "nav.imports": "Imports",
    "nav.employeeSection": "Employee Section",
    "nav.clients": "Clients",
    "nav.shippingCompanies": "Shipping Companies",
    "nav.transfers": "Transfers",
    "nav.exports": "Exports",
    "nav.addTransaction": "Add New Transaction",
    "nav.addTransfer": "Add New Transfer",
    "nav.addExport": "Add New Export",
    "nav.logout": "Logout",
    "list.loadError": "Unable to load transactions. Is API running on port 4000?",
    "list.col.client": "Client",
    "list.col.shippingCompany": "Shipping Company",
    "list.col.declaration": "Declaration",
    "list.col.status": "Status",
    "list.col.channel": "Channel",
    "list.col.value": "Value (AED)",
    "list.col.createdAt": "Created At",
    "list.col.storage": "Storage",
    "storagePage.title": "Storage card",
    "storagePage.backToRecord": "Back to transaction",
    "storagePage.subStage.input": "Input",
    "storagePage.subStage.output": "Output",
    "storagePage.subStage.seal": "Seal",
    "storagePage.section.input": "A — Input (entry) data",
    "storagePage.section.exit": "B — Exit data",
    "storagePage.section.seal": "C — Seal",
    "storagePage.loadingEquipmentFare": "Loading equipment fare",
    "storagePage.replaceContainers": "Replace containers",
    "storagePage.entryLockNumbers": "Entry lock numbers",
    "storagePage.outContainerNumbers": "Out container numbers",
    "storagePage.outLockNumbers": "Out lock numbers",
    "storagePage.switchDate": "Switch date",
    "storagePage.entryContainerNumbers": "Entry container numbers",
    "storagePage.unitCount": "Number of units",
    "storagePage.openCard": "Storage",
    "storagePage.wrongStage": "This record is not in the Storage stage.",
    "storagePage.accountantReadOnly": "Accountants can view this page only.",
    "details.linkStorage": "Storage card",
    "form.storage.openDedicatedPage": "Open storage card (input / output / seal)",
    "list.empty": "No transactions yet. Add your first transaction.",
    "list.searchPlaceholder": "Auto search: client, shipping company, declaration, airway bill...",
    "list.filterAllStatuses": "All statuses",
    "list.filterAllChannels": "All channels",
    "list.noResults": "No results match current search/filters.",
    "notFound.title": "Page not found",
    "notFound.dashboard": "Go to dashboard",
    "login.title": "Login",
    "login.subtitle": "Sign in to access transactions.",
    "login.email": "Email",
    "login.password": "Password",
    "login.submit": "Login",
    "login.submitting": "Signing in…",
    "login.error": "Invalid email or password.",
    "login.demoHint":
      "Demo accounts: manager@tracker.local / 123456, employee@tracker.local / 123456, accountant@tracker.local / 123456",
    "employees.title": "Employee Section",
    "employees.currentRole": "Current logged-in role",
    "employees.roleFromAccount": "Role is assigned by your login account.",
    "employees.managerTitle": "Manager",
    "employees.managerDesc": "Can do everything: create, edit, delete, payment, billing, and release.",
    "employees.employeeTitle": "Employee",
    "employees.employeeDesc": "Can manage transactions except accounting and billing operations.",
    "employees.employee2Title": "Employee 2",
    "employees.employee2Desc": "Handles stage 2 customs clearance data only.",
    "employees.accountantTitle": "Accountant",
    "employees.accountantDesc": "Manages accounting and billing operations (payment and release).",
    "employees.goTracker": "Go to Transactions",
    "employees.back": "Back",
    "employees.managerOnly": "Only the manager can add, edit, or delete employees.",
    "employees.name": "Name",
    "employees.email": "Email",
    "employees.password": "Password",
    "employees.passwordHintEdit": "Leave blank to keep the current password.",
    "employees.role": "Role",
    "employees.loadError": "Unable to load employees.",
    "employees.saveError": "Unable to save employee.",
    "employees.deleteError": "Unable to delete employee.",
    "employees.deleteConfirm": "Delete this employee?",
    "employees.create": "Add employee",
    "employees.update": "Update employee",
    "employees.edit": "Edit",
    "employees.delete": "Delete",
    "employees.cancelEdit": "Cancel",
    "employees.empty": "No employees found.",
    "employees.actions": "Actions",
    "employees.emailTaken": "This email is already in use.",
    "employees.lastManagerRole": "Cannot change the role of the only manager.",
    "employees.lastManagerDelete": "Cannot delete the only manager.",
    "employees.deleteSelfError": "You cannot delete your own account.",
    "form.back": "Back to list",
    "form.newTitle": "New Transaction",
    "form.editTitle": "Edit Transaction",
    "form.accessLimitedTitle": "Access Limited",
    "form.accessLimitedBody":
      "Accountant role is limited to accounting and billing operations in transaction details.",
    "form.loadError": "Unable to load transaction",
    "form.saveError": "Could not save transaction",
    "form.validationError": "Please complete all required fields. The browser will highlight invalid fields.",
    "form.saveLockedHint": "Save is disabled at Transportation and Storage stages.",
    "form.storage.sectionTitle": "Storage (entry / exit / seal)",
    "form.storage.entryDate": "Entry date",
    "form.storage.workersWages": "Workers' wages",
    "form.storage.workersCompany": "Workers company",
    "form.storage.storeName": "Store name",
    "form.storage.sizeCbm": "Size (CBM m³)",
    "form.storage.freightVehicleNumbers": "Freight vehicle numbers",
    "form.storage.crossPackaging": "Cross packaging",
    "form.storage.unity": "Unit",
    "form.storage.sealNumber": "Seal / stamp number",
    "form.storage.readOnlyHint": "At Storage stage fields are read-only here. Edit warehouse data on the storage card.",
    "form.storage.noUploadError": "New document uploads are not allowed at Storage stage.",
    "form.clientName": "Client Name",
    "form.shippingCompanyName": "Shipping Company Name",
    "form.shippingCompanyId": "Shipping Company ID",
    "form.airwayBill": "Airway Bill",
    "form.hsCode": "HS Code",
    "form.origin": "Origin Country",
    "form.invoiceValue": "Invoice Value",
    "form.documentStatus": "Document Status",
    "form.paymentStatus": "Payment Status",
    "form.goodsDescription": "Goods Description",
    "form.save": "Save Transaction",
    "form.saving": "Saving…",
    "form.invoiceToWeightRate": "Invoice → weight rate (AED per kg)",
    "form.invoiceToWeightRateHint": "Invoice value ÷ this rate = weight",
    "form.goodsWeightKg": "Goods weight (kg)",
    "form.derivedWeight": "Calculated",
    "form.containerCount": "Number of containers",
    "form.containerArrivalDate": "Container arrival date",
    "form.documentArrivalDate": "Document arrival date",
    "form.documentPostalNumber": "Document postal number",
    "form.goodsQuantity": "Goods size",
    "form.goodsQuality": "Quality of goods",
    "form.goodsUnit": "Unit of measurement",
    "form.unitsType": "Units type",
    "form.numberOfUnits": "Number of units",
    "form.optionalSelect": "— Select —",
    "form.quality.new": "New",
    "form.quality.like_new": "Like new",
    "form.quality.used": "Used",
    "form.quality.refurbished": "Refurbished",
    "form.quality.damaged": "Damaged",
    "form.quality.mixed": "Mixed",
    "form.unit.kg": "Kilogram (kg)",
    "form.unit.ton": "Ton",
    "form.unit.piece": "Piece",
    "form.unit.carton": "Carton",
    "form.unit.pallet": "Pallet",
    "form.unit.cbm": "CBM (m³)",
    "form.unit.liter": "Liter",
    "form.unit.set": "Set",
    "form.documentPhotosHelp": "Attach photos or PDFs of documents (optional).",
    "form.documentPhotosSection": "Document attachments",
    "form.removeAttachment": "Remove",
    "form.filesSelected": "new file(s) to upload",
    "details.title": "Transaction Details",
    "details.back": "Back to list",
    "details.edit": "Edit",
    "details.delete": "Delete",
    "details.deleting": "Deleting…",
    "details.markPaid": "Mark Paid",
    "details.release": "Release",
    "details.originalBl": "Original BL received",
    "details.loadError": "Unable to load transaction details.",
    "details.deleteError": "Unable to delete transaction.",
    "details.deleteConfirm": "Delete this transaction?",
    "details.actionError": "Operation failed. Check role permissions or prerequisites.",
    "details.loading": "Loading…",
    "details.client": "Client",
    "details.shippingCompany": "Shipping Company",
    "details.createdAt": "Created At",
    "details.declaration": "Declaration",
    "details.airwayBill": "Airway Bill",
    "details.hsCode": "HS Code",
    "details.goods": "Goods",
    "details.origin": "Origin",
    "details.invoiceValue": "Invoice Value",
    "details.currencySuffix": "AED",
    "details.risk": "Risk",
    "details.channel": "Channel",
    "details.document": "Document",
    "details.status": "Status",
    "details.payment": "Payment",
    "details.releaseCode": "Release Code",
    "details.notIssued": "Not issued",
    "details.containerCount": "Containers",
    "details.goodsWeightKg": "Goods weight (kg)",
    "details.invoiceToWeightRate": "Invoice→weight rate (AED/kg)",
    "details.containerArrivalDate": "Container arrival",
    "details.documentArrivalDate": "Document arrival",
    "details.documentPostalNumber": "Postal number",
    "details.goodsQuantity": "Goods size",
    "details.goodsQuality": "Quality",
    "details.goodsUnit": "Unit",
    "details.documentPhotos": "Document attachments",
    "details.openAttachment": "Open",
    "role.manager": "manager",
    "role.employee": "employee",
    "role.employee2": "Employee 2",
    "role.accountant": "accountant",
    "clients.title": "Clients Section",
    "clients.back": "Back",
    "clients.managerOnly": "Only manager can edit and manage clients.",
    "clients.loadError": "Unable to load clients.",
    "clients.saveError": "Unable to save client.",
    "clients.deleteError": "Unable to delete client.",
    "clients.deleteConfirm": "Delete this client?",
    "clients.companyName": "Company Name",
    "clients.trn": "Contact phone number",
    "clients.immigrationCode": "Client ID",
    "clients.clientEmail": "Client email",
    "clients.country": "Country",
    "clients.creditLimit": "Credit Limit",
    "clients.status": "Status",
    "clients.actions": "Actions",
    "clients.create": "Create Client",
    "clients.update": "Update Client",
    "clients.edit": "Edit",
    "clients.delete": "Delete",
    "clients.empty": "No clients found.",
    "clients.active": "active",
    "clients.suspended": "suspended",
    "clients.detailTitle": "Client details",
    "clients.detailLoadError": "Unable to load client.",
    "shipping.title": "Shipping Companies Section",
    "shipping.back": "Back",
    "shipping.managerOnly": "Only manager can edit and manage shipping companies.",
    "shipping.loadError": "Unable to load shipping companies.",
    "shipping.saveError": "Unable to save shipping company.",
    "shipping.deleteError": "Unable to delete shipping company.",
    "shipping.deleteConfirm": "Delete this shipping company?",
    "shipping.companyName": "Company Name",
    "shipping.code": "Code",
    "shipping.contactName": "Contact Name",
    "shipping.phone": "Phone",
    "shipping.email": "Email",
    "shipping.dispatchFormTemplate": "Dispatch form message template",
    "shipping.dispatchFormTemplateHint":
      "Default text for the notes field when printing the shipping company dispatch form; employees can edit it before printing.",
    "shipping.location": "Location",
    "shipping.mapClickHint": "Click the map to set the office location.",
    "shipping.clearLocation": "Clear location",
    "shipping.viewOnMap": "View on map",
    "shipping.status": "Status",
    "shipping.actions": "Actions",
    "shipping.create": "Create Shipping Company",
    "shipping.update": "Update Shipping Company",
    "shipping.edit": "Edit",
    "shipping.delete": "Delete",
    "shipping.empty": "No shipping companies found.",
    "shipping.active": "active",
    "shipping.inactive": "inactive",
    "shipping.detailTitle": "Shipping company details",
    "shipping.detailLoadError": "Unable to load shipping company.",
    "shipping.locationHint": "You can paste a map link or click on the map.",
    "shipping.viewLocation": "View location",
    "form.typeToSearch": "Type to search and pick from the list",
    "details.shippingPaperButton": "Shipping company paper form",
    "details.shippingPaperTitle": "Paper form for shipping company",
    "details.shippingPaperHeading": "Shipping / release cover sheet",
    "details.shippingPaperSub": "Edit the fields below, then print to send with the cargo.",
    "details.shippingPaperTo": "To (shipping company)",
    "details.shippingPaperFrom": "Client",
    "details.shippingPaperMessage": "message",
    "details.shippingPaperMessagePlaceholder": "Delivery instructions, address, phone, etc.",
    "details.shippingPaperPrint": "Print",
    "details.shippingPaperClose": "Close",
    "app.roleEmployee2": "Employee 2",
    "list.filterAllStages": "All stages",
    "list.paginationPrev": "Prev",
    "list.paginationNext": "Next",
    "stage.PREPARATION": "Preparation",
    "stage.CUSTOMS_CLEARANCE": "Customs clearance",
    "stage.TRANSPORTATION": "Transportation",
    "stage.STORAGE": "Storage",
    "docCategory.bill_of_lading": "Bill of Lading",
    "docCategory.certificate_of_origin": "Certificate of Origin",
    "docCategory.invoice": "Invoice",
    "docCategory.packing_list": "Packing List",
    "docCategory.uncategorized": "Uncategorized",
    "form.stage": "Transaction Stage",
    "form.snapshotReadOnly": "Transaction Snapshot (Read-only)",
    "form.stageChangeError": "Failed to change stage",
    "form.fileNumber": "File Number",
    "form.partiesSection": "Parties",
    "form.customsDeclarationSection": "Customs Declaration",
    "form.declarationNumber1": "Declaration Number (1)",
    "form.declarationNumber2": "Declaration Number (2)",
    "form.declarationDate": "Declaration Date",
    "form.declarationType1": "Declaration Type (1)",
    "form.declarationType2": "Declaration Type (2)",
    "form.portType": "Port Type",
    "form.shipmentCoreSection": "Shipment Core",
    "form.currency": "Currency",
    "form.cargoContainersSection": "Cargo & Containers",
    "form.containerNumbers": "Container Numbers",
    "form.containerNumbersPlaceholder": "e.g. MSKU1234567, TGHU9876543",
    "form.workflowStatusSection": "Workflow & Status",
    "form.stopTransaction": "Stop Transaction",
    "form.stopReason": "Stop Reason",
    "form.yes": "Yes",
    "form.no": "No",
    "form.selectDocumentCategory": "Select document category",
    "form.categoryRequiredError": "Please choose a category for each uploaded document.",
    "form.documentStatus.copy_received": "Copy received",
    "form.documentStatus.original_received": "Original received",
    "form.documentStatus.telex_release": "Telex release",
    "form.paymentStatus.pending": "Pending",
    "form.paymentStatus.paid": "Paid",
    "form.attachmentsSection": "Attachments",
    "form.declarationType.import": "Import",
    "form.declarationType.import_free_zone": "Import to Free Zone",
    "form.declarationType.import_re_export": "Import for Re-Export",
    "form.declarationType.temporary_import": "Temporary Import",
    "form.declarationType.transfer": "Transfer",
    "form.declarationType.export": "Export",
    "form.declarationType.transit_out": "Transit out",
    "form.declarationType.export_gcc": "Export to GCC",
    "form.declarationType.transitin": "Transitin",
    "form.declarationType.transitin_gcc": "Transitin from GCC",
    "form.portType.seaports": "Seaports",
    "form.portType.free_zones": "Free Zones",
    "form.portType.mainland": "Mainland",
    "transfer.app.title": "Transfer",
    "transfer.app.tagline": "Create and manage transfer records independently.",
    "transfer.list.loadError": "Unable to load transfers.",
    "transfer.form.newTitle": "New Transfer",
    "transfer.form.editTitle": "Edit Transfer",
    "transfer.details.title": "Transfer Details",
    "export.app.title": "Export",
    "export.app.tagline": "Create and manage export records independently.",
    "export.list.loadError": "Unable to load exports.",
    "export.form.newTitle": "New Export",
    "export.form.editTitle": "Edit Export",
    "export.form.exportDetails": "Export details",
    "export.details.title": "Export Details",
    "dashboard.transactionsDesc": "Main customs transactions and full workflow.",
    "dashboard.transfersDesc": "Transfer operations with independent records and rules.",
    "dashboard.exportsDesc": "Export records with independent workflows and storage.",
    "dashboard.toolsHeading": "Modules & search",
    "notifications.title": "Notifications",
    "notifications.markAllRead": "Mark all read",
    "notifications.loading": "Loading…",
    "notifications.empty": "No notifications yet",
  "notifications.clearList": "Clear list",
    "home.title": "Project dashboard",
    "home.tagline": "Cross-module activity snapshot for imports, transfers, and exports.",
    "home.modulesHeading": "Open record lists",
    "home.openFullList": "Open full list",
    "home.snapshotHint": "Figures below count the latest records loaded per module (up to 40 each), not the whole project total.",
    "home.activityHeading": "Latest record activity",
    "home.paginationSummary": "Page {page} of {pages} ({total} records)",
    "home.loadError": "Could not load the activity report.",
    "home.empty": "No recent records in the current snapshot.",
    "home.col.module": "Module",
    "home.loading": "Loading…",
    "form.orderDate": "Order date",
    "form.containerSize": "Container size",
    "form.portOfLading": "Port of lading",
    "form.portOfDischarge": "Port of discharge",
    "form.destination": "Destination",
    "form.unitNumber": "Unit number",
    "transportation.sectionTitle": "Transportation",
    "transportation.toUpper": "The appointment",
    "transportation.trachNo": "TrachNo",
    "transportation.company": "Company transportation",
    "transportation.from": "From",
    "transportation.to": "To",
    "transportation.tripCharge": "Trip Charge",
    "transportation.waitingCharge": "Waiting charge",
    "transportation.maccrikCharge": "Maccrik charge",
  },
};

export function getMessages(locale: Locale): Record<MessageKey, string> {
  return messages[locale];
}
