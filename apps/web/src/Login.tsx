import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "./api";
import { useI18n } from "./i18n/I18nContext";
import LanguageSwitcher from "./LanguageSwitcher";
import { AuthUser } from "./types";
import { useToast } from "./components/useToast";

export default function Login({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("manager@tracker.local");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      onLogin(user);
      navigate("/");
    } catch (err: any) {
      showToast(err.message || t("login.error"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-page-lang">
        <LanguageSwitcher />
      </div>
      <div className="login-card card shadow-lg border-0">
        <div className="login-card-brand text-center">
          <img src="/logo.png" alt="" width={72} height={72} className="login-logo" />
          <h1 className="login-title">{t("login.title")}</h1>
          <p className="login-subtitle">{t("login.subtitle")}</p>
        </div>
        <form className="card-body pt-4" onSubmit={onSubmit}>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label mb-0" htmlFor="login-email">
                {t("login.email")}
              </label>
              <input
                id="login-email"
                className="form-control mt-1"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="col-12">
              <label className="form-label mb-0" htmlFor="login-password">
                {t("login.password")}
              </label>
              <input
                id="login-password"
                className="form-control mt-1"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="col-12 pt-1">
              <button className="btn btn-primary w-100 login-submit" type="submit" disabled={loading}>
                {loading ? t("login.submitting") : t("login.submit")}
              </button>
            </div>
          </div>
        </form>
        <p className="login-demo-hint muted text-center px-3 pb-4 mb-0">{t("login.demoHint")}</p>
      </div>
    </main>
  );
}