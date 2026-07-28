import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, FileText, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { rulesAPI } from '../services/api';
import { CardSkeleton } from '../components/Skeletons';

const groupRules = (rules, categories) => categories
  .map((category) => ({ category, rules: rules.filter((rule) => rule.category === category) }))
  .filter((group) => group.rules.length);

const formatCategoryTitle = (category) => {
  if (!category) return 'Rules & Guidelines';
  const clean = category.trim();
  if (clean.toLowerCase().endsWith('rules')) return clean;
  return `${clean} Rules`;
};

function ResidentSocietyRules() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ rules: [], categories: [], version: 1, lastUpdated: null });

  useEffect(() => {
    rulesAPI.getAll({ force: true })
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, []);

  const activeRules = useMemo(() => (data.rules || []).filter((rule) => rule.isActive), [data.rules]);
  const pinned = useMemo(() => activeRules.filter((rule) => rule.isPinned), [activeRules]);
  const groups = useMemo(() => groupRules(activeRules, data.categories || []), [activeRules, data.categories]);

  return (
    <div className="portal-module rules-page">
      <div className="portal-page-title">
        <div>
          <h1>{t('societyRules.resTitle', 'Society Rules & By-Laws')}</h1>
          <p>{t('societyRules.resSubtitle', 'Read the latest society guidelines, code of conduct, and resident responsibilities.')}</p>
        </div>
        <div className="portal-date-chip">
          <ClipboardList size={15} /> {t('societyRules.version', 'Version')} {data.version}
        </div>
      </div>



      {loading ? (
        <CardSkeleton count={3} />
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {/* Pinned Rules Section */}
          {pinned.length > 0 && (
            <section className="portal-panel" style={{ borderLeft: '4px solid #dd6b20' }}>
              <div className="portal-panel-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Star size={18} style={{ color: '#dd6b20', fill: '#dd6b20' }} />
                  <div>
                    <h2>{t('societyRules.pinnedRules', 'Important Pinned Rules')}</h2>
                    <p>Mandatory rules every resident and visitor must strictly observe.</p>
                  </div>
                </div>
              </div>
              <div className="portal-panel-body" style={{ padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                  {pinned.map((rule) => (
                    <article
                      key={rule.id}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '10px',
                        border: '1px solid #fed7aa',
                        background: '#fffaf0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '13px', color: '#7c2d12' }}>{rule.title}</strong>
                        <span style={{ fontSize: '9px', fontWeight: 'bold', padding: '2px 7px', borderRadius: '99px', background: '#ffedd5', color: '#c2410c' }}>
                          {rule.category}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '11px', color: '#431407', lineHeight: '1.5' }}>{rule.description}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Categorized Rules Sections */}
          {groups.map((group) => (
            <section className="portal-panel" key={group.category}>
              <div className="portal-panel-head">
                <div>
                  <h2>{formatCategoryTitle(group.category)}</h2>
                  <p>Guidelines regarding {group.category.toLowerCase()} for all residents.</p>
                </div>
                <span className="portal-date-chip" style={{ fontSize: '10px' }}>
                  {group.rules.length} {group.rules.length === 1 ? 'Rule' : 'Rules'}
                </span>
              </div>
              <div className="portal-panel-body" style={{ padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                  {group.rules.map((rule) => (
                    <article
                      key={rule.id}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '10px',
                        border: '1px solid var(--portal-line, #e2e8f0)',
                        background: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                      }}
                    >
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>{rule.title}</strong>
                      <p style={{ margin: 0, fontSize: '11px', color: '#475569', lineHeight: '1.5' }}>{rule.description}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          ))}

          {!activeRules.length && (
            <section className="portal-panel">
              <div className="portal-empty" style={{ padding: '36px 16px' }}>
                <FileText size={32} style={{ color: '#94a3b8', marginBottom: '8px' }} /><br />
                {t('societyRules.noRules', 'No society rules have been published yet.')}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default ResidentSocietyRules;
