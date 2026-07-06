import React, { useState, useEffect } from 'react';
import { flatAPI, userAPI } from '../services/api';

const Flats = () => {
  const [flats, setFlats] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingFlat, setEditingFlat] = useState(null);
  const [formData, setFormData] = useState({
    flat_no: '',
    floor_no: '',
    owner_id: '',
    maintenance_charge: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [flatsRes, usersRes] = await Promise.all([
        flatAPI.getAll(),
        userAPI.getAll()
      ]);
      setFlats(flatsRes.data);
      setUsers(usersRes.data.filter((u) => u.role === 'resident'));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingFlat(null);
    setFormData({
      flat_no: '',
      floor_no: '',
      owner_id: '',
      maintenance_charge: ''
    });
    setShowModal(true);
  };

  const handleEdit = (flat) => {
    setEditingFlat(flat);
    setFormData({
      flat_no: flat.flat_no,
      floor_no: flat.floor_no,
      owner_id: flat.owner_id || '',
      maintenance_charge: flat.maintenance_charge || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this flat?')) {
      try {
        await flatAPI.delete(id);
        fetchData();
      } catch (error) {
        console.error('Error deleting flat:', error);
        alert('Error deleting flat');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFlat) {
        await flatAPI.update(editingFlat.id, formData);
      } else {
        await flatAPI.create(formData);
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving flat:', error);
      alert('Error saving flat');
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
          <h2 className="text-2xl font-semibold text-slate-900">Flats</h2>
          <p className="mt-1 text-sm text-slate-500">Manage flat records and maintenance assignments.</p>
        </div>
        <button className="rounded-xl bg-cyan-600 px-4 py-2.5 font-semibold text-white transition hover:bg-cyan-700" onClick={handleAdd}>
          Add Flat
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-3">Flat No</th>
                <th className="pb-3">Floor No</th>
                <th className="pb-3">Owner</th>
                <th className="pb-3">Maintenance Charge</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {flats.map((flat) => (
                <tr key={flat.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3">{flat.flat_no}</td>
                  <td className="py-3">{flat.floor_no}</td>
                  <td className="py-3">{flat.owner_name || 'Unassigned'}</td>
                  <td className="py-3">₹{Number(flat.maintenance_charge || 0).toLocaleString()}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-full bg-amber-500 px-3 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400" onClick={() => handleEdit(flat)}>
                        Edit
                      </button>
                      <button className="rounded-full bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-700" onClick={() => handleDelete(flat.id)}>
                        Delete
                      </button>
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
              <h3 className="text-lg font-semibold text-slate-900">{editingFlat ? 'Edit Flat' : 'Add Flat'}</h3>
              <button type="button" className="text-sm text-slate-500 hover:text-slate-700" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Flat Number</label>
                  <input type="text" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" name="flat_no" value={formData.flat_no} onChange={handleChange} required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Floor Number</label>
                  <input type="number" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" name="floor_no" value={formData.floor_no} onChange={handleChange} required />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Assign Owner</label>
                <select className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" name="owner_id" value={formData.owner_id} onChange={handleChange}>
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Maintenance Charge (₹)</label>
                <input type="number" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" name="maintenance_charge" value={formData.maintenance_charge} onChange={handleChange} min="0" required />
              </div>
              <button type="submit" className="rounded-xl bg-cyan-600 px-4 py-2.5 font-semibold text-white transition hover:bg-cyan-700">
                {editingFlat ? 'Update' : 'Add'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Flats;
