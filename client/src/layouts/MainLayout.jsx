import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import BrandLogo from "../components/BrandLogo";
import {
  ArrowRightIcon,
  CloseIcon,
  MailIcon,
  MapPinIcon,
  MenuIcon,
  MoonIcon,
  PhoneIcon,
  SunIcon,
} from "../components/SiteIcons";

function resolveApiOrigin() {
  const raw = import.meta.env.VITE_API_URL || "";
  if (!raw) return "";

  try {
    const url = new URL(raw, window.location.origin);
    return url.origin;
  } catch {
    return "";
  }
}

function ensureHintLink({ rel, href, crossOrigin }) {
  if (!href) return;
  const selector = `link[rel="${rel}"][href="${href}"]`;
  if (document.head.querySelector(selector)) return;

  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  if (crossOrigin) {
    link.crossOrigin = "anonymous";
  }
  document.head.appendChild(link);
}

function MainLayout({ children }) {
  const contactEmail = "gpt.tanjungpriok128@gmail.com";
  const whatsappNumber = "6282118223784";
  const whatsappMessage = encodeURIComponent(
    "Shalom GPT Tanjung Priok, saya ingin bertanya mengenai pelayanan gereja.",
  );
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const location = useLocation();
  const canAccessDashboard = ["admin", "multimedia"].includes(user?.role);
  const isAdminSidebarPage =
    user?.role === "admin" &&
    (location.pathname.startsWith("/dashboard") ||
      location.pathname === "/prayer" ||
      location.pathname === "/live" ||
      location.pathname === "/gallery");

  const mainRef = useRef(null);
  const lastScrollY = useRef(0);
  const profileMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const mobileMenuToggleRef = useRef(null);

  const profileInitial = user?.name?.trim()?.charAt(0)?.toUpperCase() || "U";
  const isDarkMode = theme === "dark";
  const themeActionLabel = isDarkMode ? "Ubah ke Mode Terang" : "Ubah ke Mode Gelap";

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/about", label: "Tentang" },
    { to: "/schedules", label: "Jadwal" },
    { to: "/articles", label: "Renungan" },
    { to: "/gallery", label: "Galeri" },
    { to: "/shop", label: "GTshirt" },
    ...(user ? [{ to: "/live", label: "Live" }, { to: "/prayer", label: "Doa" }] : []),
    ...(user && ["admin", "jemaat"].includes(user.role)
      ? [{ to: "/dashboard/congregation", label: "Data Jemaat" }]
      : []),
    { to: "/contact", label: "Kontak" },
  ];

  const adminSidebarLinks = [
    { to: "/dashboard", label: "Dashboard", end: true },
    { to: "/dashboard/congregation", label: "Data Jemaat" },
    { to: "/dashboard/store", label: "GTshirt Store" },
    { to: "/dashboard/articles/manage", label: "Kelola Renungan" },
    { to: "/dashboard/articles/new", label: "Buat Renungan" },
    { to: "/gallery", label: "Galeri" },
    { to: "/prayer", label: "Permohonan Doa" },
    { to: "/live", label: "Live Streaming" },
  ];

  const handleScroll = useCallback(() => {
    const currentY = window.scrollY;
    if (currentY > 96 && currentY > lastScrollY.current && !mobileMenuOpen) {
      setNavHidden(true);
    } else {
      setNavHidden(false);
    }
    lastScrollY.current = currentY;
  }, [mobileMenuOpen]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const apiOrigin = resolveApiOrigin();
    if (!apiOrigin || apiOrigin === window.location.origin) return;

    ensureHintLink({ rel: "preconnect", href: apiOrigin, crossOrigin: true });
    ensureHintLink({ rel: "dns-prefetch", href: apiOrigin });
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!profileMenuOpen) return;

    const closeOnOutsideClick = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };

    const closeOnEsc = (event) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("touchstart", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEsc);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("touchstart", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEsc);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen || isAdminSidebarPage) return;

    const closeOnOutsideClick = (event) => {
      const target = event.target;
      if (mobileMenuRef.current?.contains(target)) return;
      if (mobileMenuToggleRef.current?.contains(target)) return;
      setMobileMenuOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("touchstart", closeOnOutsideClick);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("touchstart", closeOnOutsideClick);
    };
  }, [mobileMenuOpen, isAdminSidebarPage]);

  useEffect(() => {
    if (typeof document === "undefined" || isAdminSidebarPage) return undefined;

    const { documentElement, body } = document;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    if (mobileMenuOpen) {
      documentElement.style.overflow = "hidden";
      body.style.overflow = "hidden";
    }

    return () => {
      documentElement.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, [mobileMenuOpen, isAdminSidebarPage]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    setNavHidden(false);
    lastScrollY.current = 0;
  }, [location.pathname]);

  useEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;
    mainElement.classList.remove("motion-page-enter");
    void mainElement.offsetWidth;
    mainElement.classList.add("motion-page-enter");
  }, [location.pathname]);

  useEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;

    const targets = Array.from(
      mainElement.querySelectorAll("section, article, .motion-item"),
    );

    if (!targets.length) return;

    targets.forEach((target, index) => {
      const delay = `${Math.min((index % 8) * 50, 280)}ms`;
      target.classList.add("motion-reveal");
      target.style.setProperty("--motion-delay", delay);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [location.pathname]);

  const themeButton = (
    <button
      type="button"
      onClick={toggleTheme}
      className="tap-target inline-flex items-center justify-center rounded-full border border-zinc-200/80 bg-white/85 text-zinc-700 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/90 dark:text-zinc-100 dark:hover:bg-zinc-900"
      title={themeActionLabel}
      aria-label={themeActionLabel}
    >
      {isDarkMode ? <SunIcon /> : <MoonIcon />}
    </button>
  );

  return (
    <div className="app-shell min-h-screen">
      {!isAdminSidebarPage && (
        <header
          className={`nav-glass sticky top-0 z-50 transition-transform duration-300 ${
            navHidden ? "nav-hidden" : "nav-visible"
          }`}
        >
          <div className="container-custom">
            <div className="flex min-h-[72px] items-center justify-between gap-3 py-3">
              <Link to="/" className="flex min-w-0 flex-1 items-center gap-3">
                <BrandLogo />
                <div className="min-w-0">
                  <p className="truncate text-[0.95rem] font-semibold tracking-[-0.02em] text-zinc-950 dark:text-white sm:text-base">
                    GPT Tanjung Priok
                  </p>
                  <p className="hidden text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400 sm:block">
                    Growing Together
                  </p>
                </div>
              </Link>

              <nav aria-label="Primary" className="hidden lg:block">
                <div className="flex items-center gap-1 rounded-full border border-zinc-200/80 bg-white/80 p-1 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-zinc-800 dark:bg-zinc-950/80">
                  {navLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.to === "/"}
                      className={({ isActive }) =>
                        `nav-link-modern tap-target ${isActive ? "active" : ""}`
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                  {user && ["admin", "multimedia"].includes(user.role) && (
                    <NavLink
                      to="/dashboard/articles/manage"
                      className={({ isActive }) =>
                        `nav-link-modern tap-target ${isActive ? "active" : ""}`
                      }
                    >
                      CMS
                    </NavLink>
                  )}
                </div>
              </nav>

              <div className="flex shrink-0 items-center gap-2">
                <div className="hidden sm:flex">{themeButton}</div>

                {!user && (
                  <Link to="/login" className="btn-primary hidden lg:inline-flex tap-target">
                    Login
                  </Link>
                )}

                {user && canAccessDashboard && (
                  <NavLink
                    to="/dashboard"
                    className="btn-outline hidden md:inline-flex tap-target"
                  >
                    Dashboard
                  </NavLink>
                )}

                {user && (
                  <div ref={profileMenuRef} className="relative hidden sm:block">
                    <button
                      type="button"
                      onClick={() => setProfileMenuOpen((prev) => !prev)}
                      className="tap-target inline-flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200/80 bg-white text-sm font-semibold text-zinc-800 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                      aria-label="Buka menu profil"
                      aria-expanded={profileMenuOpen}
                    >
                      {profileInitial}
                    </button>

                    {profileMenuOpen && (
                      <div className="absolute right-0 top-[calc(100%+0.75rem)] z-[70] w-64 rounded-[1.5rem] border border-zinc-200/80 bg-white p-3 shadow-[0_24px_64px_rgba(15,23,42,0.12)] dark:border-zinc-800 dark:bg-zinc-950">
                        <p className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
                          {user?.name || "Pengguna"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {user?.role || "jemaat"}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            logout();
                            setProfileMenuOpen(false);
                            setMobileMenuOpen(false);
                          }}
                          className="tap-target mt-3 inline-flex w-full items-center justify-center rounded-full bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-600"
                        >
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  ref={mobileMenuToggleRef}
                  type="button"
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  className={`mobile-menu-toggle tap-target lg:hidden ${mobileMenuOpen ? "is-open" : ""}`}
                  aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
                  aria-expanded={mobileMenuOpen}
                >
                  <span className="mobile-menu-toggle-label">
                    {mobileMenuOpen ? "Tutup" : "Menu"}
                  </span>
                  <span className="mobile-menu-toggle-icon" aria-hidden="true">
                    {mobileMenuOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
                  </span>
                </button>
              </div>
            </div>

            <div ref={mobileMenuRef} className="relative lg:hidden">
              <div
                className={`mobile-menu-backdrop ${mobileMenuOpen ? "open" : ""}`}
                aria-hidden="true"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className={`mobile-menu-float ${mobileMenuOpen ? "open" : ""}`}>
                <div className="mobile-menu-panel rounded-[1.75rem] border border-zinc-200/80 bg-white/96 p-3 shadow-[0_24px_64px_rgba(15,23,42,0.12)] dark:border-zinc-800 dark:bg-zinc-950/96">
                  <div className="mobile-menu-head mb-3 flex items-center justify-between gap-3 rounded-[1.25rem] border border-zinc-200/80 bg-zinc-50/80 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
                    {user ? (
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
                          {user?.name || "Pengguna"}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{user?.role || "jemaat"}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-zinc-950 dark:text-white">Menu Navigasi</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Cepat, ringan, dan mobile-first.</p>
                      </div>
                    )}
                    {themeButton}
                  </div>

                  <nav aria-label="Mobile primary" className="space-y-1.5">
                    {navLinks.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        end={link.to === "/"}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `mobile-nav-link ${isActive ? "active" : ""}`
                        }
                      >
                        <span>{link.label}</span>
                        <ArrowRightIcon className="h-4 w-4" />
                      </NavLink>
                    ))}
                    {user && ["admin", "multimedia"].includes(user.role) && (
                      <NavLink
                        to="/dashboard/articles/manage"
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `mobile-nav-link ${isActive ? "active" : ""}`
                        }
                      >
                        <span>CMS</span>
                        <ArrowRightIcon className="h-4 w-4" />
                      </NavLink>
                    )}
                  </nav>

                  <div className="mt-3 grid gap-2 border-t border-zinc-200/80 pt-3 dark:border-zinc-800">
                    {!user && (
                      <Link
                        to="/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="btn-primary tap-target"
                      >
                        Login
                      </Link>
                    )}
                    {user && canAccessDashboard && (
                      <NavLink
                        to="/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="btn-outline tap-target"
                      >
                        Dashboard
                      </NavLink>
                    )}
                    {user && (
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                        }}
                        className="tap-target inline-flex items-center justify-center rounded-full bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-600"
                      >
                        Logout
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
      )}

      <main ref={mainRef} className="organic-main container-custom flex-1 py-6 sm:py-8 lg:py-10">
        {isAdminSidebarPage ? (
          <>
            <div className="admin-mobile-top lg:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="admin-mobile-menu-btn"
                aria-label="Toggle admin menu"
              >
                {mobileMenuOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
              </button>
              <p className="text-sm font-semibold text-brand-900 dark:text-white">Admin Workspace</p>
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200/80 bg-white text-zinc-700 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                title={themeActionLabel}
                aria-label={themeActionLabel}
              >
                {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
              </button>
            </div>

            <div
              className={`admin-mobile-drawer-backdrop lg:hidden ${mobileMenuOpen ? "open" : ""}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <aside className="admin-mobile-drawer" onClick={(event) => event.stopPropagation()}>
                <div className="admin-sidebar-head">
                  <Link to="/" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
                    <BrandLogo />
                    <div>
                      <p className="text-sm font-bold text-brand-900 dark:text-white">GPT Tanjung Priok</p>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-500 dark:text-brand-400">
                        Admin Workspace
                      </p>
                    </div>
                  </Link>
                </div>
                <p className="admin-sidebar-title">Menu Admin</p>
                <div className="mt-4 space-y-1.5">
                  {adminSidebarLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={Boolean(link.end)}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) => `admin-sidebar-link ${isActive ? "active" : ""}`}
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>
                <div className="mt-5 border-t border-brand-200/80 pt-4 dark:border-brand-700/80">
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full rounded-xl bg-rose-500/90 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-rose-600"
                  >
                    Logout
                  </button>
                </div>
              </aside>
            </div>

            <div className="admin-workspace grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
              <aside className="admin-sidebar-panel hidden lg:block">
                <div className="admin-sidebar-head">
                  <Link to="/" className="flex items-center gap-3">
                    <BrandLogo />
                    <div>
                      <p className="text-sm font-bold text-brand-900 dark:text-white">GPT Tanjung Priok</p>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-500 dark:text-brand-400">
                        Admin Workspace
                      </p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200/80 bg-white text-zinc-700 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                    title={themeActionLabel}
                    aria-label={themeActionLabel}
                  >
                    {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                  </button>
                </div>
                <p className="admin-sidebar-title">Menu Admin</p>
                <div className="mt-4 space-y-1.5">
                  {adminSidebarLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={Boolean(link.end)}
                      className={({ isActive }) => `admin-sidebar-link ${isActive ? "active" : ""}`}
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>
                <div className="mt-5 border-t border-brand-200/80 pt-4 dark:border-brand-700/80">
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full rounded-xl bg-rose-500/90 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-rose-600"
                  >
                    Logout
                  </button>
                </div>
              </aside>

              <div className="min-w-0">{children}</div>
            </div>
          </>
        ) : (
          children
        )}
      </main>

      <footer className="border-t border-zinc-200/80 py-10 dark:border-zinc-800">
        <div className="container-custom">
          <div className="rounded-[2rem] border border-zinc-200/80 bg-white px-6 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] dark:border-zinc-800 dark:bg-zinc-950 sm:px-8 lg:px-10 lg:py-10">
            <div className="grid gap-8 lg:grid-cols-[1.3fr_0.8fr_0.9fr]">
              <div>
                <div className="flex items-center gap-3">
                  <BrandLogo />
                  <div>
                    <p className="text-lg font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
                      GPT Tanjung Priok
                    </p>
                    <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                      Growing Together
                    </p>
                  </div>
                </div>
                <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  Komunitas yang berakar dalam Kristus, bertumbuh dalam kasih, dan hadir dengan pengalaman digital yang cepat untuk ibadah, renungan, galeri, dan pelayanan.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/schedules" className="btn-primary tap-target">
                    Lihat Jadwal
                  </Link>
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline tap-target"
                  >
                    Hubungi via WhatsApp
                  </a>
                </div>
              </div>

              <div>
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                  Navigasi
                </h2>
                <ul className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
                  {[
                    { to: "/about", label: "Tentang Gereja" },
                    { to: "/articles", label: "Renungan" },
                    { to: "/gallery", label: "Galeri" },
                    { to: "/shop", label: "GTshirt" },
                    { to: "/contact", label: "Kontak" },
                  ].map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="inline-flex items-center gap-2 transition-colors hover:text-emerald-700 dark:hover:text-emerald-300"
                      >
                        <ArrowRightIcon className="h-3.5 w-3.5" />
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                  Kontak
                </h2>
                <div className="mt-4 space-y-4 text-sm text-zinc-600 dark:text-zinc-300">
                  <a
                    href={`mailto:${contactEmail}?subject=${encodeURIComponent("Pertanyaan dari Website GPT Tanjung Priok")}`}
                    className="inline-flex items-start gap-3 transition-colors hover:text-emerald-700 dark:hover:text-emerald-300"
                  >
                    <MailIcon className="mt-0.5 h-4 w-4" />
                    <span>{contactEmail}</span>
                  </a>
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-3 transition-colors hover:text-emerald-700 dark:hover:text-emerald-300"
                  >
                    <PhoneIcon className="mt-0.5 h-4 w-4" />
                    <span>+62 821-1822-3784</span>
                  </a>
                  <div className="inline-flex items-start gap-3">
                    <MapPinIcon className="mt-0.5 h-4 w-4" />
                    <span>Jl. Bugis No.128, Kebon Bawang, Tanjung Priok, Jakarta Utara 14320</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-zinc-200/80 pt-5 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 sm:flex sm:items-center sm:justify-between">
              <p>&copy; 2026 GPT Tanjung Priok</p>
              <p className="mt-2 sm:mt-0">Modern minimalist UI with performance-first delivery.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;
