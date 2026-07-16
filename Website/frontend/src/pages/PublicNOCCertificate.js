import React, { useEffect, useState } from 'react';
import { Download, FileCheck2, Printer, ShieldCheck } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { nocAPI } from '../services/api';

const formatDate = (value) => value
  ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  : '-';

const PublicNOCCertificate = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    nocAPI.getPublicCertificate(token)
      .then(({ data: response }) => {
        if (!active) return;
        setData(response);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.data?.message || 'Certificate Not Found or Expired');
        setData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const downloadCertificate = () => {
    const originalTitle = document.title;
    document.title = data?.certificate?.request_number || 'NOC-Certificate';
    window.print();
    window.setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <section className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-8 space-y-4">
            <div className="h-5 animate-pulse rounded bg-slate-100" />
            <div className="h-5 animate-pulse rounded bg-slate-100" />
            <div className="h-5 w-2/3 animate-pulse rounded bg-slate-100" />
          </div>
        </section>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
        <section className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-50 text-red-600">
            <FileCheck2 size={26} />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-950">Certificate Not Found or Expired</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This NOC certificate link is invalid, expired, or no longer approved. Please contact your society office for a fresh certificate link.
          </p>
        </section>
      </main>
    );
  }

  const { society, certificate } = data;
  const flatLabel = `${certificate.flat_no || '-'}${certificate.wing ? `, Wing ${certificate.wing}` : ''}${certificate.floor_no ? `, Floor ${certificate.floor_no}` : ''}`;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-5xl flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold">NOC Certificate</h1>
          <p className="text-sm text-slate-600">Verified certificate from {society.name}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm">
            <Printer size={16} /> Print
          </button>
          <button onClick={downloadCertificate} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white shadow-sm">
            <Download size={16} /> Download PDF
          </button>
        </div>
      </div>

      <section className="mx-auto max-w-5xl rounded-xl border-2 border-slate-800 bg-white p-6 shadow-xl print:max-w-none print:rounded-none print:border print:shadow-none sm:p-10">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-900 text-white">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-950">{society.name}</h2>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Digitally Verified Certificate</p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left sm:text-right">
            <p className="text-xs font-bold uppercase text-slate-500">NOC Number</p>
            <p className="text-lg font-extrabold text-slate-950">{certificate.request_number}</p>
          </div>
        </header>

        <div className="py-8 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-700">No Objection Certificate</p>
          <h3 className="mt-3 text-3xl font-black text-slate-950">{certificate.noc_type}</h3>
          <p className="mt-2 text-sm text-slate-600">Issued on {formatDate(certificate.issue_date)}</p>
        </div>

        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          <div><p className="text-xs font-bold uppercase text-slate-500">Resident Name</p><p className="mt-1 font-extrabold">{certificate.resident_name}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-500">Flat Details</p><p className="mt-1 font-extrabold">{flatLabel}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-500">Purpose</p><p className="mt-1 font-extrabold">{certificate.purpose}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-500">Verification Number</p><p className="mt-1 font-extrabold">{certificate.verification_number}</p></div>
        </div>

        <p className="mt-8 text-justify text-base leading-8 text-slate-800">
          This is to certify that <strong>{certificate.resident_name}</strong> is a resident/member of <strong>{flatLabel}</strong>.
          The society has no objection to issuing this certificate for the purpose stated above, subject to society rules,
          by-laws, and applicable law.
        </p>

        <div className="mt-16 grid gap-10 sm:grid-cols-2">
          <div className="border-t border-slate-900 pt-3 text-center font-bold">Secretary Signature</div>
          <div className="border-t border-slate-900 pt-3 text-center font-bold">Chairman Signature</div>
        </div>
      </section>
    </main>
  );
};

export default PublicNOCCertificate;
