/// Mirrors apps/web/src/transactionFieldPermissions.ts and API stage field sets.

bool roleCanWorkAtStage(String role, String stage) {
  if (role == 'manager') return true;
  if (role == 'employee') {
    return stage == 'PREPARATION' || stage == 'CUSTOMS_CLEARANCE';
  }
  if (role == 'employee2') {
    return stage == 'TRANSPORTATION' || stage == 'STORAGE';
  }
  if (role == 'warehouse') {
    return stage == 'STORAGE';
  }
  return false;
}

const employee1EditFields = <String>{
  'clientName',
  'clientId',
  'shippingCompanyId',
  'shippingCompanyName',
  'declarationNumber',
  'declarationNumber2',
  'declarationDate',
  'orderDate',
  'declarationType',
  'declarationType2',
  'portType',
  'containerSize',
  'portOfLading',
  'portOfDischarge',
  'destination',
  'airwayBill',
  'hsCode',
  'goodsDescription',
  'invoiceValue',
  'invoiceCurrency',
  'originCountry',
  'containerCount',
  'goodsWeightKg',
  'goodsQuantity',
  'unitNumber',
  'goodsQuality',
  'goodsUnit',
  'transportationTo',
  'trachNo',
  'shipmentNumbers',
  'transportationCompany',
  'transportationFrom',
  'transportationToLocation',
  'tripCharge',
  'waitingCharge',
  'maccrikCharge',
};

const employee2EditFields = <String>{
  'containerArrivalDate',
  'documentArrivalDate',
  'fileNumber',
  'documentPostalNumber',
  'documentStatus',
  'clearanceStatus',
  'containerNumbers',
  'unitCount',
  'isStopped',
  'stopReason',
  'transportationTo',
  'trachNo',
  'shipmentNumbers',
  'transportationCompany',
  'transportationFrom',
  'transportationToLocation',
  'tripCharge',
  'waitingCharge',
  'maccrikCharge',
};

const storageWarehouseFields = <String>{
  'storageSubStage',
  'storageEntryDate',
  'storageWorkersWages',
  'storageWorkersCompany',
  'storageStoreName',
  'storageSizeCbm',
  'storageFreightVehicleNumbers',
  'storageCrossPackaging',
  'storageUnity',
  'storageSealNumber',
  'storageInputEntryDate',
  'storageInputWorkersWages',
  'storageInputWorkersCompany',
  'storageInputStoreName',
  'storageInputVolumeCbm',
  'storageInputLoadingEquipmentFare',
  'storageExitEntryDate',
  'storageExitWorkersWages',
  'storageExitWorkersCompany',
  'storageExitStoreName',
  'storageExitVolumeCbm',
  'storageExitLoadingEquipmentFare',
  'storageExitFreightVehicleNumbers',
  'storageExitCrossPackaging',
  'storageExitUnity',
  'storageSealReplaceContainers',
  'storageSealEntryLockNumbers',
  'storageSealSwitchDate',
  'storageSealEntryContainerNumbers',
  'storageSealOutLockNumbers',
  'storageSealUnitCount',
  'storageSealWorkersCompany',
  'storageSealWorkersWages',
  'storagePhotos',
  'isStopped',
};

/// Returns allowed field names, or null meaning "all fields".
Set<String>? getAllowedUpdateFields(String role, String stage) {
  if (role == 'manager') return null;
  if (role == 'accountant') return {'paymentStatus'};
  if (!roleCanWorkAtStage(role, stage)) return <String>{};
  if (role == 'employee') return employee1EditFields;
  if (role == 'warehouse') return storageWarehouseFields;
  if (role == 'employee2') {
    return stage == 'STORAGE' ? storageWarehouseFields : employee2EditFields;
  }
  return <String>{};
}

bool canRoleSubmitField(
  String role,
  String field, {
  required bool isEdit,
  required String stage,
}) {
  if (!isEdit) return role == 'manager' || role == 'employee';
  final allowed = getAllowedUpdateFields(role, stage);
  if (allowed == null) return true;
  return allowed.contains(field);
}
