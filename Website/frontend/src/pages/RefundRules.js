import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Landmark } from "lucide-react";

const RefundRules = () => {
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
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Refund Rules</h1>
            <p className="text-slate-400 text-xs mt-1">Last Updated: July 10, 2026</p>
          </div>
        </div>

        {/* Refund Content */}
        <div className="bg-slate-900/30 border border-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 space-y-6 text-sm text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-white mb-2">1. Maintenance Payments Settlement</h2>
            <p>
              Maintenance billing is governed directly by your housing society's management committee. Any payment made via the portal goes to the society's bank account. Community Hive does not hold, manage, or process payment refunds directly.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">2. Erroneous Transctions & Double Payments</h2>
            <p>
              In case of a double payment due to a payment gateway lag or server timeout:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
              <li>Keep the transaction IDs and payment proofs handy.</li>
              <li>Present these records to your society's treasurer.</li>
              <li>The double payment will be adjusted against your next billing cycle.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">3. Dispute Timelines</h2>
            <p>
              Any maintenance billing disputes, wrong penalty assessments, or adjustments must be reported to the society administration office within fifteen (15) days of bill generation. Adjusted credits will be credited to the resident's portal account details after approval.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">4. Non-Refundable Items</h2>
            <p>
              One-time administrative processing fees, service charges, late payment penalties (if verified as applied correctly according to grace period rules), and active gate pass utility deposits are non-refundable.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default RefundRules;
