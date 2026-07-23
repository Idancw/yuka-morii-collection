import React from 'react';
import { X, Palette, Check } from 'lucide-react';
import { ACCENTS, AccentKey, ThemeMode } from '@/hooks/use-theme-preferences';

interface PreferencesModalProps {
  mode: ThemeMode;
  accent: AccentKey;
  onModeChange: (mode: ThemeMode) => void;
  onAccentChange: (accent: AccentKey) => void;
  onClose: () => void;
}

const MODE_OPTIONS: { key: ThemeMode; label: string; from: string; to: string }[] = [
  { key: 'light', label: 'Light', from: '#ffffff', to: '#dce7f5' },
  { key: 'dark', label: 'Dark', from: '#3a3f4a', to: '#1c1f26' },
];

const PreferencesModal: React.FC<PreferencesModalProps> = ({
  mode,
  accent,
  onModeChange,
  onAccentChange,
  onClose,
}) => {
  return (
    <div className="modal-overlay animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content max-w-lg w-full mx-4 p-6 sm:p-8 animate-fade-in-scale">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-3xl font-heading font-extrabold italic text-foreground">Preferences</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-bold text-foreground">Theme</h3>
        </div>
        <p className="text-muted-foreground text-sm mb-5">Personalize your collection with colors to match your style.</p>

        <div className="mb-6">
          <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-2">Mode</div>
          <div className="grid grid-cols-2 gap-3">
            {MODE_OPTIONS.map((opt) => {
              const selected = mode === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => onModeChange(opt.key)}
                  className="flex flex-col items-center gap-2"
                >
                  <div
                    className={`w-full h-16 rounded-2xl overflow-hidden flex transition-all ${
                      selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="w-1/2 h-full" style={{ backgroundColor: opt.from }} />
                    <div className="w-1/2 h-full" style={{ backgroundColor: opt.to }} />
                  </div>
                  <span className={`text-sm font-semibold ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-2">Accent</div>
          <div className="grid grid-cols-4 gap-3">
            {(Object.keys(ACCENTS) as AccentKey[]).map((key) => {
              const a = ACCENTS[key];
              const selected = accent === key;
              return (
                <button
                  key={key}
                  onClick={() => onAccentChange(key)}
                  className="flex flex-col items-center gap-2"
                >
                  <div
                    className={`relative w-full h-12 rounded-2xl overflow-hidden flex transition-all ${
                      selected ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card' : 'hover:opacity-90'
                    }`}
                  >
                    <div className="w-1/2 h-full" style={{ backgroundColor: `hsl(${a.h} ${a.s}% ${a.l}%)` }} />
                    <div className="w-1/2 h-full" style={{ backgroundColor: `hsl(${a.h} ${a.s}% ${Math.max(a.l - 12, 20)}%)` }} />
                    {selected && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white drop-shadow" />
                      </div>
                    )}
                  </div>
                  <span className={`text-xs font-semibold ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {a.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreferencesModal;
