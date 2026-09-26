import React, { useState } from 'react';
import { Layers, CheckCircle2, Clock, CircleDashed, TrendingUp, ZoomIn, ZoomOut } from 'lucide-react';

interface Stats {
  total: number;
  owned: number;
  ordered: number;
  needed: number;
  completion: number;
}

interface StatsPanelProps {
  stats: Stats;
  onFilterChange: (filter: string) => void;
}

const statItems = [
  { key: 'all', filter: 'all', label: 'Total', icon: Layers, colorClass: 'text-primary' },
  { key: 'owned', filter: 'yes', label: 'Owned', icon: CheckCircle2, colorClass: 'text-success' },
  { key: 'ordered', filter: 'ordered', label: 'Ordered', icon: Clock, colorClass: 'text-info' },
  { key: 'needed', filter: 'no', label: 'Needed', icon: CircleDashed, colorClass: 'text-muted-foreground' },
  { key: 'completion', filter: '', label: 'Owned %', icon: TrendingUp, colorClass: 'text-accent' },
];

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, onFilterChange }) => {
  const [expanded, setExpanded] = useState(false);

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

  const ToggleIcon = expanded ? ZoomOut : ZoomIn;
  const toggleButton = (
    <button
      type="button"
      onClick={() => setExpanded(e => !e)}
      title={expanded ? 'Show compact stats' : 'Show full stats'}
      className="flex-shrink-0 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
    >
      <ToggleIcon className="w-4 h-4" />
    </button>
  );

  if (expanded) {
    return (
      <div className="relative mb-4 animate-slide-up">
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-3 pr-8">
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
        <div className="absolute top-0 right-0 h-8 flex">{toggleButton}</div>
      </div>
    );
  }

  return (
    <div className="surface-card px-1 py-2 mb-2 flex items-stretch animate-slide-up">
      {statItems.map((item, i) => {
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            onClick={() => item.filter && onFilterChange(item.filter)}
            title={item.label}
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
      <div className="border-l border-border flex">{toggleButton}</div>
    </div>
  );
};

export default StatsPanel;
