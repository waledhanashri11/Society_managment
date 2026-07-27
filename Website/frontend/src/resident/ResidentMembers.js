import React, { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Mail, Phone, Search, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { residentAPI } from '../services/api';
import { TableSkeleton } from '../components/Skeletons';

const ResidentMembers = () => {
  const { t } = useTranslation();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    residentAPI.getMembers()
      .then(({ data }) => setMembers(data || []))
      .catch((err) => setError(err.response?.data?.message || 'Could not load society members.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase().trim();
    return members.filter((m) => !q || `${m.name} ${m.email} ${m.flat_no} ${m.wing}`.toLowerCase().includes(q));
  }, [members, search]);

  const stats = useMemo(() => ({
    total: members.length,
    assigned: members.filter(m => m.flat_no).length,
    paid: members.filter(m => m.payment_status === 'paid' || m.payment_status === 'Paid').length
  }), [members]);

  return (
    <div className="portal-module">
      <div className="portal-page-title">
        <div>
          <h1>{t('nav.members', 'Society Members')}</h1>
          <p>{t('residents.readOnlyDirectory', 'Read-only directory of approved residents and their flat details.')}</p>
        </div>
        <div className="portal-date-chip">
          <Users size={15} /> {t('residents.directoryTitle', 'Resident Directory')}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="portal-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '12px', marginBottom: '16px' }}>
        <div className="portal-kpi green">
          <span>Total Residents</span>
          <strong>{stats.total}</strong>
          <small>Approved accounts</small>
          <div className="portal-kpi-icon"><Users size={18} /></div>
        </div>
        <div className="portal-kpi">
          <span>Assigned Flats</span>
          <strong>{stats.assigned}</strong>
          <small>Occupied units</small>
          <div className="portal-kpi-icon"><Building2 size={18} /></div>
        </div>
        <div className="portal-kpi orange">
          <span>Clear Maintenance</span>
          <strong>{stats.paid}</strong>
          <small>Up-to-date dues</small>
          <div className="portal-kpi-icon"><CheckCircle2 size={18} /></div>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <section className="portal-panel portal-table-card">
        <div className="portal-panel-head">
          <div>
            <h2>{t('residents.directoryTitle', 'Resident Directory')}</h2>
            <p>{t('residents.directorySubtitle', 'Names, contact details, flats and payment status.')}</p>
          </div>
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resident or flat..."
              style={{ width: '100%', padding: '6px 10px 6px 30px', fontSize: '11px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
            />
          </div>
        </div>
        <div className="portal-table-wrap">
          {loading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : (
            <table className="portal-data-table">
              <thead>
                <tr>
                  <th>{t('common.resident', 'Resident')}</th>
                  <th>{t('common.flat', 'Flat')}</th>
                  <th>{t('dashboard.wing', 'Wing')}</th>
                  <th>{t('common.floor', 'Floor')}</th>
                  <th>{t('residents.contact', 'Contact')}</th>
                  <th>{t('modules.payments', 'Payment')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e2e8f0', display: 'grid', placeItems: 'center', fontWeight: 'bold', fontSize: '11px', color: '#334155' }}>
                          {(member.name || 'R').charAt(0).toUpperCase()}
                        </div>
                        <strong>{member.name}</strong>
                      </div>
                    </td>
                    <td>{member.flat_no ? `${t('common.flat', 'Flat')} ${member.flat_no}` : <span className="portal-muted-text">{t('common.notAssigned', 'Not assigned')}</span>}</td>
                    <td>{member.wing || '-'}</td>
                    <td>{member.floor_no ?? '-'}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#475569' }}><Mail size={12} /> {member.email}</span>
                        {member.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#475569' }}><Phone size={12} /> {member.phone}</span>}
                      </div>
                    </td>
                    <td><span className={`portal-status ${member.payment_status === 'paid' || member.payment_status === 'Paid' ? 'resolved' : 'pending'}`}>{t(`statusLabel.${member.payment_status}`, member.payment_status || 'Paid')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && !filteredMembers.length && !error && <div className="portal-empty">{t('residents.noResidentsFound', 'No approved residents found.')}</div>}
        </div>
      </section>
    </div>
  );
};

export default ResidentMembers;
