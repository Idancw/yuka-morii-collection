import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface VariantRowProps {
  cardId: string;
  varType: string;
  varData: any;
  isViewOnly: boolean;
  onIncrement: (cardId: string, varType: string, e: any) => void;
  onDecrement: (cardId: string, varType: string, e: any) => void;
  onToggleLanguage: (cardId: string, varType: string, lang: string, e: any) => void;
  onToggleOrdered: (cardId: string, varType: string, e: any) => void;
}

const VariantRow: React.FC<VariantRowProps> = ({
  cardId,
  varType,
  varData,
  isViewOnly,
  onIncrement,
  onDecrement,
  onToggleLanguage,
  onToggleOrdered,
}) => {
  const count = varData.count || 0;
  const isOrdered = varData.ordered || false;
  const languages = varData.languages || [];
  const availableLanguages = varData.available_languages || [];
  const numberSuffix = varData.number ? `_${varData.number.toLowerCase()}` : null;
  const varTypeForDisplay = numberSuffix && varType.endsWith(numberSuffix)
    ? varType.slice(0, -numberSuffix.length)
    : varType;
  const baseDisplayName = varTypeForDisplay.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  const displayName = varData.number ? `${baseDisplayName} (#${varData.number})` : baseDisplayName;

  return (
    <div className="variant-row">
      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
        {/* Name */}
        <div
          className="text-foreground font-semibold w-full sm:w-44 leading-tight text-xs sm:text-sm"
          title={displayName}
        >
          {displayName}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          {/* Count */}
          {!isViewOnly ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => onDecrement(cardId, varType, e)}
                className="count-btn bg-muted hover:bg-muted-foreground/20 text-foreground"
              >
                <Minus className="w-3 h-3" />
              </button>
              <div className="w-8 text-center">
                <span className={`font-heading font-bold text-sm ${count > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                  {count}
                </span>
              </div>
              <button
                onClick={(e) => onIncrement(cardId, varType, e)}
                className="count-btn bg-primary/20 hover:bg-primary/30 text-primary"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <span className={`font-heading font-bold text-sm ${count > 0 ? 'text-success' : 'text-muted-foreground'}`}>
              {count}
            </span>
          )}

          {/* Languages */}
          {!isViewOnly && (
            <div className="flex items-center gap-1.5 w-[84px] shrink-0">
              {availableLanguages.map((lang: string) => {
                const isActive = languages.includes(lang);
                const isDisabled = count === 0;

                return (
                  <button
                    key={lang}
                    onClick={(e) => !isDisabled && onToggleLanguage(cardId, varType, lang, e)}
                    disabled={isDisabled}
                    className={`lang-btn ${
                      isActive
                        ? 'bg-info text-info-foreground'
                        : isDisabled
                          ? 'bg-muted/50 text-muted-foreground/40 cursor-not-allowed'
                          : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20'
                    }`}
                  >
                    {lang}
                  </button>
                );
              })}
            </div>
          )}

          {/* Ordered toggle */}
          {!isViewOnly && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-[11px]">Ordered</span>
              <button
                onClick={(e) => count === 0 && onToggleOrdered(cardId, varType, e)}
                disabled={count > 0}
                className={`toggle-switch ${
                  isOrdered && count === 0 ? 'bg-warning' : 'bg-muted'
                } ${count > 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div
                  className={`toggle-switch-knob ${
                    isOrdered && count === 0 ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VariantRow;
