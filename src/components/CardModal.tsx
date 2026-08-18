import React from 'react';
import { X, ChevronLeft, ChevronRight, Sparkles, PenTool, Calendar, Star, Hash, Zap, FileBadge, History, Images } from 'lucide-react';
import VariantRow from './VariantRow';

const PLACEHOLDER_IMAGE = `${import.meta.env.BASE_URL}placeholder.svg`;

interface CardModalProps {
  card: any;
  isViewOnly: boolean;
  onClose: () => void;
  onPrev: (e: any) => void;
  onNext: (e: any) => void;
  onImageClick: (url: string) => void;
  onIncrement: (cardId: string, varType: string, e: any) => void;
  onDecrement: (cardId: string, varType: string, e: any) => void;
  onToggleLanguage: (cardId: string, varType: string, lang: string, e: any) => void;
  onToggleOrdered: (cardId: string, varType: string, e: any) => void;
  onTouchStart: (e: any) => void;
  onTouchMove: (e: any) => void;
  onTouchEnd: () => void;
}

const ATTRIBUTE_ICONS: Record<string, any> = {
  illustrator: PenTool,
  releaseDate: Calendar,
  rarity: Star,
  nationalNumber: Hash,
  energyType: Zap,
  regulationMark: FileBadge,
  era: History,
};

function getAttributes(card: any) {
  const rows: { key: string; label: string; value: string }[] = [
    { key: 'illustrator', label: 'Illustrator', value: card.illustrator || 'Yuka Morii' },
  ];
  if (card.releaseDate) {
    rows.push({
      key: 'releaseDate',
      label: 'Released',
      value: new Date(card.releaseDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
    });
  }
  if (card.rarity) rows.push({ key: 'rarity', label: 'Rarity', value: card.rarity });
  if (card.nationalNumber) rows.push({ key: 'nationalNumber', label: 'National #', value: `#${card.nationalNumber}` });
  if (card.energyType) rows.push({ key: 'energyType', label: 'Energy', value: card.energyType });
  if (card.regulationMark) rows.push({ key: 'regulationMark', label: 'Reg. Mark', value: card.regulationMark });
  if (card.era) rows.push({ key: 'era', label: 'Era', value: card.era });
  return rows;
}

function getCardLanguages(card: any): Set<string> {
  const langs = new Set<string>();
  Object.values(card.variations || {}).forEach((v: any) => {
    (v.available_languages || []).forEach((l: string) => langs.add(l));
  });
  return langs;
}

function getOtherPrintings(card: any) {
  if (!card.variations) return [];
  const seen = new Set<string>();
  const printings: { key: string; number: string; languages: string[] }[] = [];
  Object.entries(card.variations).forEach(([key, v]: [string, any]) => {
    if (!v.number || v.number === card.number || seen.has(v.number)) return;
    seen.add(v.number);
    printings.push({ key, number: v.number, languages: v.languages || v.available_languages || [] });
  });
  return printings;
}

const CardModal: React.FC<CardModalProps> = ({
  card,
  isViewOnly,
  onClose,
  onPrev,
  onNext,
  onImageClick,
  onIncrement,
  onDecrement,
  onToggleLanguage,
  onToggleOrdered,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}) => {
  const attributes = getAttributes(card);
  const otherPrintings = getOtherPrintings(card);
  const cardLanguages = getCardLanguages(card);
  const showBothLanguages = cardLanguages.has('EN') && cardLanguages.has('JP');
  const imageLanguages = showBothLanguages ? ['English', 'Japanese'] : [null];

  return (
    <div
      className="modal-overlay animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="modal-content max-w-2xl w-full mx-4 animate-fade-in-scale max-h-[90vh] flex flex-col">
        {/* Top bar: nav + close */}
        <div className="flex items-center justify-end gap-2 p-3 border-b border-border flex-shrink-0">
          <button onClick={onPrev} className="w-8 h-8 rounded-full btn-surface flex items-center justify-center">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={onNext} className="w-8 h-8 rounded-full btn-surface flex items-center justify-center">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto">
          {/* Image + title header */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 bg-secondary/30 p-4 sm:p-5">
            <div className="flex-shrink-0 mx-auto sm:mx-0 flex items-start justify-center sm:justify-start gap-3">
              {imageLanguages.map((lang) => (
                <div
                  key={lang || 'default'}
                  className="cursor-pointer group text-center"
                  onClick={(e) => { e.stopPropagation(); onImageClick(card.imageUrl); }}
                >
                  <img
                    src={card.imageUrl || PLACEHOLDER_IMAGE}
                    alt={lang ? `${card.name} (${lang})` : card.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                    }}
                    className={`${showBothLanguages ? 'w-28 sm:w-36' : 'w-40 sm:w-52'} h-auto rounded-xl transition-all duration-200 group-hover:opacity-80 group-hover:scale-[1.02]`}
                    style={{ boxShadow: 'var(--shadow-card)' }}
                  />
                  {lang && (
                    <div className="text-muted-foreground text-[11px] font-semibold mt-1">{lang}</div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex-1 min-w-0 py-1 text-center sm:text-left">
              <p className="text-muted-foreground text-xs font-medium mb-1">Pokémon · {card.set}</p>
              <h2 className="text-2xl sm:text-3xl font-heading font-extrabold italic text-foreground truncate">{card.name}</h2>
              <p className="text-muted-foreground text-sm mt-1">#{card.number}</p>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-6">
            {/* Variants */}
            <div>
              <h3 className="text-sm font-heading font-bold text-foreground mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Variants
              </h3>
              <div className="space-y-2">
                {card.variations && Object.entries(card.variations).map(([varType, varData]: [string, any]) => (
                  <VariantRow
                    key={varType}
                    cardId={card.id}
                    varType={varType}
                    varData={varData}
                    isViewOnly={isViewOnly}
                    onIncrement={onIncrement}
                    onDecrement={onDecrement}
                    onToggleLanguage={onToggleLanguage}
                    onToggleOrdered={onToggleOrdered}
                  />
                ))}
              </div>
            </div>

            {/* Attributes */}
            <div>
              <h3 className="text-sm font-heading font-bold text-foreground mb-3">Attributes</h3>
              <div className="space-y-2">
                {attributes.map((attr) => {
                  const Icon = ATTRIBUTE_ICONS[attr.key] || Star;
                  return (
                    <div key={attr.key} className="attribute-row">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-muted-foreground text-[11px] leading-tight">{attr.label}</div>
                        <div className="text-foreground text-sm font-semibold leading-tight truncate">{attr.value}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Other Printings */}
            {otherPrintings.length > 0 && (
              <div>
                <h3 className="text-sm font-heading font-bold text-foreground mb-3 flex items-center gap-2">
                  <Images className="w-4 h-4 text-primary" />
                  Other Printings
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {otherPrintings.map((p) => (
                    <div key={p.key} className="flex-shrink-0 w-16 text-center">
                      <img
                        src={card.imageUrl || PLACEHOLDER_IMAGE}
                        alt={`${card.name} ${p.number}`}
                        className="w-16 h-auto rounded-lg border border-border"
                      />
                      <div className="text-muted-foreground text-[10px] mt-1 truncate">#{p.number}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardModal;
