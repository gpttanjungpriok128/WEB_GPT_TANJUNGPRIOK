import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Nama harus diisi";
    if (!form.email.trim()) newErrors.email = "Email harus diisi";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = "Email tidak valid";
    if (!form.password) newErrors.password = "Password harus diisi";
    if (form.password.length < 6) newErrors.password = "Password minimal 6 karakter";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const data = await register(form);
      const role = data?.user?.role;
      navigate(["admin", "multimedia"].includes(role) ? "/dashboard" : "/");
    } catch (err) {
      const apiMessage =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        "Registrasi gagal. Silakan coba lagi.";
      setError(apiMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-stack auth-shell min-h-[calc(100vh-280px)] flex items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="text-5xl mb-4">📝</div>
          <h1 className="text-3xl font-extrabold text-brand-900 dark:text-white mb-2">
            Daftar Akun Baru
          </h1>
          <p className="text-brand-600 dark:text-brand-400">
            Bergabunglah dengan komunitas GPT Tanjung Priok
          </p>
        </div>

        <form onSubmit={submit} className="glass-card auth-card p-8 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-700 dark:text-brand-300">Nama Lengkap</label>
            <input
              type="text"
              placeholder="Nama Anda"
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: "" });
                if (error) setError("");
              }}
              required
              className={`input-modern ${errors.name ? "!border-rose-400" : ""}`}
            />
            {errors.name && <p className="text-sm text-rose-500">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-700 dark:text-brand-300">Email</label>
            <input
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: "" });
                if (error) setError("");
              }}
              required
              className={`input-modern ${errors.email ? "!border-rose-400" : ""}`}
            />
            {errors.email && <p className="text-sm text-rose-500">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-700 dark:text-brand-300">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => {
                setForm({ ...form, password: e.target.value });
                if (errors.password) setErrors({ ...errors, password: "" });
                if (error) setError("");
              }}
              required
              className={`input-modern ${errors.password ? "!border-rose-400" : ""}`}
            />
            {errors.password && <p className="text-sm text-rose-500">{errors.password}</p>}
            <p className="text-xs text-brand-500 dark:text-brand-400">Password minimal 6 karakter</p>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 p-3 text-sm text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              {error}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full disabled:opacity-60">
            {isSubmitting ? "Mendaftar..." : "Daftar"}
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

          <Link to="/login" className="btn-outline w-full text-center block">
            Sudah Punya Akun?
          </Link>
        </form>

        <p className="mt-4 text-center text-sm text-brand-600 dark:text-brand-400">
          Dengan mendaftar, Anda menyetujui{" "}
          <Link to="#" className="font-semibold text-primary hover:text-primary-light transition-colors">
            Syarat & Ketentuan
          </Link>{" "}
          kami
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
