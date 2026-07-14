import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Scale } from "lucide-react";

const TermsOfService = () => {
  return (
    <div className="min-h-screen text-slate-100 bg-slate-950 font-sans selection:bg-blue-600 selection:text-white py-20 px-6 relative overflow-hidden">
      {/* Glow backgrounds */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors mb-8 text-decoration-none"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        {/* Heading */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Terms of Service</h1>
            <p className="text-slate-400 text-xs mt-1">Last Updated: July 10, 2026</p>
          </div>
        </div>

        {/* Terms Content */}
        <div className="bg-slate-900/30 border border-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 space-y-6 text-sm text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-white mb-2">1. Acceptable Use of the Portal</h2>
            <p>
              By accessing Community Hive, you agree to supply authentic registration credentials, match your user profile to your verified flat number, and use the dashboard solely for lawful community operations, payment reports, notice board views, and complaint registrations.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">2. Resident Accounts & Responsibilities</h2>
            <p>
              You are responsible for securing your login passcode. Any activity performed under your account dashboard (including payment receipts uploads or community forum posts) remains your accountability. Immediately notify your society's administrative committee of any unauthorized account activity.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">3. Maintenance Billing & Penalties</h2>
            <p>
              Invoices are issued automatically based on the rules configured by your society's administrator. Late fees and interest penalty multipliers will be applied to outstanding maintenance balances once the set grace days period has expired.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">4. Disclaimers & Liabilities</h2>
            <p>
              Community Hive provides the administrative portal on an "as is" framework. We are not responsible for society committee financial disputes, cash leaks, check defaults, or individual maintenance billing disputes. Financial settlements must be resolved directly with your society's treasury board.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">5. Service Adjustments</h2>
            <p>
              We reserve the right to deploy updates, adjust interface designs, or temporarily suspend server access for scheduled system database optimization. Resident profile access will remain active subject to society committee registrations.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
