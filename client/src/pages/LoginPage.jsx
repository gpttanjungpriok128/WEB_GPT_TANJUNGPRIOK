import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GOOGLE_CLIENT_ID } from "../config/env";
import api from "../services/api";

function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const googleButtonRef = useRef(null);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(GOOGLE_CLIENT_ID || "");

  const redirectAfterLogin = useCallback(
    (role) => {
      navigate(["admin", "multimedia"].includes(role) ? "/dashboard" : "/");
    },
    [navigate]
  );

  const handleGoogleLogin = useCallback(
    async (credential) => {
      setError("");
      setIsGoogleSubmitting(true);
      try {
        const data = await loginWithGoogle(credential);
        redirectAfterLogin(data?.user?.role);
      } catch (err) {
        const apiMessage =
          err.response?.data?.message ||
          err.response?.data?.errors?.[0]?.msg ||
          "Login dengan Google gagal. Silakan coba lagi.";
        setError(apiMessage);
      } finally {
        setIsGoogleSubmitting(false);
      }
    },
    [loginWithGoogle, redirectAfterLogin]
  );

  useEffect(() => {
    if (GOOGLE_CLIENT_ID) {
      setGoogleClientId(GOOGLE_CLIENT_ID);
      return;
    }

    let isUnmounted = false;
    async function loadGoogleClientIdFromServer() {
      try {
        const { data } = await api.get("/auth/google/client");
        if (!isUnmounted && data?.clientId) {
          setGoogleClientId(data.clientId);
        }
      } catch (err) {
        if (!isUnmounted) {
          setGoogleClientId("");
        }
      }
    }

    loadGoogleClientIdFromServer();
    return () => {
      isUnmounted = true;
    };
  }, []);

  useEffect(() => {
    if (!googleClientId) {
      return undefined;
    }

    let isUnmounted = false;

    const onScriptError = () => {
      if (!isUnmounted) {
        setError("Google Sign-In gagal dimuat. Silakan refresh halaman.");
      }
    };

    const renderGoogleButton = () => {
      if (isUnmounted || !window.google?.accounts?.id || !googleButtonRef.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          if (!response.credential) {
            setError("Credential Google tidak valid.");
            return;
          }
          handleGoogleLogin(response.credential);
        }
      });

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: 320
      });
      setGoogleReady(true);
    };

    const existingScript = document.querySelector('script[data-google-identity="true"]');
    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return () => {
        isUnmounted = true;
      };
    }

    if (existingScript) {
      existingScript.addEventListener("load", renderGoogleButton);
      existingScript.addEventListener("error", onScriptError);
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = "true";
      script.addEventListener("load", renderGoogleButton);
      script.addEventListener("error", onScriptError);
      document.head.appendChild(script);
    }

    return () => {
      isUnmounted = true;
      const script = document.querySelector('script[data-google-identity="true"]');
      script?.removeEventListener("load", renderGoogleButton);
      script?.removeEventListener("error", onScriptError);
    };
  }, [googleClientId, handleGoogleLogin]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const data = await login(form);
      redirectAfterLogin(data?.user?.role);
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
    <div className="page-stack auth-shell min-h-[calc(100vh-280px)] flex items-center justify-center py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center relative z-10">
          <div className="inline-flex justify-center items-center w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-5xl mb-6 shadow-inner border border-emerald-200/50 dark:border-emerald-800/50">
            🔐
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 to-teal-600 dark:from-emerald-400 dark:to-teal-300 drop-shadow-sm mb-3">
            Masuk ke Akun Anda
          </h1>
          <p className="text-brand-600 dark:text-brand-400 font-medium tracking-wide">
            Selamat datang kembali di GPT Tanjung Priok
          </p>
        </div>

        <form onSubmit={submit} className="glass-card auth-card relative overflow-hidden p-8 md:p-10 space-y-6 shadow-xl hover:shadow-2xl transition-shadow duration-500">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 dark:bg-emerald-900/20 pointer-events-none" />
          <div className="relative z-10 space-y-5">
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

          <button
            type="submit"
            disabled={isSubmitting || isGoogleSubmitting}
            className="btn-primary w-full disabled:opacity-60"
          >
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

          {googleClientId ? (
            <div className="space-y-2">
              <div ref={googleButtonRef} className="flex justify-center min-h-11" />
              {!googleReady && (
                <p className="text-xs text-center text-brand-500 dark:text-brand-400">
                  Memuat Google Sign-In...
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-center text-amber-600 dark:text-amber-400">
              Login Google belum aktif. Isi `VITE_GOOGLE_CLIENT_ID` di frontend atau `GOOGLE_CLIENT_ID` di backend.
            </p>
          )}

          <Link to="/register" className="btn-outline w-full text-center block">
            Daftar Akun Baru
          </Link>
          </div>
        </form>

      </div>
    </div>
  );
}

export default LoginPage;
