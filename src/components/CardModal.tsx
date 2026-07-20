import React from 'react';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
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
              src={card.imageUrl || PLACEHOLDER_IMAGE}
              alt={card.name}
              onError={(e) => {
                (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
              }}
              className={`${isMobile ? 'w-36' : 'w-56'} h-auto rounded-xl transition-all duration-200 group-hover:opacity-80 group-hover:scale-[1.02]`}
              style={{ boxShadow: 'var(--shadow-card)' }}
            />
          </div>
          <div className="flex-1 min-w-0 py-1">
            <h2 className="text-lg sm:text-xl font-heading font-bold text-foreground mb-1 truncate">{card.name}</h2>
            <p className="text-muted-foreground text-sm mb-3">#{card.number} · {card.set}</p>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs border-t border-border pt-2.5">
              <div>
                <span className="text-muted-foreground">Illustrator</span>{' '}
                <span className="text-foreground font-medium">{card.illustrator || 'Yuka Morii'}</span>
              </div>
              {card.releaseDate && (
                <div>
                  <span className="text-muted-foreground">Released</span>{' '}
                  <span className="text-foreground font-medium">
                    {new Date(card.releaseDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}
              {card.rarity && (
                <div>
                  <span className="text-muted-foreground">Rarity</span>{' '}
                  <span className="text-foreground font-medium">{card.rarity}</span>
                </div>
              )}
              {card.nationalNumber && (
                <div>
                  <span className="text-muted-foreground">National #</span>{' '}
                  <span className="text-foreground font-medium">{card.nationalNumber}</span>
                </div>
              )}
              {card.energyType && (
                <div>
                  <span className="text-muted-foreground">Energy</span>{' '}
                  <span className="text-foreground font-medium">{card.energyType}</span>
                </div>
              )}
              {card.regulationMark && (
                <div>
                  <span className="text-muted-foreground">Reg. Mark</span>{' '}
                  <span className="text-foreground font-medium">{card.regulationMark}</span>
                </div>
              )}
              {card.era && (
                <div>
                  <span className="text-muted-foreground">Era</span>{' '}
                  <span className="text-foreground font-medium">{card.era}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Variants */}
      <div className={`p-4 sm:p-5 ${isMobile ? 'max-h-[42vh]' : 'max-h-[48vh]'} overflow-y-auto`}>
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
