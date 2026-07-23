import React from 'react';
import { ArrowLeftRight, Share2, LogOut, Eye, Settings } from 'lucide-react';

interface HeaderProps {
  user: any;
  isViewOnly: boolean;
  sharedOwnerEmail: string | null;
  currentFilter: string;
  previousFilter: string;
  compact?: boolean;
  onToggleTradeView: () => void;
  onShare: () => void;
  onLogout: () => void;
  onOpenPreferences: () => void;
}

const Header: React.FC<HeaderProps> = ({
  user,
  isViewOnly,
  sharedOwnerEmail,
  currentFilter,
  compact = false,
  onToggleTradeView,
  onShare,
  onLogout,
  onOpenPreferences,
}) => {
  const isTradeView = currentFilter === 'trade';

  return (
    <header className={`surface-card mb-4 sm:mb-6 animate-slide-up transition-[padding] duration-200 ${compact ? 'p-2.5 sm:p-6' : 'p-4 sm:p-6'}`}>
      <div className="flex justify-between items-center gap-4">
        {/* Left: Logo & User */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div
            className={`rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
              compact ? 'w-8 h-8 sm:w-12 sm:h-12' : 'w-11 h-11 sm:w-12 sm:h-12'
            }`}
            style={{ background: 'var(--gradient-primary)' }}
          >
            <img src={`${import.meta.env.BASE_URL}icon.png`} alt="logo" className="w-full h-full object-contain rounded-2xl" />
          </div>
          <div className="min-w-0">
            <h1 className={`font-heading font-extrabold italic text-foreground truncate transition-all duration-200 ${compact ? 'text-base sm:text-3xl' : 'text-xl sm:text-3xl'}`}>
              Yuka Morii Collection
            </h1>
            <p className={`text-muted-foreground text-xs sm:text-sm truncate items-center gap-1.5 ${compact ? 'hidden sm:flex' : 'flex'}`}>
              {isViewOnly ? (
                <>
                  <Eye className="w-3 h-3 flex-shrink-0" />
                  <span>Viewing {sharedOwnerEmail}'s Collection</span>
                </>
              ) : (
                <span>{user?.email}</span>
              )}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={onOpenPreferences}
            aria-label="Preferences"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full btn-surface flex items-center justify-center flex-shrink-0"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleTradeView}
            className={`flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 ${
              isTradeView
                ? 'bg-success text-success-foreground'
                : 'btn-surface'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span className="hidden sm:inline">Trade</span>
          </button>

          {!isViewOnly && (
            <button
              onClick={onShare}
              className="flex items-center gap-2 px-3 sm:px-5 py-2.5 btn-primary text-sm"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
          )}

          {!isViewOnly && (
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 sm:px-5 py-2.5 btn-surface text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
