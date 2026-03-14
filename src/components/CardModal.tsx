import React from 'react';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import VariantRow from './VariantRow';

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
  const ModalContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`modal-content ${isMobile ? 'w-full' : 'max-w-lg w-full mx-4'} animate-fade-in-scale`}>
      {/* Card Image Header */}
      <div className="relative bg-background p-4 sm:p-5">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex gap-4 sm:gap-5">
          <div
            className="flex-shrink-0 cursor-pointer group"
            onClick={(e) => { e.stopPropagation(); onImageClick(card.imageUrl); }}
          >
            <img
              src={card.imageUrl}
              alt={card.name}
              className={`${isMobile ? 'w-32' : 'w-48'} h-auto rounded-xl transition-all duration-200 group-hover:opacity-80 group-hover:scale-[1.02]`}
              style={{ boxShadow: 'var(--shadow-card)' }}
            />
          </div>
          <div className="flex-1 min-w-0 py-1">
            <h2 className="text-lg sm:text-xl font-heading font-bold text-foreground mb-1 truncate">{card.name}</h2>
            <p className="text-muted-foreground text-sm mb-4">#{card.number} · {card.set}</p>

            <div className="space-y-2">
              <div className="flex items-center gap-3 surface-elevated p-2.5">
                <span className="text-lg">🎨</span>
                <div>
                  <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Illustrator</div>
                  <div className="text-foreground font-semibold text-sm">Yuka Morii TCG Pokemon Collection</div>
                </div>
              </div>

              {card.era && (
                <div className="flex items-center gap-3 surface-elevated p-2.5">
                  <span className="text-lg">📅</span>
                  <div>
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Era</div>
                    <div className="text-foreground font-semibold text-sm">{card.era}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Variants */}
      <div className={`p-4 sm:p-5 ${isMobile ? 'max-h-[35vh]' : 'max-h-[40vh]'} overflow-y-auto`}>
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

      {/* Mobile Nav */}
      {isMobile && (
        <div className="flex justify-center gap-4 py-4 px-4 border-t border-border">
          <button onClick={onPrev} className="w-12 h-12 rounded-full btn-surface flex items-center justify-center">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={onNext} className="w-12 h-12 rounded-full btn-surface flex items-center justify-center">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div
      className="modal-overlay animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative flex flex-col items-center justify-center w-full max-w-4xl">
        {/* Desktop */}
        <div className="hidden md:flex items-center justify-center w-full">
          <button onClick={onPrev} className="w-10 h-10 rounded-full btn-surface flex items-center justify-center flex-shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <ModalContent />
          <button onClick={onNext} className="w-10 h-10 rounded-full btn-surface flex items-center justify-center flex-shrink-0">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile */}
        <div className="md:hidden w-full">
          <ModalContent isMobile />
        </div>
      </div>
    </div>
  );
};

export default CardModal;
