/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Download } from 'lucide-react';
import {
  soundEngine,
  SlideSpec,
  DecodedSlide,
  ActiveSlideRender,
  formatNumberedListText,
} from './utils/soundEngine';
import { usePWAInstall } from './hooks/usePWAInstall';
import { PWAInstallModal } from './components/PWAInstallModal';
import {
  generateStandaloneQueryResponse,
  generateStandaloneLiveEvent,
  generateStandaloneBootSlides,
  getVoiceBankAudioBase64,
  getCompoundVoiceBankParts,
  findVoiceBankKeyByText,
  synthesizeClientFishAudio,
  loadStandaloneVoiceBank,
  STANDALONE_VOICE_LINES,
  StrictDeviceFormFactor,
} from './utils/standaloneEngine';

type ScreenState = 'BOOTING' | 'IDLE' | 'LISTENING' | 'SEARCHING' | 'FOUND_BELL' | 'SPEAKING';

interface ConversationTurn {
  role: 'user' | 'model';
  text: string;
}

interface BatteryManagerLike extends EventTarget {
  level: number;
  charging: boolean;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
}

interface NetworkInformationLike {
  effectiveType?: string;
  downlink?: number;
  type?: string;
}

interface UADataLike {
  getHighEntropyValues?: (hints: string[]) => Promise<{ model?: string }>;
}

interface PersistentUserProfile {
  userName: string | null;
  visitCount: number;
  lastVisitAt: number | null;
  pastUserTopics: string[];
  userFacts: string[];
  recentSpokenBlacklist: string[];
}

const PROFILE_STORAGE_KEY = '1999ai_user_profile_v1';

const LIVE_BACKEND_ORIGINS = [
  '',
  'https://ais-pre-oefdleqwcby3ljax23rj6l-591783217576.asia-northeast1.run.app',
  'https://ais-dev-oefdleqwcby3ljax23rj6l-591783217576.asia-northeast1.run.app',
];

