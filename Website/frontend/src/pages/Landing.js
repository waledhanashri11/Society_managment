import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSelector from "../components/LanguageSelector";
import { useTheme } from "../utils/theme";
import {
  Activity, ArrowRight, Bell, Check, CheckCircle2,
  CreditCard, DollarSign, FileSpreadsheet, FileText,
  Mail, Menu, MessageSquare, Moon, Phone, ShieldCheck, Sun, Users, X
} from "lucide-react";

const Landing = () => {
  const { t } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mockupTab, setMockupTab] = useState("overview");
  const { resolvedTheme, cycleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    { icon: Users, title: t("landing.f1Title"), desc: t("landing.f1Desc") },
    { icon: FileText, title: t("landing.f2Title"), desc: t("landing.f2Desc") },
    { icon: CreditCard, title: t("landing.f3Title"), desc: t("landing.f3Desc") },
    { icon: MessageSquare, title: t("landing.f4Title"), desc: t("landing.f4Desc") },
    { icon: Bell, title: t("landing.f5Title"), desc: t("landing.f5Desc") },
    { icon: DollarSign, title: t("landing.f6Title"), desc: t("landing.f6Desc") },
    { icon: FileSpreadsheet, title: t("landing.f7Title"), desc: t("landing.f7Desc") },
    { icon: ShieldCheck, title: t("landing.f8Title"), desc: t("landing.f8Desc") }
  ];

  const steps = [
    { step: "01", title: t("landing.step1Title"), desc: t("landing.step1Desc") },
    { step: "02", title: t("landing.step2Title"), desc: t("landing.step2Desc") },
    { step: "03", title: t("landing.step3Title"), desc: t("landing.step3Desc") },
    { step: "04", title: t("landing.step4Title"), desc: t("landing.step4Desc") }
  ];

  const benefits = [
    { title: t("landing.b1Title"), desc: t("landing.b1Desc") },
    { title: t("landing.b2Title"), desc: t("landing.b2Desc") },
    { title: t("landing.b3Title"), desc: t("landing.b3Desc") },
    { title: t("landing.b4Title"), desc: t("landing.b4Desc") },
    { title: t("landing.b5Title"), desc: t("landing.b5Desc") },
    { title: t("landing.b6Title"), desc: t("landing.b6Desc") }
  ];

  return (
    <div className={`relative min-h-screen font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden transition-colors duration-300 ${
      isDark ? "text-slate-100 bg-slate-950" : "text-slate-900 bg-slate-100"
    }`}>
      {/* Background glow accents */}
      <div className={`absolute top-0 left-1/4 hidden h-[500px] w-[500px] rounded-full blur-[120px] pointer-events-none sm:block ${isDark ? "bg-blue-600/10" : "bg-blue-500/15"}`} />
      <div className={`absolute top-[120vh] right-1/4 hidden h-[600px] w-[600px] rounded-full blur-[140px] pointer-events-none sm:block ${isDark ? "bg-indigo-600/10" : "bg-indigo-500/15"}`} />
      <div className={`absolute bottom-20 left-1/3 hidden h-[450px] w-[450px] rounded-full blur-[100px] pointer-events-none sm:block ${isDark ? "bg-cyan-600/10" : "bg-cyan-500/15"}`} />

      {/* SECTION 1 — NAVBAR */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? isDark
              ? "bg-slate-950/90 backdrop-blur-md border-b border-slate-900 py-3 shadow-lg shadow-black/30"
              : "bg-white/90 backdrop-blur-md border-b border-slate-200 py-3 shadow-md shadow-slate-200/50"
            : "bg-transparent py-4 sm:py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <a href="#home" className="flex items-center gap-2 group text-decoration-none">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className={`text-base sm:text-xl font-bold bg-clip-text text-transparent ${
              isDark
                ? "bg-gradient-to-r from-white via-slate-200 to-blue-400"
                : "bg-gradient-to-r from-slate-900 via-slate-800 to-blue-600"
            }`}>
              {t("landing.heroTitle1")}
            </span>
          </a>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#home" className={`text-sm font-semibold transition-colors text-decoration-none ${
              isDark ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-blue-600"
            }`}>
              {t("landing.navHome")}
            </a>
            <a href="#features" className={`text-sm font-semibold transition-colors text-decoration-none ${
              isDark ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-blue-600"
            }`}>
              {t("landing.navFeatures")}
            </a>
            <a href="#about" className={`text-sm font-semibold transition-colors text-decoration-none ${
              isDark ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-blue-600"
            }`}>
              {t("landing.navAbout")}
            </a>
            <a href="#contact" className={`text-sm font-semibold transition-colors text-decoration-none ${
              isDark ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-blue-600"
            }`}>
              {t("landing.navContact")}
            </a>
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className={`px-5 py-2 rounded-full text-sm font-semibold border transition-all text-decoration-none ${
                isDark
                  ? "border-slate-800 hover:border-slate-600 bg-slate-950 text-slate-300 hover:text-white"
                  : "border-slate-300 hover:border-slate-400 bg-white text-slate-800 hover:text-slate-950 shadow-sm"
              }`}
            >
              {t("auth.login")}
            </Link>
            <Link
              to="/register"
              className="px-5 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:brightness-110 transition-all text-decoration-none"
            >
              {t("auth.register")}
            </Link>
            <LanguageSelector variant={isDark ? "dark" : "default"} compact />
            <button
              onClick={cycleTheme}
              aria-label="Toggle theme"
              className={`landing-theme-toggle ${!isDark ? "!bg-white !border-slate-300 !text-slate-800" : ""}`}
              title={isDark ? t("theme.light") : t("theme.dark")}
            >
              {isDark ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Sun size={15} /> Light
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-600">
                  <Moon size={15} /> Dark
                </span>
              )}
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              isDark ? "text-slate-400 hover:text-white hover:bg-slate-900" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            }`}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className={`md:hidden absolute top-full left-0 right-0 max-h-[calc(100vh-68px)] overflow-y-auto backdrop-blur-lg border-b py-5 px-4 shadow-xl animate-fadeIn ${
            isDark ? "bg-slate-950/95 border-slate-900" : "bg-white/95 border-slate-200"
          }`}>
            <div className="flex flex-col gap-4">
              <a
                href="#home"
                onClick={() => setMobileMenuOpen(false)}
                className={`text-lg font-medium text-decoration-none ${isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}
              >
                {t("landing.navHome")}
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className={`text-lg font-medium text-decoration-none ${isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}
              >
                {t("landing.navFeatures")}
              </a>
              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className={`text-lg font-medium text-decoration-none ${isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}
              >
                {t("landing.navAbout")}
              </a>
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className={`text-lg font-medium text-decoration-none ${isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}
              >
                {t("landing.navContact")}
              </a>
              <div className={`h-px my-2 ${isDark ? "bg-slate-900" : "bg-slate-200"}`} />
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-3 rounded-xl text-center font-semibold border text-decoration-none ${
                  isDark ? "border-slate-800 bg-slate-950 text-slate-300" : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                {t("auth.login")}
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 rounded-xl text-center font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg text-decoration-none"
              >
                {t("auth.register")}
              </Link>
              <div className={`h-px my-2 ${isDark ? "bg-slate-900" : "bg-slate-200"}`} />
              <div className="flex items-center gap-3">
                <LanguageSelector variant={isDark ? "dark" : "default"} compact />
                <button
                  onClick={cycleTheme}
                  aria-label="Toggle theme"
                  className={`landing-theme-toggle ${!isDark ? "!bg-white !border-slate-300 !text-slate-800" : ""}`}
                >
                  {isDark ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                      <Sun size={15} /> Light
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-600">
                      <Moon size={15} /> Dark
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* SECTION 2 — HERO SECTION */}
      <header id="home" className="relative min-h-[100svh] pt-24 pb-14 sm:pt-32 sm:pb-20 flex items-center">
        {/* Background Image with Theme-Responsive Overlay */}
        <div className="absolute inset-0 z-0">
          <div 
            className="w-full h-full bg-cover bg-center bg-no-repeat"
            style={{ 
              backgroundImage: "url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1920&q=80')" 
            }}
          />
          <div className={`absolute inset-0 backdrop-blur-[2px] transition-colors duration-300 ${
            isDark ? "bg-slate-950/92" : "bg-slate-900/80"
          }`} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
          {/* Left Side */}
          <div className="lg:col-span-7 flex flex-col items-center text-center lg:items-start lg:text-left animate-fadeInUp">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-5 sm:mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              {t("landing.heroTag")}
            </span>
            <h1 className="text-3xl min-[380px]:text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] mb-5 sm:mb-6 text-white">
              {t("landing.heroTitle1")} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                {t("landing.heroTitle2")}
              </span>
            </h1>
            <p className="text-base sm:text-lg text-slate-300 mb-7 sm:mb-8 max-w-xl leading-relaxed">
              {t("landing.heroDesc")}
            </p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-4 mb-7 sm:mb-8">
              <Link
                to="/login"
                className="px-8 py-3.5 rounded-xl sm:rounded-full font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/20 hover:shadow-blue-500/35 hover:scale-[1.02] hover:brightness-110 active:scale-95 transition-all text-decoration-none flex items-center justify-center gap-2"
              >
                {t("landing.getStarted")} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/register"
                className="px-8 py-3.5 rounded-xl sm:rounded-full font-bold border border-white/20 hover:border-white/40 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:scale-[1.02] active:scale-95 transition-all text-decoration-none text-center"
              >
                {t("landing.registerSociety")}
              </Link>
            </div>
            <div className="grid w-full max-w-sm grid-cols-1 gap-y-3 gap-x-6 text-left text-sm text-slate-300 font-medium sm:max-w-none sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span>{t("landing.secureLogin")}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span>{t("landing.autoBillingRules")}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span>{t("landing.onlinePayments")}</span>
              </div>
            </div>
          </div>

          {/* Right Side Mockup */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <div className="relative w-full max-w-[22rem] sm:max-w-md aspect-[4/3] rounded-2xl bg-slate-900/70 backdrop-blur-xl border border-white/15 shadow-2xl p-3.5 sm:p-5 overflow-hidden animate-float">
              {/* Mockup Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/80" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <span className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex gap-1.5 sm:gap-2">
                  <button
                    onClick={() => setMockupTab("overview")}
                    className={`text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-md font-medium transition-all ${
                      mockupTab === "overview" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {t("landing.overview")}
                  </button>
                  <button
                    onClick={() => setMockupTab("notices")}
                    className={`text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-md font-medium transition-all ${
                      mockupTab === "notices" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {t("landing.noticesTab")}
                  </button>
                </div>
              </div>

              {/* Mockup Content */}
              {mockupTab === "overview" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{t("landing.collected")}</div>
                      <div className="text-lg font-bold text-emerald-400 mt-1">₹3,45,000</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{t("landing.thisMonth")}</div>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{t("landing.outstanding")}</div>
                      <div className="text-lg font-bold text-amber-400 mt-1">₹45,200</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{t("landing.pendingBillsCount")}</div>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3.5 space-y-2">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">{t("landing.recentBillings")}</div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-300">Flat 102 · Amit Shah</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">{t("landing.paid")}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-300">Flat 204 · Neha Gupta</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">{t("landing.pending")}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">{t("landing.noticeBoard")}</div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-left">
                    <div className="text-xs font-bold text-slate-200">{t("landing.mockNotice1Title")}</div>
                    <p className="text-[10px] text-slate-400 mt-1">{t("landing.mockNotice1Desc")}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-left">
                    <div className="text-xs font-bold text-slate-200">{t("landing.mockNotice2Title")}</div>
                    <p className="text-[10px] text-slate-400 mt-1">{t("landing.mockNotice2Desc")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* SECTION 3 — FEATURES */}
      <section id="features" className={`py-16 sm:py-24 border-t relative transition-colors duration-300 ${
        isDark ? "border-slate-900 bg-slate-950/60" : "border-slate-200 bg-slate-200/50"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 px-3.5 py-1.5 rounded-full border border-blue-500/20">
              {t("landing.operationsHub")}
            </span>
            <h2 className={`text-3xl sm:text-4xl font-extrabold mt-4 tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              {t("landing.everythingNeeds")}
            </h2>
            <p className={`mt-3 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {t("landing.everythingDesc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {features.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className={`group border rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 ${
                    isDark
                      ? "bg-slate-900/35 hover:bg-slate-900/70 border-white/5 shadow-lg shadow-black/10"
                      : "bg-white hover:bg-slate-50 border-slate-200/90 shadow-md shadow-slate-200/60"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-5 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className={`text-lg mb-2 transition-colors ${
                    isDark ? "text-slate-100 font-bold group-hover:text-white" : "text-slate-900 font-bold group-hover:text-blue-600"
                  }`}>
                    {item.title}
                  </h3>
                  <p className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 4 — HOW IT WORKS */}
      <section id="about" className={`py-16 sm:py-24 border-t relative transition-colors duration-300 ${
        isDark ? "border-slate-900 bg-slate-950" : "border-slate-200 bg-white"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-20">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 px-3.5 py-1.5 rounded-full border border-blue-500/20">
              {t("landing.simpleSetup")}
            </span>
            <h2 className={`text-3xl sm:text-4xl font-extrabold mt-4 tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              {t("landing.howItWorks")}
            </h2>
            <p className={`mt-3 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {t("landing.howItWorksDesc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {steps.map((item, index) => (
              <div key={index} className="flex flex-col items-center lg:items-start text-center lg:text-left relative">
                {/* Connector arrow line on desktop */}
                {index < 3 && (
                  <div className={`hidden lg:block absolute top-7 left-[70%] w-[60%] h-0.5 border-t-2 border-dashed ${
                    isDark ? "border-slate-800" : "border-slate-200"
                  }`} />
                )}
                <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-bold text-lg mb-6 transition-all duration-300 ${
                  isDark
                    ? "bg-slate-900 border-blue-500/30 text-blue-400 shadow-xl shadow-blue-500/5 hover:border-blue-500"
                    : "bg-blue-50 border-blue-500/40 text-blue-600 shadow-md shadow-blue-500/10 hover:border-blue-600"
                }`}>
                  {item.step}
                </div>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>{item.title}</h3>
                <p className={`text-sm leading-relaxed max-w-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 — WHY CHOOSE COMMUNITY HIVE */}
      <section className={`py-16 sm:py-24 border-t relative transition-colors duration-300 ${
        isDark ? "border-slate-900 bg-slate-950/60" : "border-slate-200 bg-slate-200/50"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 px-3.5 py-1.5 rounded-full border border-blue-500/20">
              {t("landing.keyAdvantages")}
            </span>
            <h2 className={`text-3xl sm:text-4xl font-extrabold mt-4 tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              {t("landing.whyChooseTitle")}
            </h2>
            <p className={`mt-3 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {t("landing.whyChooseDesc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {benefits.map((item, index) => (
              <div
                key={index}
                className={`border rounded-2xl p-6 transition-all duration-300 ${
                  isDark
                    ? "bg-slate-900/40 border-white/5 hover:border-blue-500/20 hover:bg-slate-900/60"
                    : "bg-white border-slate-200/90 hover:border-blue-500/30 hover:bg-slate-50 shadow-sm"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mt-1 flex-shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold mb-1 ${isDark ? "text-slate-100" : "text-slate-900"}`}>{item.title}</h3>
                    <p className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6 — CALL TO ACTION */}
      <section className={`py-16 sm:py-20 border-t relative transition-colors duration-300 ${
        isDark ? "border-slate-900 bg-slate-950" : "border-slate-200 bg-white"
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-900 p-6 sm:p-12 lg:p-16 text-center shadow-2xl shadow-blue-500/10">
            {/* Visual background patterns */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
            
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight mb-4">
                {t("landing.ctaTitle")}
              </h2>
              <p className="text-blue-100 text-base sm:text-lg mb-8 max-w-lg mx-auto opacity-90">
                {t("landing.ctaDesc")}
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
                <Link
                  to="/login"
                  className="px-8 py-3.5 rounded-xl sm:rounded-full font-bold bg-white text-slate-950 hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all text-decoration-none shadow-lg shadow-black/10"
                >
                  {t("landing.loginPortal")}
                </Link>
                <Link
                  to="/register"
                  className="px-8 py-3.5 rounded-xl sm:rounded-full font-bold border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 hover:scale-105 active:scale-95 transition-all text-decoration-none text-white"
                >
                  {t("landing.registerFlat")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7 — FOOTER */}
      <footer id="contact" className={`border-t py-14 sm:py-16 relative transition-colors duration-300 ${
        isDark ? "bg-slate-950 border-slate-900 text-slate-400" : "bg-white border-slate-200 text-slate-700 shadow-inner"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand Column */}
          <div className="md:col-span-5 flex flex-col items-start">
            <a href="#home" className="flex items-center gap-2 group text-decoration-none mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className={`text-xl font-bold bg-clip-text text-transparent ${
                isDark ? "bg-gradient-to-r from-white to-blue-400" : "bg-gradient-to-r from-slate-900 to-blue-600"
              }`}>
                {t("landing.heroTitle1")}
              </span>
            </a>
            <p className={`text-sm leading-relaxed mb-6 max-w-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {t("landing.footerDesc")}
            </p>
            <div className={`flex flex-col gap-2 text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-blue-500" />
                <span>dhawalepriya@gmail.com</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-blue-500" />
                <span>+91 8080978517</span>
              </div>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="md:col-span-3">
            <h4 className={`text-sm font-bold uppercase tracking-wider mb-6 ${isDark ? "text-white" : "text-slate-900"}`}>{t("landing.quickLinks")}</h4>
            <div className="flex flex-col gap-3 text-sm font-medium">
              <a href="#home" className={`transition-colors text-decoration-none ${isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-blue-600"}`}>
                {t("landing.navHome")}
              </a>
              <a href="#features" className={`transition-colors text-decoration-none ${isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-blue-600"}`}>
                {t("landing.navFeatures")}
              </a>
              <a href="#about" className={`transition-colors text-decoration-none ${isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-blue-600"}`}>
                {t("landing.aboutUs")}
              </a>
              <a href="#contact" className={`transition-colors text-decoration-none ${isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-blue-600"}`}>
                {t("landing.contactSupport")}
              </a>
              <Link to="/login" className={`transition-colors text-decoration-none ${isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-blue-600"}`}>
                {t("auth.login")}
              </Link>
              <Link to="/register" className={`transition-colors text-decoration-none ${isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-blue-600"}`}>
                {t("auth.register")}
              </Link>
            </div>
          </div>

          {/* Legal Column */}
          <div className="md:col-span-4">
            <h4 className={`text-sm font-bold uppercase tracking-wider mb-6 ${isDark ? "text-white" : "text-slate-900"}`}>{t("landing.legalTerms")}</h4>
            <div className="flex flex-col gap-3 text-sm font-medium">
              <Link to="/privacy" className={`transition-colors text-decoration-none ${isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-blue-600"}`}>
                {t("landing.privacyPolicy")}
              </Link>
              <Link to="/terms" className={`transition-colors text-decoration-none ${isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-blue-600"}`}>
                {t("landing.termsOfService")}
              </Link>
              <Link to="/refunds" className={`transition-colors text-decoration-none ${isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-blue-600"}`}>
                {t("landing.refundRules")}
              </Link>
            </div>
            <p className={`text-xs mt-8 leading-relaxed ${isDark ? "text-slate-500" : "text-slate-500"}`}>
              © {new Date().getFullYear()} Community Hive. {t("landing.allRights")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
