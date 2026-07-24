import React, { useEffect, useState, useCallback } from 'react';
import { 
  History, Printer, Download, Edit2, RotateCcw, 
  X, ReceiptIndianRupee, SlidersHorizontal, Info 
} from 'lucide-react';
import { maintenanceAPI, settingsAPI } from '../services/api';
import { getUser } from '../utils/auth';
import { printWriteOffReceipt, downloadWriteOffReceiptPdf } from '../utils/paymentReceipt';
import './maintenance.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const dateStr = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="mm-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="mm-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mm-modal-head">
          <div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
          <button className="mm-icon-btn" onClick={onClose} aria-label="Close"><X size={19} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function WriteOffHistoryScreen() {
  const user = getUser();
  const isSuperAdmin = user?.role === 'super_admin';

  const [writeOffs, setWriteOffs] = useState([]);
  const [societySettings, setSocietySettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // Filters State
  const [filters, setFilters] = useState({
    resident: '',
    flat: '',
    wing: '',
    month: 'All',
    type: 'All',
    startDate: '',
    endDate: ''
  });

  // Edit State
  const [editingWriteOff, setEditingWriteOff] = useState(null);
  const [editForm, setEditForm] = useState({ amount: '', reason: '' });
  const [modal, setModal] = useState(null);

  const notify = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.resident) params.resident = filters.resident;
      if (filters.flat) params.flat = filters.flat;
      if (filters.wing) params.wing = filters.wing;
      if (filters.month !== 'All') params.month = filters.month;
      if (filters.type !== 'All') params.type = filters.type;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const [resHistory, resSettings] = await Promise.all([
        maintenanceAPI.getWriteOffHistory(params),
        settingsAPI.get()
      ]);

      setWriteOffs(resHistory.data?.data || resHistory.data || []);
      setSocietySettings(resSettings.data?.data || resSettings.data || {});
    } catch (err) {
      console.error(err);
      notify('Failed to load write-off history');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrint = (item) => {
    printWriteOffReceipt({
      ...item,
      base_maintenance_charge: Number(item.bill_amount) - Number(item.bill_penalty),
      late_fee: Number(item.bill_penalty),
      total_amount: Number(item.bill_total),
      write_off_amount: Number(item.amount),
      remaining_amount: Number(item.bill_remaining),
      approved_by: item.admin_name,
      approval_date: item.created_at
    }, societySettings);
  };

  const handleDownload = async (item) => {
    try {
      await downloadWriteOffReceiptPdf({
        ...item,
        base_maintenance_charge: Number(item.bill_amount) - Number(item.bill_penalty),
        late_fee: Number(item.bill_penalty),
        total_amount: Number(item.bill_total),
        write_off_amount: Number(item.amount),
        remaining_amount: Number(item.bill_remaining),
        approved_by: item.admin_name,
        approval_date: item.created_at
      }, societySettings);
    } catch (error) {
      notify('Failed to download PDF receipt');
    }
  };

  const handleEditClick = (item) => {
    setEditingWriteOff(item);
    setEditForm({
      amount: String(item.amount),
      reason: item.reason
    });
    setModal('edit');
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editForm.reason.trim()) {
      notify('A reason is required to update the write-off');
      return;
    }
    if (!editForm.amount || Number(editForm.amount) <= 0) {
      notify('Please enter a valid amount');
      return;
    }

    if (!window.confirm('Are you sure you want to update this write-off? This will adjust the remaining bill balance accordingly.')) {
      return;
    }

    setSaving(true);
    try {
      await maintenanceAPI.editWriteOff(editingWriteOff.id, {
        amount: Number(editForm.amount),
        reason: editForm.reason
      });
      notify('Write-off updated successfully');
      setModal(null);
      setEditingWriteOff(null);
      await loadData();
    } catch (err) {
      notify(err.response?.data?.message || 'Could not update write-off');
    } finally {
      setSaving(false);
    }
  };

  const handleReverseClick = async (item) => {
    if (!window.confirm(`Are you sure you want to REVERSE this write-off of ${money(item.amount)}? This will delete the write-off record and restore the unpaid balance back onto the resident's bill.`)) {
      return;
    }

    setSaving(true);
    try {
      await maintenanceAPI.reverseWriteOff(item.id);
      notify('Write-off reversed and balance restored');
      await loadData();
    } catch (err) {
      notify(err.response?.data?.message || 'Could not reverse write-off');
    } finally {
      setSaving(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      resident: '',
      flat: '',
      wing: '',
      month: 'All',
      type: 'All',
      startDate: '',
      endDate: ''
    });
  };

  return (
    <div className="mm-module" style={{ padding: '24px' }}>
      {toast && <div className="mm-toast" style={{ position: 'fixed', bottom: '20px', right: '20px', padding: '12px 24px', background: '#334155', color: '#fff', borderRadius: '8px', zIndex: 1000, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>{toast}</div>}
      
      <div className="mm-page-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '26px', fontWeight: '800', color: '#1e293b' }}>
            <History size={28} style={{ color: '#dc2626' }} /> Write-Off History
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
            Track and manage all maintenance and penalty write-off approvals. Admins can reverse or edit records.
          </p>
        </div>
      </div>

      {/* History Table */}
      <section className="mm-panel" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading write-off history...</div>
        ) : writeOffs.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="mm-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>
                  <th style={{ padding: '14px 16px' }}>Resident & Flat</th>
                  <th style={{ padding: '14px 16px' }}>Billing Period</th>
                  <th style={{ padding: '14px 16px' }}>Original Bill</th>
                  <th style={{ padding: '14px 16px' }}>Amount Written-Off</th>
                  <th style={{ padding: '14px 16px' }}>Amount Collected</th>
                  <th style={{ padding: '14px 16px' }}>Type</th>
                  <th style={{ padding: '14px 16px' }}>Approved By</th>
                  <th style={{ padding: '14px 16px' }}>Reason</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {writeOffs.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <strong>{item.resident_name}</strong>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Flat {item.flat_no} · Wing {item.wing}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>{months[item.month - 1]} {item.year}</td>
                    <td style={{ padding: '14px 16px', fontWeight: '500' }}>{money(item.bill_total)}</td>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: '#b91c1c' }}>{money(item.amount)}</td>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: '#15803d' }}>{money(item.bill_paid || 0)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ 
                        display: 'inline-block', 
                        padding: '2px 8px', 
                        borderRadius: '999px', 
                        fontSize: '11px', 
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        backgroundColor: item.type === 'Full' ? '#fef2f2' : '#eff6ff',
                        color: item.type === 'Full' ? '#991b1b' : '#1d4ed8'
                      }}>
                        {item.type}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>{item.admin_name}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', fontStyle: 'italic', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.reason}>
                      {item.reason}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button onClick={() => handlePrint(item)} title="Print Receipt" style={{ border: 'none', background: '#f1f5f9', padding: '6px', borderRadius: '4px', cursor: 'pointer', color: '#475569' }}><Printer size={15} /></button>
                        <button onClick={() => handleDownload(item)} title="Download PDF" style={{ border: 'none', background: '#f1f5f9', padding: '6px', borderRadius: '4px', cursor: 'pointer', color: '#475569' }}><Download size={15} /></button>
                        
                        <button onClick={() => handleEditClick(item)} title="Edit Write-Off" style={{ border: 'none', background: '#fef3c7', padding: '6px', borderRadius: '4px', cursor: 'pointer', color: '#d97706' }}><Edit2 size={15} /></button>
                        <button onClick={() => handleReverseClick(item)} title="Reverse Write-Off (Restore Balance)" style={{ border: 'none', background: '#fee2e2', padding: '6px', borderRadius: '4px', cursor: 'pointer', color: '#dc2626' }}><RotateCcw size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <ReceiptIndianRupee size={36} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
            <strong style={{ display: 'block', color: '#64748b' }}>No Write-Off Records Found</strong>
          </div>
        )}
      </section>



      {/* Edit Write-Off Modal */}
      {modal === 'edit' && editingWriteOff && (
        <Modal 
          title="Edit Write-Off Detail" 
          subtitle={`${editingWriteOff.resident_name} · Flat ${editingWriteOff.flat_no}`}
          onClose={() => { setModal(null); setEditingWriteOff(null); }}
        >
          <form onSubmit={submitEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}>
              <div style={{ marginBottom: '6px' }}><strong>Write-Off Type:</strong> {editingWriteOff.type}</div>
              <div style={{ marginBottom: '6px' }}><strong>Original Bill Total:</strong> {money(editingWriteOff.bill_total)}</div>
              <div><strong>Current Written Off:</strong> {money(editingWriteOff.amount)}</div>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
              New Written-Off Amount (₹)
              <input 
                type="number"
                min="0.01"
                step="0.01"
                required
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
              Reason for Adjustment (Mandatory)
              <textarea 
                rows="3"
                required
                value={editForm.reason}
                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                placeholder="Explain the reason for modifying this write-off amount..."
                style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={() => { setModal(null); setEditingWriteOff(null); }} className="mm-button mm-button-light" style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={saving} className="mm-button mm-button-primary" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#d97706', color: '#fff', cursor: 'pointer' }}>
                {saving ? 'Saving Changes...' : 'Save Adjustments'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
