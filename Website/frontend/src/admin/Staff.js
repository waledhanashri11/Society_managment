import React, { useState, useEffect } from 'react';
import { staffAPI } from '../services/api';

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    phone: '',
    salary: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaff();
  }, []);

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

  const handleAdd = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      role: '',
      phone: '',
      salary: ''
    });
    setShowModal(true);
  };

  const handleEdit = (staffMember) => {
    setEditingStaff(staffMember);
    setFormData({
      name: staffMember.name,
      role: staffMember.role,
      phone: staffMember.phone,
      salary: staffMember.salary
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        await staffAPI.delete(id);
        fetchStaff();
      } catch (error) {
        console.error('Error deleting staff:', error);
        alert('Error deleting staff');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStaff) {
        await staffAPI.update(editingStaff.id, formData);
      } else {
        await staffAPI.create(formData);
      }
      setShowModal(false);
      fetchStaff();
    } catch (error) {
      console.error('Error saving staff:', error);
      alert('Error saving staff');
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
          <h2 className="text-2xl font-semibold text-slate-900">Staff</h2>
          <p className="mt-1 text-sm text-slate-500">Manage society staff records and payments.</p>
        </div>
        <button className="rounded-xl bg-cyan-600 px-4 py-2.5 font-semibold text-white transition hover:bg-cyan-700" onClick={handleAdd}>
          Add Staff
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-3">Name</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Phone</th>
                <th className="pb-3">Salary</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3">{member.name}</td>
                  <td className="py-3">{member.role}</td>
                  <td className="py-3">{member.phone}</td>
                  <td className="py-3">₹{parseFloat(member.salary).toLocaleString()}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-full bg-amber-500 px-3 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400" onClick={() => handleEdit(member)}>Edit</button>
                      <button className="rounded-full bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-700" onClick={() => handleDelete(member.id)}>Delete</button>
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
              <h3 className="text-lg font-semibold text-slate-900">{editingStaff ? 'Edit Staff' : 'Add Staff'}</h3>
              <button type="button" className="text-sm text-slate-500 hover:text-slate-700" onClick={() => setShowModal(false)}>Close</button>
            </div>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                <input type="text" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
                <input type="text" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" name="role" value={formData.role} onChange={handleChange} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
                <input type="text" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" name="phone" value={formData.phone} onChange={handleChange} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Salary (₹)</label>
                <input type="number" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" name="salary" value={formData.salary} onChange={handleChange} required />
              </div>
              <button type="submit" className="rounded-xl bg-cyan-600 px-4 py-2.5 font-semibold text-white transition hover:bg-cyan-700">{editingStaff ? 'Update' : 'Add'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;
