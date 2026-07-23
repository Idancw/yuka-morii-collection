import React from 'react';
import { ArrowLeftRight, Share2, LogOut, Eye } from 'lucide-react';

interface HeaderProps {
  user: any;
  isViewOnly: boolean;
  sharedOwnerEmail: string | null;
  currentFilter: string;
  previousFilter: string;
  onToggleTradeView: () => void;
  onShare: () => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({
  user,
  isViewOnly,
  sharedOwnerEmail,
  currentFilter,
  onToggleTradeView,
  onShare,
  onLogout,
}) => {
  const isTradeView = currentFilter === 'trade';

  return (
    <header className="surface-card p-4 sm:p-6 mb-6 animate-slide-up">
      <div className="flex justify-between items-center gap-4">
        {/* Left: Logo & User */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--gradient-primary)' }}>
            <img src={`${import.meta.env.BASE_URL}icon.png`} alt="logo" className="w-full h-full object-contain rounded-2xl" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-heading font-extrabold italic text-foreground truncate">
              Yuka Morii Collection
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm truncate flex items-center gap-1.5">
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
            onClick={onToggleTradeView}
            className={`flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
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
