import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle2, ClipboardList } from 'lucide-react';
import { rulesAPI } from '../services/api';

const groupRules = (rules, categories) => categories
  .map((category) => ({ category, rules: rules.filter((rule) => rule.category === category) }))
  .filter((group) => group.rules.length);

const niceDate = (value) => value ? new Date(value).toLocaleDateString('en-IN') : '-';

const SocietyRulesAcceptance = ({ children }) => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);
  const [rules, setRules] = useState([]);
  const [checked, setChecked] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef(null);

  const isRulesPage = location.pathname === '/resident/society-rules';

  useEffect(() => {
    let active = true;
    Promise.all([rulesAPI.getMeta({ force: true }), rulesAPI.getAll({ force: true })])
      .then(([metaRes, rulesRes]) => {
        if (!active) return;
        setMeta(metaRes.data);
        setRules(rulesRes.data.rules || []);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const activeRules = useMemo(() => rules.filter((rule) => rule.isActive), [rules]);
  const needsAcceptance = meta?.acceptance?.needsAcceptance;
  const groups = useMemo(() => groupRules(activeRules, meta?.categories || []), [activeRules, meta]);
  const pinned = activeRules.filter((rule) => rule.isPinned);
  const hasPublishedRules = activeRules.length > 0;

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || !hasPublishedRules) return;
    if (node.scrollHeight <= node.clientHeight + 12) setScrolled(true);
  }, [hasPublishedRules, groups.length, pinned.length]);

  if (loading || !needsAcceptance || isRulesPage || !hasPublishedRules) return children;

  const onScroll = (event) => {
    const node = event.currentTarget;
    if (node.scrollTop + node.clientHeight >= node.scrollHeight - 12) setScrolled(true);
  };

  const accept = async () => {
    setSaving(true);
    try {
      const response = await rulesAPI.accept();
      setMeta((current) => ({
        ...current,
        acceptance: {
          ...(current?.acceptance || {}),
          rulesAccepted: true,
          acceptedRulesVersion: response.data.version,
          needsAcceptance: false
        }
      }));
    } finally {
      setSaving(false);
    }
  };

  const updated = Boolean(meta?.acceptance?.acceptedRulesVersion);

  return (
    <div className="rules-gate">
      <section className="rules-gate-card">
        <div className="rules-gate-head">
          <span><ClipboardList size={24} /></span>
          <div>
            <h1>{updated ? 'Society Rules Updated' : 'Society Rules'}</h1>
            <p>Welcome to our Society. Please read all rules carefully before continuing.</p>
            <small>Version: {meta?.version || 1} · Last Updated: {niceDate(meta?.lastUpdated)}</small>
          </div>
        </div>

        <div className="rules-scroll" onScroll={onScroll} ref={scrollRef}>
          {pinned.length > 0 && (
            <div className="rules-category-card pinned">
              <h2>Pinned Rules</h2>
              {pinned.map((rule) => <article key={rule.id}><strong>{rule.title}</strong><p>{rule.description}</p></article>)}
            </div>
          )}
          {groups.map((group) => (
            <div className="rules-category-card" key={group.category}>
              <h2>{group.category} Rules</h2>
              {group.rules.map((rule) => <article key={rule.id}><strong>{rule.title}</strong><p>{rule.description}</p></article>)}
            </div>
          ))}
        </div>

        <label className="rules-accept-check">
          <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
          <span>I have read and agree to follow the Society Rules.</span>
        </label>
        <button className="portal-primary-btn rules-accept-btn" disabled={!checked || !scrolled || saving} onClick={accept}>
          <CheckCircle2 size={17} /> {saving ? 'Saving...' : 'Accept & Continue'}
        </button>
        {!scrolled && <p className="rules-help">Scroll to the bottom of the rules to enable acceptance.</p>}
      </section>
    </div>
  );
};

export default SocietyRulesAcceptance;
