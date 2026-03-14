import React from 'react';
import { SearchX } from 'lucide-react';
import CardItem from './CardItem';

interface CardGridProps {
  filteredCards: any[];
  currentFilter: string;
  isViewOnly: boolean;
  hasExpansionStampOwned: (card: any) => boolean;
  getExpansionStampMapping: () => Record<string, string>;
  getVariationBadges: (variations: any) => any[];
  onCardClick: (card: any) => void;
  onImagePopup: (url: string) => void;
}

const CardGrid: React.FC<CardGridProps> = ({
  filteredCards,
  currentFilter,
  isViewOnly,
  hasExpansionStampOwned,
  getExpansionStampMapping,
  getVariationBadges,
  onCardClick,
  onImagePopup,
}) => {
  return (
    <div className="surface-card p-4 sm:p-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
      <h2 className="text-xl sm:text-2xl font-heading font-bold gradient-text mb-5 flex items-center gap-2">
        📚 Collection
        <span className="text-muted-foreground text-sm font-body font-normal">
          — {filteredCards.length} cards
        </span>
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filteredCards.map(card => (
          <CardItem
            key={card.id}
            card={card}
            currentFilter={currentFilter}
            isViewOnly={isViewOnly}
            hasExpansionStampOwned={hasExpansionStampOwned}
            getExpansionStampMapping={getExpansionStampMapping}
            getVariationBadges={getVariationBadges}
            onClick={() => onCardClick(card)}
            onImagePopup={onImagePopup}
          />
        ))}
      </div>

      {filteredCards.length === 0 && (
        <div className="text-center text-muted-foreground py-20">
          <SearchX className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <div className="text-xl font-heading font-semibold">No cards match your filters</div>
        </div>
      )}
    </div>
  );
};

export default CardGrid;
