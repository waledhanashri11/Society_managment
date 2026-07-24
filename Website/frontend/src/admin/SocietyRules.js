import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, Edit3, Plus, Search, Star, Trash2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { rulesAPI } from '../services/api';
import { CardSkeleton } from '../components/Skeletons';

const emptyForm = { title: '', description: '', category: 'General', isPinned: false, isActive: true };
const fullDate = (value) => value ? new Date(value).toLocaleString('en-IN') : '-';

const SocietyRules = () => {
  const [rules, setRules] = useState([]);
  const [meta, setMeta] = useState({ categories: [], version: 1 });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');

  const notify = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 2500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const rulesRes = await rulesAPI.getAll({ force: true });
      setRules(rulesRes.data.rules || []);
      setMeta({ categories: rulesRes.data.categories || [], version: rulesRes.data.version, lastUpdated: rulesRes.data.lastUpdated });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredRules = useMemo(() => {
    const q = search.toLowerCase();
    return rules.filter((rule) => !q || `${rule.title} ${rule.description} ${rule.category}`.toLowerCase().includes(q));
  }, [rules, search]);

  const saveRule = async (event) => {
    event.preventDefault();
    if (editing) {
      await rulesAPI.update(editing.id, form);
      notify('Rule updated');
    } else {
      await rulesAPI.create(form);
      notify('Rule added');
    }
    setForm(emptyForm);
    setEditing(null);
    load();
  };

  const editRule = (rule) => {
    setEditing(rule);
    setForm({
      title: rule.title,
      description: rule.description,
      category: rule.category,
      isPinned: rule.isPinned,
      isActive: rule.isActive
    });
  };

  const removeRule = async (rule) => {
    if (!window.confirm('Delete this rule?')) return;
    await rulesAPI.delete(rule.id);
    notify('Rule deleted');
    load();
  };

  const quickUpdate = async (rule, patch) => {
    await rulesAPI.update(rule.id, {
      title: rule.title,
      description: rule.description,
      category: rule.category,
      isPinned: rule.isPinned,
      isActive: rule.isActive,
      ...patch
    });
    load();
  };

  const moveRule = async (rule, direction) => {
    const ordered = [...rules].sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
    const index = ordered.findIndex((item) => item.id === rule.id);
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    await rulesAPI.reorder(ordered.map((item) => item.id));
    load();
  };

  const exportPdf = async () => {
    const element = document.createElement('section');
    element.style.cssText = 'width:760px;padding:28px;font-family:Arial,sans-serif;color:#122033;background:#fff;';
    element.innerHTML = `<h1>Society Rules</h1><p>Version ${meta.version} · Last Updated ${fullDate(meta.lastUpdated)}</p>${rules.filter((r) => r.isActive).map((rule) => `<h3>${rule.category}: ${rule.title}</h3><p>${rule.description}</p>`).join('')}`;
    await html2pdf().set({ filename: `Society_Rules_v${meta.version}.pdf`, margin: 8, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4' } }).from(element).save();
  };

  return (
    <div className="portal-module rules-page">
      <div className="portal-page-title">
        <div><h1>Society Rules</h1><p>Manage rule book, versioning, and resident acceptance.</p></div>
        <button className="portal-primary-btn" onClick={exportPdf}><Download size={16} /> Download PDF</button>
      </div>
      {message && <div className="settings-success"><CheckCircle2 size={16} /> {message}</div>}

      <section className="portal-panel rules-editor">
        <div className="portal-panel-head"><div><h2>{editing ? 'Edit Rule' : 'Add Rule'}</h2><p>Every save increases rules version automatically.</p></div></div>
        <form className="portal-form" onSubmit={saveRule}>
          <label><span>Title</span><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
          <label><span>Category</span><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{meta.categories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label className="portal-field-full"><span>Description</span><textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></label>
          <label className="notice-toggle"><input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} /><span>Pin important rule</span></label>
          <label className="notice-toggle"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /><span>Rule enabled</span></label>
          <div className="portal-form-actions"><button type="button" className="portal-light-btn" onClick={() => { setEditing(null); setForm(emptyForm); }}>Cancel</button><button className="portal-primary-btn"><Plus size={15} /> {editing ? 'Update Rule' : 'Add Rule'}</button></div>
        </form>
      </section>

      <section className="portal-panel">
        <div className="portal-panel-head"><div><h2>Rules Library</h2><p>Search, reorder, pin, enable, or remove rules.</p></div><label className="rules-search"><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search rules..." /></label></div>
        {loading ? <CardSkeleton count={4} /> : <div className="rules-list">
          {filteredRules.map((rule) => (
            <article className={`rules-admin-card ${rule.isPinned ? 'pinned' : ''} ${!rule.isActive ? 'disabled' : ''}`} key={rule.id}>
              <div><h3>{rule.isPinned && <Star size={14} />} {rule.title}</h3><p>{rule.description}</p><small>{rule.category} · Updated {fullDate(rule.updatedAt)} · By {rule.updatedByName || 'Admin'}</small></div>
              <div className="portal-row-actions">
                <button onClick={() => moveRule(rule, -1)}>↑</button>
                <button onClick={() => moveRule(rule, 1)}>↓</button>
                <button onClick={() => quickUpdate(rule, { isPinned: !rule.isPinned })}>{rule.isPinned ? 'Unpin' : 'Pin'}</button>
                <button onClick={() => quickUpdate(rule, { isActive: !rule.isActive })}>{rule.isActive ? 'Disable' : 'Enable'}</button>
                <button onClick={() => editRule(rule)}><Edit3 size={13} /> Edit</button>
                <button className="danger" onClick={() => removeRule(rule)}><Trash2 size={13} /> Delete</button>
              </div>
            </article>
          ))}
        </div>}
      </section>
    </div>
  );
};

export default SocietyRules;
