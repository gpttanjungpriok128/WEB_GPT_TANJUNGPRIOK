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
  const canAccessDashboard = ["admin", "multimedia"].includes(user?.role);
  const location = useLocation();
  const mainRef = useRef(null);
  const lastScrollY = useRef(0);

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/about", label: "Tentang" },
    { to: "/schedules", label: "Jadwal" },
    { to: "/articles", label: "Renungan" },
    { to: "/gallery", label: "Galeri" },
    ...(user ? [{ to: "/live", label: "Live" }, { to: "/prayer", label: "Doa" }] : []),
    { to: "/contact", label: "Kontak" },
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
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
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

      {/* Main Content */}
      <main ref={mainRef} className="container-custom py-10 flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative border-t border-brand-200 dark:border-brand-700 mt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-50/40 to-brand-100/60 dark:from-transparent dark:via-brand-950/40 dark:to-brand-950/80 pointer-events-none" />
        <div className="container-custom relative py-12">
          <div className="grid gap-10 md:grid-cols-3 mb-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <BrandLogo />
                <div>
                  <p className="font-bold text-brand-800 dark:text-white">
                    GPT Tanjung Priok
                  </p>
                  <p className="text-xs text-brand-500 dark:text-brand-400 font-medium">
                    Growing Together
                  </p>
                </div>
              </div>
              <p className="text-sm text-brand-600 dark:text-brand-300 leading-relaxed">
                Komunitas yang berakar dalam Kristus dan bertumbuh dalam kasih untuk saling melayani.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-brand-800 dark:text-white">
                Navigasi
              </h3>
              <ul className="space-y-2.5 text-sm">
                {[
                  { to: "/about", label: "Tentang" },
                  { to: "/schedules", label: "Jadwal" },
                  { to: "/articles", label: "Renungan" },
                  { to: "/gallery", label: "Galeri" },
                  { to: "/contact", label: "Kontak" },
                ].map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-brand-600 dark:text-brand-400 hover:text-primary dark:hover:text-primary-light transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-brand-800 dark:text-white">
                Kontak
              </h3>
              <div className="space-y-3 text-sm">
                <a
                  href={`mailto:${contactEmail}?subject=${encodeURIComponent("Pertanyaan dari Website GPT Tanjung Priok")}`}
                  className="flex items-start gap-2 text-brand-600 hover:text-primary dark:text-brand-400 dark:hover:text-primary-light transition-colors duration-200"
                >
                  <span>📧</span>
                  <span>{contactEmail}</span>
                </a>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 text-brand-600 hover:text-primary dark:text-brand-400 dark:hover:text-primary-light transition-colors duration-200"
                >
                  <span>📞</span>
                  <span>+62 812-8983-3972 (WhatsApp)</span>
                </a>
                <p className="flex items-start gap-2 text-brand-600 dark:text-brand-400">
                  <span>📍</span>
                  <span>Jl. Bugis No.128, Kebon Bawang, Tanjung Priok, Jakarta Utara, 14320</span>
                </p>
              </div>
            </div>
          </div>
          <div className="section-divider mb-6" />
          <div className="text-center text-sm text-brand-500 dark:text-brand-400">
            <p>&copy; 2026 GPT Tanjung Priok. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;
