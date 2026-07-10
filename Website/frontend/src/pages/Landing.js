import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, ArrowRight, Bell, Check, CheckCircle2,
  CreditCard, DollarSign, FileSpreadsheet, FileText,
  Mail, Menu, MessageSquare, Phone, ShieldCheck, Users, X
} from "lucide-react";

const Landing = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mockupTab, setMockupTab] = useState("overview");

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
    {
      icon: Users,
      title: "Resident Management",
      desc: "Manage residents, tenants, and flat owners effortlessly with digital profiles and quick directory lookups."
    },
    {
      icon: FileText,
      title: "Maintenance Billing",
      desc: "Set automatic monthly maintenance billing rules. Generate invoices for all occupied flats in one click."
    },
    {
      icon: CreditCard,
      title: "Payment Tracking",
      desc: "Track collected, pending, and overdue maintenance balances with automated invoices and receipts."
    },
    {
      icon: MessageSquare,
      title: "Complaint Management",
      desc: "Enable residents to submit complaints online. Track resolution workflow and status in real time."
    },
    {
      icon: Bell,
      title: "Notice Board",
      desc: "Broadcast important announcements, digital newsletters, and urgent alerts instantly to the community."
    },
    {
      icon: DollarSign,
      title: "Expense Management",
      desc: "Log operational expenses, vendor bills, and utility payments. Keep the society budget transparent."
    },
    {
      icon: FileSpreadsheet,
      title: "Reports & Analytics",
      desc: "Generate monthly and yearly collection statements, expense summaries, and defaulter audits."
    },
    {
      icon: ShieldCheck,
      title: "Secure Authentication",
      desc: "Provide role-based dashboards for administrators and residents to ensure privacy and data security."
    }
  ];

  const steps = [
    {
      step: "01",
      title: "Resident Registers",
      desc: "Residents register securely on the platform to create their profile."
    },
    {
      step: "02",
      title: "Admin Assigns Flat",
      desc: "Administrators match the resident's profile to their corresponding flat number."
    },
    {
      step: "03",
      title: "Auto-Billing Cycles",
      desc: "Monthly maintenance bills are generated automatically based on society rules."
    },
    {
      step: "04",
      title: "Secure Fast Pay",
      desc: "Residents pay online, checking records and printing PDF receipts instantly."
    }
  ];

  const benefits = [
    { title: "Automatic Bill Generation", desc: "No more manual invoice entry every month." },
    { title: "Late Fee Calculation", desc: "Automate penalty rules for overdue balances." },
    { title: "Expense Reports", desc: "Export detailed society cash flow summaries." },
    { title: "Complaint Tracking", desc: "Keep society operational issues organized." },
    { title: "Resident Directory", desc: "Securely access community contact logs." },
    { title: "Mobile Friendly", desc: "Optimized layouts for phones, tablets, and desktops." }
  ];

  return (
    <div className="relative min-h-screen text-slate-100 bg-slate-950 font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden">
      {/* Background glow accents */}
      <div className="absolute top-0 left-1/4 hidden h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none sm:block" />
      <div className="absolute top-[120vh] right-1/4 hidden h-[600px] w-[600px] rounded-full bg-indigo-600/10 blur-[140px] pointer-events-none sm:block" />
      <div className="absolute bottom-20 left-1/3 hidden h-[450px] w-[450px] rounded-full bg-cyan-600/10 blur-[100px] pointer-events-none sm:block" />

      {/* SECTION 1 — NAVBAR */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-slate-950/90 backdrop-blur-md border-b border-slate-900 py-3 shadow-lg shadow-black/30"
            : "bg-transparent py-4 sm:py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <a href="#home" className="flex items-center gap-2 group text-decoration-none">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-base sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-blue-400">
              Community Hive
            </span>
          </a>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#home" className="text-sm font-medium text-slate-400 hover:text-white transition-colors text-decoration-none">
              Home
            </a>
            <a href="#features" className="text-sm font-medium text-slate-400 hover:text-white transition-colors text-decoration-none">
              Features
            </a>
            <a href="#about" className="text-sm font-medium text-slate-400 hover:text-white transition-colors text-decoration-none">
              About
            </a>
            <a href="#contact" className="text-sm font-medium text-slate-400 hover:text-white transition-colors text-decoration-none">
              Contact
            </a>
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/login"
              className="px-5 py-2 rounded-full text-sm font-semibold border border-slate-800 hover:border-slate-600 bg-slate-950 text-slate-300 hover:text-white transition-all text-decoration-none"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="px-5 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:brightness-110 transition-all text-decoration-none"
            >
              Register
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 max-h-[calc(100vh-68px)] overflow-y-auto bg-slate-950/95 backdrop-blur-lg border-b border-slate-900 py-5 px-4 shadow-xl animate-fadeIn">
            <div className="flex flex-col gap-4">
              <a
                href="#home"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-slate-400 hover:text-white text-decoration-none"
              >
                Home
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-slate-400 hover:text-white text-decoration-none"
              >
                Features
              </a>
              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-slate-400 hover:text-white text-decoration-none"
              >
                About
              </a>
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-slate-400 hover:text-white text-decoration-none"
              >
                Contact
              </a>
              <div className="h-px bg-slate-900 my-2" />
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 rounded-xl text-center font-semibold border border-slate-800 bg-slate-950 text-slate-300 text-decoration-none"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 rounded-xl text-center font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg text-decoration-none"
              >
                Register
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* SECTION 2 — HERO SECTION */}
      <header id="home" className="relative min-h-[100svh] pt-24 pb-14 sm:pt-32 sm:pb-20 flex items-center">
        {/* Background Image with Dark Overlay */}
        <div className="absolute inset-0 z-0">
          <div 
            className="w-full h-full bg-cover bg-center bg-no-repeat"
            style={{ 
              backgroundImage: "url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1920&q=80')" 
            }}
          />
          <div className="absolute inset-0 bg-slate-950/92 backdrop-blur-[2px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
          {/* Left Side */}
          <div className="lg:col-span-7 flex flex-col items-center text-center lg:items-start lg:text-left animate-fadeInUp">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-5 sm:mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Smart Society Management
            </span>
            <h1 className="text-3xl min-[380px]:text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] mb-5 sm:mb-6 text-white">
              Community Hive <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
                Society Management
              </span>
            </h1>
            <p className="text-base sm:text-lg text-slate-400 mb-7 sm:mb-8 max-w-xl leading-relaxed">
              Digitize your housing society with automated maintenance billing, complaint management, notice boards, expense tracking, and secure resident communication. Manage everything from one platform.
            </p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-4 mb-7 sm:mb-8">
              <Link
                to="/login"
                className="px-8 py-3.5 rounded-xl sm:rounded-full font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/20 hover:shadow-blue-500/35 hover:scale-[1.02] hover:brightness-110 active:scale-95 transition-all text-decoration-none flex items-center justify-center gap-2"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/register"
                className="px-8 py-3.5 rounded-xl sm:rounded-full font-bold border border-slate-800 hover:border-slate-600 bg-slate-950/40 backdrop-blur-sm text-slate-300 hover:text-white hover:scale-[1.02] active:scale-95 transition-all text-decoration-none text-center"
              >
                Register Society
              </Link>
            </div>
            <div className="grid w-full max-w-sm grid-cols-1 gap-y-3 gap-x-6 text-left text-sm text-slate-400 font-medium sm:max-w-none sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span>Secure Login</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span>Auto Billing Rules</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span>Online Payments</span>
              </div>
            </div>
          </div>

          {/* Right Side Mockup */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <div className="relative w-full max-w-[22rem] sm:max-w-md aspect-[4/3] rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-2xl p-3.5 sm:p-5 overflow-hidden animate-float">
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
                    Overview
                  </button>
                  <button
                    onClick={() => setMockupTab("notices")}
                    className={`text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-md font-medium transition-all ${
                      mockupTab === "notices" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Notices
                  </button>
                </div>
              </div>

              {/* Mockup Content */}
              {mockupTab === "overview" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Collected</div>
                      <div className="text-lg font-bold text-emerald-400 mt-1">₹3,45,000</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">This Month</div>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Outstanding</div>
                      <div className="text-lg font-bold text-amber-400 mt-1">₹45,200</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">8 Pending Bills</div>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3.5 space-y-2">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">Recent Billings</div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-300">Flat 102 · Amit Shah</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">Paid</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-300">Flat 204 · Neha Gupta</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">Pending</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Notice Board</div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-left">
                    <div className="text-xs font-bold text-slate-200">Annual General Body Meeting</div>
                    <p className="text-[10px] text-slate-400 mt-1">Scheduled for next Sunday at 10:00 AM in the clubhouse hall. Attendance is mandatory.</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-left">
                    <div className="text-xs font-bold text-slate-200">Pest Control Service</div>
                    <p className="text-[10px] text-slate-400 mt-1">Pest control in wings A & B will be conducted on Friday from 10:00 AM onwards.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* SECTION 3 — FEATURES */}
      <section id="features" className="py-16 sm:py-24 border-t border-slate-900 bg-slate-950/60 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 px-3.5 py-1.5 rounded-full border border-blue-500/20">
              Operations Hub
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-4 tracking-tight">
              Everything Your Society Needs
            </h2>
            <p className="text-slate-400 mt-3">
              Streamline community administrative work and daily operations with our comprehensive modules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {features.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="group bg-slate-900/35 hover:bg-slate-900/70 border border-white/5 hover:border-blue-500/30 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 shadow-lg shadow-black/10"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-5 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100 mb-2 group-hover:text-white">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 4 — HOW IT WORKS */}
      <section id="about" className="py-16 sm:py-24 border-t border-slate-900 bg-slate-950 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-20">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 px-3.5 py-1.5 rounded-full border border-blue-500/20">
              Simple Setup
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-4 tracking-tight">
              How It Works
            </h2>
            <p className="text-slate-400 mt-3">
              Four steps to digitize your community and automate maintenance collections.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {steps.map((item, index) => (
              <div key={index} className="flex flex-col items-center lg:items-start text-center lg:text-left relative">
                {/* Connector arrow line on desktop */}
                {index < 3 && (
                  <div className="hidden lg:block absolute top-7 left-[70%] w-[60%] h-0.5 border-t-2 border-dashed border-slate-800" />
                )}
                <div className="w-14 h-14 rounded-full bg-slate-900 border-2 border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg mb-6 shadow-xl shadow-blue-500/5 hover:border-blue-500 transition-all duration-300">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed max-w-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 — WHY CHOOSE COMMUNITY HIVE */}
      <section className="py-16 sm:py-24 border-t border-slate-900 bg-slate-950/60 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 px-3.5 py-1.5 rounded-full border border-blue-500/20">
              Key Advantages
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-4 tracking-tight">
              Why Choose Community Hive?
            </h2>
            <p className="text-slate-400 mt-3">
              Built specifically for modern housing societies to enforce transparency and streamline operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {benefits.map((item, index) => (
              <div
                key={index}
                className="bg-slate-900/40 border border-white/5 hover:border-blue-500/20 rounded-2xl p-6 transition-all duration-300 hover:bg-slate-900/60"
              >
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mt-1 flex-shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100 mb-1">{item.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6 — CALL TO ACTION */}
      <section className="py-16 sm:py-20 border-t border-slate-900 bg-slate-950 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-900 p-6 sm:p-12 lg:p-16 text-center shadow-2xl shadow-blue-500/10">
            {/* Visual background patterns */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
            
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight mb-4">
                Ready to Digitize Your Society?
              </h2>
              <p className="text-blue-100 text-base sm:text-lg mb-8 max-w-lg mx-auto opacity-90">
                Join Community Hive today and simplify maintenance billing, communications, and administrative tracking.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
                <Link
                  to="/login"
                  className="px-8 py-3.5 rounded-xl sm:rounded-full font-bold bg-white text-slate-950 hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all text-decoration-none shadow-lg shadow-black/10"
                >
                  Login Portal
                </Link>
                <Link
                  to="/register"
                  className="px-8 py-3.5 rounded-xl sm:rounded-full font-bold border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 hover:scale-105 active:scale-95 transition-all text-decoration-none"
                >
                  Register Flat
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7 — FOOTER */}
      <footer id="contact" className="bg-slate-950 border-t border-slate-900 py-14 sm:py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand Column */}
          <div className="md:col-span-5 flex flex-col items-start">
            <a href="#home" className="flex items-center gap-2 group text-decoration-none mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-400">
                Community Hive
              </span>
            </a>
            <p className="text-sm text-slate-500 leading-relaxed mb-6 max-w-sm">
              Digitize society administration, secure collection processing, online receipts, notices and complaint boards for modern housing societies.
            </p>
            <div className="flex flex-col gap-2 text-sm text-slate-400 font-medium">
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
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Quick Links</h4>
            <div className="flex flex-col gap-3 text-sm font-medium">
              <a href="#home" className="text-slate-400 hover:text-white transition-colors text-decoration-none">
                Home
              </a>
              <a href="#features" className="text-slate-400 hover:text-white transition-colors text-decoration-none">
                Features
              </a>
              <a href="#about" className="text-slate-400 hover:text-white transition-colors text-decoration-none">
                About Us
              </a>
              <a href="#contact" className="text-slate-400 hover:text-white transition-colors text-decoration-none">
                Contact Support
              </a>
            </div>
          </div>

          {/* Legal Column */}
          <div className="md:col-span-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Legal & Terms</h4>
            <div className="flex flex-col gap-3 text-sm font-medium">
              <Link to="/privacy" className="text-slate-400 hover:text-white transition-colors text-decoration-none">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-slate-400 hover:text-white transition-colors text-decoration-none">
                Terms of Service
              </Link>
              <Link to="/refunds" className="text-slate-400 hover:text-white transition-colors text-decoration-none">
                Refund Rules
              </Link>
            </div>
            <p className="text-xs text-slate-600 mt-8 leading-relaxed">
              © {new Date().getFullYear()} Community Hive. All rights reserved. Built for smart societies.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