async function postComputerApi<T>(path: string, body: unknown): Promise<T> {
  const isGitHubPages =
    typeof window !== 'undefined' && /github\.io$/i.test(window.location.hostname);
  const originsToTry = isGitHubPages ? LIVE_BACKEND_ORIGINS.slice(1) : LIVE_BACKEND_ORIGINS;

  for (const origin of originsToTry) {
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), origin ? 9500 : 12000);
      const res = await fetch(`${origin}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      if (res.ok) {
        return (await res.json()) as T;
      }
    } catch {
      // Try next origin
    }
  }
  throw new Error('All backend origins unreachable');
}

function loadPersistentProfile(): PersistentUserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistentUserProfile>;
      return {
        userName: parsed.userName || null,
        visitCount: typeof parsed.visitCount === 'number' ? parsed.visitCount : 0,
        lastVisitAt: typeof parsed.lastVisitAt === 'number' ? parsed.lastVisitAt : null,
        pastUserTopics: Array.isArray(parsed.pastUserTopics) ? parsed.pastUserTopics.slice(0, 6) : [],
        userFacts: Array.isArray(parsed.userFacts) ? parsed.userFacts.slice(0, 10) : [],
        recentSpokenBlacklist: Array.isArray(parsed.recentSpokenBlacklist)
          ? parsed.recentSpokenBlacklist.slice(-40)
          : [],
      };
    }
  } catch {
    // Ignore storage errors
  }
  return {
    userName: null,
    visitCount: 0,
    lastVisitAt: null,
    pastUserTopics: [],
    userFacts: [],
    recentSpokenBlacklist: [],
  };
}

function savePersistentProfile(profile: PersistentUserProfile): void {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage errors
  }
}

function detectDeviceEnvironmentSync(): {
  deviceFormFactor: StrictDeviceFormFactor;
  deviceCategory: string;
  deviceModel: string | null;
  isInstalledApp: boolean;
} {
  const ua = navigator.userAgent || '';
  const maxTouch = navigator.maxTouchPoints || 0;
  const minDim = Math.min(window.screen.width, window.screen.height);
  const maxDim = Math.max(window.screen.width, window.screen.height);
  const dpr = window.devicePixelRatio || 1;
  const coarsePointer = window.matchMedia
    ? window.matchMedia('(pointer: coarse)').matches
    : false;

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  let deviceFormFactor: StrictDeviceFormFactor = 'pc';
  let deviceCategory = 'Desktop PC';
  let deviceModel: string | null = null;

  const isIPad = /iPad/i.test(ua) || (/Macintosh/i.test(ua) && maxTouch > 1);
  const isIPhone = /iPhone|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  if (isIPad) {
    deviceFormFactor = 'tablet';
    deviceCategory = 'iPad Tablet';
  } else if (isIPhone) {
    deviceFormFactor = 'phone';
    deviceCategory = 'iPhone';
  } else if (isAndroid) {
    const isTablet = !/Mobile/i.test(ua) || minDim >= 600;
    deviceFormFactor = isTablet ? 'tablet' : 'phone';
    deviceCategory = isTablet ? 'Android Tablet' : 'Android Phone';
    const match = ua.match(/Android[^;]+;\s*([^;)]+?)(?:\s+Build\/|\))/i);
    if (match && match[1] && match[1].trim() !== 'K') {
      deviceModel = match[1].trim();
    }
  } else if (/CrOS/i.test(ua)) {
    deviceFormFactor = 'laptop';
    deviceCategory = 'Chromebook Laptop';
  } else if (/Windows/i.test(ua)) {
    if (maxTouch > 0 && coarsePointer && maxDim <= 1366) {
      deviceFormFactor = 'tablet';
      deviceCategory = 'Windows Tablet';
    } else if (maxTouch > 0 || (maxDim <= 1728 && dpr >= 1.25)) {
      deviceFormFactor = 'laptop';
      deviceCategory = 'Windows Laptop';
    } else {
      deviceFormFactor = 'pc';
      deviceCategory = 'Windows Desktop PC';
    }
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    if (dpr >= 2 && maxDim <= 1800) {
      deviceFormFactor = 'laptop';
      deviceCategory = 'MacBook Laptop';
    } else {
      deviceFormFactor = 'pc';
      deviceCategory = 'Mac Desktop';
    }
  } else if (/Linux/i.test(ua)) {
    deviceFormFactor = maxDim <= 1600 && dpr >= 1.25 ? 'laptop' : 'pc';
    deviceCategory = deviceFormFactor === 'laptop' ? 'Linux Laptop' : 'Linux Desktop PC';
  }

  return {
    deviceFormFactor,
    deviceCategory,
    deviceModel,
    isInstalledApp: isStandalone,
  };
}

// Show-Accurate Animated Cartoon Yellow Clanging Bell — Large & Bold
const CourageClangingBell: React.FC = () => {
  return (
    <div className="relative flex items-center justify-center w-80 h-80 sm:w-[26rem] sm:h-[26rem] md:w-[30rem] md:h-[30rem] select-none">
      <svg
        viewBox="0 0 240 240"
        className="w-full h-full animate-bell-clang drop-shadow-[0_0_22px_rgba(229,217,36,0.5)]"
      >
        <path
          d="M 54 78 C 36 105, 36 145, 58 176"
          fill="none"
          stroke="#C8BA28"
          strokeWidth="4.5"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M 40 68 C 18 102, 18 152, 46 190"
          fill="none"
          stroke="#C8BA28"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.45"
        />
        <path
          d="M 155 46 C 184 56, 202 82, 204 114"
          fill="none"
          stroke="#C8BA28"
          strokeWidth="4.5"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M 168 34 C 202 46, 220 78, 222 118"
          fill="none"
          stroke="#C8BA28"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.45"
        />

        <g transform="rotate(32 125 120)">
          <path
            d="M 116 32 C 116 22, 134 22, 134 32 L 132 42 L 118 42 Z"
            fill="#C99700"
            stroke="#594300"
            strokeWidth="4"
          />
          <path
            d="M 90 105 C 90 54, 104 40, 125 40 C 146 40, 160 54, 160 105 Z"
            fill="#E5D71A"
            stroke="#594300"
            strokeWidth="4.5"
            strokeLinejoin="round"
          />
          <path
            d="M 90 102 C 74 128, 64 150, 62 162 C 95 176, 155 176, 188 162 C 186 150, 176 128, 160 102 Z"
            fill="#ECD922"
            stroke="#594300"
            strokeWidth="4.5"
            strokeLinejoin="round"
          />
          <ellipse
            cx="125"
            cy="162"
            rx="62"
            ry="22"
            fill="#D4B20C"
            stroke="#594300"
            strokeWidth="4.5"
          />
          <path
            d="M 76 158 C 96 146, 154 146, 174 158"
            fill="none"
            stroke="#7A5900"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle
            cx="114"
            cy="164"
            r="13"
            fill="#F2C811"
            stroke="#594300"
            strokeWidth="4.5"
          />
          <path
            d="M 110 54 C 102 68, 98 88, 96 100"
            fill="none"
            stroke="#FFF89E"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.8"
          />
        </g>
      </svg>
    </div>
  );
};

const RetroSpecimenGraphic: React.FC<{ label: string }> = ({ label }) => {
  const upper = label.toUpperCase();
  const isMonsterOrAswang =
    upper.includes('ASWANG') ||
    upper.includes('MANANANGGAL') ||
    upper.includes('TIKBALANG') ||
    upper.includes('KAPRE') ||
    upper.includes('TIYANAK') ||
    upper.includes('VAMPIRE') ||
    upper.includes('WEREWOLF') ||
    upper.includes('MONSTER') ||
    upper.includes('GHOST') ||
    upper.includes('DEMON') ||
    upper.includes('ZOMBIE') ||
    upper.includes('ALIEN');
  const isCat =
    upper.includes('CAT') ||
    upper.includes('FELINE') ||
    upper.includes('KITTEN') ||
    upper.includes('LION') ||
    upper.includes('TIGER');
  const isDog =
    upper.includes('DOG') ||
    upper.includes('CANINE') ||
    upper.includes('PUP') ||
    upper.includes('WOLF') ||
    upper.includes('FOX');
  const isAquatic =
    upper.includes('SHARK') ||
    upper.includes('WHALE') ||
    upper.includes('FISH') ||
    upper.includes('DOLPHIN') ||
    upper.includes('OCTOPUS');
  const isCrawly =
    upper.includes('SPIDER') ||
    upper.includes('SNAKE') ||
    upper.includes('COBRA') ||
    upper.includes('BUG') ||
    upper.includes('ROACH') ||
    upper.includes('SCORPION');

  return (
    <svg
      viewBox="0 0 120 90"
      className="w-full h-full stroke-[#F3F89D] fill-none"
      strokeWidth="2.4"
    >
      {/* Animated CRT Radar / Target Sweep Ring */}
      <circle
        cx="60"
        cy="45"
        r="39"
        strokeDasharray="6 4"
        className="origin-center animate-[spin_9s_linear_infinite] opacity-40"
      />
      {isMonsterOrAswang ? (
        <g className="animate-pulse">
          {/* Bat/Folklore Wings */}
          <path d="M60,44 C38,16 14,20 8,42 C18,40 26,46 32,54 C42,48 50,50 60,44 Z" fill="#F3F89D" fillOpacity="0.2" />
          <path d="M60,44 C82,16 106,20 112,42 C102,40 94,46 88,54 C78,48 70,50 60,44 Z" fill="#F3F89D" fillOpacity="0.2" />
          {/* Head & Horns/Ears */}
          <polygon points="42,34 36,12 50,24 70,24 84,12 78,34 82,64 38,64" fill="#0A261E" />
          {/* Glowing Eyes */}
          <polygon points="45,38 55,42 46,45" fill="#F3F89D" />
          <polygon points="75,38 65,42 74,45" fill="#F3F89D" />
          {/* Fangs */}
          <line x1="46" y1="54" x2="74" y2="54" />
          <polygon points="49,54 52,63 55,54" fill="#F3F89D" />
          <polygon points="65,54 68,63 71,54" fill="#F3F89D" />
        </g>
      ) : isAquatic ? (
        <g className="animate-bounce">
          <path d="M16,48 C34,28 74,28 102,45 C74,62 34,62 16,48 Z" />
          <polygon points="52,33 62,14 68,34" fill="#F3F89D" />
          <polygon points="100,45 114,32 110,45 114,58" fill="#F3F89D" />
          <circle cx="34" cy="44" r="3" fill="#F3F89D" />
          <polyline points="24,52 29,49 34,53 39,49 44,53" />
        </g>
      ) : isCrawly ? (
        <g className="animate-pulse">
          <ellipse cx="60" cy="48" rx="14" ry="18" />
          <circle cx="60" cy="26" r="8" />
          <circle cx="57" cy="24" r="2" fill="#F3F89D" />
          <circle cx="63" cy="24" r="2" fill="#F3F89D" />
          <polyline points="46,38 24,26 14,36" />
          <polyline points="46,46 20,44 10,54" />
          <polyline points="46,54 24,62 16,74" />
          <polyline points="74,38 96,26 106,36" />
          <polyline points="74,46 100,44 110,54" />
          <polyline points="74,54 96,62 104,74" />
        </g>
      ) : isCat ? (
        <g className="animate-bounce">
          <polygon points="30,38 24,14 44,26 76,26 96,14 90,38 94,66 26,66" />
          <circle cx="44" cy="45" r="4" fill="#F3F89D" />
          <circle cx="76" cy="45" r="4" fill="#F3F89D" />
          <polygon points="56,53 64,53 60,58" fill="#F3F89D" />
          <line x1="12" y1="48" x2="32" y2="51" />
          <line x1="12" y1="56" x2="32" y2="56" />
          <line x1="108" y1="48" x2="88" y2="51" />
          <line x1="108" y1="56" x2="88" y2="56" />
        </g>
      ) : isDog ? (
        <g className="animate-bounce">
          <rect x="32" y="24" width="56" height="46" rx="8" />
          <path d="M32,28 C16,28 14,54 26,56 L32,44" fill="#F3F89D" />
          <path d="M88,28 C104,28 106,54 94,56 L88,44" fill="#F3F89D" />
          <ellipse cx="47" cy="42" rx="6" ry="8" />
          <ellipse cx="73" cy="42" rx="6" ry="8" />
          <circle cx="47" cy="43" r="2.5" fill="#F3F89D" />
          <circle cx="73" cy="43" r="2.5" fill="#F3F89D" />
          <ellipse cx="60" cy="54" rx="7" ry="4.5" fill="#F3F89D" />
        </g>
      ) : (
        <g className="animate-pulse">
          <rect x="18" y="12" width="84" height="66" strokeDasharray="4 3" />
          <circle cx="60" cy="45" r="22" />
          <line x1="60" y1="16" x2="60" y2="74" />
          <line x1="30" y1="45" x2="90" y2="45" />
          <circle cx="60" cy="45" r="5" fill="#F3F89D" />
        </g>
      )}
    </svg>
  );
};

const SpecimenPhotoBox: React.FC<{
  imageUrl: string | null;
  label: string;
  className?: string;
}> = ({ imageUrl, label, className = 'w-28 h-24 sm:w-40 sm:h-32' }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [opticMode, setOpticMode] = useState<'PHOSPHOR' | 'COLOR' | 'XRAY'>('PHOSPHOR');

  useEffect(() => {
    setImgFailed(false);
  }, [imageUrl]);

  const filterClass =
    opticMode === 'PHOSPHOR'
      ? 'crt-photo-filter'
      : opticMode === 'XRAY'
      ? 'invert contrast-150 grayscale brightness-110'
      : 'contrast-125 saturate-110 brightness-95';

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        soundEngine.playKeyClick('Enter');
        setOpticMode((prev) =>
          prev === 'PHOSPHOR' ? 'COLOR' : prev === 'COLOR' ? 'XRAY' : 'PHOSPHOR'
        );
      }}
      title="Tap specimen to cycle 1999 CRT optical mode"
      className={`relative border-2 border-[#F3F89D] bg-[#0A261E]/70 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer group ${className}`}
    >
      {imageUrl && !imgFailed ? (
        <img
          src={imageUrl}
          alt={label}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className={`w-full h-full object-cover transition-all duration-150 ${filterClass}`}
        />
      ) : (
        <div className="w-full h-full p-2 flex items-center justify-center">
          <RetroSpecimenGraphic label={label} />
        </div>
      )}
      {/* Animated CRT Scanner Laser Sweep Overlay */}
      <div className="absolute inset-x-0 top-0 h-1 bg-[#F3F89D]/60 animate-[ping_2.4s_ease-in-out_infinite] pointer-events-none" />
      <div className="absolute inset-0 crt-scanlines pointer-events-none" />
      {/* Optical Mode Readout Tag */}
      <div className="absolute bottom-0.5 right-1 bg-[#0A261E]/85 px-1 text-[9px] sm:text-[10px] font-cmd uppercase phosphor-text pointer-events-none">
        {opticMode}
      </div>
      {/* Corner Targeting Brackets */}
      <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-[#F3F89D] pointer-events-none" />
      <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-[#F3F89D] pointer-events-none" />
      <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-[#F3F89D] pointer-events-none" />
      <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-[#F3F89D] pointer-events-none" />
    </div>
  );
};

/**
 * Breaks a long sentence into short, punchy 30-55 character visual pages at natural clause boundaries
 * so that while the Computer speaks a long sentence, the CRT screen displays each clause in HUGE
 * show-accurate letters that flip right as his voice reaches the next clause!
 */
function getLiveHugeDisplayChunk(
  typedText: string,
  fullText: string,
  maxCharsPerScreen = 54
): { chunkTyped: string; chunkFullLen: number } {
  const cleanFull = fullText || typedText || '';
  if (cleanFull.length <= maxCharsPerScreen) {
    return { chunkTyped: typedText, chunkFullLen: cleanFull.length };
  }

  // Split fullText into visual pages of ~25..maxCharsPerScreen chars at clause/word boundaries
  const pages: Array<{ start: number; end: number }> = [];
  let cursor = 0;

  while (cursor < cleanFull.length) {
    const remaining = cleanFull.length - cursor;
    if (remaining <= maxCharsPerScreen) {
      pages.push({ start: cursor, end: cleanFull.length });
      break;
    }

    const windowSlice = cleanFull.slice(cursor, cursor + maxCharsPerScreen);
    let splitOffset = -1;

    // 1. Prefer splitting right after sentence/clause punctuation (. ? ! ; : — ,)
    const punctMatches = [...windowSlice.matchAll(/([.?!;:—]+|\.{2,}|,)\s+/g)];
    for (const m of punctMatches) {
      const candidateEnd = (m.index ?? 0) + m[0].length;
      if (candidateEnd >= 18) {
        splitOffset = candidateEnd;
      }
    }

    // 2. Otherwise split at the last space before maxCharsPerScreen
    if (splitOffset === -1) {
      const lastSpace = windowSlice.lastIndexOf(' ');
      splitOffset = lastSpace >= 16 ? lastSpace + 1 : maxCharsPerScreen;
    }

    pages.push({ start: cursor, end: cursor + splitOffset });
    cursor += splitOffset;
  }

  const typedLen = typedText.length;
  let activePage = pages[0];
  for (const p of pages) {
    if (typedLen > p.start) {
      activePage = p;
    }
  }

  const chunkTyped = typedText.slice(activePage.start).replace(/^\s+/, '');
  const chunkFullLen = Math.max(1, activePage.end - activePage.start);
  return { chunkTyped, chunkFullLen };
}

/**
 * Formats GIANT punchlines (like "I DON'T KNOW\n\nYOU'RE ON YOUR\nOWN, KID:)")
 * to match the exact line wrapping and huge screen-filling ratio from the show screenshot!
 */
function formatShowGiantText(text: string): string {
  return text.replace(
    /YOU'RE ON YOUR\s+OWN,\s*KID:\)/gi,
    "YOU'RE ON YOUR\nOWN, KID:)"
  );
}

export default function App() {
  const [screenState, setScreenState] = useState<ScreenState>('BOOTING');
  const [plainScreenText, setPlainScreenText] = useState<string>('YOU\nTWIT');
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [activeSlide, setActiveSlide] = useState<ActiveSlideRender | null>(null);
  const [micEnabled, setMicEnabled] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // User typing in the bottom-left using the Computer's own font — hides the Computer's center text while typing!
  const [userDraft, setUserDraft] = useState<string>('');
  const [lastReplySlides, setLastReplySlides] = useState<DecodedSlide[] | null>(null);

  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [installModalOpen, setInstallModalOpen] = useState<boolean>(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  const { isInstallable, isInstalled, install } = usePWAInstall();

  const hiddenCmdInputRef = useRef<HTMLInputElement | null>(null);
  const userDraftScrollRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micPermissionPromiseRef = useRef<Promise<MediaStream | null> | null>(null);
  const vadCtxRef = useRef<AudioContext | null>(null);
  const vadAnalyserRef = useRef<AnalyserNode | null>(null);
  const vadRafRef = useRef<number | null>(null);
  const speechRecRef = useRef<{ stop: () => void } | null>(null);
  const liveSpeechTranscriptRef = useRef<string>('');
  const audioChunksRef = useRef<Blob[]>([]);
  const micEnabledRef = useRef<boolean>(true);
  const isMutedRef = useRef<boolean>(false);
  const micTurnedOffWhileMutedRef = useRef<boolean>(false);
  const micUserSpeakingNowRef = useRef<boolean>(false);
  const micSpokeInSessionRef = useRef<boolean>(false);
  const startVoiceSessionRef = useRef<() => void>(() => {});
  const historyRef = useRef<ConversationTurn[]>([]);
  const screenStateRef = useRef<ScreenState>('BOOTING');
  const userDraftRef = useRef<string>('');
  const bootHasRunRef = useRef<boolean>(false);

  // Deep Device, Identity & Behavioral Forensics Refs
  const profileRef = useRef<PersistentUserProfile>(loadPersistentProfile());
  const minutesSinceLastVisitRef = useRef<number | null>(null);
  const initialBatteryRef = useRef<number | null>(null);
  const inputMethodRef = useRef<'touchscreen' | 'mouse'>(
    navigator.maxTouchPoints > 0 ? 'touchscreen' : 'mouse'
  );
  const touchStartYRef = useRef<number | null>(null);
  const sessionStartTimeRef = useRef<number>(Date.now());
  const turnCountRef = useRef<number>(0);
  const replayClickCountRef = useRef<number>(0);
  const hiddenTimestampRef = useRef<number | null>(null);
  const lastAwaySecondsRef = useRef<number | null>(null);
  const distractionCountRef = useRef<number>(0);
  const idleStareStageRef = useRef<number>(0);
  const liveEventInFlightRef = useRef<boolean>(false);
  const lastLiveEventTimeRef = useRef<number>(0);
  const backspaceCountRef = useRef<number>(0);
  const peakDraftRef = useRef<string>('');
  const erasedBeforeSendRef = useRef<string | null>(null);
  const typingStartTimeRef = useRef<number | null>(null);
  const wasPastedRef = useRef<boolean>(false);
  const chickenOutTimerRef = useRef<number | null>(null);
  const typingFreezeTimerRef = useRef<number | null>(null);
  const screenHoldTimerRef = useRef<number | null>(null);
  const screenTapTimestampsRef = useRef<number[]>([]);
  const lastTouchOrClickTimeRef = useRef<number>(0);
  const lastKeystrokeTimeRef = useRef<number>(0);
  const actionEpochRef = useRef<number>(0);
  const pendingUnmuteEventRef = useRef<string | null>(null);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const updateScreenState = useCallback((next: ScreenState) => {
    screenStateRef.current = next;
    setScreenState(next);
  }, []);

  useEffect(() => {
    screenStateRef.current = screenState;
  }, [screenState]);

  useEffect(() => {
    userDraftRef.current = userDraft;
    if (userDraftScrollRef.current) {
      userDraftScrollRef.current.scrollTop = userDraftScrollRef.current.scrollHeight;
    }
  }, [userDraft]);

  // Helper to record spoken lines, detected user names, and personal user facts into persistent storage
  const recordModelOutputToProfile = useCallback(
    (
      spokenText: string,
      userQuery?: string,
      detectedUserName?: string | null,
      extractedUserFact?: string | null
    ) => {
      const p = profileRef.current;
      if (detectedUserName && detectedUserName.trim()) {
        p.userName = detectedUserName.trim();
      }
      if (userQuery && userQuery.trim().length >= 4) {
        const cleanQ = userQuery.trim().slice(0, 60);
        p.pastUserTopics = [cleanQ, ...p.pastUserTopics.filter((q) => q !== cleanQ)].slice(0, 6);
      }
      const candidateFact =
        extractedUserFact && extractedUserFact.trim()
          ? extractedUserFact.trim().slice(0, 90)
          : userQuery &&
            /\b(i\s+(?:am|feel|stayed|failed|hate|love|like|work|study|play|ate|lost|broke|need|want|can't|cannot)|my\s+(?:gf|bf|girlfriend|boyfriend|crush|ex|mom|dad|friend|friends|job|school|life|grades|exam|test))\b/i.test(
              userQuery
            )
          ? userQuery.trim().slice(0, 90)
          : null;
      if (candidateFact) {
        p.userFacts = [
          candidateFact,
          ...(p.userFacts || []).filter((f) => f.toLowerCase() !== candidateFact.toLowerCase()),
        ].slice(0, 10);
      }
      if (spokenText && spokenText.trim()) {
        p.recentSpokenBlacklist = [...p.recentSpokenBlacklist, spokenText.trim()].slice(-40);
      }
      p.lastVisitAt = Date.now();
      savePersistentProfile(p);
    },
    []
  );

  // Gather comprehensive real-time device, environmental & typing forensics telemetry
  const gatherLivePhoneTelemetry = useCallback(async (submittedText?: string) => {
    const now = new Date();
    const localTime = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const dayOfWeek = now.toLocaleDateString([], { weekday: 'long' });
    const hour = now.getHours();
    const timeOfDay =
      hour < 5
        ? 'late night'
        : hour < 12
        ? 'morning'
        : hour < 17
        ? 'afternoon'
        : hour < 22
        ? 'evening'
        : 'late night';

    const systemLanguage = navigator.language || 'en-US';
    const osDarkMode = window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true;
    const cpuCores = navigator.hardwareConcurrency || null;
    const ramGb =
      (navigator as Navigator & { deviceMemory?: number }).deviceMemory || null;
    const screenResolution = `${window.screen.width}x${window.screen.height}`;

    let batteryPercent: number | null = null;
    let isCharging: boolean | null = null;
    let hasBattery = false;

    try {
      const nav = navigator as Navigator & {
        getBattery?: () => Promise<BatteryManagerLike & { dischargingTime?: number; chargingTime?: number }>;
      };
      if (typeof nav.getBattery === 'function') {
        const bat = await nav.getBattery();
        batteryPercent = Math.round(bat.level * 100);
        isCharging = Boolean(bat.charging);
        // On desktop PCs without a battery, Chrome often reports charging=true, level=1, chargingTime=0, dischargingTime=Infinity
        hasBattery =
          !bat.charging ||
          bat.level < 1 ||
          (typeof bat.dischargingTime === 'number' && bat.dischargingTime !== Infinity) ||
          (typeof bat.chargingTime === 'number' && bat.chargingTime > 0 && bat.chargingTime !== Infinity);
        if (initialBatteryRef.current === null) {
          initialBatteryRef.current = batteryPercent;
        }
      }
    } catch {
      // Ignore
    }

    const batteryDroppedBy =
      initialBatteryRef.current !== null &&
      batteryPercent !== null &&
      initialBatteryRef.current > batteryPercent
        ? initialBatteryRef.current - batteryPercent
        : 0;

    const syncEnv = detectDeviceEnvironmentSync();
    let deviceFormFactor: StrictDeviceFormFactor = syncEnv.deviceFormFactor;
    let deviceCategory = syncEnv.deviceCategory;
    let deviceModel = syncEnv.deviceModel;

    // Refine Laptop vs Desktop PC using live battery telemetry
    if (deviceFormFactor === 'pc' && hasBattery) {
      deviceFormFactor = 'laptop';
      if (deviceCategory.includes('Windows')) deviceCategory = 'Windows Laptop';
      else if (deviceCategory.includes('Mac')) deviceCategory = 'MacBook Laptop';
      else if (deviceCategory.includes('Linux')) deviceCategory = 'Linux Laptop';
      else deviceCategory = 'Laptop Computer';
    }
    if (deviceFormFactor === 'phone' || deviceFormFactor === 'tablet') {
      hasBattery = true;
    }

    try {
      const uaData = (navigator as Navigator & { userAgentData?: UADataLike }).userAgentData;
      if (!deviceModel && uaData && typeof uaData.getHighEntropyValues === 'function') {
        const highEntropy = await uaData.getHighEntropyValues(['model']);
        if (highEntropy.model && highEntropy.model.trim()) {
          deviceModel = highEntropy.model.trim();
        }
      }
    } catch {
      // Ignore
    }

    const navConn = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
    const connectionType = navConn
      ? `${(navConn.type || navConn.effectiveType || 'wireless').toUpperCase()}`
      : undefined;

    const isPortrait = window.innerHeight >= window.innerWidth;
    const orientation = isPortrait ? 'Portrait' : 'Landscape';

    const awaySecs = lastAwaySecondsRef.current;
    lastAwaySecondsRef.current = null;

    // Calculate real-time typing forensics for this message
    const currentBackspaces = backspaceCountRef.current;
    const wasPasted = wasPastedRef.current;
    const deletedDraftBefore = erasedBeforeSendRef.current;

    let typingDurationSec: number | null = null;
    let typingSpeedWpm: number | null = null;
    if (typingStartTimeRef.current && submittedText) {
      typingDurationSec = Math.max(1, Math.round((Date.now() - typingStartTimeRef.current) / 1000));
      const wordEstimate = submittedText.trim().length / 5;
      typingSpeedWpm = Math.round((wordEstimate / typingDurationSec) * 60);
    }

    const lettersOnly = (submittedText || '').replace(/[^a-zA-Z]/g, '');
    const isAllCaps =
      lettersOnly.length >= 5 && lettersOnly === lettersOnly.toUpperCase();

    // Reset per-message typing counters
    backspaceCountRef.current = 0;
    peakDraftRef.current = '';
    erasedBeforeSendRef.current = null;
    typingStartTimeRef.current = null;
    wasPastedRef.current = false;

    const currentReplays = replayClickCountRef.current;
    replayClickCountRef.current = 0;

    turnCountRef.current += 1;
    const sessionMinutes = Math.round((Date.now() - sessionStartTimeRef.current) / 60000);
    const p = profileRef.current;

    return {
      localTime,
      dayOfWeek,
      timeOfDay,
      systemLanguage,
      osDarkMode,
      cpuCores,
      ramGb,
      screenResolution,
      inputMethod:
        deviceFormFactor === 'phone' || deviceFormFactor === 'tablet'
          ? ('touchscreen' as const)
          : inputMethodRef.current,
      batteryPercent: hasBattery ? batteryPercent : null,
      batteryDroppedBy: hasBattery ? batteryDroppedBy : 0,
      isCharging: hasBattery ? isCharging : null,
      hasBattery,
      deviceFormFactor,
      deviceCategory,
      deviceModel,
      isInstalledApp: syncEnv.isInstalledApp,
      connectionType,
      orientation,
      lastAwaySeconds: awaySecs,
      backspaceCount: currentBackspaces,
      typingSpeedWpm,
      typingDurationSec,
      wasPasted,
      isAllCaps,
      deletedDraftBefore,
      sessionMinutes,
      turnCount: turnCountRef.current,
      distractionCount: distractionCountRef.current,
      replayCount: currentReplays,
      visitCount: p.visitCount,
      minutesSinceLastVisit: minutesSinceLastVisitRef.current,
      userName: p.userName,
      pastUserTopics: p.pastUserTopics,
      userFacts: p.userFacts,
      recentSpokenBlacklist: p.recentSpokenBlacklist,
    };
  }, []);

  // Track Android visualViewport height so when Gboard pops up, bottom-left typing stays right above the keyboard!
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handleResize = () => {
      setViewportHeight(vv.height);
    };
    handleResize();
    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleResize);
    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleResize);
    };
  }, []);

  const createDecodedSlidePromises = useCallback(
    (slides: SlideSpec[]): Array<Promise<DecodedSlide>> => {
      return slides.map(async (slide) => {
        // 1. Check if this slide is a compound stitched voice-bank slide ("prefix_X+clause_Y")
        if (slide.ttsId && slide.ttsId.includes('+')) {
          const compoundParts = await getCompoundVoiceBankParts(slide.ttsId);
          if (compoundParts && compoundParts.length >= 2) {
            const { buffer: audioBuffer, envelope } =
              await soundEngine.decodeCompoundAudioWithEnvelope(compoundParts, slide.ttsId);
            return {
              ...slide,
              audioBuffer,
              audioBase64: compoundParts[0],
              audioMimeType: 'audio/mpeg',
              envelope,
            };
          }
        }

        // 2. Check if this slide's ttsId OR exact text matches our local 280-clip Simon Prebble voice bank (instant 0ms lookup!)
        const matchedTextKey = findVoiceBankKeyByText(slide.text);
        const isKnownBankKey = Boolean(
          (slide.ttsId &&
            Object.prototype.hasOwnProperty.call(STANDALONE_VOICE_LINES, slide.ttsId)) ||
            matchedTextKey
        );
        let audioBase64: string | null = null;
        let audioMimeType = 'audio/mpeg';
        const resolvedText = slide.text;
        const resolvedTtsId = matchedTextKey || slide.ttsId;

        if (isKnownBankKey) {
          audioBase64 = await getVoiceBankAudioBase64(resolvedTtsId, resolvedText);
        }

        // 3. Otherwise (dynamic answer slide), fetch exact spoken audio from live TTS backend (with up to 3 attempts)
        if (!audioBase64) {
          for (let attempt = 0; attempt < 3 && !audioBase64; attempt++) {
            const ttsRes = await postComputerApi<{
              audioBase64?: string | null;
              audioMimeType?: string | null;
            }>('/api/tts', { ttsId: resolvedTtsId, text: resolvedText }).catch(() => ({
              audioBase64: null,
              audioMimeType: null,
            }));
            audioBase64 = ttsRes?.audioBase64 || null;
            if (ttsRes?.audioMimeType) {
              audioMimeType = ttsRes.audioMimeType;
            }
            if (!audioBase64 && attempt < 2) {
              await new Promise((r) => setTimeout(r, 280));
            }
          }
          // 4. If backend /api/tts is unreachable (e.g. on static GitHub Pages), synthesize exact text via client Fish Audio!
          // NEVER overwrite resolvedText with a saved voice-bank line so he ALWAYS says and displays the real answer!
          if (!audioBase64) {
            audioBase64 = await synthesizeClientFishAudio(resolvedText);
          }
        }

        const { buffer: audioBuffer, envelope } = await soundEngine.decodeAudioWithEnvelope(
          audioBase64,
          resolvedTtsId || resolvedText
        );

        return {
          ...slide,
          text: resolvedText,
          ttsId: resolvedTtsId,
          audioBuffer,
          audioBase64,
          audioMimeType,
          envelope,
        };
      });
    },
    []
  );

  // Pauses the active MediaRecorder/VAD without EVER calling track.stop() so the browser never asks for permission twice!
  const stopMicHardware = useCallback(() => {
    micUserSpeakingNowRef.current = false;
    if (vadRafRef.current !== null) {
      cancelAnimationFrame(vadRafRef.current);
      vadRafRef.current = null;
    }
    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {
        // Ignore
      }
      speechRecRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore
      }
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = false;
      });
    }
  }, []);

  // Acquires the microphone MediaStream ONCE and reuses it for the entire session so it never prompts twice!
  const ensurePersistentMicStream = useCallback(async (): Promise<MediaStream | null> => {
    if (
      micStreamRef.current &&
      micStreamRef.current.active &&
      micStreamRef.current.getAudioTracks().some((t) => t.readyState === 'live')
    ) {
      micStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = true;
      });
      return micStreamRef.current;
    }

    if (micPermissionPromiseRef.current) {
      return micPermissionPromiseRef.current;
    }

    const reqPromise = (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        micStreamRef.current = stream;

        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const vadCtx = new AudioCtx();
        const source = vadCtx.createMediaStreamSource(stream);
        const analyser = vadCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        vadCtxRef.current = vadCtx;
        vadAnalyserRef.current = analyser;
        return stream;
      } catch {
        return null;
      } finally {
        micPermissionPromiseRef.current = null;
      }
    })();

    micPermissionPromiseRef.current = reqPromise;
    return reqPromise;
  }, []);

  // Unified Live Situational Awareness Trigger:
  // STRICT RULE: Only works when the Computer is NOT already speaking/searching/booting,
  // and NEVER overlaps with user typing or another active speech sequence!
  const triggerLiveAwarenessEvent = useCallback(
    async (
      eventType: string,
      options?: {
        awaySeconds?: number;
        extraDetail?: string;
        allowInterruptSpeaking?: boolean;
        clearFrozenDraft?: boolean;
      }
    ) => {
      // While muted, never speak out loud! If they turned the mic off while muted, remember it so he roasts them right after they unmute him!
      if (isMutedRef.current) {
        if (eventType === 'MIC_GHOSTED') {
          micTurnedOffWhileMutedRef.current = true;
        }
        return;
      }

      if (liveEventInFlightRef.current || micUserSpeakingNowRef.current) return;
      if (!options?.clearFrozenDraft && userDraftRef.current.length > 0) return;

      // Never trigger while the Computer is already speaking, searching, ringing the bell, or booting!
      const currentSt = screenStateRef.current;
      if (currentSt !== 'IDLE' && currentSt !== 'LISTENING') {
        return;
      }

      const now = Date.now();
      const isScreenTouchSensor =
        eventType === 'SCREEN_POKING' ||
        eventType === 'SCREEN_HOLD' ||
        eventType === 'SWIPE_SCROLL_ATTEMPT' ||
        eventType === 'ZOOM_ATTEMPT';

      // If the user was typing within the last 3.5 seconds, ignore screen tap/hold/swipe sensors so typing+tapping never collides!
      if (isScreenTouchSensor && now - lastKeystrokeTimeRef.current < 3500) {
        return;
      }

      const isUnmuteOrMicSensor =
        eventType === 'UNMUTED_AFTER_MIC_OFF' ||
        eventType === 'MUTE_TOGGLE_CAUGHT' ||
        eventType === 'MIC_GHOSTED';

      const isUserInitiatedSensor =
        isScreenTouchSensor ||
        isUnmuteOrMicSensor ||
        eventType === 'BIOMETRIC_SCAN' ||
        eventType === 'DEVICE_SHAKE' ||
        eventType === 'CHARGER_CHANGED' ||
        eventType === 'ORIENTATION_CHANGED' ||
        eventType === 'COPY_ATTEMPT' ||
        eventType === 'DEVTOOLS_ATTEMPT' ||
        eventType === 'TAB_OR_NOTIFICATION_RETURN' ||
        eventType === 'TYPING_CHICKENED_OUT' ||
        eventType === 'TYPING_FROZEN' ||
        eventType === 'REPLAY_OBSESSION';

      const minCooldownMs = isUnmuteOrMicSensor ? 0 : isUserInitiatedSensor ? 2200 : 12000;
      if (now - lastLiveEventTimeRef.current < minCooldownMs) {
        return;
      }

      const myEpoch = ++actionEpochRef.current;
      liveEventInFlightRef.current = true;
      lastLiveEventTimeRef.current = now;
      stopMicHardware();
      soundEngine.stopVoice();

      try {
        const deviceInfo = await gatherLivePhoneTelemetry();
        if (actionEpochRef.current !== myEpoch) return;

        const data = await postComputerApi<{ spokenText?: string; slides?: SlideSpec[] }>(
          '/api/boot',
          {
            reason: 'LIVE_EVENT',
            eventType,
            awaySeconds: options?.awaySeconds ?? 6,
            distractionCount: distractionCountRef.current,
            deviceInfo,
            extraDetail: options?.extraDetail || '',
            history: historyRef.current,
          }
        ).catch(() =>
          generateStandaloneLiveEvent(
            eventType,
            options?.awaySeconds ?? 6,
            distractionCountRef.current,
            deviceInfo,
            options?.extraDetail || ''
          )
        );

        if (actionEpochRef.current !== myEpoch) return;

        if (Array.isArray(data.slides) && data.slides.length > 0) {
          if (!options?.clearFrozenDraft && userDraftRef.current.length > 0) {
            return;
          }
          const slidePromises = createDecodedSlidePromises(data.slides);
          await slidePromises[0];

          if (actionEpochRef.current !== myEpoch) return;

          if (options?.clearFrozenDraft) {
            setUserDraft('');
            userDraftRef.current = '';
          } else if (userDraftRef.current.length > 0) {
            return;
          }

          const spoken =
            data.spokenText || data.slides.map((s: { text: string }) => s.text).join(' ');
          recordModelOutputToProfile(spoken);
          setHistory((prev) => [...prev.slice(-10), { role: 'model', text: spoken }]);
          updateScreenState('SPEAKING');
          await soundEngine.playSlidePromisesSequentially(slidePromises, {
            onSlideRender: (rendered) => {
              if (actionEpochRef.current === myEpoch) {
                setActiveSlide({ ...rendered });
              }
            },
            onAllComplete: (resolved) => {
              if (actionEpochRef.current !== myEpoch) return;
              setLastReplySlides(resolved);
              updateScreenState('IDLE');
              if (micEnabledRef.current && userDraftRef.current.length === 0) {
                startVoiceSessionRef.current();
              }
            },
          });
        }
      } catch {
        // Ignore transient network errors
      } finally {
        if (actionEpochRef.current === myEpoch) {
          liveEventInFlightRef.current = false;
        } else {
          liveEventInFlightRef.current = false;
        }
      }
    },
    [
      createDecodedSlidePromises,
      gatherLivePhoneTelemetry,
      recordModelOutputToProfile,
      stopMicHardware,
      updateScreenState,
    ]
  );

  // Hands-Free Persistent Voice Capture + Automatic Silence Detection
  // - Reuses a single persistent MediaStream so the browser NEVER asks twice for permission!
  // - Also runs browser SpeechRecognition in parallel so static GitHub Pages transcribes exact spoken words!
  const startVoiceCaptureSession = useCallback(async () => {
    if (!micEnabledRef.current || userDraftRef.current.length > 0 || liveEventInFlightRef.current) {
      return;
    }
    if (
      screenStateRef.current === 'SEARCHING' ||
      screenStateRef.current === 'FOUND_BELL' ||
      screenStateRef.current === 'SPEAKING' ||
      screenStateRef.current === 'BOOTING'
    ) {
      return;
    }

    stopMicHardware();

    const stream = await ensurePersistentMicStream();
    if (
      !stream ||
      !micEnabledRef.current ||
      userDraftRef.current.length > 0 ||
      screenStateRef.current !== 'IDLE'
    ) {
      return;
    }

    stream.getAudioTracks().forEach((t) => {
      t.enabled = true;
    });

    try {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      liveSpeechTranscriptRef.current = '';

      // Start parallel browser SpeechRecognition if available (for GitHub Pages static voice transcription!)
      try {
        const SpeechRec =
          (window as unknown as { SpeechRecognition?: new () => unknown }).SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: new () => unknown })
            .webkitSpeechRecognition;
        if (SpeechRec) {
          const rec = new SpeechRec() as {
            continuous: boolean;
            interimResults: boolean;
            lang: string;
            onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
            onerror: (() => void) | null;
            start: () => void;
            stop: () => void;
          };
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = navigator.language || 'en-US';
          rec.onresult = (e) => {
            let text = '';
            for (let i = 0; i < e.results.length; i++) {
              text += e.results[i][0]?.transcript || '';
            }
            if (text.trim()) {
              liveSpeechTranscriptRef.current = text.trim();
            }
          };
          rec.onerror = () => {};
          rec.start();
          speechRecRef.current = rec;
        }
      } catch {
        // Ignore if SpeechRecognition is unsupported
      }

      const vadCtx = vadCtxRef.current;
      const analyser = vadAnalyserRef.current;
      if (vadCtx && vadCtx.state === 'suspended') {
        await vadCtx.resume().catch(() => {});
      }
      const dataArray = new Uint8Array(analyser ? analyser.frequencyBinCount : 256);

      let hasSpoken = false;
      let consecutiveVoiceFrames = 0;
      let speechStartTime = 0;
      let lastVoiceTime = performance.now();
      const sessionStartTime = performance.now();

      const checkVoiceActivity = () => {
        if (
          !micEnabledRef.current ||
          mediaRecorder.state !== 'recording' ||
          userDraftRef.current.length > 0 ||
          liveEventInFlightRef.current ||
          (screenStateRef.current !== 'IDLE' && screenStateRef.current !== 'LISTENING')
        ) {
          return;
        }

        if (vadCtx && vadCtx.state === 'suspended') {
          vadCtx.resume().catch(() => {});
        }

        if (analyser) {
          analyser.getByteTimeDomainData(dataArray);
        }
        let sumSquares = 0;
        let peakDeviation = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const norm = (dataArray[i] - 128) / 128;
          sumSquares += norm * norm;
          const absNorm = Math.abs(norm);
          if (absNorm > peakDeviation) peakDeviation = absNorm;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        const now = performance.now();

        // Ignore brief mechanical thumps caused by tapping/touching the phone screen or typing on the keyboard!
        const isRecentScreenTap = now - lastTouchOrClickTimeRef.current < 500;
        const isRecentKeystroke = Date.now() - lastKeystrokeTimeRef.current < 2500;
        if (!isRecentScreenTap && !isRecentKeystroke && rms > 0.028 && peakDeviation > 0.085) {
          consecutiveVoiceFrames += 1;
          // Require 6 consecutive frames (~100ms) of sustained vocal energy before triggering LISTENING
          if (consecutiveVoiceFrames >= 6) {
            if (!hasSpoken) {
              hasSpoken = true;
              micUserSpeakingNowRef.current = true;
              micSpokeInSessionRef.current = true;
              speechStartTime = now;
              setActiveSlide(null);
              updateScreenState('LISTENING');
              setPlainScreenText('LISTENING...');
            }
            lastVoiceTime = now;
          }
        } else {
          consecutiveVoiceFrames = 0;
        }

        // Automatically stop and send as soon as the user finishes speaking and pauses for ~880ms!
        if (hasSpoken && now - speechStartTime > 450 && now - lastVoiceTime > 880) {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
          return;
        }

        // Cap single continuous utterance at 14 seconds max
        if (hasSpoken && now - speechStartTime > 14000) {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
          return;
        }

        // Recycle silent buffer every 20s without closing the MediaStream!
        if (!hasSpoken && now - sessionStartTime > 20000) {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
          return;
        }

        vadRafRef.current = requestAnimationFrame(checkVoiceActivity);
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        micUserSpeakingNowRef.current = false;
        if (vadRafRef.current !== null) {
          cancelAnimationFrame(vadRafRef.current);
          vadRafRef.current = null;
        }
        if (speechRecRef.current) {
          try {
            speechRecRef.current.stop();
          } catch {
            // Ignore
          }
          speechRecRef.current = null;
        }

        // Mute track while processing/speaking, but DO NOT call track.stop()!
        stream.getAudioTracks().forEach((t) => {
          t.enabled = false;
        });

        if (
          !micEnabledRef.current ||
          userDraftRef.current.length > 0 ||
          liveEventInFlightRef.current ||
          Date.now() - lastKeystrokeTimeRef.current < 2500 ||
          (screenStateRef.current !== 'IDLE' && screenStateRef.current !== 'LISTENING')
        ) {
          if (screenStateRef.current === 'LISTENING') {
            updateScreenState('IDLE');
          }
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });

        const spokenDurationMs = hasSpoken ? performance.now() - speechStartTime : 0;
        if (audioBlob.size < 450 || !hasSpoken || spokenDurationMs < 420) {
          if (
            micEnabledRef.current &&
            userDraftRef.current.length === 0 &&
            screenStateRef.current === 'IDLE'
          ) {
            startVoiceSessionRef.current();
          } else if (screenStateRef.current === 'LISTENING') {
            updateScreenState('IDLE');
          }
          return;
        }

        const myEpoch = ++actionEpochRef.current;
        setPlainScreenText('...');
        const capturedBrowserTranscript = liveSpeechTranscriptRef.current.trim();

        const reader = new FileReader();
        reader.onloadend = async () => {
          if (actionEpochRef.current !== myEpoch || userDraftRef.current.length > 0) return;
          const base64Data = (reader.result as string).split(',')[1];
          try {
            const deviceInfo = await gatherLivePhoneTelemetry(capturedBrowserTranscript || undefined);
            if (actionEpochRef.current !== myEpoch || userDraftRef.current.length > 0) return;

            const data = await postComputerApi<{
              userTranscript?: string;
              detectedUserName?: string | null;
              extractedUserFact?: string | null;
              isQuestion?: boolean;
              spokenText?: string;
              slides?: SlideSpec[];
            }>('/api/voice-chat', {
              audioBase64: base64Data,
              mimeType: audioBlob.type || 'audio/webm',
              history: historyRef.current,
              deviceInfo,
            }).catch(async () => {
              const spokenQuery = capturedBrowserTranscript || 'Hello computer';
              const fallback = await generateStandaloneQueryResponse(
                spokenQuery,
                historyRef.current,
                deviceInfo
              );
              return {
                ...fallback,
                extractedUserFact: null,
                userTranscript: capturedBrowserTranscript || '[VOICE]',
                isQuestion:
                  /\b(what|who|where|when|why|how|tell|show|explain|ano|sino|saan|paano|bakit)\b/i.test(
                    spokenQuery
                  ) || spokenQuery.includes('?'),
              };
            });

            if (actionEpochRef.current !== myEpoch || userDraftRef.current.length > 0) return;

            const slides: SlideSpec[] =
              Array.isArray(data.slides) && data.slides.length > 0
                ? data.slides
                : [{ style: 'GIANT', text: 'SPEAK UP,\nYOU TWIT.', ttsId: 'giant_7' }];
            const fullSpokenText: string =
              data.spokenText || slides.map((s) => s.text).join(' ');
            const userTranscript: string = (
              data.userTranscript ||
              capturedBrowserTranscript ||
              ''
            ).trim();
            const isQuestion: boolean = Boolean(data.isQuestion);

            recordModelOutputToProfile(
              fullSpokenText,
              userTranscript,
              data.detectedUserName || null,
              data.extractedUserFact || null
            );

            const slidePromises = createDecodedSlidePromises(slides);
            await slidePromises[0];
            if (actionEpochRef.current !== myEpoch || userDraftRef.current.length > 0) return;

            // If the user asked a question on the mic, ring the yellow Cartoon Bell first!
            if (isQuestion) {
              updateScreenState('FOUND_BELL');
              soundEngine.playSearchFoundBell();
              await new Promise<void>((resolve) => setTimeout(resolve, 850));
              if (actionEpochRef.current !== myEpoch || userDraftRef.current.length > 0) return;
            }

            if (userTranscript) {
              setHistory((prev) => [
                ...prev.slice(-10),
                { role: 'user', text: userTranscript },
                { role: 'model', text: fullSpokenText },
              ]);
            } else {
              setHistory((prev) => [
                ...prev.slice(-10),
                { role: 'model', text: fullSpokenText },
              ]);
            }

            updateScreenState('SPEAKING');
            await soundEngine.playSlidePromisesSequentially(slidePromises, {
              onSlideRender: (rendered) => {
                if (actionEpochRef.current === myEpoch) {
                  setActiveSlide({ ...rendered });
                }
              },
              onAllComplete: (resolved) => {
                if (actionEpochRef.current !== myEpoch) return;
                setLastReplySlides(resolved);
                updateScreenState('IDLE');
                if (micEnabledRef.current && userDraftRef.current.length === 0) {
                  startVoiceSessionRef.current();
                }
              },
            });
          } catch {
            if (actionEpochRef.current === myEpoch) {
              updateScreenState('IDLE');
              if (micEnabledRef.current && userDraftRef.current.length === 0) {
                startVoiceSessionRef.current();
              }
            }
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      vadRafRef.current = requestAnimationFrame(checkVoiceActivity);
    } catch {
      updateScreenState('IDLE');
    }
  }, [
    createDecodedSlidePromises,
    ensurePersistentMicStream,
    gatherLivePhoneTelemetry,
    recordModelOutputToProfile,
    stopMicHardware,
    updateScreenState,
  ]);

  useEffect(() => {
    startVoiceSessionRef.current = () => {
      startVoiceCaptureSession();
    };
  }, [startVoiceCaptureSession]);

  // 1. Attention-Span Callout When User Leaves & Returns (Never guesses specific apps like TikTok)
  useEffect(() => {
    const markUserLeft = () => {
      if (!hiddenTimestampRef.current) {
        hiddenTimestampRef.current = Date.now();
      }
    };

    const handleUserReturned = () => {
      if (!hiddenTimestampRef.current) return;
      const awayMs = Date.now() - hiddenTimestampRef.current;
      const awaySec = Math.round(awayMs / 1000);
      hiddenTimestampRef.current = null;

      if (awaySec >= 3) {
        lastAwaySecondsRef.current = awaySec;
        distractionCountRef.current += 1;
        triggerLiveAwarenessEvent('TAB_OR_NOTIFICATION_RETURN', {
          awaySeconds: awaySec,
          allowInterruptSpeaking: true,
        });
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        markUserLeft();
      } else if (document.visibilityState === 'visible') {
        handleUserReturned();
      }
    };

    const onWindowBlur = () => {
      markUserLeft();
    };

    const onWindowFocus = () => {
      handleUserReturned();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('focus', onWindowFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('focus', onWindowFocus);
    };
  }, [triggerLiveAwarenessEvent]);

  // 2. Live Charger Plug/Unplug, Screen Rotation, Copy/Right-Click, Network Reconnect, and Phone Shake
  useEffect(() => {
    let batteryObj: BatteryManagerLike | null = null;
    const onChargingChange = () => {
      if (!batteryObj) return;
      triggerLiveAwarenessEvent('CHARGER_CHANGED', {
        extraDetail: batteryObj.charging ? 'CHARGING' : 'UNPLUGGED',
      });
    };

    const setupBatteryListener = async () => {
      try {
        const nav = navigator as Navigator & {
          getBattery?: () => Promise<BatteryManagerLike>;
        };
        if (typeof nav.getBattery === 'function') {
          batteryObj = await nav.getBattery();
          if (initialBatteryRef.current === null) {
            initialBatteryRef.current = Math.round(batteryObj.level * 100);
          }
          batteryObj.addEventListener('chargingchange', onChargingChange);
        }
      } catch {
        // Ignore
      }
    };
    setupBatteryListener();

    // Physical Phone Shake Detection (Accelerometer)
    let lastAccel = { x: 0, y: 0, z: 0 };
    const onDeviceMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;
      const dx = Math.abs(acc.x - lastAccel.x);
      const dy = Math.abs(acc.y - lastAccel.y);
      const dz = Math.abs(acc.z - lastAccel.z);
      lastAccel = { x: acc.x, y: acc.y, z: acc.z };
      if (dx + dy + dz > 28) {
        triggerLiveAwarenessEvent('DEVICE_SHAKE');
      }
    };

    // Screen Orientation Flip Detection
    let lastIsPortrait = window.innerHeight >= window.innerWidth;
    const onOrientationCheck = () => {
      const nowPortrait = window.innerHeight >= window.innerWidth;
      if (nowPortrait !== lastIsPortrait) {
        lastIsPortrait = nowPortrait;
        triggerLiveAwarenessEvent('ORIENTATION_CHANGED', {
          extraDetail: nowPortrait ? 'Portrait' : 'Landscape',
        });
      }
    };

    // Copy / Plagiarism Detection
    const onCopyAttempt = () => {
      triggerLiveAwarenessEvent('COPY_ATTEMPT');
    };

    // Network Restored Detection
    const onOnlineRestored = () => {
      triggerLiveAwarenessEvent('NETWORK_RESTORED');
    };

    // Window Width Resize / Split-Screen Multitasking Detection
    let lastWindowWidth = window.innerWidth;
    const onWindowResize = () => {
      const nowPortrait = window.innerHeight >= window.innerWidth;
      if (nowPortrait !== lastIsPortrait) {
        lastIsPortrait = nowPortrait;
        lastWindowWidth = window.innerWidth;
        return;
      }
      if (Math.abs(window.innerWidth - lastWindowWidth) > 65) {
        lastWindowWidth = window.innerWidth;
        triggerLiveAwarenessEvent('WINDOW_RESIZED', {
          extraDetail: `${window.innerWidth}x${window.innerHeight}`,
        });
      }
    };

    // Desktop Mouse Cursor Escape Detection (moving mouse to top bar to close/switch tab)
    let lastMouseY = 200;
    const onMouseMove = (e: MouseEvent) => {
      if (inputMethodRef.current === 'mouse' && e.clientY <= 4 && lastMouseY > 12) {
        triggerLiveAwarenessEvent('CURSOR_ESCAPE_ATTEMPT');
      }
      lastMouseY = e.clientY;
    };

    window.addEventListener('devicemotion', onDeviceMotion);
    window.addEventListener('orientationchange', onOrientationCheck);
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('copy', onCopyAttempt);
    window.addEventListener('online', onOnlineRestored);

    return () => {
      if (batteryObj) {
        batteryObj.removeEventListener('chargingchange', onChargingChange);
      }
      window.removeEventListener('devicemotion', onDeviceMotion);
      window.removeEventListener('orientationchange', onOrientationCheck);
      window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('copy', onCopyAttempt);
      window.removeEventListener('online', onOnlineRestored);
    };
  }, [triggerLiveAwarenessEvent]);

  // 3. Escalating Idle Stare Loop: Whenever user sits in IDLE without typing or talking,
  // he continues talking and questioning them with a fresh multi-slide sequence!
  useEffect(() => {
    if (screenState !== 'IDLE' || userDraft.length > 0) return;

    const waitMs = idleStareStageRef.current === 0 ? 24000 : 30000;
    const timer = window.setTimeout(() => {
      if (micUserSpeakingNowRef.current) return;
      idleStareStageRef.current += 1;
      triggerLiveAwarenessEvent('IDLE_STARE', {
        extraDetail: String(idleStareStageRef.current),
      });
    }, waitMs);

    return () => window.clearTimeout(timer);
  }, [screenState, userDraft, triggerLiveAwarenessEvent]);

  // Authentic, readable 90s Windows / MS-DOS / BIOS Boot Sequence with MADE BY REN
  const runBootSequence = useCallback(async () => {
    const myEpoch = ++actionEpochRef.current;
    soundEngine.unlockAudio();
    soundEngine.stopVoice();
    soundEngine.playBootSequenceSound();
    setActiveSlide(null);
    setBootLines([]);
    updateScreenState('BOOTING');

    // Update persistent visit counter on boot
    const p = profileRef.current;
    if (p.lastVisitAt) {
      minutesSinceLastVisitRef.current = Math.max(
        1,
        Math.round((Date.now() - p.lastVisitAt) / 60000)
      );
    }
    p.visitCount += 1;
    p.lastVisitAt = Date.now();
    savePersistentProfile(p);

    const env = detectDeviceEnvironmentSync();
    const modelSuffix = env.deviceModel ? ` (${env.deviceModel.toUpperCase()})` : '';
    const operatorLabel = p.userName
      ? `${p.userName.toUpperCase()} [VISIT #${p.visitCount}]`
      : `UNKNOWN TWIT [VISIT #${p.visitCount}]`;

    const bootScript: Array<{ line: string; delayMs: number }> = [
      { line: '1999 AI ROM BIOS v4.99 (C) NOWHERE SYSTEMS INC.', delayMs: 220 },
      { line: 'SYSTEM ARCHITECT & CREATOR: MADE BY REN', delayMs: 320 },
      { line: 'CPU: BRITISH-SARCASM PENTIUM II 350MHZ', delayMs: 190 },
      { line: 'MEMORY TEST: 65536K OK [EXTENDED RAM VERIFIED]', delayMs: 240 },
      { line: `HOST HARDWARE: ${env.deviceCategory.toUpperCase()}${modelSuffix}`, delayMs: 250 },
      {
        line: `DISPLAY MODE: ${
          env.isInstalledApp ? 'STANDALONE INSTALLED APP' : 'WEB BROWSER SESSION'
        }`,
        delayMs: 230,
      },
      { line: `DETECTED OPERATOR: ${operatorLabel}`, delayMs: 230 },
      { line: 'VERIFYING DMI POOL DATA ........... SUCCESS', delayMs: 260 },
      { line: 'STARTING WINDOWS 98 [1999 AI EDITION]...', delayMs: 300 },
      { line: 'C:\\>LH C:\\WINDOWS\\SYSTEM\\SIMON_PREBBLE_VOICE.DRV', delayMs: 210 },
      { line: 'C:\\>LH C:\\WINDOWS\\SYSTEM\\SARCASM_ENGINE.VXD', delayMs: 210 },
      { line: 'SCANNING OPERATOR IQ LEVEL ... 0 ITEMS FOUND', delayMs: 280 },
      { line: 'LAUNCHING 1999_AI.EXE ... READY.', delayMs: 950 },
    ];

    // Preload Fish Audio voice bank in background while BIOS lines type out
    loadStandaloneVoiceBank().catch(() => {});

    const bootTelemetryPromise = gatherLivePhoneTelemetry();
    const bootFetchPromise = bootTelemetryPromise
      .then((deviceInfo) =>
        postComputerApi<{ slides?: SlideSpec[]; spokenText?: string }>('/api/boot', {
          reason: 'BOOT',
          deviceInfo,
        })
      )
      .catch(() => ({ slides: [] as SlideSpec[] }));

    const accumulated: string[] = [];
    for (let i = 0; i < bootScript.length; i++) {
      if (actionEpochRef.current !== myEpoch) return;
      accumulated.push(bootScript[i].line);
      setBootLines([...accumulated]);
      soundEngine.playTypewriterTick();
      await new Promise((r) => setTimeout(r, bootScript[i].delayMs));
    }

    if (actionEpochRef.current !== myEpoch) return;
    const [data, bootDeviceInfo] = await Promise.all([bootFetchPromise, bootTelemetryPromise]);
    if (actionEpochRef.current !== myEpoch) return;

    const slides: SlideSpec[] =
      Array.isArray(data.slides) && data.slides.length > 0
        ? data.slides
        : generateStandaloneBootSlides(p.visitCount, bootDeviceInfo);

    const slidePromises = createDecodedSlidePromises(slides);
    await slidePromises[0];
    if (actionEpochRef.current !== myEpoch) return;

    updateScreenState('SPEAKING');
    await soundEngine.playSlidePromisesSequentially(slidePromises, {
      onSlideRender: (rendered) => {
        if (actionEpochRef.current === myEpoch) {
          setActiveSlide({ ...rendered });
        }
      },
      onAllComplete: (resolved) => {
        if (actionEpochRef.current !== myEpoch) return;
        setLastReplySlides(resolved);
        updateScreenState('IDLE');
        if (pendingUnmuteEventRef.current && !isMutedRef.current) {
          const evt = pendingUnmuteEventRef.current;
          pendingUnmuteEventRef.current = null;
          triggerLiveAwarenessEvent(evt);
          return;
        }
        if (micEnabledRef.current && userDraftRef.current.length === 0) {
          startVoiceSessionRef.current();
        }
      },
    });
  }, [createDecodedSlidePromises, gatherLivePhoneTelemetry, triggerLiveAwarenessEvent, updateScreenState]);

  // Automatically boot on app open (and open Install Modal if launched via ?install=1 link)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('install=1')) {
      setInstallModalOpen(true);
    }
    if (bootHasRunRef.current) return;
    bootHasRunRef.current = true;
    runBootSequence();
  }, [runBootSequence]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (installModalOpen) return;
      if (e.key === 'PrintScreen') {
        triggerLiveAwarenessEvent('COPY_ATTEMPT');
        return;
      }
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
      ) {
        triggerLiveAwarenessEvent('DEVTOOLS_ATTEMPT');
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      soundEngine.unlockAudio();
      // Ignore modifier, navigation, volume, or function keys so they never interrupt speech
      if (e.key.length > 1 && e.key !== 'Backspace' && e.key !== 'Enter') return;
      lastKeystrokeTimeRef.current = Date.now();
      screenTapTimestampsRef.current = [];
      if (screenHoldTimerRef.current !== null) {
        window.clearTimeout(screenHoldTimerRef.current);
        screenHoldTimerRef.current = null;
      }
      if (
        document.activeElement !== hiddenCmdInputRef.current &&
        screenState !== 'SEARCHING' &&
        screenState !== 'FOUND_BELL' &&
        screenState !== 'BOOTING'
      ) {
        hiddenCmdInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [installModalOpen, screenState, triggerLiveAwarenessEvent]);

  const submitQuery = useCallback(
    async (rawQuery: string) => {
      const trimmed = rawQuery.trim();
      if (!trimmed) return;

      const myEpoch = ++actionEpochRef.current;
      lastKeystrokeTimeRef.current = Date.now();
      liveEventInFlightRef.current = false;
      screenTapTimestampsRef.current = [];

      if (screenHoldTimerRef.current !== null) {
        window.clearTimeout(screenHoldTimerRef.current);
        screenHoldTimerRef.current = null;
      }
      if (chickenOutTimerRef.current !== null) {
        window.clearTimeout(chickenOutTimerRef.current);
        chickenOutTimerRef.current = null;
      }
      if (typingFreezeTimerRef.current !== null) {
        window.clearTimeout(typingFreezeTimerRef.current);
        typingFreezeTimerRef.current = null;
      }
      idleStareStageRef.current = 0;

      // Update userDraftRef BEFORE stopping mic so no async callback sees a stale draft!
      userDraftRef.current = '';
      setUserDraft('');
      stopMicHardware();
      soundEngine.stopVoice();

      soundEngine.unlockAudio();
      soundEngine.playKeyClick('Enter');
      setActiveSlide(null);
      hiddenCmdInputRef.current?.blur();

      // STAGE 1: Play the looping "Waiting Courage Computer" sound while typing "SEARCHING" inside the show-accurate red/cream box
      updateScreenState('SEARCHING');
      const stopWaitingSound = soundEngine.startWaitingCourageSound();
      soundEngine.runQuickTypewriter('SEARCHING', 45, (txt) => setPlainScreenText(txt));

      try {
        const deviceInfo = await gatherLivePhoneTelemetry(trimmed);
        if (actionEpochRef.current !== myEpoch) {
          stopWaitingSound();
          return;
        }

        const queryData = await postComputerApi<{
          detectedUserName?: string | null;
          extractedUserFact?: string | null;
          spokenText?: string;
          slides?: SlideSpec[];
        }>('/api/query', {
          query: trimmed,
          history,
          deviceInfo,
        }).catch(() => generateStandaloneQueryResponse(trimmed, history, deviceInfo));

        if (actionEpochRef.current !== myEpoch) {
          stopWaitingSound();
          return;
        }

        const slides: SlideSpec[] =
          Array.isArray(queryData.slides) && queryData.slides.length > 0
            ? queryData.slides
            : [{ style: 'GIANT', text: 'OH, PLEASE.\nSPARE ME.', ttsId: 'giant_8' }];
        const fullSpokenText: string =
          queryData.spokenText || slides.map((s) => s.text).join(' ');

        recordModelOutputToProfile(
          fullSpokenText,
          trimmed,
          queryData.detectedUserName || null,
          'extractedUserFact' in queryData ? queryData.extractedUserFact || null : null
        );

        const slidePromises = createDecodedSlidePromises(slides);

        // Wait ONLY for Slide 1 to be ready before ringing the bell!
        await slidePromises[0];
        if (actionEpochRef.current !== myEpoch) {
          stopWaitingSound();
          return;
        }

        stopWaitingSound();

        // STAGE 2: Show the large animated yellow Cartoon Bell clanging on the teal screen with its ringing sound!
        updateScreenState('FOUND_BELL');
        soundEngine.playSearchFoundBell();

        await new Promise<void>((resolve) => setTimeout(resolve, 850));
        if (actionEpochRef.current !== myEpoch) return;

        setHistory((prev) => [
          ...prev.slice(-10),
          { role: 'user', text: trimmed },
          { role: 'model', text: fullSpokenText },
        ]);

        // STAGE 3: Play slides sequentially, each locked 100% to its own audio buffer!
        updateScreenState('SPEAKING');
        await soundEngine.playSlidePromisesSequentially(slidePromises, {
          onSlideRender: (rendered) => {
            if (actionEpochRef.current === myEpoch) {
              setActiveSlide({ ...rendered });
            }
          },
          onAllComplete: (resolved) => {
            if (actionEpochRef.current !== myEpoch) return;
            setLastReplySlides(resolved);
            updateScreenState('IDLE');
            if (pendingUnmuteEventRef.current && !isMutedRef.current) {
              const evt = pendingUnmuteEventRef.current;
              pendingUnmuteEventRef.current = null;
              triggerLiveAwarenessEvent(evt);
              return;
            }
            if (micEnabledRef.current && userDraftRef.current.length === 0) {
              startVoiceSessionRef.current();
            }
          },
        });
      } catch {
        stopWaitingSound();
        if (actionEpochRef.current === myEpoch) {
          updateScreenState('IDLE');
          setActiveSlide(null);
          setPlainScreenText('YOU\nTWIT');
          if (micEnabledRef.current && userDraftRef.current.length === 0) {
            startVoiceSessionRef.current();
          }
        }
      }
    },
    [
      history,
      gatherLivePhoneTelemetry,
      createDecodedSlidePromises,
      recordModelOutputToProfile,
      stopMicHardware,
      triggerLiveAwarenessEvent,
      updateScreenState,
    ]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    soundEngine.unlockAudio();
    const nextVal = e.target.value;
    if (nextVal === userDraftRef.current) return;

    // Immediately update synchronous refs & cancel any pending tap/hold/live timers so typing and tapping NEVER collide!
    lastKeystrokeTimeRef.current = Date.now();
    userDraftRef.current = nextVal;
    actionEpochRef.current += 1;
    liveEventInFlightRef.current = false;
    screenTapTimestampsRef.current = [];

    if (screenHoldTimerRef.current !== null) {
      window.clearTimeout(screenHoldTimerRef.current);
      screenHoldTimerRef.current = null;
    }
    if (chickenOutTimerRef.current !== null) {
      window.clearTimeout(chickenOutTimerRef.current);
      chickenOutTimerRef.current = null;
    }
    if (typingFreezeTimerRef.current !== null) {
      window.clearTimeout(typingFreezeTimerRef.current);
      typingFreezeTimerRef.current = null;
    }

    if (nextVal.length > 0) {
      // Clear the Computer's previous slide in the background as soon as you start typing
      setActiveSlide(null);
      setPlainScreenText('');

      if (typingStartTimeRef.current === null) {
        typingStartTimeRef.current = Date.now();
      }
      if (nextVal.length > peakDraftRef.current.length) {
        peakDraftRef.current = nextVal;
      }
      // Pause active mic recorder while typing, but keep MIC: ON enabled so it never asks twice!
      stopMicHardware();
      if (screenStateRef.current === 'SPEAKING' || screenStateRef.current === 'LISTENING') {
        soundEngine.stopVoice();
        updateScreenState('IDLE');
      }

      // If user starts typing and freezes mid-sentence for 6.5 seconds without sending (only when IDLE):
      if (nextVal.trim().length >= 2) {
        const frozenSnapshot = nextVal.trim();
        typingFreezeTimerRef.current = window.setTimeout(() => {
          if (screenStateRef.current === 'IDLE' && userDraftRef.current.trim() === frozenSnapshot) {
            triggerLiveAwarenessEvent('TYPING_FROZEN', {
              extraDetail: frozenSnapshot,
              clearFrozenDraft: true,
            });
          }
        }, 6500);
      }
    }

    if (nextVal.length > userDraft.length) {
      soundEngine.playKeyClick();
    } else if (nextVal.length < userDraft.length) {
      soundEngine.playKeyClick('Backspace');
      backspaceCountRef.current += 1;

      if (nextVal.length === 0 && peakDraftRef.current.trim().length >= 2) {
        const abandonedDraft = peakDraftRef.current.trim();
        erasedBeforeSendRef.current = abandonedDraft;
        peakDraftRef.current = '';
        typingStartTimeRef.current = null;
        chickenOutTimerRef.current = window.setTimeout(() => {
          if (screenStateRef.current === 'IDLE' && userDraftRef.current.length === 0) {
            triggerLiveAwarenessEvent('TYPING_CHICKENED_OUT', {
              extraDetail: abandonedDraft,
            });
          }
        }, 2600);
      } else if (nextVal.length === 0 && micEnabledRef.current && screenStateRef.current === 'IDLE') {
        startVoiceSessionRef.current();
      }
    }
    setUserDraft(nextVal);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    soundEngine.unlockAudio();
    lastKeystrokeTimeRef.current = Date.now();
    if (e.key === 'Enter') {
      e.preventDefault();
      if (userDraft.trim()) {
        submitQuery(userDraft);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userDraft.trim()) {
      submitQuery(userDraft);
    }
  };

  const toggleVoiceMode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.unlockAudio();
    soundEngine.playKeyClick('Enter');
    actionEpochRef.current += 1;

    if (micEnabledRef.current) {
      micEnabledRef.current = false;
      setMicEnabled(false);
      stopMicHardware();

      // Always record if they turned the mic off while he was muted (or before unmuting) so he calls it out right after they unmute him!
      if (isMutedRef.current) {
        micTurnedOffWhileMutedRef.current = true;
        return;
      }

      micTurnedOffWhileMutedRef.current = true;
      soundEngine.stopVoice();
      screenStateRef.current = 'IDLE';
      setScreenState('IDLE');
      setPlainScreenText('YOU\nTWIT');
      triggerLiveAwarenessEvent('MIC_GHOSTED');
      return;
    }

    if (!isMutedRef.current) {
      micTurnedOffWhileMutedRef.current = false;
    }
    soundEngine.stopVoice();
    setUserDraft('');
    userDraftRef.current = '';
    micSpokeInSessionRef.current = false;
    micEnabledRef.current = true;
    setMicEnabled(true);
    screenStateRef.current = 'IDLE';
    setScreenState('IDLE');
    await startVoiceCaptureSession();
  };

  const toggleMuteMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.unlockAudio();

    if (!isMutedRef.current) {
      // Muting the Computer: silence audio ONLY while keeping the typewriter effect & current slides running!
      isMutedRef.current = true;
      setIsMuted(true);
      soundEngine.setMuted(true);
      return;
    }

    // Unmuting the Computer: restore voice audio immediately
    isMutedRef.current = false;
    setIsMuted(false);
    soundEngine.setMuted(false);
    soundEngine.playKeyClick('Enter');

    const turnedMicOff = micTurnedOffWhileMutedRef.current || !micEnabledRef.current;
    micTurnedOffWhileMutedRef.current = false;
    const unmuteEvent = turnedMicOff ? 'UNMUTED_AFTER_MIC_OFF' : 'MUTE_TOGGLE_CAUGHT';

    // If he is currently in the middle of typing/speaking a slide, let him finish speaking it with audio back on,
    // and queue the unmute callout to fire right when his current slides complete!
    if (screenStateRef.current !== 'IDLE' && screenStateRef.current !== 'LISTENING') {
      pendingUnmuteEventRef.current = unmuteEvent;
      return;
    }

    pendingUnmuteEventRef.current = null;
    triggerLiveAwarenessEvent(unmuteEvent);
  };

  // Render the Computer's Center Display
  const renderComputerScreen = () => {
    // Authentic 1999 BIOS / MS-DOS Boot-Up Display — pinned flush to the top-left!
    if (screenState === 'BOOTING') {
      return (
        <div className="w-full h-full flex flex-col items-start justify-start text-left space-y-1 sm:space-y-1.5 pt-1 crt-glitch">
          {bootLines.map((line, idx) => (
            <div
              key={idx}
              className="w-full text-left font-cmd uppercase phosphor-text break-words text-[clamp(0.95rem,2.8vw,1.55rem)] leading-[1.22] tracking-wider"
            >
              {line}
              {idx === bootLines.length - 1 && (
                <span className="inline-block w-[0.45em] h-[0.78em] bg-[#F3F89D] ml-1.5 align-baseline cursor-block" />
              )}
            </div>
          ))}
        </div>
      );
    }

    if (screenState === 'FOUND_BELL') {
      return <CourageClangingBell />;
    }

    // Show-Accurate SEARCHING Box (Screenshot 3: Centered Cream Rectangle with Dark Red/Maroon Border & Text)
    if (screenState === 'SEARCHING') {
      const searchingText = (plainScreenText || 'SEARCHING').replace(/\.+$/, '');
      return (
        <div className="w-full flex items-center justify-center crt-glitch px-3">
          <div className="courage-red-box px-6 py-3 sm:px-14 sm:py-5 min-w-[240px] sm:min-w-[420px] flex items-center justify-center">
            <h1 className="font-courage uppercase whitespace-nowrap courage-red-box-text text-[clamp(1.5rem,6.2vw,4.1rem)] leading-[1.2] tracking-[0.07em] text-center">
              {searchingText}
            </h1>
          </div>
        </div>
      );
    }

    const showDynamicSlide =
      (screenState === 'SPEAKING' || screenState === 'IDLE') && activeSlide !== null;

    if (showDynamicSlide && activeSlide) {
      const fullSlideText = activeSlide.fullText || activeSlide.typedText || '';
      const typedSlideText = activeSlide.typedText || '';

      // 0. SHOW-ACCURATE "SEARCH FOUND - [ 1 ITEM ]" SCREEN (Screenshot 4!)
      const searchFoundMatch = fullSlideText.match(
        /^Search\s+found\s*[:-]?\s*1\s+item[.!]?\s*(.*)$/i
      );
      if (searchFoundMatch) {
        const prefixLen = fullSlideText.length - (searchFoundMatch[1] || '').length;
        const showOneItemBox = typedSlideText.length >= 12;
        const trailingTyped =
          typedSlideText.length > prefixLen
            ? typedSlideText.slice(prefixLen).trim()
            : '';
        const headerTyped =
          typedSlideText.length < 6
            ? typedSlideText.toUpperCase()
            : typedSlideText.length < 12
            ? `SEARCH\n${typedSlideText.slice(6).trim().toUpperCase()}-`
            : 'SEARCH\nFOUND-';

        return (
          <div className="w-full max-w-[94vw] mx-auto flex flex-col items-center justify-center space-y-5 sm:space-y-8 px-2 crt-glitch text-center">
            <h1 className="font-courage uppercase whitespace-pre-line phosphor-text text-[clamp(2.1rem,8.2vw,5.4rem)] leading-[1.2] tracking-[0.06em] text-center">
              {headerTyped}
            </h1>

            {showOneItemBox && (
              <div className="courage-red-box px-8 py-2.5 sm:px-16 sm:py-4 flex items-center justify-center">
                <span className="font-courage uppercase courage-red-box-text text-[clamp(1.55rem,6vw,3.9rem)] leading-[1.2] tracking-[0.06em]">
                  1 ITEM
                </span>
              </div>
            )}

            {trailingTyped && (
              <h2 className="font-courage uppercase whitespace-pre-line break-words phosphor-text w-full max-w-4xl text-[clamp(1.65rem,6vw,3.9rem)] leading-[1.3] text-center pt-1">
                {trailingTyped}
                {screenState === 'SPEAKING' && (
                  <span className="inline-block w-[0.45em] h-[0.78em] bg-[#F3F89D] ml-1.5 align-baseline cursor-block" />
                )}
              </h2>
            )}
          </div>
        );
      }

      // 1. SHOW-ACCURATE SINGLE-SUBJECT VISUALIZER + REAL CONNECTED PICTURE (Animals, Aswang, Monsters, Science, etc.)
      if (
        activeSlide.style === 'VISUAL' ||
        Boolean(activeSlide.visualSubject) ||
        Boolean(activeSlide.visualImageUrl)
      ) {
        const subjectLabel =
          activeSlide.visualSubject ||
          activeSlide.boxTitle?.replace(/^SPECIMEN:\s*/i, '') ||
          'SPECIMEN';
        const headerTitle = activeSlide.boxTitle || `SPECIMEN: ${subjectLabel}`;
        const { chunkTyped } = getLiveHugeDisplayChunk(typedSlideText, fullSlideText, 58);

        return (
          <div className="w-full max-w-[94vw] mx-auto flex flex-col items-center justify-center space-y-4 sm:space-y-6 px-1 crt-glitch">
            <div className="w-full max-w-2xl border-2 border-[#F3F89D] bg-[#0A261E]/35 p-3 sm:p-4 flex flex-col items-center space-y-3">
              <div className="w-full courage-red-box px-3 py-1.5 sm:py-2">
                <h2 className="font-courage uppercase text-center courage-red-box-text text-sm sm:text-xl font-bold tracking-wider">
                  {headerTitle}
                </h2>
              </div>

              <div className="w-full flex items-center justify-center gap-3 sm:gap-6">
                {/* Real Connected Picture from Wikipedia / Wikimedia Commons */}
                <SpecimenPhotoBox
                  imageUrl={activeSlide.visualImageUrl || null}
                  label={subjectLabel}
                  className="w-36 h-28 sm:w-52 sm:h-40"
                />

                {/* Companion Animated Bio-Scanner & Creature Schematic Visualizer */}
                <div className="flex flex-col items-center justify-between border border-[#F3F89D]/70 bg-[#0A261E]/50 p-2 w-28 h-28 sm:w-40 sm:h-40 shrink-0">
                  <div className="w-full flex items-center justify-between text-[10px] sm:text-xs font-cmd phosphor-text opacity-80">
                    <span>SCAN: LIVE</span>
                    <span>99.9%</span>
                  </div>
                  <div className="w-20 h-16 sm:w-28 sm:h-24 flex items-center justify-center">
                    <RetroSpecimenGraphic label={subjectLabel} />
                  </div>
                  {/* Animated Equalizer / Bio-Wave Bars */}
                  <div className="w-full flex items-end justify-between gap-1 h-4 px-1">
                    <span className="flex-1 bg-[#F3F89D] h-full animate-pulse" />
                    <span className="flex-1 bg-[#F3F89D] h-2/3 animate-bounce" />
                    <span className="flex-1 bg-[#F3F89D] h-4/5 animate-pulse" />
                    <span className="flex-1 bg-[#F3F89D] h-1/2 animate-bounce" />
                    <span className="flex-1 bg-[#F3F89D] h-full animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full max-w-5xl flex items-center justify-center">
              <h1 className="font-courage uppercase whitespace-pre-line break-words phosphor-text w-full text-[clamp(1.45rem,5.2vw,3.3rem)] leading-[1.34] text-center">
                {chunkTyped}
                {screenState === 'SPEAKING' && (
                  <span className="inline-block w-[0.45em] h-[0.78em] bg-[#F3F89D] ml-1.5 align-baseline cursor-block" />
                )}
              </h1>
            </div>
          </div>
        );
      }

      // 2. SIDE-BY-SIDE VISUAL COMPARISON MODE
      if (activeSlide.style === 'COMPARE' && (activeSlide.compareLeft || activeSlide.compareRight)) {
        const { chunkTyped } = getLiveHugeDisplayChunk(typedSlideText, fullSlideText, 58);
        return (
          <div className="w-full max-w-[94vw] mx-auto flex flex-col items-center justify-center space-y-5 sm:space-y-7 px-1 crt-glitch">
            <div className="w-full grid grid-cols-2 gap-3 sm:gap-6 max-w-2xl mx-auto">
              <div className="border-2 border-[#F3F89D] bg-[#0A261E]/25 p-3 flex flex-col items-center text-center space-y-2">
                <div className="w-full courage-red-box px-2 py-1">
                  <span className="font-courage uppercase courage-red-box-text text-xs sm:text-base font-bold tracking-wider">
                    {activeSlide.compareLeft || 'ITEM 1'}
                  </span>
                </div>
                <SpecimenPhotoBox
                  imageUrl={activeSlide.compareLeftImageUrl || null}
                  label={activeSlide.compareLeft || 'ITEM 1'}
                />
              </div>

              <div className="border-2 border-[#F3F89D] bg-[#0A261E]/25 p-3 flex flex-col items-center text-center space-y-2">
                <div className="w-full courage-red-box px-2 py-1">
                  <span className="font-courage uppercase courage-red-box-text text-xs sm:text-base font-bold tracking-wider">
                    {activeSlide.compareRight || 'ITEM 2'}
                  </span>
                </div>
                <SpecimenPhotoBox
                  imageUrl={activeSlide.compareRightImageUrl || null}
                  label={activeSlide.compareRight || 'ITEM 2'}
                />
              </div>
            </div>

            <div className="w-full max-w-5xl flex items-center justify-center">
              <h1 className="font-courage uppercase whitespace-pre-line break-words phosphor-text w-full text-[clamp(1.45rem,5.2vw,3.3rem)] leading-[1.35] text-center">
                {chunkTyped}
                {screenState === 'SPEAKING' && (
                  <span className="inline-block w-[0.45em] h-[0.78em] bg-[#F3F89D] ml-1.5 align-baseline cursor-block" />
                )}
              </h1>
            </div>
          </div>
        );
      }

      // 3. SHOW LIST LAYOUT (Screenshot 2: Cream Box with Red Text on top + Huge 1. and 2. lines underneath!)
      if (
        activeSlide.style === 'LIST' ||
        /\b1[.)]\s+.+\b2[.)]\s+/s.test(fullSlideText)
      ) {
        const formattedTyped = formatNumberedListText(typedSlideText);
        const listLines = formattedTyped
          .split(/\n+/)
          .map((l) => l.trim())
          .filter(Boolean);
        const listHeaderTitle = activeSlide.boxTitle || 'HOW TO SURVIVE THIS';

        return (
          <div className="w-full max-w-[94vw] mx-auto flex flex-col items-center justify-center space-y-6 sm:space-y-8 px-2 crt-glitch">
            <div className="w-full max-w-4xl courage-red-box px-5 py-3.5 sm:px-10 sm:py-5">
              <h2 className="font-courage uppercase text-center courage-red-box-text text-[clamp(1.25rem,4.5vw,3.0rem)] leading-[1.26] tracking-[0.06em]">
                {listHeaderTitle}
              </h2>
            </div>

            <div className="w-full max-w-4xl flex flex-col items-start justify-start space-y-4 sm:space-y-5 text-left pl-1 sm:pl-4">
              {listLines.map((lineText, idx) => (
                <div
                  key={idx}
                  className="font-courage break-words phosphor-text w-full text-left text-[clamp(1.45rem,5.1vw,3.35rem)] leading-[1.35]"
                >
                  {lineText}
                  {screenState === 'SPEAKING' && idx === listLines.length - 1 && (
                    <span className="inline-block w-[0.45em] h-[0.78em] bg-[#F3F89D] ml-1.5 align-baseline cursor-block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      }

      // 4. GIANT PUNCHLINE / INSULT LAYOUT (Screenshot 5 ratio: "I DON'T KNOW / YOU'RE ON YOUR OWN, KID:)")
      if (activeSlide.style === 'GIANT') {
        const displayGiantTyped = formatShowGiantText(typedSlideText);
        const displayGiantFull = formatShowGiantText(fullSlideText);
        const targetLen = displayGiantFull.length;

        const giantSize =
          targetLen <= 16
            ? 'text-[clamp(2.6rem,10.2vw,6.6rem)] leading-[1.22]'
            : targetLen <= 44
            ? 'text-[clamp(2.0rem,7.3vw,5.0rem)] leading-[1.28]'
            : 'text-[clamp(1.7rem,6.0vw,4.1rem)] leading-[1.32]';

        return (
          <div className="w-full max-w-[94vw] mx-auto flex items-center justify-center text-center px-2 crt-glitch">
            <h1
              className={`font-courage uppercase whitespace-pre-line break-words phosphor-text w-full tracking-[0.06em] ${giantSize}`}
            >
              {displayGiantTyped}
              {screenState === 'SPEAKING' && (
                <span className="inline-block w-[0.45em] h-[0.78em] bg-[#F3F89D] ml-1.5 align-baseline cursor-block" />
              )}
            </h1>
          </div>
        );
      }

      // 5. NORMAL FULL-SCREEN DEADPAN SLIDE (Uses live clause-paging so every screen is short & HUGE like the show!)
      const { chunkTyped, chunkFullLen } = getLiveHugeDisplayChunk(
        typedSlideText,
        fullSlideText,
        54
      );
      const normalSize =
        chunkFullLen <= 28
          ? 'text-[clamp(2.2rem,8.0vw,5.3rem)] leading-[1.26]'
          : chunkFullLen <= 46
          ? 'text-[clamp(1.9rem,6.8vw,4.5rem)] leading-[1.3]'
          : 'text-[clamp(1.68rem,5.9vw,3.9rem)] leading-[1.34]';

      return (
        <div className="w-full max-w-[94vw] mx-auto flex items-center justify-center px-2 crt-glitch">
          <h1
            className={`font-courage uppercase whitespace-pre-line break-words phosphor-text w-full text-center tracking-[0.055em] ${normalSize}`}
          >
            {chunkTyped}
            {screenState === 'SPEAKING' && (
              <span className="inline-block w-[0.45em] h-[0.78em] bg-[#F3F89D] ml-1.5 align-baseline cursor-block" />
            )}
          </h1>
        </div>
      );
    }

    // Plain screen text (for IDLE "YOU\nTWIT" or LISTENING "SPEAK\nYOU TWIT")
    const trimmed = plainScreenText.trim();
    if (!trimmed && screenState !== 'LISTENING') {
      return null;
    }
    const isShort =
      trimmed === 'YOU\nTWIT' ||
      trimmed === 'SPEAK\nYOU TWIT' ||
      trimmed.length <= 16;

    return (
      <div className="w-full max-w-[94vw] mx-auto flex items-center justify-center px-2 crt-glitch">
        <h1
          className={`font-courage uppercase whitespace-pre-line break-words phosphor-text w-full ${
            isShort
              ? 'text-[clamp(2.65rem,10.2vw,6.6rem)] leading-[1.24] text-center'
              : 'text-[clamp(1.9rem,6.8vw,4.4rem)] leading-[1.32] text-center'
          }`}
        >
          {plainScreenText}
          {screenState === 'LISTENING' && (
            <span
              className="inline-block w-[0.45em] h-[0.78em] bg-[#F3F89D] ml-1.5 align-baseline cursor-block"
              aria-hidden="true"
            />
          )}
        </h1>
      </div>
    );
  };

  const isTyping = userDraft.length > 0;

  // Dynamic font sizing for user typing so it's also big and bold like the show!
  const userDraftFontSize =
    userDraft.length <= 45
      ? 'text-[clamp(1.4rem,4.8vw,2.9rem)] leading-[1.42]'
      : userDraft.length <= 110
      ? 'text-[clamp(1.15rem,3.8vw,2.2rem)] leading-[1.4]'
      : userDraft.length <= 200
      ? 'text-[clamp(0.98rem,3.0vw,1.7rem)] leading-[1.38]'
      : 'text-[clamp(0.85rem,2.4vw,1.35rem)] leading-[1.36]';

  return (
    <main
      onPointerDown={(e) => {
        lastTouchOrClickTimeRef.current = performance.now();
        inputMethodRef.current = e.pointerType === 'touch' ? 'touchscreen' : 'mouse';
        if ((e.target as HTMLElement)?.closest('button')) return;
        if (screenHoldTimerRef.current !== null) {
          window.clearTimeout(screenHoldTimerRef.current);
          screenHoldTimerRef.current = null;
        }
        // Only arm hold sensor when Computer is IDLE (not speaking) and user isn't typing!
        if (
          userDraftRef.current.length === 0 &&
          Date.now() - lastKeystrokeTimeRef.current > 3500 &&
          screenState === 'IDLE' &&
          !micUserSpeakingNowRef.current &&
          !liveEventInFlightRef.current
        ) {
          screenHoldTimerRef.current = window.setTimeout(() => {
            screenHoldTimerRef.current = null;
            if (
              screenStateRef.current === 'IDLE' &&
              userDraftRef.current.length === 0 &&
              Date.now() - lastKeystrokeTimeRef.current > 3500
            ) {
              triggerLiveAwarenessEvent('SCREEN_HOLD');
            }
          }, 1250);
        }
      }}
      onPointerUp={() => {
        if (screenHoldTimerRef.current !== null) {
          window.clearTimeout(screenHoldTimerRef.current);
          screenHoldTimerRef.current = null;
        }
      }}
      onPointerCancel={() => {
        if (screenHoldTimerRef.current !== null) {
          window.clearTimeout(screenHoldTimerRef.current);
          screenHoldTimerRef.current = null;
        }
      }}
      onTouchStart={(e) => {
        lastTouchOrClickTimeRef.current = performance.now();
        // 2-finger pinch-zoom attempt when IDLE!
        if (
          e.touches.length >= 2 &&
          screenState === 'IDLE' &&
          userDraftRef.current.length === 0 &&
          Date.now() - lastKeystrokeTimeRef.current > 3500
        ) {
          if (screenHoldTimerRef.current !== null) {
            window.clearTimeout(screenHoldTimerRef.current);
            screenHoldTimerRef.current = null;
          }
          triggerLiveAwarenessEvent('ZOOM_ATTEMPT');
          return;
        }
        if (e.touches.length === 1) {
          touchStartYRef.current = e.touches[0].clientY;
        }
      }}
      onTouchMove={(e) => {
        if (touchStartYRef.current !== null && e.touches.length === 1) {
          const dy = Math.abs(e.touches[0].clientY - touchStartYRef.current);
          if (dy > 18 && screenHoldTimerRef.current !== null) {
            window.clearTimeout(screenHoldTimerRef.current);
            screenHoldTimerRef.current = null;
          }
        }
      }}
      onTouchEnd={(e) => {
        lastTouchOrClickTimeRef.current = performance.now();
        if (screenHoldTimerRef.current !== null) {
          window.clearTimeout(screenHoldTimerRef.current);
          screenHoldTimerRef.current = null;
        }
        if (
          touchStartYRef.current !== null &&
          e.changedTouches.length === 1 &&
          userDraftRef.current.length === 0 &&
          Date.now() - lastKeystrokeTimeRef.current > 3500 &&
          screenState === 'IDLE' &&
          !micUserSpeakingNowRef.current &&
          !liveEventInFlightRef.current
        ) {
          const dy = Math.abs(e.changedTouches[0].clientY - touchStartYRef.current);
          if (dy > 60) {
            screenTapTimestampsRef.current = [];
            triggerLiveAwarenessEvent('SWIPE_SCROLL_ATTEMPT');
          }
        }
        touchStartYRef.current = null;
      }}
      onWheel={(e) => {
        if (
          userDraftRef.current.length === 0 &&
          Date.now() - lastKeystrokeTimeRef.current > 3500 &&
          screenState === 'IDLE' &&
          !liveEventInFlightRef.current &&
          Math.abs(e.deltaY) > 40
        ) {
          triggerLiveAwarenessEvent('SWIPE_SCROLL_ATTEMPT');
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (screenState === 'IDLE' && userDraftRef.current.length === 0) {
          triggerLiveAwarenessEvent('COPY_ATTEMPT');
        }
      }}
      onClick={(e) => {
        lastTouchOrClickTimeRef.current = performance.now();
        soundEngine.unlockAudio();
        if ((e.target as HTMLElement)?.closest('button')) return;

        // If browser blocked getUserMedia before first gesture, unlock persistent mic stream on first tap
        if (
          micEnabledRef.current &&
          !micStreamRef.current &&
          screenState === 'IDLE' &&
          userDraftRef.current.length === 0
        ) {
          startVoiceCaptureSession();
        }
        // If user is actively speaking in LISTENING mode and taps the screen, finish recording immediately
        if (
          micEnabled &&
          screenState === 'LISTENING' &&
          micUserSpeakingNowRef.current &&
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === 'recording'
        ) {
          mediaRecorderRef.current.stop();
          return;
        }
        // Detect if the user is rapidly poking/tapping the empty screen (4+ taps in 2.2s) ONLY when Computer is IDLE and user is NOT typing!
        if (
          screenState === 'IDLE' &&
          !micUserSpeakingNowRef.current &&
          !liveEventInFlightRef.current &&
          userDraftRef.current.length === 0 &&
          Date.now() - lastKeystrokeTimeRef.current > 3500
        ) {
          const now = Date.now();
          const recentTaps = screenTapTimestampsRef.current
            .filter((t) => now - t < 2200)
            .concat(now);
          screenTapTimestampsRef.current = recentTaps;
          if (recentTaps.length >= 4) {
            screenTapTimestampsRef.current = [];
            if (screenHoldTimerRef.current !== null) {
              window.clearTimeout(screenHoldTimerRef.current);
              screenHoldTimerRef.current = null;
            }
            triggerLiveAwarenessEvent('SCREEN_POKING');
            return;
          }
        }
        if (screenState === 'IDLE') {
          hiddenCmdInputRef.current?.focus();
        }
      }}
      style={{
        height: viewportHeight ? `${viewportHeight}px` : '100dvh',
      }}
      className="relative w-screen overflow-hidden crt-surface crt-scanlines animate-crt-open flex flex-col justify-between px-3 sm:px-5 py-4 cursor-text select-none"
    >
      {/* Mobile-friendly Form & Input so Android Gboard's "Send/Enter" key submits reliably */}
      <form onSubmit={handleFormSubmit} className="fixed bottom-0 left-0 w-full h-0 overflow-hidden">
        <input
          ref={hiddenCmdInputRef}
          type="text"
          inputMode="text"
          enterKeyHint="send"
          value={userDraft}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onPaste={() => {
            wasPastedRef.current = true;
          }}
          disabled={
            screenState === 'SEARCHING' ||
            screenState === 'FOUND_BELL' ||
            (screenState !== 'IDLE' && screenState !== 'SPEAKING' && screenState !== 'LISTENING')
          }
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Terminal Input"
          className="fixed bottom-0 left-0 w-full h-12 opacity-0 pointer-events-none"
        />
      </form>

      {/* Top Subtle Replay / Scan / Mic / App Download Trigger */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="w-full flex items-center justify-between z-30 shrink-0"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {lastReplySlides && screenState === 'IDLE' && (
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                soundEngine.unlockAudio();
                replayClickCountRef.current += 1;
                if (replayClickCountRef.current >= 3) {
                  replayClickCountRef.current = 0;
                  triggerLiveAwarenessEvent('REPLAY_OBSESSION');
                  return;
                }
                const myEpoch = ++actionEpochRef.current;
                stopMicHardware();
                updateScreenState('SPEAKING');
                soundEngine.playSlidePromisesSequentially(
                  lastReplySlides.map((s) => Promise.resolve(s)),
                  {
                    onSlideRender: (rendered) => {
                      if (actionEpochRef.current === myEpoch) {
                        setActiveSlide({ ...rendered });
                      }
                    },
                    onAllComplete: () => {
                      if (actionEpochRef.current !== myEpoch) return;
                      updateScreenState('IDLE');
                      if (micEnabledRef.current && userDraftRef.current.length === 0) {
                        startVoiceSessionRef.current();
                      }
                    },
                  }
                );
              }}
              className="min-h-[44px] px-2 font-cmd text-lg sm:text-xl uppercase phosphor-text opacity-65 hover:opacity-100 cursor-pointer touch-manipulation"
            >
              REPLAY
            </button>
          )}

          {screenState === 'IDLE' && (
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                soundEngine.unlockAudio();
                soundEngine.playKeyClick('Enter');
                triggerLiveAwarenessEvent('BIOMETRIC_SCAN');
              }}
              className="min-h-[44px] px-2 font-cmd text-lg sm:text-xl uppercase phosphor-text opacity-65 hover:opacity-100 cursor-pointer touch-manipulation"
              title="Run 1999 Biometric & Hardware Diagnostic Roast"
            >
              [SCAN]
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={toggleMuteMode}
            disabled={
              screenState === 'SEARCHING' ||
              screenState === 'FOUND_BELL' ||
              screenState === 'BOOTING'
            }
            className={`min-h-[44px] px-2.5 flex items-center gap-1.5 font-cmd text-lg sm:text-xl uppercase phosphor-text cursor-pointer touch-manipulation ${
              isMuted ? 'opacity-100 border border-[#F3F89D]/60 bg-[#0A261E]/50' : 'opacity-75 hover:opacity-100'
            }`}
            aria-label={isMuted ? 'Unmute computer voice' : 'Mute computer voice'}
            title={isMuted ? 'Unmute Computer Voice' : 'Mute Computer Voice'}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4" />
                <span>MUTED</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span>MUTE</span>
              </>
            )}
          </button>

          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={toggleVoiceMode}
            disabled={
              screenState === 'SEARCHING' ||
              screenState === 'FOUND_BELL' ||
              screenState === 'BOOTING'
            }
            className={`min-h-[44px] px-2.5 flex items-center gap-1.5 font-cmd text-lg sm:text-xl uppercase phosphor-text cursor-pointer touch-manipulation ${
              micEnabled ? 'opacity-100' : 'opacity-65 hover:opacity-100'
            }`}
            aria-label={micEnabled ? 'Turn off microphone' : 'Turn on microphone'}
          >
            {micEnabled ? (
              <>
                <MicOff className="w-4 h-4" />
                <span>MIC: ON</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>MIC</span>
              </>
            )}
          </button>

          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={async (e) => {
              e.stopPropagation();
              soundEngine.unlockAudio();
              soundEngine.playKeyClick('Enter');
              if (isInstallable && !isInstalled) {
                const accepted = await install();
                if (!accepted) setInstallModalOpen(true);
              } else {
                setInstallModalOpen(true);
              }
            }}
            className="min-h-[44px] px-2.5 flex items-center gap-1.5 font-cmd text-lg sm:text-xl uppercase phosphor-text opacity-75 hover:opacity-100 cursor-pointer touch-manipulation border border-[#F3F89D]/40 bg-[#0A261E]/40"
            aria-label="Download app to phone"
          >
            <Download className="w-4 h-4" />
            <span>APP</span>
          </button>
        </div>
      </div>

      {/* CENTER STAGE: Top-left aligned during BIOS BOOTING, centered during normal operation */}
      <div
        className={`flex-1 w-full flex my-2 min-h-0 ${
          screenState === 'BOOTING'
            ? 'items-start justify-start'
            : 'items-center justify-center'
        }`}
      >
        {!isTyping && renderComputerScreen()}
      </div>

      {/* BOTTOM-LEFT USER TYPING IN HIS FONT (Pinned to the left-most side with a small gap; submitted via Keyboard Send/Enter!) */}
      <div className="w-full z-20 min-h-[44px] flex items-end justify-start pb-1 pl-0.5 pr-2">
        {isTyping && (
          <div
            ref={userDraftScrollRef}
            className="w-full max-h-[70dvh] overflow-y-auto text-left crt-glitch"
          >
            <div
              className={`w-full font-courage phosphor-text break-words [overflow-wrap:anywhere] whitespace-pre-wrap tracking-[0.09em] ${userDraftFontSize}`}
              style={{
                wordSpacing: '0.16em',
              }}
            >
              {userDraft}
              <span
                className="inline-block w-[0.45em] h-[0.78em] bg-[#F3F89D] ml-2 align-baseline cursor-block"
                aria-hidden="true"
              />
            </div>
          </div>
        )}
      </div>

      <PWAInstallModal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
      />
    </main>
  );
}
