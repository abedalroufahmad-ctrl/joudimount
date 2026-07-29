import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { transactionListPath } from "./paths";
import { apiFetch } from "./api";
import type { MessageKey } from "./i18n/messages";
import { useI18n } from "./i18n/I18nContext";
import { API_BASE, Role, StorageSubStage, Transaction, DocumentAttachment } from "./types";

type TransactionModule = "transactions" | "transfers";

function isoToDateInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function numToStr(n: number | undefined): string {
  return n != null && Number.isFinite(n) ? String(n) : "";
}

type StorageFormState = {
  storageSubStage: StorageSubStage;
  storageInputEntryDate: string;
  storageInputWorkersWages: string;
  storageInputWorkersCompany: string;
  storageInputStoreName: string;
  storageInputVolumeCbm: string;
  storageInputLoadingEquipmentFare: string;
  storageExitEntryDate: string;
  storageExitWorkersWages: string;
  storageExitWorkersCompany: string;
  storageExitStoreName: string;
  storageExitVolumeCbm: string;
  storageExitLoadingEquipmentFare: string;
  storageExitFreightVehicleNumbers: string;
  storageExitCrossPackaging: string;
  storageExitUnity: string;
  storageSealReplaceContainers: string;
  storageSealEntryLockNumbers: string;
  storageSealSwitchDate: string;
  storageSealEntryContainerNumbers: string;
  storageSealOutLockNumbers: string;
  storageSealUnitCount: string;
  storageSealWorkersCompany: string;
  storageSealWorkersWages: string;
};

function mapTxToForm(tx: Transaction): StorageFormState {
  return {
    storageSubStage: tx.storageSubStage ?? "INPUT",
    storageInputEntryDate: isoToDateInput(tx.storageInputEntryDate ?? tx.storageEntryDate),
    storageInputWorkersWages: numToStr(tx.storageInputWorkersWages ?? tx.storageWorkersWages),
    storageInputWorkersCompany: tx.storageInputWorkersCompany ?? tx.storageWorkersCompany ?? "",
    storageInputStoreName: tx.storageInputStoreName ?? tx.storageStoreName ?? "",
    storageInputVolumeCbm: numToStr(tx.storageInputVolumeCbm ?? tx.storageSizeCbm),
    storageInputLoadingEquipmentFare: numToStr(tx.storageInputLoadingEquipmentFare),
    storageExitEntryDate: isoToDateInput(tx.storageExitEntryDate ?? tx.storageEntryDate),
    storageExitWorkersWages: numToStr(tx.storageExitWorkersWages ?? tx.storageWorkersWages),
    storageExitWorkersCompany: tx.storageExitWorkersCompany ?? tx.storageWorkersCompany ?? "",
    storageExitStoreName: tx.storageExitStoreName ?? tx.storageStoreName ?? "",
    storageExitVolumeCbm: numToStr(tx.storageExitVolumeCbm ?? tx.storageSizeCbm),
    storageExitLoadingEquipmentFare: numToStr(tx.storageExitLoadingEquipmentFare),
    storageExitFreightVehicleNumbers: tx.storageExitFreightVehicleNumbers ?? tx.storageFreightVehicleNumbers ?? "",
    storageExitCrossPackaging: tx.storageExitCrossPackaging ?? tx.storageCrossPackaging ?? "",
    storageExitUnity: tx.storageExitUnity ?? tx.storageUnity ?? "",
    storageSealReplaceContainers: tx.storageSealReplaceContainers ?? "",
    storageSealEntryLockNumbers: tx.storageSealEntryLockNumbers ?? "",
    storageSealSwitchDate: isoToDateInput(tx.storageSealSwitchDate),
    storageSealEntryContainerNumbers: tx.storageSealEntryContainerNumbers ?? "",
    storageSealOutLockNumbers: tx.storageSealOutLockNumbers ?? "",
    storageSealUnitCount: tx.storageSealUnitCount ?? "",
    storageSealWorkersCompany: tx.storageSealWorkersCompany ?? "",
    storageSealWorkersWages: numToStr(tx.storageSealWorkersWages),
  };
}

