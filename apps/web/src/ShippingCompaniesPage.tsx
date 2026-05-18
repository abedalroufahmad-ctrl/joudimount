import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "./api";
import LocationMapPicker from "./LocationMapPicker";
import { useI18n } from "./i18n/I18nContext";
import { Role, ShippingCompany } from "./types";

type ShippingCompanyForm = {
  companyName: string;
  code: string;
  contactName: string;
  phone: string;
  email: string;
  dispatchFormTemplate: string;
  latitude: number | null;
  longitude: number | null;
  location: string;
  status: "active" | "inactive";
};

const emptyCompany: ShippingCompanyForm = {
  companyName: "",
  code: "",
  contactName: "",
  phone: "",
  email: "",
  dispatchFormTemplate: "",
  latitude: null,
  longitude: null,
  location: "",
  status: "active",
};

export default function ShippingCompaniesPage({ role }: { role: Role }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [items, setItems] = useState<ShippingCompany[]>([]);
  const [form, setForm] = useState(emptyCompany);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const isManager = role === "manager";

  async function loadItems() {
    const res = await apiFetch("/api/shipping-companies");
    if (!res.ok) throw new Error("failed");
    setItems((await res.json()) as ShippingCompany[]);
  }

  useEffect(() => {
    loadItems().catch(() => setError(t("shipping.loadError")));
  }, [t]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isManager) return;
    setError("");
    const path = editingId ? `/api/shipping-companies/${editingId}` : "/api/shipping-companies";
    const method = editingId ? "PUT" : "POST";
    const trimmedEmail = form.email.trim();
    const body: Record<string, unknown> = {
      companyName: form.companyName,
      code: form.code,
      contactName: form.contactName || undefined,
      phone: form.phone || undefined,
      status: form.status,
    };
    if (trimmedEmail) body.email = trimmedEmail;
    else if (editingId) body.email = null;
    if (form.latitude != null && form.longitude != null) {
      body.latitude = form.latitude;
      body.longitude = form.longitude;
    } else if (editingId) {
      body.latitude = null;
      body.longitude = null;
    }
    body.dispatchFormTemplate = form.dispatchFormTemplate.trim();
    const res = await apiFetch(path, { method, body: JSON.stringify(body) });
    if (!res.ok) {
      setError(t("shipping.saveError"));
      return;
    }
    setForm(emptyCompany);
    setEditingId(null);
    await loadItems();
  };

  const onEdit = (item: ShippingCompany) => {
    setEditingId(item.id);
    setForm({
      companyName: item.companyName,
      code: item.code,
      contactName: item.contactName ?? "",
      phone: item.phone ?? "",
      email: item.email ?? "",
      dispatchFormTemplate: item.dispatchFormTemplate ?? "",
      latitude: item.latitude ?? null,
      longitude: item.longitude ?? null,
      location: item.location ?? "",
      status: item.status,
    });
  };

  const onDelete = async (id: string) => {
    if (!isManager) return;
    if (!window.confirm(t("shipping.deleteConfirm"))) return;
    const res = await apiFetch(`/api/shipping-companies/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(t("shipping.deleteError"));
      return;
    }
    await loadItems();
  };

  return (
    <main className="container py-2">
      <div className="page-actions">
        <Link to="/" className="btn btn-outline-secondary btn-sm">
          {t("shipping.back")}
        </Link>
      </div>
      <h1 className="display-6 fw-bold">{t("shipping.title")}</h1>
      <p className="section-subtitle">{t("shipping.managerOnly")}</p>
      {!isManager ? <p className="muted">{t("shipping.managerOnly")}</p> : null}
      {error ? <p className="error alert alert-danger">{error}</p> : null}

      {isManager ? (
        <form className="card shadow-sm mb-4" onSubmit={onSubmit}>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label mb-0">{t("shipping.companyName")}</label>
                <input
                  className="form-control mt-1"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  required
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label mb-0">{t("shipping.code")}</label>
                <input
                  className="form-control mt-1"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  required
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label mb-0">{t("shipping.contactName")}</label>
                <input
                  className="form-control mt-1"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label mb-0">{t("shipping.phone")}</label>
                <input
                  className="form-control mt-1"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label mb-0">{t("shipping.email")}</label>
                <input
                  className="form-control mt-1"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="col-12">
                <label className="form-label mb-0">{t("shipping.dispatchFormTemplate")}</label>
                <textarea
                  className="form-control mt-1"
                  value={form.dispatchFormTemplate}
                  onChange={(e) => setForm({ ...form, dispatchFormTemplate: e.target.value })}
                  rows={5}
                />
              </div>
              <p className="col-12 text-muted small mb-0">{t("shipping.dispatchFormTemplateHint")}</p>
              <div className="col-12">
                <label className="form-label mb-0">{t("shipping.location")}</label>
                <input
                  className="form-control mt-1"
                  value={form.location}
                  onChange={(e) => {
                    const val = e.target.value;
                    let lat = form.latitude;
                    let lng = form.longitude;
                    
                    // Try to parse lat/lng from Google Maps link
                    const match = val.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/) || val.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
                    if (match) {
                      lat = parseFloat(match[1]);
                      lng = parseFloat(match[2]);
                    }

                    setForm({ ...form, location: val, latitude: lat, longitude: lng });
                  }}
                />
                <p className="text-muted small mt-1 mb-0">{t("shipping.locationHint")}</p>
              </div>
              <LocationMapPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={(lat, lng) => {
                  let locationStr = form.location;
                  if (lat != null && lng != null) {
                    locationStr = `https://www.google.com/maps?q=${lat},${lng}`;
                  } else {
                    locationStr = "";
                  }
                  setForm({ ...form, latitude: lat, longitude: lng, location: locationStr });
                }}
                hint={t("shipping.mapClickHint")}
                clearLabel={t("shipping.clearLocation")}
              />
              <div className="col-12 col-md-6">
                <label className="form-label mb-0">{t("shipping.status")}</label>
                <select
                  className="form-select mt-1"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "inactive" })}
                >
                  <option value="active">{t("shipping.active")}</option>
                  <option value="inactive">{t("shipping.inactive")}</option>
                </select>
              </div>
              <div className="col-12">
                <button className="btn btn-primary" type="submit">
                  {editingId ? t("shipping.update") : t("shipping.create")}
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
              <th>{t("shipping.companyName")}</th>
              <th>{t("shipping.code")}</th>
              <th>{t("shipping.contactName")}</th>
              <th>{t("shipping.phone")}</th>
              <th>{t("shipping.email")}</th>
              <th>{t("shipping.location")}</th>
              <th>{t("shipping.status")}</th>
              {isManager ? <th>{t("shipping.actions")}</th> : null}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="clickable-row"
                onClick={() => navigate(`/shipping-companies/${item.id}`)}
              >
                <td>{item.companyName}</td>
                <td>{item.code}</td>
                <td>{item.contactName ?? "-"}</td>
                <td>{item.phone ?? "-"}</td>
                <td>{item.email ?? "-"}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  {item.location ? (
                    <div className="text-break" style={{ maxWidth: 200 }}>
                      {item.location.startsWith("http") ? (
                        <a href={item.location} target="_blank" rel="noreferrer">
                          {t("shipping.viewLocation")}
                        </a>
                      ) : (
                        item.location
                      )}
                    </div>
                  ) : item.latitude != null && item.longitude != null ? (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${item.latitude}&mlon=${item.longitude}&zoom=14`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("shipping.viewOnMap")}
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  <span className="status-badge">{item.status}</span>
                </td>
                {isManager ? (
                  <td onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => onEdit(item)}>
                      {t("shipping.edit")}
                    </button>{" "}
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onDelete(item.id)}>
                      {t("shipping.delete")}
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={isManager ? 8 : 7}>{t("shipping.empty")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
