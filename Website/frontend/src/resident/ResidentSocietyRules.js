import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Star } from 'lucide-react';
import { rulesAPI } from '../services/api';
import { CardSkeleton } from '../components/Skeletons';

const groupRules = (rules, categories) => categories
  .map((category) => ({ category, rules: rules.filter((rule) => rule.category === category) }))
  .filter((group) => group.rules.length);

const fullDate = (value) => value ? new Date(value).toLocaleString('en-IN') : '-';

const ResidentSocietyRules = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ rules: [], categories: [], version: 1, lastUpdated: null });

  useEffect(() => {
    rulesAPI.getAll({ force: true })
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, []);

  const activeRules = data.rules.filter((rule) => rule.isActive);
  const pinned = activeRules.filter((rule) => rule.isPinned);
  const groups = useMemo(() => groupRules(activeRules, data.categories || []), [activeRules, data.categories]);

  return (
    <div className="portal-module rules-page">
      <div className="portal-page-title">
        <div>
          <h1>Society Rules</h1>
          <p>Read the latest society guidelines and responsibilities.</p>
        </div>
        <div className="portal-date-chip"><ClipboardList size={15} /> Version {data.version}</div>
      </div>
      <section className="portal-panel rules-version-card">
        <div><strong>Last Updated</strong><span>{fullDate(data.lastUpdated)}</span></div>
        <div><strong>Total Active Rules</strong><span>{activeRules.length}</span></div>
      </section>

      {loading ? <CardSkeleton count={4} /> : (
        <>
          {pinned.length > 0 && (
            <section className="rules-category-card pinned">
              <h2><Star size={16} /> Pinned Rules</h2>
              {pinned.map((rule) => <article key={rule.id}><strong>{rule.title}</strong><p>{rule.description}</p></article>)}
            </section>
          )}
          {groups.map((group) => (
            <section className="rules-category-card" key={group.category}>
              <h2>{group.category} Rules</h2>
              {group.rules.map((rule) => <article key={rule.id}><strong>{rule.title}</strong><p>{rule.description}</p></article>)}
            </section>
          ))}
          {!activeRules.length && <section className="portal-panel"><div className="portal-empty">No society rules have been published yet.</div></section>}
        </>
      )}
    </div>
  );
};

export default ResidentSocietyRules;
