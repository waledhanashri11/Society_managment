import React, { useState, useEffect } from 'react';
import { maintenanceAPI } from '../services/api';

const Maintenance = () => {
  const [maintenance, setMaintenance] = useState([]);
  const [bills, setBills] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    dueDate: '',
    description: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [maintenanceRes, billsRes] = await Promise.all([
        maintenanceAPI.getAll(),
        maintenanceAPI.getBills()
      ]);
      setMaintenance(maintenanceRes.data.data || []);
      setBills(billsRes.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingRecord(null);
    setFormData({
      title: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      dueDate: '',
      description: ''
    });
    setShowModal(true);
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      title: record.title || '',
      month: record.month,
      year: record.year,
      dueDate: record.due_date || '',
      description: record.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this maintenance cycle?')) {
      try {
        await maintenanceAPI.delete(id);
        fetchData();
      } catch (error) {
        console.error('Error deleting record:', error);
        alert('Error deleting record');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRecord) {
        await maintenanceAPI.update(editingRecord.id, formData);
      } else {
        await maintenanceAPI.create(formData);
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving record:', error);
      alert(error.response?.data?.message || 'Error saving record');
    }
  };

  const handleGenerateBills = async (e) => {
    e.preventDefault();
    try {
      await maintenanceAPI.generateBills({ maintenanceId: selectedMaintenanceId });
      setShowGenerateModal(false);
      setSelectedMaintenanceId('');
      fetchData();
      alert('Bills generated successfully');
    } catch (error) {
      console.error('Error generating bills:', error);
      alert(error.response?.data?.message || 'Error generating bills');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return <div className="rounded-2xl bg-white p-6 text-slate-600 shadow-sm">Loading...</div>;
  }

  const summaryCards = [
    { title: 'Total Bills', value: bills.length, tone: 'bg-cyan-600 text-white' },
    { title: 'Pending Bills', value: bills.filter((b) => b.payment_status !== 'Paid').length, tone: 'bg-amber-400 text-slate-950' },
    { title: 'Paid Bills', value: bills.filter((b) => b.payment_status === 'Paid').length, tone: 'bg-emerald-600 text-white' },
    { title: 'Overdue Bills', value: bills.filter((b) => b.payment_status !== 'Paid' && new Date(b.due_date) < new Date()).length, tone: 'bg-sky-600 text-white' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Maintenance Management</h2>
          <p className="mt-1 text-sm text-slate-500">Plan maintenance cycles and track bills.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => setShowGenerateModal(true)}>
            Generate Bills
          </button>
          <button className="rounded-xl bg-cyan-600 px-4 py-2.5 font-semibold text-white transition hover:bg-cyan-700" onClick={handleAdd}>
            Create Maintenance
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.title} className={`rounded-2xl p-5 shadow-sm ${card.tone}`}>
            <p className="text-sm opacity-80">{card.title}</p>
            <p className="mt-2 text-3xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Maintenance Cycles</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-3">Title</th>
                <th className="pb-3">Month/Year</th>
                <th className="pb-3">Due Date</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {maintenance.map((record) => (
                <tr key={record.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3">{record.title || 'Monthly Maintenance'}</td>
                  <td className="py-3">{record.month}/{record.year}</td>
                  <td className="py-3">{record.due_date || '-'}</td>
                  <td className="py-3">{record.maintenance_status || 'ACTIVE'}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-full bg-amber-500 px-3 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400" onClick={() => handleEdit(record)}>Edit</button>
                      <button className="rounded-full bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-700" onClick={() => handleDelete(record.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Recent Bills</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-3">Resident</th>
                <th className="pb-3">Flat</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Due Date</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {bills.slice(0, 8).map((bill) => (
                <tr key={bill.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3">{bill.resident_name}</td>
                  <td className="py-3">{bill.flat_no}</td>
                  <td className="py-3">₹{Number(bill.total_amount || 0).toLocaleString()}</td>
                  <td className="py-3">{bill.due_date || '-'}</td>
                  <td className="py-3">{bill.payment_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">{editingRecord ? 'Edit Maintenance' : 'Create Maintenance Cycle'}</h3>
              <button type="button" className="text-sm text-slate-500 hover:text-slate-700" onClick={() => setShowModal(false)}>Close</button>
            </div>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
                <input type="text" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" name="title" value={formData.title} onChange={handleChange} required />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Month</label>
                  <select className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" name="month" value={formData.month} onChange={handleChange} required>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (<option key={m} value={m}>{m}</option>))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Year</label>
                  <input type="number" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" name="year" value={formData.year} onChange={handleChange} required />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Due Date</label>
                <input type="date" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" name="dueDate" value={formData.dueDate} onChange={handleChange} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <textarea className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" name="description" value={formData.description} onChange={handleChange} rows="3" />
              </div>
              <button type="submit" className="rounded-xl bg-cyan-600 px-4 py-2.5 font-semibold text-white transition hover:bg-cyan-700">{editingRecord ? 'Update' : 'Create'}</button>
            </form>
          </div>
        </div>
      )}

      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Generate Bills</h3>
              <button type="button" className="text-sm text-slate-500 hover:text-slate-700" onClick={() => setShowGenerateModal(false)}>Close</button>
            </div>
            <form onSubmit={handleGenerateBills} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Maintenance Cycle</label>
                <select className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" value={selectedMaintenanceId} onChange={(e) => setSelectedMaintenanceId(e.target.value)} required>
                  <option value="">Select maintenance cycle</option>
                  {maintenance.map((item) => (
                    <option key={item.id} value={item.id}>{item.title || 'Monthly Maintenance'} ({item.month}/{item.year})</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="rounded-xl bg-cyan-600 px-4 py-2.5 font-semibold text-white transition hover:bg-cyan-700">Generate Bills</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;
