import React, { useEffect, useState } from 'react';
import { Mail, Phone, Users } from 'lucide-react';
import { residentAPI } from '../services/api';
import { TableSkeleton } from '../components/Skeletons';

const ResidentMembers = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    residentAPI.getMembers()
      .then(({ data }) => setMembers(data || []))
      .catch((err) => setError(err.response?.data?.message || 'Could not load society members.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="portal-module">
      <div className="portal-page-title">
        <div>
          <h1>Society Members</h1>
          <p>Read-only directory of approved residents and their flat details.</p>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <section className="portal-panel portal-table-card">
        <div className="portal-panel-head">
          <div><h2>Resident Directory</h2><p>Names, contact details, flats and payment status.</p></div>
          <Users size={18} />
        </div>
        <div className="portal-table-wrap">
          {loading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : (
            <table className="portal-data-table">
              <thead>
                <tr><th>Resident</th><th>Flat</th><th>Wing</th><th>Floor</th><th>Contact</th><th>Payment</th></tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td><strong>{member.name}</strong></td>
                    <td>{member.flat_no ? `Flat ${member.flat_no}` : <span className="portal-muted-text">Not assigned</span>}</td>
                    <td>{member.wing || '-'}</td>
                    <td>{member.floor_no ?? '-'}</td>
                    <td>
                      <div className="grid gap-1">
                        <span className="inline-flex items-center gap-1"><Mail size={12} /> {member.email}</span>
                        {member.phone && <span className="inline-flex items-center gap-1"><Phone size={12} /> {member.phone}</span>}
                      </div>
                    </td>
                    <td><span className={`portal-status ${member.payment_status === 'paid' ? 'paid' : 'pending'}`}>{member.payment_status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && !members.length && !error && <div className="portal-empty">No approved residents found.</div>}
        </div>
      </section>
    </div>
  );
};

export default ResidentMembers;
