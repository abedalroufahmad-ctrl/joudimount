class Transaction {
  final String id;
  final String clientId;
  final String clientName;
  final String? shippingCompanyId;
  final String shippingCompanyName;
  final String declarationNumber;
  final String? declarationNumber2;
  final DateTime? declarationDate;
  final DateTime? orderDate;
  final String? declarationType;
  final String? declarationType2;
  final String? portType;
  final String? containerSize;
  final String? portOfLading;
  final String? portOfDischarge;
  final String? destination;
  final String? transportationTo;
  final String? trachNo;
  final String? transportationCompany;
  final String? transportationFrom;
  final String? transportationToLocation;
  final double? tripCharge;
  final double? waitingCharge;
  final double? maccrikCharge;
  final String airwayBill;
  final String hsCode;
  final String goodsDescription;
  final double invoiceValue;
  final String? invoiceCurrency;
  final String originCountry;
  final String documentStatus;
  final String clearanceStatus;
  final String riskLevel;
  final String channel;
  final String paymentStatus;
  final String xrayResult;
  final String? releaseCode;
  final List<dynamic>? documentAttachments;
  final int? containerCount;
  final double? goodsWeightKg;
  final double? invoiceToWeightRateAedPerKg;
  final DateTime? containerArrivalDate;
  final DateTime? documentArrivalDate;
  final String? fileNumber;
  final List<String>? containerNumbers;
  final String? unitCount;
  final int? unitNumber;
  final bool? isStopped;
  final String? holdReason;
  final String? stopReason;
  final String? documentPostalNumber;
  final double? goodsQuantity;
  final String? goodsQuality;
  final String? goodsUnit;
  final String? storageSubStage;
  final DateTime? storageEntryDate;
  final double? storageWorkersWages;
  final String? storageWorkersCompany;
  final String? storageStoreName;
  final double? storageSizeCbm;
  final String? storageFreightVehicleNumbers;
  final String? storageCrossPackaging;
  final String? storageUnity;
  final String? storageSealNumber;
  final DateTime? storageInputEntryDate;
  final double? storageInputWorkersWages;
  final String? storageInputWorkersCompany;
  final String? storageInputStoreName;
  final double? storageInputVolumeCbm;
  final double? storageInputLoadingEquipmentFare;
  final DateTime? storageExitEntryDate;
  final double? storageExitWorkersWages;
  final String? storageExitWorkersCompany;
  final String? storageExitStoreName;
  final double? storageExitVolumeCbm;
  final double? storageExitLoadingEquipmentFare;
  final String? storageExitFreightVehicleNumbers;
  final String? storageExitCrossPackaging;
  final String? storageExitUnity;
  final String? storageSealReplaceContainers;
  final String? storageSealEntryLockNumbers;
  final DateTime? storageSealSwitchDate;
  final String? storageSealEntryContainerNumbers;
  final String? storageSealOutLockNumbers;
  final String? storageSealUnitCount;
  final String? storageSealWorkersCompany;
  final double? storageSealWorkersWages;
  final List<dynamic>? accountingCustomFields;
  final String transactionStage;
  final DateTime createdAt;
  final DateTime updatedAt;

  Transaction({
    required this.id,
    required this.clientId,
    required this.clientName,
    this.shippingCompanyId,
    required this.shippingCompanyName,
    required this.declarationNumber,
    this.declarationNumber2,
    this.declarationDate,
    this.orderDate,
    this.declarationType,
    this.declarationType2,
    this.portType,
    this.containerSize,
    this.portOfLading,
    this.portOfDischarge,
    this.destination,
    this.transportationTo,
    this.trachNo,
    this.transportationCompany,
    this.transportationFrom,
    this.transportationToLocation,
    this.tripCharge,
    this.waitingCharge,
    this.maccrikCharge,
    required this.airwayBill,
    required this.hsCode,
    required this.goodsDescription,
    required this.invoiceValue,
    this.invoiceCurrency,
    required this.originCountry,
    required this.documentStatus,
    required this.clearanceStatus,
    required this.riskLevel,
    required this.channel,
    required this.paymentStatus,
    required this.xrayResult,
    this.releaseCode,
    this.documentAttachments,
    this.containerCount,
    this.goodsWeightKg,
    this.invoiceToWeightRateAedPerKg,
    this.containerArrivalDate,
    this.documentArrivalDate,
    this.fileNumber,
    this.containerNumbers,
    this.unitCount,
    this.unitNumber,
    this.isStopped,
    this.holdReason,
    this.stopReason,
    this.documentPostalNumber,
    this.goodsQuantity,
    this.goodsQuality,
    this.goodsUnit,
    this.storageSubStage,
    this.storageEntryDate,
    this.storageWorkersWages,
    this.storageWorkersCompany,
    this.storageStoreName,
    this.storageSizeCbm,
    this.storageFreightVehicleNumbers,
    this.storageCrossPackaging,
    this.storageUnity,
    this.storageSealNumber,
    this.storageInputEntryDate,
    this.storageInputWorkersWages,
    this.storageInputWorkersCompany,
    this.storageInputStoreName,
    this.storageInputVolumeCbm,
    this.storageInputLoadingEquipmentFare,
    this.storageExitEntryDate,
    this.storageExitWorkersWages,
    this.storageExitWorkersCompany,
    this.storageExitStoreName,
    this.storageExitVolumeCbm,
    this.storageExitLoadingEquipmentFare,
    this.storageExitFreightVehicleNumbers,
    this.storageExitCrossPackaging,
    this.storageExitUnity,
    this.storageSealReplaceContainers,
    this.storageSealEntryLockNumbers,
    this.storageSealSwitchDate,
    this.storageSealEntryContainerNumbers,
    this.storageSealOutLockNumbers,
    this.storageSealUnitCount,
    this.storageSealWorkersCompany,
    this.storageSealWorkersWages,
    this.accountingCustomFields,
    required this.transactionStage,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    String reqStr(dynamic value, [String fallback = '']) =>
        value == null ? fallback : value.toString();

    String? optStr(dynamic value) =>
        value == null ? null : value.toString();

    double? optDouble(dynamic value) {
      if (value == null) return null;
      if (value is num) return value.toDouble();
      final parsed = double.tryParse(value.toString());
      return parsed;
    }

    int? optInt(dynamic value) {
      if (value == null) return null;
      if (value is int) return value;
      if (value is num) return value.toInt();
      return int.tryParse(value.toString());
    }

    bool? optBool(dynamic value) {
      if (value == null) return null;
      if (value is bool) return value;
      final s = value.toString().toLowerCase();
      if (s == 'true' || s == '1') return true;
      if (s == 'false' || s == '0') return false;
      return null;
    }

    DateTime parseDate(dynamic value) => DateTime.parse(value.toString());

    List<String>? parseStringList(dynamic value) {
      if (value is! List) return null;
      return value.map((e) => e.toString()).toList();
    }

    return Transaction(
      id: reqStr(json['id'] ?? json['_id']),
      clientId: reqStr(json['clientId']),
      clientName: reqStr(json['clientName'], 'Unknown Client'),
      shippingCompanyId: optStr(json['shippingCompanyId']),
      shippingCompanyName:
          reqStr(json['shippingCompanyName'], 'Unknown Shipping Company'),
      declarationNumber: reqStr(json['declarationNumber']),
      declarationNumber2: optStr(json['declarationNumber2']),
      declarationDate:
          json['declarationDate'] != null ? parseDate(json['declarationDate']) : null,
      orderDate: json['orderDate'] != null ? parseDate(json['orderDate']) : null,
      declarationType: optStr(json['declarationType']),
      declarationType2: optStr(json['declarationType2']),
      portType: optStr(json['portType']),
      containerSize: optStr(json['containerSize']),
      portOfLading: optStr(json['portOfLading']),
      portOfDischarge: optStr(json['portOfDischarge']),
      destination: optStr(json['destination']),
      transportationTo: optStr(json['transportationTo']),
      trachNo: optStr(json['trachNo']),
      transportationCompany: optStr(json['transportationCompany']),
      transportationFrom: optStr(json['transportationFrom']),
      transportationToLocation: optStr(json['transportationToLocation']),
      tripCharge: optDouble(json['tripCharge']),
      waitingCharge: optDouble(json['waitingCharge']),
      maccrikCharge: optDouble(json['maccrikCharge']),
      airwayBill: reqStr(json['airwayBill']),
      hsCode: reqStr(json['hsCode']),
      goodsDescription: reqStr(json['goodsDescription']),
      invoiceValue: optDouble(json['invoiceValue']) ?? 0,
      invoiceCurrency: optStr(json['invoiceCurrency']),
      originCountry: reqStr(json['originCountry']),
      documentStatus: reqStr(json['documentStatus'], 'copy_received'),
      clearanceStatus: reqStr(json['clearanceStatus'], 'DRAFT'),
      riskLevel: reqStr(json['riskLevel'], 'low'),
      channel: reqStr(json['channel'], 'green'),
      paymentStatus: reqStr(json['paymentStatus'], 'pending'),
      xrayResult: reqStr(json['xrayResult'], 'not_required'),
      releaseCode: optStr(json['releaseCode']),
      documentAttachments: json['documentAttachments'] is List
          ? List<dynamic>.from(json['documentAttachments'] as List)
          : null,
      containerCount: optInt(json['containerCount']),
      goodsWeightKg: optDouble(json['goodsWeightKg']),
      invoiceToWeightRateAedPerKg: optDouble(json['invoiceToWeightRateAedPerKg']),
      containerArrivalDate: json['containerArrivalDate'] != null
          ? parseDate(json['containerArrivalDate'])
          : null,
      documentArrivalDate: json['documentArrivalDate'] != null
          ? parseDate(json['documentArrivalDate'])
          : null,
      fileNumber: optStr(json['fileNumber']),
      containerNumbers: parseStringList(json['containerNumbers']),
      unitCount: optStr(json['unitCount']),
      unitNumber: optInt(json['unitNumber']),
      isStopped: optBool(json['isStopped']),
      holdReason: optStr(json['holdReason']),
      stopReason: optStr(json['stopReason']),
      documentPostalNumber: optStr(json['documentPostalNumber']),
      goodsQuantity: optDouble(json['goodsQuantity']),
      goodsQuality: optStr(json['goodsQuality']),
      goodsUnit: optStr(json['goodsUnit']),
      storageSubStage: optStr(json['storageSubStage']),
      storageEntryDate:
          json['storageEntryDate'] != null ? parseDate(json['storageEntryDate']) : null,
      storageWorkersWages: optDouble(json['storageWorkersWages']),
      storageWorkersCompany: optStr(json['storageWorkersCompany']),
      storageStoreName: optStr(json['storageStoreName']),
      storageSizeCbm: optDouble(json['storageSizeCbm']),
      storageFreightVehicleNumbers: optStr(json['storageFreightVehicleNumbers']),
      storageCrossPackaging: optStr(json['storageCrossPackaging']),
      storageUnity: optStr(json['storageUnity']),
      storageSealNumber: optStr(json['storageSealNumber']),
      storageInputEntryDate: json['storageInputEntryDate'] != null
          ? parseDate(json['storageInputEntryDate'])
          : null,
      storageInputWorkersWages: optDouble(json['storageInputWorkersWages']),
      storageInputWorkersCompany: optStr(json['storageInputWorkersCompany']),
      storageInputStoreName: optStr(json['storageInputStoreName']),
      storageInputVolumeCbm: optDouble(json['storageInputVolumeCbm']),
      storageInputLoadingEquipmentFare: optDouble(json['storageInputLoadingEquipmentFare']),
      storageExitEntryDate: json['storageExitEntryDate'] != null
          ? parseDate(json['storageExitEntryDate'])
          : null,
      storageExitWorkersWages: optDouble(json['storageExitWorkersWages']),
      storageExitWorkersCompany: optStr(json['storageExitWorkersCompany']),
      storageExitStoreName: optStr(json['storageExitStoreName']),
      storageExitVolumeCbm: optDouble(json['storageExitVolumeCbm']),
      storageExitLoadingEquipmentFare: optDouble(json['storageExitLoadingEquipmentFare']),
      storageExitFreightVehicleNumbers: optStr(json['storageExitFreightVehicleNumbers']),
      storageExitCrossPackaging: optStr(json['storageExitCrossPackaging']),
      storageExitUnity: optStr(json['storageExitUnity']),
      storageSealReplaceContainers: optStr(json['storageSealReplaceContainers']),
      storageSealEntryLockNumbers: optStr(json['storageSealEntryLockNumbers']),
      storageSealSwitchDate: json['storageSealSwitchDate'] != null
          ? parseDate(json['storageSealSwitchDate'])
          : null,
      storageSealEntryContainerNumbers: optStr(json['storageSealEntryContainerNumbers']),
      storageSealOutLockNumbers: optStr(json['storageSealOutLockNumbers']),
      storageSealUnitCount: optStr(json['storageSealUnitCount']),
      storageSealWorkersCompany: optStr(json['storageSealWorkersCompany']),
      storageSealWorkersWages: optDouble(json['storageSealWorkersWages']),
      accountingCustomFields: json['accountingCustomFields'] is List
          ? List<dynamic>.from(json['accountingCustomFields'] as List)
          : null,
      transactionStage: reqStr(json['transactionStage'], 'PREPARATION'),
      createdAt: json['createdAt'] != null
          ? parseDate(json['createdAt'])
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? parseDate(json['updatedAt'])
          : DateTime.now(),
    );
  }
}