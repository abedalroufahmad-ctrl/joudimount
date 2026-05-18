import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "./api";
import { useI18n } from "./i18n/I18nContext";
import { ShippingCompany } from "./types";

export default function ShippingCompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const [item, setItem] = useState<ShippingCompany | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    apiFetch(`/api/shipping-companies/${id}`)
      .then((res) => {
        if (res.status === 404) throw new Error("not-found");
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data: ShippingCompany) => setItem(data))
      .catch(() => setError(t("shipping.detailLoadError")));
  }, [id, t]);

  return (
    <main className="container">
      <div className="page-actions">
        <Link to="/shipping-companies" className="btn btn-outline-secondary btn-sm">
          {t("shipping.back")}
        </Link>
      </div>
      <h1>{t("shipping.detailTitle")}</h1>
      {error ? <p className="error">{error}</p> : null}
      {!item && !error ? <p>{t("details.loading")}</p> : null}
      {item ? (
        <section className="details-card card shadow-sm">
          <div className="card-body">
          <div className="row row-cols-1 row-cols-md-2 g-3">
            <p className="details-item mb-0">
              <strong>{t("shipping.companyName")}:</strong> {item.companyName}
            </p>
            <p className="details-item mb-0">
              <strong>{t("shipping.code")}:</strong> {item.code}
            </p>
            <p className="details-item mb-0">
              <strong>{t("shipping.contactName")}:</strong> {item.contactName ?? "—"}
            </p>
            <p className="details-item mb-0">
              <strong>{t("shipping.phone")}:</strong> {item.phone ?? "—"}
            </p>
            <p className="details-item mb-0">
              <strong>{t("shipping.email")}:</strong> {item.email ?? "—"}
            </p>
            <p className="details-item col-12 mb-0">
              <strong>{t("shipping.dispatchFormTemplate")}:</strong>
              <br />
              <span style={{ whiteSpace: "pre-wrap" }}>{item.dispatchFormTemplate?.trim() ? item.dispatchFormTemplate : "—"}</span>
            </p>
            <p className="details-item mb-0">
              <strong>{t("shipping.location")}:</strong>{" "}
              {item.location ? (
                <span className="text-break">
                  {item.location.startsWith("http") ? (
                    <a href={item.location} target="_blank" rel="noreferrer">
                      {t("shipping.viewLocation")}
                    </a>
                  ) : (
                    item.location
                  )}
                </span>
              ) : item.latitude != null && item.longitude != null ? (
                <a
                  href={`https://www.openstreetmap.org/?mlat=${item.latitude}&mlon=${item.longitude}&zoom=14`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("shipping.viewOnMap")}
                </a>
              ) : (
                "—"
              )}
            </p>
            <p className="details-item mb-0">
              <strong>{t("shipping.status")}:</strong>{" "}
              <span className="status-badge">{item.status === "active" ? t("shipping.active") : t("shipping.inactive")}</span>
            </p>
          </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
