import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "./api";
import { markInvalidFields, setupInvalidFieldClear } from "./formValidation";
import { useI18n } from "./i18n/I18nContext";
import { Client, Role } from "./types";

type ClientForm = {
  companyName: string;
  trn: string;
  immigrationCode: string;
  email: string;
  country: string;
  creditLimit: number;
  status: "active" | "suspended";
};

const emptyClient: ClientForm = {
  companyName: "",
  trn: "",
  immigrationCode: "",
  email: "",
  country: "",
  creditLimit: 0,
  status: "active",
};

export default function ClientsPage({ role }: { role: Role }) {
  const { t, numberLocale } = useI18n();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState(emptyClient);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const isManager = role === "manager";

  async function loadClients() {
    const res = await apiFetch("/api/clients");
    if (!res.ok) throw new Error("failed");
    const data = (await res.json()) as Client[];
    setClients(data);
  }

  useEffect(() => {
    loadClients().catch(() => setError(t("clients.loadError")));
  }, [t]);

  useEffect(() => {
    if (!formRef.current) return;
    return setupInvalidFieldClear(formRef.current);
  }, [isManager]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isManager) return;
    const formEl = event.currentTarget;
    if (!markInvalidFields(formEl)) {
      setError(t("form.validationError"));
      formEl.reportValidity();
      return;
    }
    setError("");
    const path = editingId ? `/api/clients/${editingId}` : "/api/clients";
    const method = editingId ? "PUT" : "POST";
    const res = await apiFetch(path, {
      method,
      body: JSON.stringify({
        ...form,
        creditLimit: Number(form.creditLimit),
      }),
    });
    if (!res.ok) {
      setError(t("clients.saveError"));
      return;
    }
    setForm(emptyClient);
    setEditingId(null);
    await loadClients();
  };

  const onEdit = (client: Client) => {
    setEditingId(client.id);
    setForm({
      companyName: client.companyName,
      trn: client.trn,
      immigrationCode: client.immigrationCode ?? "",
      email: client.email ?? "",
      country: client.country ?? "",
      creditLimit: client.creditLimit,
      status: client.status,
    });
  };

  const onDelete = async (id: string) => {
    if (!isManager) return;
    if (!window.confirm(t("clients.deleteConfirm"))) return;
    const res = await apiFetch(`/api/clients/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(t("clients.deleteError"));
      return;
    }
    await loadClients();
  };

  return (
    <main className="container py-2">
      <div className="page-actions">
        <Link to="/" className="btn btn-outline-secondary btn-sm">
          {t("clients.back")}
        </Link>
      </div>
      <h1 className="display-6 fw-bold">{t("clients.title")}</h1>
      <p className="section-subtitle">{t("clients.managerOnly")}</p>
      {!isManager ? <p className="muted">{t("clients.managerOnly")}</p> : null}
      {error ? <p className="error alert alert-danger">{error}</p> : null}

      {isManager ? (
        <form ref={formRef} className="card shadow-sm mb-4" noValidate onSubmit={onSubmit}>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label mb-0">{t("clients.companyName")}</label>
                <input
                  className="form-control mt-1"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  required
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label mb-0">{t("clients.trn")}</label>
                <input
                  className="form-control mt-1"
                  value={form.trn}
                  onChange={(e) => setForm({ ...form, trn: e.target.value })}
                  required
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label mb-0">{t("clients.immigrationCode")}</label>
                <input
                  className="form-control mt-1"
                  value={form.immigrationCode}
                  onChange={(e) => setForm({ ...form, immigrationCode: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label mb-0">{t("clients.clientEmail")}</label>
                <input
                  className="form-control mt-1"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label mb-0">{t("clients.country")}</label>
                <input
                  className="form-control mt-1"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label mb-0">{t("clients.creditLimit")}</label>
                <input
                  className="form-control mt-1"
                  type="number"
                  min={0}
                  value={form.creditLimit}
                  onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label mb-0">{t("clients.status")}</label>
                <select
                  className="form-select mt-1"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "suspended" })}
                >
                  <option value="active">{t("clients.active")}</option>
                  <option value="suspended">{t("clients.suspended")}</option>
                </select>
              </div>
              <div className="col-12">
                <button className="btn btn-primary" type="submit">
                  {editingId ? t("clients.update") : t("clients.create")}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : null}

      <div className="table-wrap card shadow-sm">
        <table className="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>{t("clients.companyName")}</th>
              <th>{t("clients.trn")}</th>
              <th>{t("clients.immigrationCode")}</th>
              <th>{t("clients.clientEmail")}</th>
              <th>{t("clients.country")}</th>
              <th>{t("clients.creditLimit")}</th>
              <th>{t("clients.status")}</th>
              {isManager ? <th>{t("clients.actions")}</th> : null}
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr
                key={client.id}
                className="clickable-row"
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <td>{client.companyName}</td>
                <td>{client.trn}</td>
                <td>{client.immigrationCode ?? "-"}</td>
                <td>{client.email ?? "-"}</td>
                <td>{client.country ?? "-"}</td>
                <td>{client.creditLimit.toLocaleString(numberLocale)}</td>
                <td>
                  <span className="status-badge">{client.status}</span>
                </td>
                {isManager ? (
                  <td onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => onEdit(client)}>
                      {t("clients.edit")}
                    </button>{" "}
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onDelete(client.id)}>
                      {t("clients.delete")}
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
            {!clients.length && (
              <tr>
                <td colSpan={isManager ? 8 : 7}>{t("clients.empty")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
