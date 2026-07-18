import React from 'react';
import { Check } from 'lucide-react';

const PLACEHOLDER_IMAGE = `${import.meta.env.BASE_URL}placeholder.svg`;

interface CardItemProps {
  card: any;
  currentFilter: string;
  isViewOnly: boolean;
  hasExpansionStampOwned: (card: any) => boolean;
  getExpansionStampMapping: () => Record<string, string>;
  getVariationBadges: (variations: any) => any[];
  onClick: () => void;
  onImagePopup: (url: string) => void;
}

const CardItem: React.FC<CardItemProps> = ({
  card,
  currentFilter,
  isViewOnly,
  hasExpansionStampOwned,
  getExpansionStampMapping,
  getVariationBadges,
  onClick,
  onImagePopup,
}) => {
  const variations = card.variations || {};
  const totalCopies = Object.values(variations).reduce((sum: number, v: any) => sum + ((v as any).count || 0), 0) as number;
  const hasReverseHolo = variations.reverse_holo && (variations.reverse_holo.count > 0);
  const isOrdered = Object.values(variations).some((v: any) => v.ordered === true && v.count === 0);
  const isOwned = totalCopies > 0;
  const isTradeView = currentFilter === 'trade';
  const hasExpansionStamp = hasExpansionStampOwned(card);
  const expansionStampUrl = hasExpansionStamp ? getExpansionStampMapping()[card.set] : null;
  const variationBadges = getVariationBadges(variations);

  return (
    <div
      onClick={() => {
        if (!isViewOnly && currentFilter !== 'trade') onClick();
      }}
      className={`relative surface-card overflow-hidden transition-all duration-300 ${
        isTradeView ? 'cursor-default' : 'card-hover cursor-pointer hover:border-primary/50'
      }`}
    >
      <div className="aspect-[2/3] relative bg-background">
        <img
          src={card.imageUrl || PLACEHOLDER_IMAGE}
          alt={card.name}
          onError={(e) => {
            (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
          }}
          onClick={(e) => {
            if (isTradeView) {
              e.stopPropagation();
              onImagePopup(card.imageUrl);
            }
          }}
          className={`w-full h-full object-contain p-2 ${isTradeView ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
        />

        {isTradeView ? (
          <TradeOverlay variations={variations} />
        ) : (
          <CollectionOverlay
            isOwned={isOwned}
            isOrdered={isOrdered}
            totalCopies={totalCopies}
            hasReverseHolo={hasReverseHolo}
            expansionStampUrl={expansionStampUrl}
            variationBadges={variationBadges}
            variations={variations}
          />
        )}
      </div>

      <div className="p-2.5 bg-background/50">
        <div className="font-heading font-bold text-foreground text-xs truncate">{card.name}</div>
        <div className="text-muted-foreground text-[10px] truncate">#{card.number}</div>
        <div className="text-primary/60 text-[9px] truncate mt-0.5">{card.set}</div>
      </div>
    </div>
  );
};

const TradeOverlay: React.FC<{ variations: any }> = ({ variations }) => (
  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/95 to-transparent p-2 pt-8">
    <div className="flex flex-col gap-1.5">
      {Object.entries(variations)
        .filter(([_, v]: [string, any]) => {
          const count = v.count || 0;
          const languages = v.languages || [];
          const languageCount = languages.length || 1;
          return count > languageCount;
        })
        .map(([varType, v]: [string, any]) => {
          const languages = v.languages || [];
          const count = v.count || 0;
          const languageCount = languages.length || 1;
          const tradeCount = count - languageCount;

          return (
            <div key={varType} className="bg-success rounded-lg px-2 py-1.5 border border-success/50">
              <div className="flex items-center justify-between gap-2">
                <span className="text-success-foreground text-[10px] font-bold flex-1 leading-tight">
                  {varType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </span>
                <div className="flex items-center gap-1.5">
                  {languages.includes('EN') && <span className="text-xs">🇺🇸</span>}
                  {languages.includes('JP') && <span className="text-xs">🇯🇵</span>}
                  <span className="text-success-foreground font-black text-sm bg-success/60 px-1.5 py-0.5 rounded">
                    {tradeCount}×
                  </span>
                </div>
              </div>
            </div>
          );
        })}
    </div>
  </div>
);

interface CollectionOverlayProps {
  isOwned: boolean;
  isOrdered: boolean;
  totalCopies: number;
  hasReverseHolo: boolean;
  expansionStampUrl: string | null;
  variationBadges: any[];
  variations: any;
}

const CollectionOverlay: React.FC<CollectionOverlayProps> = ({
  isOwned,
  isOrdered,
  totalCopies,
  hasReverseHolo,
  expansionStampUrl,
  variationBadges,
  variations,
}) => (
  <>
    {expansionStampUrl && (
      <div className="absolute top-1/2 -translate-y-1/2" style={{ left: '75%', transform: 'translate(-60%, -20%)' }}>
        <div className="w-24 h-24 flex items-center justify-center p-1.5">
          <img src={expansionStampUrl} alt="Expansion Stamp" className="w-full h-full object-contain" />
        </div>
      </div>
    )}

    {/* Language badges */}
    <div className="absolute top-2 left-2 flex flex-col gap-1">
      {Object.values(variations).some((v: any) => v.languages?.includes('EN')) && (
        <div className="badge-circle bg-foreground shadow-lg text-xs">🇺🇸</div>
      )}
      {Object.values(variations).some((v: any) => v.languages?.includes('JP')) && (
        <div className="badge-circle bg-foreground shadow-lg text-xs">🇯🇵</div>
      )}
    </div>

    {/* Owned checkmark */}
    {isOwned && (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-12 h-12 bg-foreground rounded-full flex items-center justify-center shadow-2xl">
          <Check className="w-7 h-7 text-success" />
        </div>
      </div>
    )}

    {/* Ordered indicator */}
    {isOrdered && !isOwned && (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-12 h-12 bg-foreground rounded-full flex items-center justify-center shadow-2xl">
          <img src="https://cdn-icons-png.flaticon.com/512/3500/3500833.png" alt="Ordered" className="w-8 h-8 object-contain" />
        </div>
      </div>
    )}

    {/* Right badges */}
    <div className="absolute top-2 right-2 flex flex-col gap-1">
      {totalCopies > 1 && (
        <div className="badge-circle bg-foreground shadow-lg">
          <span className="text-background text-xs font-bold">{totalCopies}</span>
        </div>
      )}
      {hasReverseHolo && (
        <div className="badge-circle bg-foreground shadow-lg overflow-hidden border border-primary/30" title="Reverse Holo">
          <img src="https://static.dextcg.com/resources/variants/alternate/ReverseHoloVariant.webp" alt="Reverse Holo" className="w-5 h-5 object-contain invert" />
        </div>
      )}
      {variationBadges.map((badge: any, index: number) => (
        <div key={`${badge.type}-${index}`} className="badge-circle bg-foreground shadow-lg overflow-hidden border border-primary/30" title={badge.alt}>
          <img src={badge.icon} alt={badge.alt} className="w-5 h-5 object-contain" />
        </div>
      ))}
    </div>
  </>
);

export default CardItem;
