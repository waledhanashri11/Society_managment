import React from 'react';

const SkeletonBlock = ({ className = '' }) => (
  <div className={`bg-gray-200 animate-pulse rounded ${className}`} />
);

export const CardSkeleton = ({ count = 4 }) => (
  <div className="portal-kpis">
    {Array.from({ length: count }).map((_, index) => (
      <article className="portal-kpi" key={index}>
        <SkeletonBlock className="h-3 w-24 mb-3" />
        <SkeletonBlock className="h-7 w-28 mb-3" />
        <SkeletonBlock className="h-3 w-20" />
      </article>
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="portal-table-wrap">
    <table className="portal-data-table">
      <tbody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={rowIndex}>
            {Array.from({ length: columns }).map((__, columnIndex) => (
              <td key={columnIndex}>
                <SkeletonBlock className="h-4 w-full" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const FormSkeleton = ({ fields = 4 }) => (
  <div className="portal-panel">
    {Array.from({ length: fields }).map((_, index) => (
      <div className="mb-3" key={index}>
        <SkeletonBlock className="h-3 w-24 mb-2" />
        <SkeletonBlock className="h-10 w-full" />
      </div>
    ))}
  </div>
);

export const DashboardSkeleton = () => (
  <div>
    <div className="portal-page-title">
      <div>
        <SkeletonBlock className="h-8 w-48 mb-2" />
        <SkeletonBlock className="h-4 w-72" />
      </div>
      <SkeletonBlock className="h-8 w-28" />
    </div>
    <CardSkeleton count={4} />
    <div className="portal-dashboard-grid">
      <section className="portal-panel">
        <SkeletonBlock className="h-6 w-40 mb-4" />
        <SkeletonBlock className="h-40 w-full" />
      </section>
      <section className="portal-panel">
        <SkeletonBlock className="h-6 w-40 mb-4" />
        <SkeletonBlock className="h-40 w-full" />
      </section>
    </div>
  </div>
);

export default SkeletonBlock;
