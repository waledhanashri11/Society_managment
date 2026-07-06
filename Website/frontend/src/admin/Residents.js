import React, { useState, useEffect } from 'react';
import { userAPI, flatAPI } from '../services/api';

const Residents = () => {
  const [residents, setResidents] = useState([]);
  const [flats, setFlats] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingResident, setEditingResident] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'resident',
    flat_id: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, flatsRes] = await Promise.all([
        userAPI.getAll(),
        flatAPI.getAll()
      ]);
      setResidents(usersRes.data.filter((u) => u.role === 'resident'));
      setFlats(flatsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingResident(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'resident',
      flat_id: ''
    });
    setShowModal(true);
  };

  const handleEdit = (resident) => {
    setEditingResident(resident);
    setFormData({
      name: resident.name,
      email: resident.email,
      password: '',
      role: resident.role,
      flat_id: ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this resident?')) {
      try {
        await userAPI.delete(id);
        fetchData();
      } catch (error) {
        console.error('Error deleting resident:', error);
        alert('Error deleting resident');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingResident) {
        await userAPI.update(editingResident.id, formData);
      } else {
        await userAPI.create(formData);
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving resident:', error);
      alert('Error saving resident');
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Residents</h2>
          <p className="mt-1 text-sm text-slate-500">Maintain resident accounts and flat assignments.</p>
        </div>
        <button className="rounded-xl bg-cyan-600 px-4 py-2.5 font-semibold text-white transition hover:bg-cyan-700" onClick={handleAdd}>
          Add Resident
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-3">Name</th>
                <th className="pb-3">Email</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Created At</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {residents.map((resident) => (
                <tr key={resident.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3">{resident.name}</td>
                  <td className="py-3">{resident.email}</td>
                  <td className="py-3"><span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">{resident.role}</span></td>
                  <td className="py-3">{new Date(resident.created_at).toLocaleDateString()}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-full bg-amber-500 px-3 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400" onClick={() => handleEdit(resident)}>Edit</button>
                      <button className="rounded-full bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-700" onClick={() => handleDelete(resident.id)}>Delete</button>
                    </div>
                  </td>
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
              <h3 className="text-lg font-semibold text-slate-900">{editingResident ? 'Edit Resident' : 'Add Resident'}</h3>
              <button type="button" className="text-sm text-slate-500 hover:text-slate-700" onClick={() => setShowModal(false)}>Close</button>
            </div>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                <input type="text" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input type="email" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" name="email" value={formData.email} onChange={handleChange} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                <input type="password" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" name="password" value={formData.password} onChange={handleChange} required={!editingResident} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Assign Flat</label>
                <select className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" name="flat_id" value={formData.flat_id} onChange={handleChange}>
                  <option value="">Select Flat</option>
                  {flats.map((flat) => (
                    <option key={flat.id} value={flat.id}>Flat {flat.flat_no} - Floor {flat.floor_no}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="rounded-xl bg-cyan-600 px-4 py-2.5 font-semibold text-white transition hover:bg-cyan-700">{editingResident ? 'Update' : 'Add'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Residents;
