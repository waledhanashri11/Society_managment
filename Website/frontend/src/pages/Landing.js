import React from 'react';
import { Link } from 'react-router-dom';

const highlights = [
  'Resident-friendly maintenance workflows',
  'Clear notices and instant updates',
  'Fast complaint tracking for every unit'
];

const Landing = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/assets/society.jpg')" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(2,6,23,0.96),rgba(15,23,42,0.86))]" />
      <div className="absolute left-[-5rem] top-8 h-80 w-80 rounded-full bg-cyan-400/20 blur-[120px]" />
      <div className="absolute bottom-[-4rem] right-[-4rem] h-96 w-96 rounded-full bg-sky-500/20 blur-[140px]" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <div className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">
          Community Hive
        </div>
        <nav className="flex items-center gap-3">
          <Link to="/" className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20">
            Home
          </Link>
          <Link to="/login" className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20">
            Login
          </Link>
          <Link to="/register" className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
            Register
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-24">
        <section className="max-w-2xl">
          <span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
            Welcome to your society hub
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            Manage community life with clarity, speed, and trust.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            A polished entry point for notices, maintenance requests, resident support, and secure community coordination before you even log in.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/register" className="rounded-full bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
              Create account
            </Link>
            <Link to="/login" className="rounded-full border border-white/15 bg-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/20">
              Have an account?
            </Link>
          </div>
        </section>

        <aside className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
            Society essentials
          </p>
          <h2 className="mt-4 text-3xl font-semibold text-white">
            Everything your community needs in one calm dashboard.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-400">
            Keep notices, bills, complaints, and resident updates organized without the chaos.
          </p>
          <div className="mt-6 space-y-3">
            {highlights.map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
};

export default Landing;
