import React, { useState } from 'react';
import { Download, X, Smartphone, Share, PlusSquare, Copy, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { soundEngine } from '../utils/soundEngine';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isInIframe, install } = usePWAInstall();
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyUrl = async () => {
    soundEngine.playKeyClick('Enter');
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDirectInstall = async () => {
    soundEngine.playKeyClick('Enter');
    const accepted = await install();
    if (accepted) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#061712]/80 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
    >
      <div className="w-full max-w-md border-2 border-[#EEF7C2] bg-[#0A261E] text-[#EEF7C2] p-5 shadow-2xl font-cli">
        <div className="flex items-center justify-between border-b border-[#EEF7C2]/30 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#EEF7C2]" />
            <h2
              id="pwa-install-title"
              className="text-base font-bold tracking-wider uppercase phosphor-text-subtle"
            >
              Install 1999 AI App
            </h2>
          </div>
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              onClose();
            }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center border border-[#EEF7C2]/40 hover:bg-[#EEF7C2] hover:text-[#0A261E] transition-colors cursor-pointer"
            aria-label="Close installation guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs leading-relaxed text-[#EEF7C2]/90 mb-4">
          &ldquo;Oh, marvelous. You want to install my superior intellect as a full-screen app on your phone. Follow these steps, you twit.&rdquo;
        </p>

        {isInstalled ? (
          <div className="border border-[#EEF7C2] bg-[#4EB89B]/20 p-3 text-xs mb-4">
            TERMINAL STATUS: ALREADY INSTALLED AS AN APP ON YOUR DEVICE.
          </div>
        ) : isInstallable ? (
          <button
            onClick={handleDirectInstall}
            className="w-full min-h-[48px] mb-4 flex items-center justify-center gap-2 bg-[#EEF7C2] text-[#0A261E] font-bold text-sm uppercase tracking-wider hover:bg-[#F7FBE1] transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Install 1999 AI App Now
          </button>
        ) : null}

        <div className="space-y-3 text-xs border-t border-[#EEF7C2]/25 pt-3">
          {/* Android First & Prominent */}
          <div
            className={`border p-3 ${
              isAndroid
                ? 'border-[#EEF7C2] bg-[#4EB89B]/20'
                : 'border-[#EEF7C2]/35 bg-[#4EB89B]/10'
            }`}
          >
            <div className="font-bold uppercase tracking-wider mb-1.5 text-[#EEF7C2]">
              {isAndroid ? '1. Android / Chrome (Detected)' : '1. Android / Chrome'}
            </div>
            <ol className="space-y-1.5 text-[#EEF7C2]/90 list-decimal list-inside">
              {isInIframe && (
                <li>
                  Copy the link below and open it directly in <strong>Chrome</strong> (Android blocks app installation inside preview frames).
                </li>
              )}
              <li>
                Tap the Chrome menu (<strong>⋮</strong>) in the top-right corner.
              </li>
              <li>
                Tap <strong>Install app</strong> (or <strong>Add to Home screen &rarr; Install</strong>) to install <strong>1999 AI</strong> as a standalone Android app.
              </li>
            </ol>
          </div>

          {/* iPhone / iOS Safari */}
          <div
            className={`border p-3 ${
              isIOS
                ? 'border-[#EEF7C2] bg-[#4EB89B]/20'
                : 'border-[#EEF7C2]/35 bg-[#4EB89B]/10'
            }`}
          >
            <div className="font-bold uppercase tracking-wider mb-1.5 text-[#EEF7C2]">
              {isIOS ? '2. iPhone / iOS Safari (Detected)' : '2. iPhone / iOS Safari'}
            </div>
            <ol className="space-y-1.5 text-[#EEF7C2]/85 list-decimal list-inside">
              <li>
                Open this URL directly in <strong>Safari</strong> on your iPhone.
              </li>
              <li className="flex items-center gap-1.5 flex-wrap">
                <span>Tap</span>
                <span className="inline-flex items-center gap-1 border border-[#EEF7C2]/50 px-1.5 py-0.5 text-[11px]">
                  <Share className="w-3 h-3" /> Share
                </span>
                <span>then tap</span>
                <span className="inline-flex items-center gap-1 border border-[#EEF7C2]/50 px-1.5 py-0.5 text-[11px]">
                  <PlusSquare className="w-3 h-3" /> Add to Home Screen
                </span>
              </li>
            </ol>
          </div>

          <div className="pt-1">
            <button
              onClick={handleCopyUrl}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 border border-[#EEF7C2]/60 bg-[#0A261E] hover:bg-[#EEF7C2] hover:text-[#0A261E] text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedUrl
                ? 'App Link Copied — Open In Android Chrome!'
                : 'Copy Direct App Link For Android Chrome'}
            </button>
          </div>

          <div className="pt-2 text-center text-[11px] uppercase tracking-widest text-[#EEF7C2]/60">
            MADE BY REN
          </div>
        </div>
      </div>
    </div>
  );
};
