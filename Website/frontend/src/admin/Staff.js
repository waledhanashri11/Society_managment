import React, { useEffect, useMemo, useState } from 'react';
import { Edit3, IndianRupee, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { staffAPI } from '../services/api';
import { CardSkeleton, TableSkeleton } from '../components/Skeletons';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({ name: '', role: '', phone: '', salary: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStaff(); }, []);

  const fetchStaff = async () => {
    try {
      const response = await staffAPI.getAll();
      setStaff(response.data);
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthlyPayroll = useMemo(() => staff.reduce((sum, member) => sum + Number(member.salary || 0), 0), [staff]);

  const handleAdd = () => {
    setEditingStaff(null);
    setFormData({ name: '', role: '', phone: '', salary: '' });
    setShowModal(true);
  };

  const handleEdit = (member) => {
    setEditingStaff(member);
    setFormData({ name: member.name, role: member.role, phone: member.phone, salary: member.salary });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try { await staffAPI.delete(id); fetchStaff(); }
      catch (error) { console.error('Error deleting staff:', error); alert('Error deleting staff'); }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      if (editingStaff) await staffAPI.update(editingStaff.id, formData);
      else await staffAPI.create(formData);
      setShowModal(false);
      fetchStaff();
    } catch (error) {
      console.error('Error saving staff:', error);
      alert('Error saving staff');
    }
  };

  const handleChange = (event) => setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));

  return (
    <div className="portal-module">
      <div className="portal-page-title">
        <div><h1>Staff</h1><p>Manage society staff, roles, contact numbers and salaries.</p></div>
        <button className="portal-primary-btn" onClick={handleAdd}><Plus size={17} /> Add Staff</button>
      </div>

      {loading ? <CardSkeleton count={2} /> : <div className="portal-kpis">
        <div className="portal-kpi"><span>Total Staff</span><strong>{staff.length}</strong><small>Active support team</small><div className="portal-kpi-icon"><ShieldCheck size={18} /></div></div>
        <div className="portal-kpi green"><span>Monthly Payroll</span><strong>{money(monthlyPayroll)}</strong><small>Salary commitment</small><div className="portal-kpi-icon"><IndianRupee size={18} /></div></div>
      </div>}

      <section className="portal-panel portal-table-card">
        <div className="portal-panel-head"><div><h2>Staff Directory</h2><p>Operational team members and salary details.</p></div></div>
        <div className="portal-table-wrap">
          {loading ? <TableSkeleton rows={5} columns={5} /> : <table className="portal-data-table">
            <thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Salary</th><th>Actions</th></tr></thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id}>
                  <td><strong>{member.name}</strong></td>
                  <td>{member.role}</td>
                  <td>{member.phone}</td>
                  <td>{money(member.salary)}</td>
                  <td><div className="portal-row-actions"><button onClick={() => handleEdit(member)}><Edit3 size={14} /> Edit</button><button className="danger" onClick={() => handleDelete(member.id)}><Trash2 size={14} /> Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>}
          {!loading && !staff.length && <div className="portal-empty">No staff members found.</div>}
        </div>
      </section>

      {showModal && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowModal(false)}>
          <div className="portal-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="portal-modal-head"><div><h3>{editingStaff ? 'Edit Staff' : 'Add Staff'}</h3><p>Keep role and salary information updated.</p></div><button onClick={() => setShowModal(false)}>×</button></div>
            <form onSubmit={handleSubmit} className="portal-form">
              <label><span>Name</span><input name="name" value={formData.name} onChange={handleChange} required /></label>
              <label><span>Role</span><input name="role" value={formData.role} onChange={handleChange} required /></label>
              <label><span>Phone</span><input name="phone" value={formData.phone} onChange={handleChange} required /></label>
              <label><span>Salary</span><input type="number" name="salary" value={formData.salary} onChange={handleChange} required /></label>
              <div className="portal-form-actions"><button type="button" className="portal-light-btn" onClick={() => setShowModal(false)}>Cancel</button><button className="portal-primary-btn">{editingStaff ? 'Update Staff' : 'Add Staff'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;
