import React, { memo, lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const Section2DnDGrid = lazy(() => import("@/components/plots/Section2DnDGrid"));
const DraggableSectionGrid = lazy(() => import("@/components/plots/DraggableSectionGrid"));

const STATUS_COLORS = {
  'Available': 'bg-green-500 border-green-700',
  'Reserved': 'bg-yellow-400 border-yellow-600',
  'Occupied': 'bg-red-500 border-red-700',
  'Veteran': 'bg-blue-600 border-blue-800',
  'Unavailable': 'bg-gray-600 border-gray-800',
  'Unknown': 'bg-purple-500 border-purple-700',
  'Default': 'bg-gray-300 border-gray-500'
};

const getSectionPalette = (key) => {
  switch (String(key)) {
    case '1': return 'bg-blue-100 border-blue-300 text-blue-900';
    case '2': return 'bg-transparent border-transparent text-green-900';
    case '3': return 'bg-rose-100 border-rose-300 text-rose-900';
    case '4': return 'bg-amber-100 border-amber-300 text-amber-900';
    case '5': return 'bg-purple-100 border-purple-300 text-purple-900';
    default:  return 'bg-lime-100 border-lime-300 text-lime-900';
  }
};

const FullscreenPlotsOverlay = memo(function FullscreenPlotsOverlay({ sections }) {
  if (!sections || Object.keys(sections).length === 0) return null;

  return (
    <div className="p-4 space-y-6 border border-stone-300 shadow-lg rounded-lg max-w-full overflow-auto" style={{ backgroundColor: 'rgba(231, 229, 228, 0.01)' }}>
      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
        Plot Overlay
      </div>
      <Suspense fallback={<div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" />Loading plots…</div>}>
        {Object.keys(sections)
          .filter(k => k !== '1' && k !== '3' && k !== '4')
          .sort((a, b) => parseInt(b) - parseInt(a))
          .map(sectionKey => {
            const palette = getSectionPalette(sectionKey);
            const [bgColor, borderColor] = palette.split(' ');
            const plots = sections[sectionKey] || [];

            if (sectionKey === '2') {
              return (
                <div key={sectionKey}>
                  <div className="text-sm font-bold text-green-800 mb-1">Section 2</div>
                  <Section2DnDGrid
                    plots={plots}
                    section1Plots={sections['1'] || []}
                    baseColorClass={`${bgColor} ${borderColor}`}
                    isAdmin={false}
                    statusColors={STATUS_COLORS}
                  />
                </div>
              );
            }

            return (
              <div key={sectionKey}>
                <div className="text-sm font-bold mb-1" style={{ color: sectionKey === '5' ? '#7e22ce' : '#1e3a5f' }}>
                  Section {sectionKey}
                </div>
                <div className="text-xs text-gray-400">{plots.length} plots</div>
              </div>
            );
          })}
      </Suspense>
    </div>
  );
});

export default FullscreenPlotsOverlay;