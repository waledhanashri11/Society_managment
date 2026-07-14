import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

const PrivacyPolicy = () => {
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
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Privacy Policy</h1>
            <p className="text-slate-400 text-xs mt-1">Last Updated: July 10, 2026</p>
          </div>
        </div>

        {/* Policy Content */}
        <div className="bg-slate-900/30 border border-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 space-y-6 text-sm text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-white mb-2">1. Information We Collect</h2>
            <p>
              We collect information that you directly provide when registering an account, updating your profile, or utilizing society services. This includes personal information (such as name, phone number, email address), flat allotment numbers, ownership details, and billing transactional history.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">2. How We Use Your Information</h2>
            <p>
              The information we gather is used to facilitate community coordination. Specifically, we use it to:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
              <li>Generate and manage monthly society maintenance invoices.</li>
              <li>Verify owner flat allotments and prevent unauthorized portal access.</li>
              <li>Log, assign, and update online resolution progress for complaints.</li>
              <li>Send critical announcements, billing reminders, and receipts.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">3. Data Protection & Security</h2>
            <p>
              We prioritize the protection of your personal records. We deploy standard secure socket layer measures, encryption methodologies, and role-based access rights checks to shield your credentials and payments history from unauthorized access, modification, or exposure.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">4. Third-Party Sharing</h2>
            <p>
              Community Hive does not sell, lease, or distribute resident directories or transactional data logs to third-party advertising companies. Your records are only shared to complete authorized actions, such as integrated processing of manual payment slip validations.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">5. Resident Rights & Controls</h2>
            <p>
              As a society member, you retain full rights to inspect your profiles, access complete maintenance invoice histories, and print accounting receipts. You may contact your designated society administrators to request updates to erroneous flat allotments or profile details.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