function appendOptionalNumber(payload: Record<string, unknown>, key: string, raw: string) {
  const t = raw.trim();
  if (t === "") return;
  const n = Number(t);
  if (!Number.isFinite(n)) return;
  payload[key] = n;
}

function buildPayload(form: StorageFormState, existingIsStopped?: boolean): Record<string, unknown> {
  const payload: Record<string, unknown> = { storageSubStage: form.storageSubStage };
  if (typeof existingIsStopped === "boolean") payload.isStopped = existingIsStopped;
  const dates: [string, string][] = [
    ["storageInputEntryDate", form.storageInputEntryDate],
    ["storageExitEntryDate", form.storageExitEntryDate],
    ["storageSealSwitchDate", form.storageSealSwitchDate],
  ];
  for (const [key, v] of dates) {
    const t = v.trim();
    if (t) payload[key] = t;
  }
  const strings: [string, string][] = [
    ["storageInputWorkersCompany", form.storageInputWorkersCompany],
    ["storageInputStoreName", form.storageInputStoreName],
    ["storageExitWorkersCompany", form.storageExitWorkersCompany],
    ["storageExitStoreName", form.storageExitStoreName],
    ["storageExitFreightVehicleNumbers", form.storageExitFreightVehicleNumbers],
    ["storageExitCrossPackaging", form.storageExitCrossPackaging],
    ["storageExitUnity", form.storageExitUnity],
    ["storageSealReplaceContainers", form.storageSealReplaceContainers],
    ["storageSealEntryLockNumbers", form.storageSealEntryLockNumbers],
    ["storageSealEntryContainerNumbers", form.storageSealEntryContainerNumbers],
    ["storageSealOutLockNumbers", form.storageSealOutLockNumbers],
    ["storageSealWorkersCompany", form.storageSealWorkersCompany],
    ["storageSealUnitCount", form.storageSealUnitCount],
  ];
  for (const [key, v] of strings) {
    const t = v.trim();
    if (t) payload[key] = t;
  }
  appendOptionalNumber(payload, "storageInputWorkersWages", form.storageInputWorkersWages);
  appendOptionalNumber(payload, "storageInputVolumeCbm", form.storageInputVolumeCbm);
  appendOptionalNumber(payload, "storageInputLoadingEquipmentFare", form.storageInputLoadingEquipmentFare);
  appendOptionalNumber(payload, "storageExitWorkersWages", form.storageExitWorkersWages);
  appendOptionalNumber(payload, "storageExitVolumeCbm", form.storageExitVolumeCbm);
  appendOptionalNumber(payload, "storageExitLoadingEquipmentFare", form.storageExitLoadingEquipmentFare);
  appendOptionalNumber(payload, "storageSealWorkersWages", form.storageSealWorkersWages);
  return payload;
}

async function parseApiErrorMessage(res: Response): Promise<string> {
  const text = await res.text();
  const status = res.status;
  try {
    const j = JSON.parse(text) as { error?: unknown };
    const e = j.error;
    if (e == null) return text.trim() ? `HTTP ${status}: ${text.trim().slice(0, 400)}` : `HTTP ${status}`;
    if (typeof e === "string") return e;
    if (typeof e === "object" && e !== null) return JSON.stringify(e);
    return String(e);
  } catch {
    return text.trim() ? `HTTP ${status}: ${text.trim().slice(0, 400)}` : `HTTP ${status}`;
  }
}

