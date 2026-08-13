import React from 'react';
import { Layers, CheckCircle2, Clock, CircleDashed, TrendingUp } from 'lucide-react';

interface Stats {
  total: number;
  owned: number;
  ordered: number;
  needed: number;
  completion: number;
}

interface StatsPanelProps {
  stats: Stats;
  compact?: boolean;
  onFilterChange: (filter: string) => void;
}

const statItems = [
  { key: 'all', filter: 'all', label: 'Total', icon: Layers, colorClass: 'text-primary' },
  { key: 'owned', filter: 'yes', label: 'Owned', icon: CheckCircle2, colorClass: 'text-success' },
  { key: 'ordered', filter: 'ordered', label: 'Ordered', icon: Clock, colorClass: 'text-info' },
  { key: 'needed', filter: 'no', label: 'Needed', icon: CircleDashed, colorClass: 'text-muted-foreground' },
  { key: 'completion', filter: '', label: 'Owned %', icon: TrendingUp, colorClass: 'text-accent' },
];

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, compact = false, onFilterChange }) => {
  const getStatValue = (key: string) => {
    switch (key) {
      case 'all': return stats.total;
      case 'owned': return stats.owned;
      case 'ordered': return stats.ordered;
      case 'needed': return stats.needed;
      case 'completion': return `${stats.completion}%`;
      default: return 0;
    }
  };

  return (
    <>
      {/* Compact strip: always used on mobile, and on all sizes once scrolled */}
      <div
        className={`${compact ? '' : 'sm:hidden'} surface-card px-1 py-2 mb-2 sm:mb-4 flex items-stretch animate-slide-up transition-all duration-200`}
        style={{ animationDelay: '0.05s' }}
      >
        {statItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => item.filter && onFilterChange(item.filter)}
              className={`flex-1 flex items-center justify-center gap-1 py-1 ${
                i !== statItems.length - 1 ? 'border-r border-border' : ''
              }`}
            >
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${item.colorClass}`} />
              <span className={`text-xs font-heading font-bold ${item.colorClass}`}>
                {getStatValue(item.key)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Desktop: full stat cards, hidden once scrolled/compact */}
      <div className={`hidden ${compact ? '' : 'sm:grid sm:grid-cols-3 lg:grid-cols-5'} gap-3 mb-6 animate-slide-up`} style={{ animationDelay: '0.05s' }}>
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              onClick={() => item.filter && onFilterChange(item.filter)}
              className={`stat-card ${item.filter ? 'cursor-pointer' : ''}`}
            >
              <Icon className={`w-5 h-5 ${item.colorClass} mx-auto mb-2`} />
              <div className={`text-3xl font-heading font-bold ${item.colorClass}`}>
                {getStatValue(item.key)}
              </div>
              <div className="text-muted-foreground text-xs font-medium mt-1">{item.label}</div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default StatsPanel;
