import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const data = await login(form);
      const role = data?.user?.role;
      navigate(["admin", "multimedia"].includes(role) ? "/dashboard" : "/");
    } catch (err) {
      const apiMessage =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        "Email atau password salah. Silakan coba lagi.";
      setError(apiMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-280px)] flex items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-3xl font-extrabold text-brand-900 dark:text-white mb-2">
            Masuk ke Akun Anda
          </h1>
          <p className="text-brand-600 dark:text-brand-400">
            Selamat datang kembali di GPT Tanjung Priok
          </p>
        </div>

        <form onSubmit={submit} className="glass-card p-8 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-700 dark:text-brand-300">Email</label>
            <input
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                if (error) setError("");
              }}
              required
              className="input-modern"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-700 dark:text-brand-300">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => {
                setForm({ ...form, password: e.target.value });
                if (error) setError("");
              }}
              required
              className="input-modern"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 p-3 text-sm text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              {error}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full disabled:opacity-60">
            {isSubmitting ? "Masuk..." : "Masuk"}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full section-divider" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white dark:bg-brand-900 px-3 text-brand-500 dark:text-brand-400">
                Atau
              </span>
            </div>
          </div>

          <Link to="/register" className="btn-outline w-full text-center block">
            Daftar Akun Baru
          </Link>
        </form>

        <p className="mt-4 text-center text-sm text-brand-600 dark:text-brand-400">
          Belum punya akun?{" "}
          <Link to="/register" className="font-semibold text-primary hover:text-primary-light transition-colors">
            Daftar di sini
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
