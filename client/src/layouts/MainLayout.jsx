import { useEffect, useRef, useState, useCallback } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import BrandLogo from "../components/BrandLogo";

function MainLayout({ children }) {
  const contactEmail = "gpt.tanjungpriok128@gmail.com";
  const whatsappNumber = "6281289833972";
  const whatsappMessage = encodeURIComponent(
    "Shalom GPT Tanjung Priok, saya ingin bertanya mengenai pelayanan gereja.",
  );
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const location = useLocation();
  const canAccessDashboard = ["admin", "multimedia"].includes(user?.role);
  const isAdminSidebarPage =
    user?.role === "admin" &&
    (
      location.pathname.startsWith("/dashboard")
      || location.pathname === "/prayer"
      || location.pathname === "/live"
      || location.pathname === "/gallery"
    );
  const mainRef = useRef(null);
  const lastScrollY = useRef(0);

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/about", label: "Tentang" },
    { to: "/schedules", label: "Jadwal" },
    { to: "/articles", label: "Renungan" },
    { to: "/gallery", label: "Galeri" },
    ...(user ? [{ to: "/live", label: "Live" }, { to: "/prayer", label: "Doa" }] : []),
    ...(user && ["admin", "jemaat"].includes(user.role)
      ? [{ to: "/dashboard/congregation", label: "Data Jemaat" }]
      : []),
    { to: "/contact", label: "Kontak" },
  ];

  const adminSidebarLinks = [
    { to: "/dashboard", label: "Dashboard", end: true },
    { to: "/dashboard/congregation", label: "Data Jemaat" },
    { to: "/dashboard/articles/manage", label: "Kelola Renungan" },
    { to: "/dashboard/articles/new", label: "Buat Renungan" },
    { to: "/gallery", label: "Galeri" },
    { to: "/prayer", label: "Permohonan Doa" },
    { to: "/live", label: "Live Streaming" },
  ];

  // Auto-hide nav on scroll
  const handleScroll = useCallback(() => {
    const currentY = window.scrollY;
    if (currentY > 80 && currentY > lastScrollY.current) {
      setNavHidden(true);
    } else {
      setNavHidden(false);
    }
    lastScrollY.current = currentY;
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Always return to top when navigating between pages
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    setNavHidden(false);
    lastScrollY.current = 0;
  }, [location.pathname]);

  // Page enter animation
  useEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;
    mainElement.classList.remove("motion-page-enter");
    void mainElement.offsetWidth;
    mainElement.classList.add("motion-page-enter");
  }, [location.pathname]);

  // Scroll reveal observer
  useEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;

    const targets = Array.from(
      mainElement.querySelectorAll("section, article, .motion-item"),
    );

    if (!targets.length) return;

    targets.forEach((target, index) => {
      const delay = `${Math.min((index % 8) * 60, 360)}ms`;
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
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [location.pathname]);

  return (
    <div className="app-shell min-h-screen flex flex-col">
      {/* Navigation */}
      {!isAdminSidebarPage && (
        <nav
          className={`nav-glass sticky top-0 z-50 transition-all duration-300 ${
            navHidden && !mobileMenuOpen
              ? "nav-hidden"
              : "nav-visible"
          }`}
        >
          <div className="container-custom">
            <div className="flex items-center justify-between gap-3 h-16">
              {/* Logo */}
              <Link
                to="/"
                className="flex items-center gap-3 group"
              >
                <BrandLogo />
                <div className="hidden sm:block">
                  <p className="text-base font-bold text-brand-800 dark:text-white group-hover:text-primary transition-colors">
                    GPT Tanjung Priok
                  </p>
                  <p className="text-xs text-brand-500 dark:text-brand-400 font-medium">
                    Growing Together
                  </p>
                </div>
              </Link>

              {/* Desktop Nav */}
              <div className="hidden lg:flex items-center gap-0.5">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === "/"}
                    className={({ isActive }) =>
                      `nav-link-modern ${
                        isActive
                          ? "active"
                          : "text-brand-700 dark:text-brand-200 hover:text-primary"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
                {user && ["admin", "multimedia"].includes(user.role) && (
                  <NavLink
                    to="/dashboard/articles/manage"
                    className={({ isActive }) =>
                      `nav-link-modern ${
                        isActive
                          ? "active"
                          : "text-brand-700 dark:text-brand-200 hover:text-primary"
                      }`
                    }
                  >
                    CMS
                  </NavLink>
                )}
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className="relative rounded-xl p-2.5 hover:bg-brand-100/80 dark:hover:bg-brand-800/50 transition-all duration-300"
                  title={theme === "dark" ? "Light Mode" : "Dark Mode"}
                >
                  <span className="text-lg transition-transform duration-300 block" style={{ transform: theme === "dark" ? "rotate(180deg)" : "rotate(0deg)" }}>
                    {theme === "dark" ? "☀️" : "🌙"}
                  </span>
                </button>

                {!user && (
                  <div className="hidden sm:flex gap-2">
                    <NavLink
                      to="/login"
                      className="btn-primary text-sm !px-5 !py-2"
                    >
                      Login
                    </NavLink>
                  </div>
                )}

                {user && (
                  <div className="hidden md:flex items-center gap-2">
                    {canAccessDashboard && (
                      <NavLink
                        to="/dashboard"
                        className="rounded-xl border border-brand-200 dark:border-brand-700 px-4 py-2 text-sm font-medium hover:bg-brand-50 dark:hover:bg-brand-800/50 transition-all duration-300"
                      >
                        Dashboard
                      </NavLink>
                    )}
                    <button
                      onClick={logout}
                      className="rounded-xl bg-rose-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 transition-all duration-300"
                    >
                      Logout
                    </button>
                  </div>
                )}

                {/* Mobile Menu Toggle */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="rounded-xl p-2.5 lg:hidden hover:bg-brand-100/80 dark:hover:bg-brand-800/50 transition-all duration-300"
                >
                  <div className="w-5 h-4 relative flex flex-col justify-between">
                    <span className={`block w-full h-0.5 bg-brand-700 dark:bg-brand-200 rounded-full transition-all duration-300 origin-center ${mobileMenuOpen ? "rotate-45 translate-y-[7px]" : ""}`} />
                    <span className={`block w-full h-0.5 bg-brand-700 dark:bg-brand-200 rounded-full transition-all duration-300 ${mobileMenuOpen ? "opacity-0 scale-x-0" : ""}`} />
                    <span className={`block w-full h-0.5 bg-brand-700 dark:bg-brand-200 rounded-full transition-all duration-300 origin-center ${mobileMenuOpen ? "-rotate-45 -translate-y-[7px]" : ""}`} />
                  </div>
                </button>
              </div>
            </div>

            {/* Mobile Menu */}
            <div
              className={`lg:hidden overflow-hidden transition-all duration-400 ease-out ${
                mobileMenuOpen ? "max-h-[600px] opacity-100 pb-4" : "max-h-0 opacity-0"
              }`}
            >
              <div className="space-y-1 rounded-2xl bg-brand-50/80 dark:bg-brand-900/60 p-3 backdrop-blur-sm">
                {navLinks.map((link, i) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === "/"}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `block px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-primary text-white shadow-sm"
                          : "text-brand-700 dark:text-brand-200 hover:bg-brand-100 dark:hover:bg-brand-800/50"
                      }`
                    }
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    {link.label}
                  </NavLink>
                ))}
                {user && ["admin", "multimedia"].includes(user.role) && (
                  <NavLink
                    to="/dashboard/articles/manage"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `block px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-primary text-white shadow-sm"
                          : "text-brand-700 dark:text-brand-200 hover:bg-brand-100 dark:hover:bg-brand-800/50"
                      }`
                    }
                  >
                    CMS Renungan
                  </NavLink>
                )}

                <div className="border-t border-brand-200 dark:border-brand-700 mt-2 pt-2">
                  {!user && (
                    <NavLink
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block btn-primary text-sm text-center"
                    >
                      Login
                    </NavLink>
                  )}
                  {user && (
                    <div className="space-y-1">
                      {canAccessDashboard && (
                        <NavLink
                          to="/dashboard"
                          onClick={() => setMobileMenuOpen(false)}
                          className="block px-4 py-2.5 rounded-xl text-sm font-medium border border-brand-200 dark:border-brand-700 text-center hover:bg-brand-100 dark:hover:bg-brand-800/50 transition"
                        >
                          Dashboard
                        </NavLink>
                      )}
                      <button
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full rounded-xl bg-rose-500/90 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-600 transition"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main ref={mainRef} className="organic-main container-custom py-10 flex-1">
        {isAdminSidebarPage ? (
          <>
            <div className="admin-mobile-top lg:hidden">
              <button
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="admin-mobile-menu-btn"
                aria-label="Toggle admin menu"
              >
                <span className={`block h-0.5 w-5 rounded-full bg-brand-700 dark:bg-brand-200 transition-all ${mobileMenuOpen ? "translate-y-[6px] rotate-45" : ""}`} />
                <span className={`mt-1.5 block h-0.5 w-5 rounded-full bg-brand-700 dark:bg-brand-200 transition-all ${mobileMenuOpen ? "opacity-0" : ""}`} />
                <span className={`mt-1.5 block h-0.5 w-5 rounded-full bg-brand-700 dark:bg-brand-200 transition-all ${mobileMenuOpen ? "-translate-y-[6px] -rotate-45" : ""}`} />
              </button>
              <p className="text-sm font-semibold text-brand-900 dark:text-white">Admin Workspace</p>
              <button
                onClick={toggleTheme}
                className="rounded-xl p-2 text-lg transition-all duration-300 hover:bg-brand-100/80 dark:hover:bg-brand-800/60"
                title={theme === "dark" ? "Light Mode" : "Dark Mode"}
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
            </div>

            <div className={`admin-mobile-drawer-backdrop lg:hidden ${mobileMenuOpen ? "open" : ""}`} onClick={() => setMobileMenuOpen(false)}>
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
                      className={({ isActive }) =>
                        `admin-sidebar-link ${
                          isActive ? "active" : ""
                        }`
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>
                <div className="mt-5 border-t border-brand-200/80 pt-4 dark:border-brand-700/80">
                  <button
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
                    onClick={toggleTheme}
                    className="rounded-xl p-2 text-lg transition-all duration-300 hover:bg-brand-100/80 dark:hover:bg-brand-800/60"
                    title={theme === "dark" ? "Light Mode" : "Dark Mode"}
                  >
                    {theme === "dark" ? "☀️" : "🌙"}
                  </button>
                </div>
                <p className="admin-sidebar-title">Menu Admin</p>
                <div className="mt-4 space-y-1.5">
                  {adminSidebarLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={Boolean(link.end)}
                      className={({ isActive }) =>
                        `admin-sidebar-link ${
                          isActive ? "active" : ""
                        }`
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>
                <div className="mt-5 border-t border-brand-200/80 pt-4 dark:border-brand-700/80">
                  <button
                    onClick={logout}
                    className="w-full rounded-xl bg-rose-500/90 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-rose-600"
                  >
                    Logout
                  </button>
                </div>
              </aside>

              <div className="min-w-0">
                {children}
              </div>
            </div>
          </>
        ) : (
          children
        )}
      </main>

      {/* Footer */}
      <footer className="organic-footer mt-16 border-t border-brand-200 dark:border-brand-700">
        <div className="container-custom py-10">
          <div className="organic-footer-card relative overflow-hidden rounded-3xl border border-brand-200/80 bg-white/85 p-6 shadow-sm backdrop-blur md:p-10 dark:border-brand-800 dark:bg-brand-950/75">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand-200/35 blur-3xl dark:bg-brand-700/20" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-primary/20 blur-3xl dark:bg-primary/10" />

            <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr_0.9fr]">
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <BrandLogo />
                  <div>
                    <p className="text-lg font-bold text-brand-900 dark:text-white">
                      GPT Tanjung Priok
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-widest text-brand-500 dark:text-brand-400">
                      Growing Together
                    </p>
                  </div>
                </div>
                <p className="max-w-xl text-sm leading-relaxed text-brand-700 dark:text-brand-300">
                  Komunitas yang berakar dalam Kristus, bertumbuh dalam kasih,
                  dan berjalan bersama melalui ibadah, renungan, serta pelayanan
                  yang saling menguatkan.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/schedules"
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                  >
                    Lihat Jadwal Ibadah
                  </Link>
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-xl border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:border-brand-500 hover:text-brand-900 dark:border-brand-700 dark:text-brand-300 dark:hover:border-brand-500 dark:hover:text-white"
                  >
                    Hubungi via WhatsApp
                  </a>
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-brand-900 dark:text-white">
                  Jelajahi
                </h3>
                <ul className="space-y-2.5 text-sm">
                  {[
                    { to: "/about", label: "Tentang Gereja" },
                    { to: "/articles", label: "Renungan Harian" },
                    { to: "/gallery", label: "Galeri Kegiatan" },
                    { to: "/prayer", label: "Permohonan Doa" },
                    { to: "/contact", label: "Kontak & Lokasi" },
                  ].map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="text-brand-700 transition hover:text-primary dark:text-brand-300 dark:hover:text-primary-light"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-brand-900 dark:text-white">
                  Kontak
                </h3>
                <div className="space-y-3 text-sm text-brand-700 dark:text-brand-300">
                  <a
                    href={`mailto:${contactEmail}?subject=${encodeURIComponent("Pertanyaan dari Website GPT Tanjung Priok")}`}
                    className="block transition hover:text-primary dark:hover:text-primary-light"
                  >
                    {contactEmail}
                  </a>
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block transition hover:text-primary dark:hover:text-primary-light"
                  >
                    +62 812-8983-3972
                  </a>
                  <p className="leading-relaxed text-brand-600 dark:text-brand-400">
                    Jl. Bugis No.128, Kebon Bawang, Tanjung Priok, Jakarta
                    Utara 14320
                  </p>
                </div>
              </div>
            </div>

            <div className="relative mt-8 flex flex-col gap-2 border-t border-brand-200/80 pt-5 text-xs text-brand-500 sm:flex-row sm:items-center sm:justify-between dark:border-brand-800 dark:text-brand-400">
              <p>&copy; 2026 GPT Tanjung Priok</p>
              <p>Website komunitas untuk ibadah, renungan, dan pelayanan</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;
