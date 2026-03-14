import React from 'react';
import { X } from 'lucide-react';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 animate-fade-in"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 bg-card/50 hover:bg-card rounded-full flex items-center justify-center text-foreground z-10 backdrop-blur-sm transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={imageUrl}
        alt="Card Detail"
        className="max-w-full max-h-[90vh] object-contain rounded-lg animate-fade-in-scale"
        style={{ boxShadow: 'var(--shadow-modal)' }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export default ImageModal;
