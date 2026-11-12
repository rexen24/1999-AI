import React, { useState } from 'react';
import { Download, X, Smartphone, Share, PlusSquare, Copy, Check, ExternalLink } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { soundEngine } from '../utils/soundEngine';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHARED_APP_URL = 'https://rexen24.github.io/1999-AI/?install=1';

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isInIframe, install } = usePWAInstall();
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!isOpen) return null;

  const directInstallUrl =
    typeof window !== 'undefined' && !isInIframe
      ? window.location.href.split('?')[0].split('#')[0] + '?install=1'
      : SHARED_APP_URL;

  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playKeyClick('Enter');
    try {
      await navigator.clipboard.writeText(directInstallUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDirectInstall = async (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playKeyClick('Enter');
    const accepted = await install();
    if (accepted) {
      onClose();
    }
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#061712]/85 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full max-w-md border-2 border-[#EEF7C2] bg-[#0A261E] text-[#EEF7C2] p-4 sm:p-5 shadow-2xl font-cli my-auto"
      >
        <div className="flex items-center justify-between border-b border-[#EEF7C2]/30 pb-3 mb-3">
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
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundEngine.playKeyClick();
              onClose();
            }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center border border-[#EEF7C2]/40 hover:bg-[#EEF7C2] hover:text-[#0A261E] transition-colors cursor-pointer"
            aria-label="Close installation guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isInstalled ? (
          <div className="border-2 border-[#EEF7C2] bg-[#4EB89B]/25 p-3 text-xs mb-4 font-bold uppercase">
            STATUS: 1999 AI IS ALREADY INSTALLED ON YOUR HOME SCREEN!
          </div>
        ) : isInstallable ? (
          <button
            type="button"
            onClick={handleDirectInstall}
            className="w-full min-h-[54px] mb-4 flex items-center justify-center gap-2.5 bg-[#EEF7C2] text-[#0A261E] font-bold text-sm sm:text-base uppercase tracking-wider hover:bg-[#F7FBE1] active:scale-[0.99] transition-all cursor-pointer shadow-lg"
          >
            <Download className="w-5 h-5" />
            Tap Here To Install 1999 AI Now
          </button>
        ) : isInIframe ? (
          <div className="mb-4 space-y-2">
            <p className="text-xs text-[#EEF7C2]/95 leading-relaxed">
              You are currently inside the preview window. Tap the button below to open <strong>1999 AI</strong> directly in Chrome so Android lets you install it:
            </p>
            <a
              href={SHARED_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => soundEngine.playKeyClick('Enter')}
              className="w-full min-h-[52px] flex items-center justify-center gap-2 bg-[#EEF7C2] text-[#0A261E] font-bold text-xs sm:text-sm uppercase tracking-wider hover:bg-[#F7FBE1] transition-colors cursor-pointer px-3 text-center no-underline"
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span>Tap To Open Direct Install Page</span>
            </a>
          </div>
        ) : null}

        <div className="space-y-3 text-xs border-t border-[#EEF7C2]/25 pt-3">
          {/* Android Instructions */}
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
              <li>
                Make sure this page is open directly in <strong>Chrome</strong> (not inside a preview frame).
              </li>
              <li>
                Tap the <strong>3 dots (⋮)</strong> in the top-right corner of Chrome.
              </li>
              <li>
                Tap <strong>Install app</strong> (or <strong>Add to Home screen &rarr; Install</strong>).
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
              {isIOS ? '2. iPhone / Safari (Detected)' : '2. iPhone / Safari'}
            </div>
            <ol className="space-y-1.5 text-[#EEF7C2]/85 list-decimal list-inside">
              <li>
                Open the link in <strong>Safari</strong> on your iPhone.
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

          <div className="pt-1 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 border border-[#EEF7C2]/60 bg-[#0A261E] hover:bg-[#EEF7C2] hover:text-[#0A261E] text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedUrl ? 'Link Copied — Paste Into Chrome!' : 'Copy Direct App Link'}
            </button>
          </div>

          <div className="pt-1 text-center text-[11px] uppercase tracking-widest text-[#EEF7C2]/60">
            MADE BY REN
          </div>
        </div>
      </div>
    </div>
  );
};
