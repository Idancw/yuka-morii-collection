import React, { useEffect, useRef, useState } from 'react';
import { Search, ArrowUpAZ, ArrowDownAZ, ChevronDown, Check, X } from 'lucide-react';

interface FiltersBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedEras: string[];
  onErasChange: (eras: string[]) => void;
  eras: string[];
  sortOrder: string;
  onSortChange: (order: string) => void;
  compact?: boolean;
}

const FiltersBar: React.FC<FiltersBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedEras,
  onErasChange,
  eras,
  sortOrder,
  onSortChange,
  compact = false,
}) => {
  const [eraMenuOpen, setEraMenuOpen] = useState(false);
  const eraMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!eraMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (eraMenuRef.current && !eraMenuRef.current.contains(e.target as Node)) {
        setEraMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [eraMenuOpen]);

  const toggleEra = (era: string) => {
    onErasChange(
      selectedEras.includes(era)
        ? selectedEras.filter(e => e !== era)
        : [...selectedEras, era]
    );
  };

  const eraLabel = selectedEras.length === 0
    ? 'All Eras'
    : selectedEras.length === 1
      ? selectedEras[0]
      : `${selectedEras.length} Eras`;

  return (
    <div className={`surface-card animate-slide-up transition-all duration-200 ${compact ? 'p-2 mb-2' : 'p-4 mb-6'}`} style={{ animationDelay: '0.1s' }}>
      <div className={`grid gap-2 sm:gap-3 ${compact ? 'grid-cols-[1fr_auto_auto]' : 'grid-cols-1 md:grid-cols-3'}`}>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, set, number..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`filter-input pl-10 transition-all duration-200 ${compact ? '!py-1.5' : ''}`}
          />
        </div>

        {/* Era multi-select */}
        <div className="relative" ref={eraMenuRef}>
          <button
            type="button"
            onClick={() => setEraMenuOpen(o => !o)}
            className={`filter-input flex items-center justify-between gap-2 cursor-pointer transition-all duration-200 ${compact ? '!py-1.5 !w-auto' : ''}`}
          >
            <span className="truncate">{eraLabel}</span>
            <ChevronDown className={`w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${eraMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {eraMenuOpen && (
            <div className="absolute z-50 mt-2 w-64 max-h-80 overflow-y-auto surface-card p-2 animate-fade-in-scale">
              <div className="flex items-center justify-between px-2 py-1.5 mb-1 border-b border-border">
                <span className="text-xs font-semibold text-muted-foreground">
                  {selectedEras.length === 0 ? 'All eras' : `${selectedEras.length} selected`}
                </span>
                {selectedEras.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onErasChange([])}
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>
              {eras.map(era => {
                const checked = selectedEras.includes(era);
                return (
                  <button
                    key={era}
                    type="button"
                    onClick={() => toggleEra(era)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left hover:bg-secondary transition-colors duration-150"
                  >
                    <span className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 ${
                      checked ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                    }`}>
                      {checked && <Check className="w-3 h-3" />}
                    </span>
                    <span className="truncate">{era}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sort */}
        <div className="flex gap-2">
          <button
            onClick={() => onSortChange('asc')}
            title="Oldest"
            className={`flex-1 flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all duration-200 ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2.5'} ${
              sortOrder === 'asc'
                ? 'bg-primary text-primary-foreground'
                : 'btn-surface'
            }`}
          >
            <ArrowUpAZ className="w-4 h-4" />
            <span className={compact ? 'hidden' : ''}>Oldest</span>
          </button>
          <button
            onClick={() => onSortChange('desc')}
            title="Newest"
            className={`flex-1 flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all duration-200 ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2.5'} ${
              sortOrder === 'desc'
                ? 'bg-primary text-primary-foreground'
                : 'btn-surface'
            }`}
          >
            <ArrowDownAZ className="w-4 h-4" />
            <span className={compact ? 'hidden' : ''}>Newest</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FiltersBar;
