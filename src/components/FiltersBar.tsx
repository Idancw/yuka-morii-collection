import React from 'react';
import { Search, ArrowUpAZ, ArrowDownAZ } from 'lucide-react';

interface FiltersBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentEra: string;
  onEraChange: (era: string) => void;
  eras: string[];
  sortOrder: string;
  onSortChange: (order: string) => void;
}

const FiltersBar: React.FC<FiltersBarProps> = ({
  searchQuery,
  onSearchChange,
  currentEra,
  onEraChange,
  eras,
  sortOrder,
  onSortChange,
}) => {
  return (
    <div className="surface-card p-4 mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, set, number..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="filter-input pl-10"
          />
        </div>

        {/* Era */}
        <select
          value={currentEra}
          onChange={(e) => onEraChange(e.target.value)}
          className="filter-input appearance-none cursor-pointer"
        >
          {eras.map(era => (
            <option key={era} value={era}>{era === 'all' ? 'All Eras' : era}</option>
          ))}
        </select>

        {/* Sort */}
        <div className="flex gap-2">
          <button
            onClick={() => onSortChange('asc')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
              sortOrder === 'asc'
                ? 'bg-primary text-primary-foreground'
                : 'btn-surface'
            }`}
          >
            <ArrowUpAZ className="w-4 h-4" />
            1→223
          </button>
          <button
            onClick={() => onSortChange('desc')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
              sortOrder === 'desc'
                ? 'bg-primary text-primary-foreground'
                : 'btn-surface'
            }`}
          >
            <ArrowDownAZ className="w-4 h-4" />
            223→1
          </button>
        </div>
      </div>
    </div>
  );
};

export default FiltersBar;
