import React from 'react';
import { X, Copy, Link } from 'lucide-react';

interface ShareModalProps {
  userId: string;
  onCopyLink: () => void;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ userId, onCopyLink, onClose }) => {
  const shareUrl = `${window.location.origin}${window.location.pathname}?user=${userId}`;

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div
        className="modal-content max-w-md w-full p-8 animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Link className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-2xl font-heading font-bold gradient-text">Share Collection</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-muted-foreground mb-4 text-sm">Anyone with this link can view your collection:</p>

        <div className="bg-background p-4 rounded-xl mb-6 break-all text-sm font-mono text-primary/80 border border-border">
          {shareUrl}
        </div>

        <div className="flex gap-3">
          <button onClick={onCopyLink} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2">
            <Copy className="w-4 h-4" />
            Copy Link
          </button>
          <button onClick={onClose} className="flex-1 btn-surface py-3">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
