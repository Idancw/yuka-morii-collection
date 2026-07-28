import React from 'react';
import { X, Printer } from 'lucide-react';

const PLACEHOLDER_IMAGE = `${import.meta.env.BASE_URL}placeholder.svg`;
const CARDS_PER_PAGE = 16;

interface ExportSheetModalProps {
  cards: any[];
  onClose: () => void;
}

const ExportSheetModal: React.FC<ExportSheetModalProps> = ({ cards, onClose }) => {
  const pages: any[][] = [];
  for (let i = 0; i < cards.length; i += CARDS_PER_PAGE) {
    pages.push(cards.slice(i, i + CARDS_PER_PAGE));
  }
  const pageCount = Math.max(pages.length, 1);

  return (
    <div className="export-sheet-overlay fixed inset-0 bg-foreground/50 backdrop-blur-md z-50 flex flex-col animate-fade-in">
      {/* Toolbar (hidden when printing) */}
      <div className="no-print flex-shrink-0 bg-card border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-heading font-extrabold italic text-foreground truncate">
            Missing Cards Sheet
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm truncate">
            {cards.length} {cards.length === 1 ? 'card' : 'cards'} · {pageCount} {pageCount === 1 ? 'page' : 'pages'} · 4×4 per page
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => window.print()}
            disabled={cards.length === 0}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 btn-primary text-sm disabled:opacity-40 disabled:pointer-events-none"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print / Save as PDF</span>
            <span className="sm:hidden">Print</span>
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview / print content */}
      <div className="export-sheet-scroll flex-1 overflow-auto bg-muted/60 py-6">
        {cards.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">Nothing missing — your collection is complete!</p>
        ) : (
          <div className="print-sheet">
            {pages.map((pageCards, pageIndex) => (
              <div key={pageIndex} className="print-page">
                {pageCards.map((card) => (
                  <div key={card.id} className="print-card">
                    <img
                      src={card.imageUrl || PLACEHOLDER_IMAGE}
                      alt={card.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                      }}
                    />
                    <div className="print-card-caption">
                      <div className="name">{card.name}</div>
                      <div className="meta">#{card.number} · {card.set}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportSheetModal;
