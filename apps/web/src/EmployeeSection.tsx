import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, getCurrentUser } from "./api";
import { useI18n } from "./i18n/I18nContext";
import { Employee, Role } from "./types";

interface Props {
  role: Role;
}

function roleLabel(role: Role, t: ReturnType<typeof useI18n>["t"]) {
  if (role === "manager") return t("role.manager");
  if (role === "employee") return t("role.employee");
  if (role === "employee2") return t("role.employee2");
  return t("role.accountant");
}

type EmployeeForm = {
  name: string;
  email: string;
  password: string;
  role: Role;
};

const emptyForm: EmployeeForm = {
  name: "",
  email: "",
  password: "",
  role: "employee",
};

async function mapEmployeeApiError(res: Response, t: ReturnType<typeof useI18n>["t"], fallback: string) {
  try {
    const data = (await res.json()) as { error?: unknown };
    const e = data.error;
    if (e === "email_taken") return t("employees.emailTaken");
    if (e === "last_manager_role") return t("employees.lastManagerRole");
    if (e === "last_manager_delete") return t("employees.lastManagerDelete");
    if (e === "delete_self") return t("employees.deleteSelfError");
    if (typeof e === "string" && e.length > 0 && !e.startsWith("{")) return e;
  } catch {
    /* use fallback */
  }
  return fallback;
}

export default function EmployeeSection({ role }: Props) {
  const { t } = useI18n();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const isManager = role === "manager";
  const currentUserId = getCurrentUser()?.id;

  async function loadEmployees() {
    const res = await apiFetch("/api/employees");
    if (!res.ok) throw new Error("failed");
    const data = (await res.json()) as Employee[];
    setEmployees(data);
  }

  useEffect(() => {
    loadEmployees().catch(() => setError(t("employees.loadError")));
  }, [t]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isManager) return;
    setError("");
    const path = editingId ? `/api/employees/${editingId}` : "/api/employees";
    const method = editingId ? "PUT" : "POST";
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
    };
    if (!editingId) {
      body.password = form.password;
    } else if (form.password.trim().length > 0) {
      body.password = form.password;
    }
    const res = await apiFetch(path, {
      method,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setError(await mapEmployeeApiError(res, t, t("employees.saveError")));
      return;
    }
    setForm(emptyForm);
    setEditingId(null);
    await loadEmployees();
  };

  const onEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setForm({
      name: emp.name,
      email: emp.email,
      password: "",
      role: emp.role,
    });
  };

  const onCancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  };

  const onDelete = async (id: string) => {
    if (!isManager) return;
    if (id === currentUserId) {
      setError(t("employees.deleteSelfError"));
      return;
    }
    if (!window.confirm(t("employees.deleteConfirm"))) return;
    const res = await apiFetch(`/api/employees/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(await mapEmployeeApiError(res, t, t("employees.deleteError")));
      return;
    }
    await loadEmployees();
  };

  return (
    <main className="container py-2">
      <div className="page-actions">
        <Link to="/" className="btn btn-outline-secondary btn-sm">
          {t("employees.back")}
        </Link>
      </div>
      <h1>{t("employees.title")}</h1>
      <p className="section-subtitle">
        {t("employees.currentRole")}: <strong>{roleLabel(role, t)}</strong>
      </p>
      <div className="details-card">{t("employees.roleFromAccount")}</div>

      <div className="role-grid">
        <section className={`details-card ${role === "manager" ? "role-active" : ""}`}>
          <h3>{t("employees.managerTitle")}</h3>
          <p>{t("employees.managerDesc")}</p>
        </section>
        <section className={`details-card ${role === "employee" ? "role-active" : ""}`}>
          <h3>{t("employees.employeeTitle")}</h3>
          <p>{t("employees.employeeDesc")}</p>
        </section>
        <section className={`details-card ${role === "employee2" ? "role-active" : ""}`}>
          <h3>{t("employees.employee2Title")}</h3>
          <p>{t("employees.employee2Desc")}</p>
        </section>
        <section className={`details-card ${role === "accountant" ? "role-active" : ""}`}>
          <h3>{t("employees.accountantTitle")}</h3>
          <p>{t("employees.accountantDesc")}</p>
        </section>
      </div>

      <p className="section-subtitle">{t("employees.managerOnly")}</p>
      {!isManager ? <p className="muted">{t("employees.managerOnly")}</p> : null}
      {error ? <p className="error alert alert-danger">{error}</p> : null}

      {isManager ? (
        <form className="card shadow-sm mb-4" onSubmit={onSubmit}>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label mb-0">{t("employees.name")}</label>
                <input
                  className="form-control mt-1"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  minLength={2}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label mb-0">{t("employees.email")}</label>
                <input
                  className="form-control mt-1"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label mb-0">{t("employees.password")}</label>
                <input
                  className="form-control mt-1"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete={editingId ? "new-password" : "new-password"}
                  required={!editingId}
                  minLength={editingId ? undefined : 4}
                  placeholder={editingId ? t("employees.passwordHintEdit") : undefined}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label mb-0">{t("employees.role")}</label>
                <select
                  className="form-select mt-1"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                >
                  <option value="manager">{t("role.manager")}</option>
                  <option value="employee">{t("role.employee")}</option>
                  <option value="employee2">{t("role.employee2")}</option>
                  <option value="accountant">{t("role.accountant")}</option>
                </select>
              </div>
              <div className="col-12 d-flex flex-wrap gap-2 align-items-center">
                <button className="btn btn-primary" type="submit">
                  {editingId ? t("employees.update") : t("employees.create")}
                </button>
                {editingId ? (
                  <button type="button" className="btn btn-outline-secondary" onClick={onCancelEdit}>
                    {t("employees.cancelEdit")}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </form>
      ) : null}

      <div className="table-wrap card shadow-sm">
        <table className="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>{t("employees.name")}</th>
              <th>{t("employees.email")}</th>
              <th>{t("employees.role")}</th>
              {isManager ? <th>{t("employees.actions")}</th> : null}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td>{emp.name}</td>
                <td>{emp.email}</td>
                <td>{roleLabel(emp.role, t)}</td>
                {isManager ? (
                  <td>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => onEdit(emp)}>
                      {t("employees.edit")}
                    </button>{" "}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      disabled={emp.id === currentUserId}
                      onClick={() => onDelete(emp.id)}
                      title={emp.id === currentUserId ? t("employees.deleteSelfError") : undefined}
                    >
                      {t("employees.delete")}
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
            {!employees.length && (
              <tr>
                <td colSpan={isManager ? 4 : 3}>{t("employees.empty")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="page-actions">
        <Link to="/transactions" className="btn btn-primary">
          {t("employees.goTracker")}
        </Link>
      </div>
    </main>
  );
}