export default function TransactionStoragePage({
  role,
  module,
}: {
  role: Role;
  module: TransactionModule;
}) {
  const { t, numberLocale } = useI18n();
  const { id } = useParams<{ id: string }>();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [form, setForm] = useState<StorageFormState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingStoragePhotos, setExistingStoragePhotos] = useState<DocumentAttachment[]>([]);
  const [newStoragePhotos, setNewStoragePhotos] = useState<File[]>([]);

  const backHref = transactionListPath(module);
  const detailHref = `/${module}/${id}`;

  const canEdit = role !== "accountant";

  useEffect(() => {
    if (!id) return;
    setError("");
    apiFetch(`/api/${module}/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("not-found");
        return res.json();
      })
      .then((data: Transaction) => {
        setTransaction(data);
        setForm(mapTxToForm(data));
        setExistingStoragePhotos(data.storagePhotos ?? []);
        setNewStoragePhotos([]);
      })
      .catch(() => setError(t("form.loadError")));
  }, [id, module, t]);

  const titleSuffix = useMemo(() => {
    if (!transaction) return "";
    return transaction.declarationNumber ? ` · ${transaction.declarationNumber}` : "";
  }, [transaction]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !form || !canEdit) return;
    setError("");
    setLoading(true);
    try {
      const payload = buildPayload(form, transaction?.isStopped);
      const fd = new FormData();
      
      for (const [key, val] of Object.entries(payload)) {
        fd.append(key, String(val));
      }
      
      // Preserve existing documentAttachments
      fd.append("existingAttachments", JSON.stringify(transaction?.documentAttachments ?? []));
      
      // Handle storagePhotos
      fd.append("existingStoragePhotos", JSON.stringify(existingStoragePhotos));
      for (const file of newStoragePhotos) {
        fd.append("storagePhotos", file);
      }

      const res = await apiFetch(`/api/${module}/${id}`, {
        method: "PUT",
        body: fd,
      });
      if (!res.ok) {
        const detail = await parseApiErrorMessage(res);
        setError(detail ? `${t("form.saveError")} (${detail})` : t("form.saveError"));
        return;
      }
      const data = (await res.json()) as Transaction;
      setTransaction(data);
      setForm(mapTxToForm(data));
      setExistingStoragePhotos(data.storagePhotos ?? []);
      setNewStoragePhotos([]);
    } catch {
      setError(t("form.saveError"));
    } finally {
      setLoading(false);
    }
  };

  if (!id) {
    return (
      <main className="container py-2">
        <p className="error alert alert-danger">{t("notFound.title")}</p>
        <Link to={backHref} className="btn btn-outline-secondary btn-sm">
          {t("form.back")}
        </Link>
      </main>
    );
  }

  return (
    <main className="container py-2">
      <div className="page-actions d-flex flex-wrap gap-2 align-items-center">
        <Link to={detailHref} className="btn btn-outline-secondary btn-sm">
          {t("storagePage.backToRecord" as MessageKey)}
        </Link>
        <Link to={backHref} className="btn btn-outline-secondary btn-sm">
          {t("form.back")}
        </Link>
      </div>
      <h1>
        {t("storagePage.title" as MessageKey)}
        {titleSuffix}
      </h1>
      {error ? <p className="error alert alert-danger">{error}</p> : null}
      {!transaction || !form ? <p>{t("details.loading")}</p> : null}
      {transaction && transaction.transactionStage !== "STORAGE" ? (
        <p className="muted" role="status">
          {t("storagePage.wrongStage" as MessageKey)}
        </p>
      ) : null}
      {transaction && transaction.transactionStage === "STORAGE" && form ? (
        <form className="card shadow-sm mb-4" onSubmit={onSubmit}>
          <div className="card-body">
            <div className="row g-3">
          <p className="details-item col-12">
            <strong>{t("details.client")}:</strong> {transaction.clientName}
          </p>
          <p className="details-item col-12">
            <strong>{t("details.createdAt")}:</strong> {new Date(transaction.createdAt).toLocaleString(numberLocale)}
          </p>

          <div className="col-12 d-flex flex-wrap gap-2">
            {(["INPUT", "OUTPUT", "SEAL"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className={form.storageSubStage === tab ? "btn btn-primary btn-sm" : "btn btn-outline-secondary btn-sm"}
                onClick={() => setForm({ ...form, storageSubStage: tab })}
              >
                {tab === "INPUT"
                  ? t("storagePage.subStage.input" as MessageKey)
                  : tab === "OUTPUT"
                    ? t("storagePage.subStage.output" as MessageKey)
                    : t("storagePage.subStage.seal" as MessageKey)}
              </button>
            ))}
          </div>

          {form.storageSubStage === "INPUT" ? (
            <>
              <h2 className="form-section-title col-12 h5 border-bottom pb-2 mt-3 mb-0">{t("storagePage.section.input" as MessageKey)}</h2>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("form.storage.entryDate" as MessageKey)}
                <input className="form-control mt-1"
                  type="date"
                  value={form.storageInputEntryDate}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, storageInputEntryDate: e.target.value })}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("form.storage.workersWages" as MessageKey)}
                <input className="form-control mt-1"
                  type="number"
                  min={0}
                  step="any"
                  value={form.storageInputWorkersWages}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, storageInputWorkersWages: e.target.value })}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("form.storage.workersCompany" as MessageKey)}
                <input className="form-control mt-1"
                  value={form.storageInputWorkersCompany}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, storageInputWorkersCompany: e.target.value })}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("form.storage.storeName" as MessageKey)}
                <input className="form-control mt-1"
                  value={form.storageInputStoreName}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, storageInputStoreName: e.target.value })}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("form.storage.sizeCbm" as MessageKey)}
                <input className="form-control mt-1"
                  type="number"
                  min={0}
                  step="any"
                  value={form.storageInputVolumeCbm}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, storageInputVolumeCbm: e.target.value })}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("storagePage.loadingEquipmentFare" as MessageKey)}
                <input className="form-control mt-1"
                  type="number"
                  min={0}
                  step="any"
                  value={form.storageInputLoadingEquipmentFare}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, storageInputLoadingEquipmentFare: e.target.value })}
                />
              </label>
            </>
          ) : null}

          {form.storageSubStage === "OUTPUT" ? (
            <>
              <h2 className="form-section-title col-12 h5 border-bottom pb-2 mt-3 mb-0">{t("storagePage.section.exit" as MessageKey)}</h2>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("form.storage.entryDate" as MessageKey)}
                <input className="form-control mt-1"
                  type="date"
                  value={form.storageExitEntryDate}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, storageExitEntryDate: e.target.value })}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("form.storage.workersWages" as MessageKey)}
                <input className="form-control mt-1"
                  type="number"
                  min={0}
                  step="any"
                  value={form.storageExitWorkersWages}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, storageExitWorkersWages: e.target.value })}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("form.storage.workersCompany" as MessageKey)}
                <input className="form-control mt-1"
                  value={form.storageExitWorkersCompany}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, storageExitWorkersCompany: e.target.value })}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("form.storage.storeName" as MessageKey)}
                <input className="form-control mt-1"
                  value={form.storageExitStoreName}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, storageExitStoreName: e.target.value })}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("form.storage.sizeCbm" as MessageKey)}
                <input className="form-control mt-1"
                  type="number"
                  min={0}
                  step="any"
                  value={form.storageExitVolumeCbm}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, storageExitVolumeCbm: e.target.value })}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("storagePage.loadingEquipmentFare" as MessageKey)}
                <input className="form-control mt-1"
                  type="number"
                  min={0}
                  step="any"
                  value={form.storageExitLoadingEquipmentFare}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, storageExitLoadingEquipmentFare: e.target.value })}
                />
              </label>
              <label className="col-12 form-label w-100 mb-0">
                {t("form.storage.freightVehicleNumbers" as MessageKey)}
                <textarea className="form-control mt-1"
                  value={form.storageExitFreightVehicleNumbers}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, storageExitFreightVehicleNumbers: e.target.value })}
                  rows={2}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("form.storage.crossPackaging" as MessageKey)}
                <input className="form-control mt-1"
                  value={form.storageExitCrossPackaging}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, storageExitCrossPackaging: e.target.value })}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("form.storage.unity" as MessageKey)}
                <input className="form-control mt-1"
                  value={form.storageExitUnity}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, storageExitUnity: e.target.value })}
                />
              </label>
            </>
          ) : null}

          {form.storageSubStage === "SEAL" ? (
            <>
              <h2 className="form-section-title col-12 h5 border-bottom pb-2 mt-3 mb-0">{t("storagePage.section.seal" as MessageKey)}</h2>
              <label className="col-12 form-label w-100 mb-0">
                {t("storagePage.entryContainerNumbers" as MessageKey)}
                <textarea className="form-control mt-1"
                  value={form.storageSealReplaceContainers}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, storageSealReplaceContainers: e.target.value })}
                  rows={2}
                />
              </label>
              <label className="col-12 form-label w-100 mb-0">
                {t("storagePage.entryLockNumbers" as MessageKey)}
                <textarea className="form-control mt-1"
                  value={form.storageSealEntryLockNumbers}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, storageSealEntryLockNumbers: e.target.value })}
                  rows={2}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("storagePage.switchDate" as MessageKey)}
                <input className="form-control mt-1"
                  type="date"
                  value={form.storageSealSwitchDate}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, storageSealSwitchDate: e.target.value })}
                />
              </label>
              <label className="col-12 form-label w-100 mb-0">
                {t("storagePage.outContainerNumbers" as MessageKey)}
                <textarea className="form-control mt-1"
                  value={form.storageSealEntryContainerNumbers}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, storageSealEntryContainerNumbers: e.target.value })}
                  rows={2}
                />
              </label>
              <label className="col-12 form-label w-100 mb-0">
                {t("storagePage.outLockNumbers" as MessageKey)}
                <textarea className="form-control mt-1"
                  value={form.storageSealOutLockNumbers}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, storageSealOutLockNumbers: e.target.value })}
                  rows={2}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("storagePage.unitCount" as MessageKey)}
                <input className="form-control mt-1"
                  type="text"
                  value={form.storageSealUnitCount}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, storageSealUnitCount: e.target.value })}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("form.storage.workersCompany" as MessageKey)}
                <input className="form-control mt-1"
                  value={form.storageSealWorkersCompany}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, storageSealWorkersCompany: e.target.value })}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("form.storage.workersWages" as MessageKey)}
                <input className="form-control mt-1"
                  type="number"
                  min={0}
                  step="any"
                  value={form.storageSealWorkersWages}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, storageSealWorkersWages: e.target.value })}
                />
              </label>
            </>
          ) : null}

          <div className="col-12 border-top pt-3 mt-3">
            <h3 className="h5 mb-2">{t("storagePage.productImages" as MessageKey)}</h3>
            <p className="text-muted small mb-3">{t("storagePage.productImagesHelp" as MessageKey)}</p>
            
            {/* Existing photos list */}
            {existingStoragePhotos.length > 0 ? (
              <div className="mb-3">
                <div className="d-flex flex-wrap gap-3">
                  {existingStoragePhotos.map((photo) => (
                    <div key={photo.path} className="position-relative border rounded p-1 d-flex flex-column align-items-center" style={{ width: 100 }}>
                      <a href={`${API_BASE}${photo.path}`} target="_blank" rel="noreferrer" className="d-block mb-1">
                        <img
                          src={`${API_BASE}${photo.path}`}
                          alt={photo.originalName}
                          style={{
                            width: 80,
                            height: 80,
                            objectFit: "cover",
                            borderRadius: 6,
                          }}
                        />
                      </a>
                      <button
                        type="button"
                        className="btn btn-sm btn-link text-danger p-0 mt-auto"
                        disabled={!canEdit}
                        onClick={() => setExistingStoragePhotos((prev) => prev.filter((x) => x.path !== photo.path))}
                      >
                        {t("form.removeAttachment" as MessageKey)}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* File input for new images */}
            {canEdit ? (
              <div className="mb-3">
                <input
                  type="file"
                  className="form-control"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    setNewStoragePhotos((prev) => [...prev, ...files]);
                    e.target.value = "";
                  }}
                />
              </div>
            ) : null}

            {/* New picked photos list */}
            {newStoragePhotos.length > 0 ? (
              <div className="mb-3">
                <ul className="list-group">
                  {newStoragePhotos.map((file, idx) => (
                    <li key={`${file.name}-${idx}`} className="list-group-item d-flex justify-content-between align-items-center py-1">
                      <span className="small text-truncate" style={{ maxWidth: "70%" }}>
                        {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-link text-danger p-0"
                        onClick={() => setNewStoragePhotos((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        {t("form.removeAttachment" as MessageKey)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {!canEdit ? (
            <p className="muted col-12" role="status">
              {t("storagePage.accountantReadOnly" as MessageKey)}
            </p>
          ) : null}
          <div className="col-12">
            <button className="btn btn-primary" type="submit" disabled={loading || !canEdit}>
              {loading ? t("form.saving") : t("form.save")}
            </button>
          </div>
            </div>
          </div>
        </form>
      ) : null}
    </main>
  );
}
