import React, { memo, useMemo } from 'react';
import { Shield, AlertTriangle, AlertOctagon, Info, CheckCircle } from 'lucide-react';

const SEV_CONFIG = {
  info: { icon: Info, color: 'bg-slate-100 text-slate-700 border-slate-200', iconColor: 'text-slate-500' },
  low: { icon: CheckCircle, color: 'bg-emerald-50 text-emerald-800 border-emerald-200', iconColor: 'text-emerald-500' },
  medium: { icon: AlertTriangle, color: 'bg-amber-50 text-amber-800 border-amber-200', iconColor: 'text-amber-500' },
  high: { icon: AlertOctagon, color: 'bg-orange-50 text-orange-800 border-orange-200', iconColor: 'text-orange-500' },
  critical: { icon: Shield, color: 'bg-red-50 text-red-800 border-red-200', iconColor: 'text-red-500' }
};

const StatCard = memo(function StatCard({ label, count, config }) {
  const Icon = config.icon;
  return (
    <div className={`p-2 sm:p-3 rounded-lg border ${config.color} transition-all hover:shadow-sm`}>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${config.iconColor}`} />
        <span className="text-[10px] sm:text-xs uppercase font-medium tracking-wide">{label}</span>
      </div>
      <div className="text-lg sm:text-xl lg:text-2xl font-bold mt-1 tabular-nums">{count}</div>
    </div>
  );
});

function SecurityStatsCards({ events = [] }) {
  const stats = useMemo(() => {
    const buckets = { info: 0, low: 0, medium: 0, high: 0, critical: 0 };
    events.forEach(e => {
      if (buckets[e.severity] !== undefined) buckets[e.severity]++;
    });
    return buckets;
  }, [events]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
      {Object.entries(stats).map(([key, count]) => (
        <StatCard key={key} label={key} count={count} config={SEV_CONFIG[key]} />
      ))}
    </div>
  );
}

export default memo(SecurityStatsCards);