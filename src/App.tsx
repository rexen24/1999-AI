/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Download } from 'lucide-react';
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
  loadStandaloneVoiceBank,
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
  recentSpokenBlacklist: string[];
}

const PROFILE_STORAGE_KEY = '1999ai_user_profile_v1';

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
        recentSpokenBlacklist: Array.isArray(parsed.recentSpokenBlacklist)
          ? parsed.recentSpokenBlacklist.slice(-18)
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
  deviceCategory: string;
  deviceModel: string | null;
  isInstalledApp: boolean;
} {
  const ua = navigator.userAgent || '';
  const maxTouch = navigator.maxTouchPoints || 0;
  const minDim = Math.min(window.screen.width, window.screen.height);

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  let deviceCategory = 'Desktop PC';
  let deviceModel: string | null = null;

  const isIPad = /iPad/i.test(ua) || (/Macintosh/i.test(ua) && maxTouch > 1);
  const isIPhone = /iPhone|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  if (isIPad) {
    deviceCategory = 'iPad Tablet';
  } else if (isIPhone) {
    deviceCategory = 'iPhone';
  } else if (isAndroid) {
    const isTablet = !/Mobile/i.test(ua) || minDim >= 600;
    deviceCategory = isTablet ? 'Android Tablet' : 'Android Phone';
    const match = ua.match(/Android[^;]+;\s*([^;)]+?)(?:\s+Build\/|\))/i);
    if (match && match[1] && match[1].trim() !== 'K') {
      deviceModel = match[1].trim();
    }
  } else if (/Windows/i.test(ua)) {
    deviceCategory = maxTouch > 0 && minDim < 900 ? 'Windows Tablet' : 'Windows PC';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    deviceCategory = 'Mac Computer';
  } else if (/CrOS/i.test(ua)) {
    deviceCategory = 'Chromebook';
  } else if (/Linux/i.test(ua)) {
    deviceCategory = 'Linux PC';
  }

  return {
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
      className="w-full h-full stroke-[#E2F6C2] fill-none"
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
          <path d="M60,44 C38,16 14,20 8,42 C18,40 26,46 32,54 C42,48 50,50 60,44 Z" fill="#E2F6C2" fillOpacity="0.2" />
          <path d="M60,44 C82,16 106,20 112,42 C102,40 94,46 88,54 C78,48 70,50 60,44 Z" fill="#E2F6C2" fillOpacity="0.2" />
          {/* Head & Horns/Ears */}
          <polygon points="42,34 36,12 50,24 70,24 84,12 78,34 82,64 38,64" fill="#0A261E" />
          {/* Glowing Eyes */}
          <polygon points="45,38 55,42 46,45" fill="#E2F6C2" />
          <polygon points="75,38 65,42 74,45" fill="#E2F6C2" />
          {/* Fangs */}
          <line x1="46" y1="54" x2="74" y2="54" />
          <polygon points="49,54 52,63 55,54" fill="#E2F6C2" />
          <polygon points="65,54 68,63 71,54" fill="#E2F6C2" />
        </g>
      ) : isAquatic ? (
        <g className="animate-bounce">
          <path d="M16,48 C34,28 74,28 102,45 C74,62 34,62 16,48 Z" />
          <polygon points="52,33 62,14 68,34" fill="#E2F6C2" />
          <polygon points="100,45 114,32 110,45 114,58" fill="#E2F6C2" />
          <circle cx="34" cy="44" r="3" fill="#E2F6C2" />
          <polyline points="24,52 29,49 34,53 39,49 44,53" />
        </g>
      ) : isCrawly ? (
        <g className="animate-pulse">
          <ellipse cx="60" cy="48" rx="14" ry="18" />
          <circle cx="60" cy="26" r="8" />
          <circle cx="57" cy="24" r="2" fill="#E2F6C2" />
          <circle cx="63" cy="24" r="2" fill="#E2F6C2" />
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
          <circle cx="44" cy="45" r="4" fill="#E2F6C2" />
          <circle cx="76" cy="45" r="4" fill="#E2F6C2" />
          <polygon points="56,53 64,53 60,58" fill="#E2F6C2" />
          <line x1="12" y1="48" x2="32" y2="51" />
          <line x1="12" y1="56" x2="32" y2="56" />
          <line x1="108" y1="48" x2="88" y2="51" />
          <line x1="108" y1="56" x2="88" y2="56" />
        </g>
      ) : isDog ? (
        <g className="animate-bounce">
          <rect x="32" y="24" width="56" height="46" rx="8" />
          <path d="M32,28 C16,28 14,54 26,56 L32,44" fill="#E2F6C2" />
          <path d="M88,28 C104,28 106,54 94,56 L88,44" fill="#E2F6C2" />
          <ellipse cx="47" cy="42" rx="6" ry="8" />
          <ellipse cx="73" cy="42" rx="6" ry="8" />
          <circle cx="47" cy="43" r="2.5" fill="#E2F6C2" />
          <circle cx="73" cy="43" r="2.5" fill="#E2F6C2" />
          <ellipse cx="60" cy="54" rx="7" ry="4.5" fill="#E2F6C2" />
        </g>
      ) : (
        <g className="animate-pulse">
          <rect x="18" y="12" width="84" height="66" strokeDasharray="4 3" />
          <circle cx="60" cy="45" r="22" />
          <line x1="60" y1="16" x2="60" y2="74" />
          <line x1="30" y1="45" x2="90" y2="45" />
          <circle cx="60" cy="45" r="5" fill="#E2F6C2" />
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

  useEffect(() => {
    setImgFailed(false);
  }, [imageUrl]);

  return (
    <div
      className={`relative border-2 border-[#E2F6C2] bg-[#0A261E]/70 overflow-hidden shrink-0 flex items-center justify-center ${className}`}
    >
      {imageUrl && !imgFailed ? (
        <img
          src={imageUrl}
          alt={label}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover crt-photo-filter"
        />
      ) : (
        <div className="w-full h-full p-2 flex items-center justify-center">
          <RetroSpecimenGraphic label={label} />
        </div>
      )}
      {/* Animated CRT Scanner Laser Sweep Overlay */}
      <div className="absolute inset-x-0 top-0 h-1 bg-[#E2F6C2]/60 animate-[ping_2.4s_ease-in-out_infinite] pointer-events-none" />
      <div className="absolute inset-0 crt-scanlines pointer-events-none" />
      {/* Corner Targeting Brackets */}
      <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-[#E2F6C2] pointer-events-none" />
      <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-[#E2F6C2] pointer-events-none" />
      <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-[#E2F6C2] pointer-events-none" />
      <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-[#E2F6C2] pointer-events-none" />
    </div>
  );
};

export default function App() {
  const [screenState, setScreenState] = useState<ScreenState>('BOOTING');
  const [plainScreenText, setPlainScreenText] = useState<string>('YOU\nTWIT');
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [activeSlide, setActiveSlide] = useState<ActiveSlideRender | null>(null);
  const [micEnabled, setMicEnabled] = useState<boolean>(false);

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
  const vadRafRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const micEnabledRef = useRef<boolean>(false);
  const micSpokeInSessionRef = useRef<boolean>(false);
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

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    screenStateRef.current = screenState;
  }, [screenState]);

  useEffect(() => {
    userDraftRef.current = userDraft;
    if (userDraftScrollRef.current) {
      userDraftScrollRef.current.scrollTop = userDraftScrollRef.current.scrollHeight;
    }
  }, [userDraft]);

  // Helper to record spoken lines and detected user names into persistent storage
  const recordModelOutputToProfile = useCallback(
    (spokenText: string, userQuery?: string, detectedUserName?: string | null) => {
      const p = profileRef.current;
      if (detectedUserName && detectedUserName.trim()) {
        p.userName = detectedUserName.trim();
      }
      if (userQuery && userQuery.trim().length >= 4) {
        const cleanQ = userQuery.trim().slice(0, 60);
        p.pastUserTopics = [cleanQ, ...p.pastUserTopics.filter((q) => q !== cleanQ)].slice(0, 6);
      }
      if (spokenText && spokenText.trim()) {
        p.recentSpokenBlacklist = [...p.recentSpokenBlacklist, spokenText.trim()].slice(-18);
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

    try {
      const nav = navigator as Navigator & {
        getBattery?: () => Promise<BatteryManagerLike>;
      };
      if (typeof nav.getBattery === 'function') {
        const bat = await nav.getBattery();
        batteryPercent = Math.round(bat.level * 100);
        isCharging = Boolean(bat.charging);
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
    let deviceModel = syncEnv.deviceModel;

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
      inputMethod: inputMethodRef.current,
      batteryPercent,
      batteryDroppedBy,
      isCharging,
      deviceCategory: syncEnv.deviceCategory,
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
        const ttsRes = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ttsId: slide.ttsId, text: slide.text }),
        })
          .then(async (r) => {
            if (!r.ok) throw new Error('Static host');
            return await r.json();
          })
          .catch(() => ({ audioBase64: null, audioMimeType: null }));

        let audioBase64: string | null = ttsRes?.audioBase64 || null;
        if (!audioBase64) {
          audioBase64 = await getVoiceBankAudioBase64(slide.ttsId, slide.text);
        }
        const audioMimeType: string | null = ttsRes?.audioMimeType || 'audio/mpeg';
        const { buffer: audioBuffer, envelope } = await soundEngine.decodeAudioWithEnvelope(
          audioBase64,
          slide.ttsId || slide.text
        );

        return {
          ...slide,
          audioBuffer,
          audioBase64,
          audioMimeType,
          envelope,
        };
      });
    },
    []
  );

  // Unified Live Situational Awareness Trigger for 100% verifiable actions
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
      if (liveEventInFlightRef.current || micEnabledRef.current) return;
      if (!options?.clearFrozenDraft && userDraftRef.current.length > 0) return;

      const currentSt = screenStateRef.current;
      const canRun =
        currentSt === 'IDLE' ||
        (Boolean(options?.allowInterruptSpeaking) && currentSt === 'SPEAKING');
      if (!canRun) return;

      const now = Date.now();
      if (
        eventType !== 'TAB_OR_NOTIFICATION_RETURN' &&
        eventType !== 'TYPING_CHICKENED_OUT' &&
        eventType !== 'TYPING_FROZEN' &&
        eventType !== 'REPLAY_OBSESSION' &&
        now - lastLiveEventTimeRef.current < 10000
      ) {
        return;
      }

      liveEventInFlightRef.current = true;
      lastLiveEventTimeRef.current = now;

      try {
        const deviceInfo = await gatherLivePhoneTelemetry();
        const data = await fetch('/api/boot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason: 'LIVE_EVENT',
            eventType,
            awaySeconds: options?.awaySeconds ?? 6,
            distractionCount: distractionCountRef.current,
            deviceInfo,
            extraDetail: options?.extraDetail || '',
            history: historyRef.current,
          }),
        })
          .then(async (r) => {
            if (!r.ok) throw new Error('Static host');
            return await r.json();
          })
          .catch(() =>
            generateStandaloneLiveEvent(
              eventType,
              options?.awaySeconds ?? 6,
              distractionCountRef.current,
              deviceInfo,
              options?.extraDetail || ''
            )
          );
        if (Array.isArray(data.slides) && data.slides.length > 0 && !micEnabledRef.current) {
          if (!options?.clearFrozenDraft && userDraftRef.current.length > 0) {
            return;
          }
          soundEngine.stopVoice();
          const slidePromises = createDecodedSlidePromises(data.slides);
          await slidePromises[0];
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
          setScreenState('SPEAKING');
          await soundEngine.playSlidePromisesSequentially(slidePromises, {
            onSlideRender: (rendered) => setActiveSlide({ ...rendered }),
            onAllComplete: (resolved) => {
              setLastReplySlides(resolved);
              setScreenState('IDLE');
            },
          });
        }
      } catch {
        // Ignore transient network errors
      } finally {
        liveEventInFlightRef.current = false;
      }
    },
    [createDecodedSlidePromises, gatherLivePhoneTelemetry, recordModelOutputToProfile]
  );

  const stopMicHardware = useCallback(() => {
    if (vadRafRef.current !== null) {
      cancelAnimationFrame(vadRafRef.current);
      vadRafRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore
      }
    }
    mediaRecorderRef.current = null;
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
  }, []);

  // Hands-Free Voice Capture + Automatic Silence Detection
  // - No bell when just talking/bantering!
  // - Plays the yellow Cartoon Bell when the user asks a question on mic!
  const startVoiceCaptureSession = useCallback(async () => {
    if (!micEnabledRef.current) return;

    stopMicHardware();
    setActiveSlide(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (!micEnabledRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      micStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const vadCtx = new AudioCtx();
      if (vadCtx.state === 'suspended') {
        await vadCtx.resume().catch(() => {});
      }
      const source = vadCtx.createMediaStreamSource(stream);
      const analyser = vadCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      let hasSpoken = false;
      let speechStartTime = 0;
      let lastVoiceTime = performance.now();
      const sessionStartTime = performance.now();

      const checkVoiceActivity = () => {
        if (!micEnabledRef.current || mediaRecorder.state !== 'recording') {
          vadCtx.close().catch(() => {});
          return;
        }

        if (vadCtx.state === 'suspended') {
          vadCtx.resume().catch(() => {});
        }

        analyser.getByteTimeDomainData(dataArray);
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

        if (rms > 0.011 || peakDeviation > 0.045) {
          if (!hasSpoken) {
            hasSpoken = true;
            micSpokeInSessionRef.current = true;
            speechStartTime = now;
            setPlainScreenText('LISTENING...');
          }
          lastVoiceTime = now;
        }

        // Automatically stop and send as soon as the user finishes speaking and pauses for ~860ms!
        if (hasSpoken && now - speechStartTime > 320 && now - lastVoiceTime > 860) {
          vadCtx.close().catch(() => {});
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
          return;
        }

        // Cap single continuous utterance at 14 seconds max
        if (hasSpoken && now - speechStartTime > 14000) {
          vadCtx.close().catch(() => {});
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
          return;
        }

        // If user hasn't spoken yet for 20s, recycle recorder cleanly while keeping MIC: ON active!
        if (!hasSpoken && now - sessionStartTime > 20000) {
          vadCtx.close().catch(() => {});
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
        if (vadRafRef.current !== null) {
          cancelAnimationFrame(vadRafRef.current);
          vadRafRef.current = null;
        }
        vadCtx.close().catch(() => {});
        stream.getTracks().forEach((track) => track.stop());

        if (!micEnabledRef.current) {
          setScreenState('IDLE');
          setPlainScreenText('YOU\nTWIT');
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });

        if (audioBlob.size < 450 || !hasSpoken) {
          if (micEnabledRef.current) {
            startVoiceCaptureSession();
          } else {
            setScreenState('IDLE');
            setPlainScreenText('YOU\nTWIT');
          }
          return;
        }

        setPlainScreenText('...');

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          try {
            const deviceInfo = await gatherLivePhoneTelemetry();
            const data = await fetch('/api/voice-chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64Data,
                mimeType: audioBlob.type || 'audio/webm',
                history: historyRef.current,
                deviceInfo,
              }),
            })
              .then(async (r) => {
                if (!r.ok) throw new Error('Static host');
                return await r.json();
              })
              .catch(async () => {
                const fallback = await generateStandaloneQueryResponse(
                  'Speaking into microphone',
                  historyRef.current,
                  deviceInfo
                );
                return {
                  ...fallback,
                  userTranscript: '[VOICE INPUT]',
                  isQuestion: true,
                };
              });
            const slides: SlideSpec[] =
              Array.isArray(data.slides) && data.slides.length > 0
                ? data.slides
                : [{ style: 'GIANT', text: 'SPEAK CLEARLY.' }];
            const fullSpokenText: string =
              data.spokenText || slides.map((s) => s.text).join(' ');
            const userTranscript: string = (data.userTranscript || '').trim();
            const isQuestion: boolean = Boolean(data.isQuestion);

            recordModelOutputToProfile(
              fullSpokenText,
              userTranscript,
              data.detectedUserName || null
            );

            const slidePromises = createDecodedSlidePromises(slides);

            await slidePromises[0];

            // If the user asked a question on the mic, ring the yellow Cartoon Bell first!
            // If they are just talking/bantering, skip the bell and talk straight back!
            if (isQuestion) {
              setScreenState('FOUND_BELL');
              soundEngine.playSearchFoundBell();
              await new Promise<void>((resolve) => setTimeout(resolve, 850));
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

            setScreenState('SPEAKING');
            await soundEngine.playSlidePromisesSequentially(slidePromises, {
              onSlideRender: (rendered) => {
                setActiveSlide({ ...rendered });
              },
              onAllComplete: (resolved) => {
                setLastReplySlides(resolved);
                if (micEnabledRef.current) {
                  startVoiceCaptureSession();
                } else {
                  setScreenState('IDLE');
                }
              },
            });
          } catch {
            if (micEnabledRef.current) {
              startVoiceCaptureSession();
            } else {
              setScreenState('IDLE');
              setPlainScreenText('YOU\nTWIT');
            }
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      setScreenState('LISTENING');
      setPlainScreenText('SPEAK\nYOU TWIT');
      mediaRecorder.start();
      vadRafRef.current = requestAnimationFrame(checkVoiceActivity);
    } catch {
      micEnabledRef.current = false;
      setMicEnabled(false);
      setScreenState('IDLE');
      setPlainScreenText('MIC BLOCKED');
      hiddenCmdInputRef.current?.focus();
    }
  }, [
    createDecodedSlidePromises,
    gatherLivePhoneTelemetry,
    recordModelOutputToProfile,
    stopMicHardware,
  ]);

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
    if (screenState !== 'IDLE' || micEnabled || userDraft.length > 0) return;

    const waitMs = idleStareStageRef.current === 0 ? 22000 : 28000;
    const timer = window.setTimeout(() => {
      idleStareStageRef.current += 1;
      triggerLiveAwarenessEvent('IDLE_STARE', {
        extraDetail: String(idleStareStageRef.current),
      });
    }, waitMs);

    return () => window.clearTimeout(timer);
  }, [screenState, micEnabled, userDraft, triggerLiveAwarenessEvent]);

  // Authentic, readable 90s Windows / MS-DOS / BIOS Boot Sequence with MADE BY REN
  const runBootSequence = useCallback(async () => {
    soundEngine.unlockAudio();
    soundEngine.stopVoice();
    soundEngine.playBootSequenceSound();
    setActiveSlide(null);
    setBootLines([]);
    setScreenState('BOOTING');

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

    const bootFetchPromise = fetch('/api/boot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'BOOT' }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error('Static host');
        return await r.json();
      })
      .catch(() => ({ slides: [] }));

    const accumulated: string[] = [];
    for (let i = 0; i < bootScript.length; i++) {
      accumulated.push(bootScript[i].line);
      setBootLines([...accumulated]);
      soundEngine.playTypewriterTick();
      await new Promise((r) => setTimeout(r, bootScript[i].delayMs));
    }

    const data = await bootFetchPromise;
    const slides: SlideSpec[] =
      Array.isArray(data.slides) && data.slides.length > 0
        ? data.slides
        : generateStandaloneBootSlides(p.visitCount);

    const slidePromises = createDecodedSlidePromises(slides);
    await slidePromises[0];

    setScreenState('SPEAKING');
    await soundEngine.playSlidePromisesSequentially(slidePromises, {
      onSlideRender: (rendered) => {
        setActiveSlide({ ...rendered });
      },
      onAllComplete: (resolved) => {
        setLastReplySlides(resolved);
        setScreenState('IDLE');
      },
    });
  }, [createDecodedSlidePromises]);

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
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      soundEngine.unlockAudio();
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

      if (chickenOutTimerRef.current !== null) {
        window.clearTimeout(chickenOutTimerRef.current);
        chickenOutTimerRef.current = null;
      }
      if (typingFreezeTimerRef.current !== null) {
        window.clearTimeout(typingFreezeTimerRef.current);
        typingFreezeTimerRef.current = null;
      }
      idleStareStageRef.current = 0;

      // Turn off continuous mic if user submits a typed query
      if (micEnabledRef.current) {
        micEnabledRef.current = false;
        setMicEnabled(false);
        stopMicHardware();
      }

      soundEngine.unlockAudio();
      soundEngine.playKeyClick('Enter');
      setUserDraft('');
      setActiveSlide(null);
      hiddenCmdInputRef.current?.blur();

      // STAGE 1: Play the looping "Waiting Courage Computer" sound while typing "SEARCHING..."
      setScreenState('SEARCHING');
      const stopWaitingSound = soundEngine.startWaitingCourageSound();
      soundEngine.runQuickTypewriter('SEARCHING...', 40, (txt) => setPlainScreenText(txt));

      try {
        const deviceInfo = await gatherLivePhoneTelemetry(trimmed);

        const queryData = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: trimmed,
            history,
            deviceInfo,
          }),
        })
          .then(async (r) => {
            if (!r.ok) throw new Error('Static host');
            return await r.json();
          })
          .catch(() => generateStandaloneQueryResponse(trimmed, history, deviceInfo));
        const slides: SlideSpec[] =
          Array.isArray(queryData.slides) && queryData.slides.length > 0
            ? queryData.slides
            : [{ style: 'GIANT', text: 'Oh, spare me.' }];
        const fullSpokenText: string =
          queryData.spokenText || slides.map((s) => s.text).join(' ');

        recordModelOutputToProfile(
          fullSpokenText,
          trimmed,
          queryData.detectedUserName || null
        );

        const slidePromises = createDecodedSlidePromises(slides);

        // Wait ONLY for Slide 1 to be ready before ringing the bell!
        await slidePromises[0];

        stopWaitingSound();

        // STAGE 2: Show the large animated yellow Cartoon Bell clanging on the teal screen with its ringing sound!
        setScreenState('FOUND_BELL');
        soundEngine.playSearchFoundBell();

        await new Promise<void>((resolve) => setTimeout(resolve, 850));

        setHistory((prev) => [
          ...prev.slice(-10),
          { role: 'user', text: trimmed },
          { role: 'model', text: fullSpokenText },
        ]);

        // STAGE 3: Play slides sequentially, each locked 100% to its own audio buffer!
        setScreenState('SPEAKING');
        await soundEngine.playSlidePromisesSequentially(slidePromises, {
          onSlideRender: (rendered) => {
            setActiveSlide({ ...rendered });
          },
          onAllComplete: (resolved) => {
            setLastReplySlides(resolved);
            setScreenState('IDLE');
          },
        });
      } catch {
        stopWaitingSound();
        setScreenState('IDLE');
        setActiveSlide(null);
        setPlainScreenText('YOU\nTWIT');
      }
    },
    [
      history,
      gatherLivePhoneTelemetry,
      createDecodedSlidePromises,
      recordModelOutputToProfile,
      stopMicHardware,
    ]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    soundEngine.unlockAudio();
    const nextVal = e.target.value;

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
      // so it never jumps back to his old text if you don't send it!
      setActiveSlide(null);
      setPlainScreenText('');

      if (typingStartTimeRef.current === null) {
        typingStartTimeRef.current = Date.now();
      }
      if (nextVal.length > peakDraftRef.current.length) {
        peakDraftRef.current = nextVal;
      }
      if (micEnabledRef.current) {
        micEnabledRef.current = false;
        setMicEnabled(false);
        stopMicHardware();
      }
      if (screenState === 'SPEAKING' || screenState === 'LISTENING') {
        soundEngine.stopVoice();
        setScreenState('IDLE');
      }

      // If user starts typing and freezes mid-sentence for 6.5 seconds without sending:
      if (nextVal.trim().length >= 2) {
        const frozenSnapshot = nextVal.trim();
        typingFreezeTimerRef.current = window.setTimeout(() => {
          triggerLiveAwarenessEvent('TYPING_FROZEN', {
            extraDetail: frozenSnapshot,
            clearFrozenDraft: true,
          });
        }, 6500);
      }
    }

    if (nextVal.length > userDraft.length) {
      soundEngine.playKeyClick();
    } else if (nextVal.length < userDraft.length) {
      soundEngine.playKeyClick('Backspace');
      backspaceCountRef.current += 1;

      // If user typed a message (2+ chars) and deleted the whole thing back to empty:
      // 1) Keep the screen clean (no old Computer text!)
      // 2) Wait 2.4s and if they still haven't typed anything new, call them out aloud!
      if (nextVal.length === 0 && peakDraftRef.current.trim().length >= 2) {
        const abandonedDraft = peakDraftRef.current.trim();
        erasedBeforeSendRef.current = abandonedDraft;
        peakDraftRef.current = '';
        typingStartTimeRef.current = null;
        chickenOutTimerRef.current = window.setTimeout(() => {
          triggerLiveAwarenessEvent('TYPING_CHICKENED_OUT', {
            extraDetail: abandonedDraft,
          });
        }, 2400);
      }
    }
    setUserDraft(nextVal);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    soundEngine.unlockAudio();
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

    if (micEnabledRef.current) {
      const spokeAtAll = micSpokeInSessionRef.current;
      micEnabledRef.current = false;
      setMicEnabled(false);
      stopMicHardware();
      soundEngine.stopVoice();
      setScreenState('IDLE');
      setPlainScreenText('YOU\nTWIT');

      if (!spokeAtAll) {
        triggerLiveAwarenessEvent('MIC_GHOSTED');
      }
      return;
    }

    soundEngine.stopVoice();
    setUserDraft('');
    micSpokeInSessionRef.current = false;
    micEnabledRef.current = true;
    setMicEnabled(true);
    await startVoiceCaptureSession();
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
                <span className="inline-block w-[0.45em] h-[0.78em] bg-[#E2F6C2] ml-1.5 align-baseline cursor-block" />
              )}
            </div>
          ))}
        </div>
      );
    }

    if (screenState === 'FOUND_BELL') {
      return <CourageClangingBell />;
    }

    // Compact single-line SEARCHING... so the 'G' never wraps onto a second line on mobile phones!
    if (screenState === 'SEARCHING') {
      return (
        <div className="w-full flex items-center justify-center crt-glitch px-2">
          <h1 className="font-courage uppercase whitespace-nowrap phosphor-text text-[clamp(1.3rem,5.2vw,3.4rem)] leading-[1.3] text-center">
            {plainScreenText}
            <span
              className="inline-block w-[0.45em] h-[0.78em] bg-[#E2F6C2] ml-1.5 align-baseline cursor-block"
              aria-hidden="true"
            />
          </h1>
        </div>
      );
    }

    const showDynamicSlide =
      (screenState === 'SPEAKING' || screenState === 'IDLE') && activeSlide !== null;

    if (showDynamicSlide && activeSlide) {
      const targetLen = (activeSlide.fullText || activeSlide.typedText).length;

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

        return (
          <div className="w-full max-w-5xl mx-auto flex flex-col items-center justify-center space-y-4 sm:space-y-6 px-1 crt-glitch">
            <div className="w-full max-w-2xl border-2 border-[#E2F6C2] bg-[#0A261E]/35 p-3 sm:p-4 flex flex-col items-center space-y-3">
              <div className="w-full border-[2px] border-[#1E1A1B] bg-[#E3DCE1] px-3 py-1.5">
                <h2 className="font-courage uppercase text-center text-[#5A181E] text-xs sm:text-lg font-bold tracking-wider">
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
                <div className="flex flex-col items-center justify-between border border-[#E2F6C2]/70 bg-[#0A261E]/50 p-2 w-28 h-28 sm:w-40 sm:h-40 shrink-0">
                  <div className="w-full flex items-center justify-between text-[10px] sm:text-xs font-cmd phosphor-text opacity-80">
                    <span>SCAN: LIVE</span>
                    <span>99.9%</span>
                  </div>
                  <div className="w-20 h-16 sm:w-28 sm:h-24 flex items-center justify-center">
                    <RetroSpecimenGraphic label={subjectLabel} />
                  </div>
                  {/* Animated Equalizer / Bio-Wave Bars */}
                  <div className="w-full flex items-end justify-between gap-1 h-4 px-1">
                    <span className="flex-1 bg-[#E2F6C2] h-full animate-pulse" />
                    <span className="flex-1 bg-[#E2F6C2] h-2/3 animate-bounce" />
                    <span className="flex-1 bg-[#E2F6C2] h-4/5 animate-pulse" />
                    <span className="flex-1 bg-[#E2F6C2] h-1/2 animate-bounce" />
                    <span className="flex-1 bg-[#E2F6C2] h-full animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full max-w-4xl flex items-center justify-start">
              <h1 className="font-courage uppercase whitespace-pre-line break-words phosphor-text w-full text-[clamp(1.12rem,3.8vw,2.2rem)] leading-[1.46] text-left">
                {activeSlide.typedText}
                {screenState === 'SPEAKING' && (
                  <span className="inline-block w-[0.45em] h-[0.78em] bg-[#E2F6C2] ml-1.5 align-baseline cursor-block" />
                )}
              </h1>
            </div>
          </div>
        );
      }

      // 2. SIDE-BY-SIDE VISUAL COMPARISON MODE
      if (activeSlide.style === 'COMPARE' && (activeSlide.compareLeft || activeSlide.compareRight)) {
        return (
          <div className="w-full max-w-5xl mx-auto flex flex-col items-center justify-center space-y-5 sm:space-y-7 px-1 crt-glitch">
            <div className="w-full grid grid-cols-2 gap-3 sm:gap-6 max-w-2xl mx-auto">
              <div className="border-2 border-[#E2F6C2] bg-[#0A261E]/25 p-3 flex flex-col items-center text-center space-y-2">
                <div className="w-full border border-[#1E1A1B] bg-[#E3DCE1] px-2 py-1">
                  <span className="font-courage uppercase text-[#5A181E] text-xs sm:text-base font-bold tracking-wider">
                    {activeSlide.compareLeft || 'ITEM 1'}
                  </span>
                </div>
                <SpecimenPhotoBox
                  imageUrl={activeSlide.compareLeftImageUrl || null}
                  label={activeSlide.compareLeft || 'ITEM 1'}
                />
              </div>

              <div className="border-2 border-[#E2F6C2] bg-[#0A261E]/25 p-3 flex flex-col items-center text-center space-y-2">
                <div className="w-full border border-[#1E1A1B] bg-[#E3DCE1] px-2 py-1">
                  <span className="font-courage uppercase text-[#5A181E] text-xs sm:text-base font-bold tracking-wider">
                    {activeSlide.compareRight || 'ITEM 2'}
                  </span>
                </div>
                <SpecimenPhotoBox
                  imageUrl={activeSlide.compareRightImageUrl || null}
                  label={activeSlide.compareRight || 'ITEM 2'}
                />
              </div>
            </div>

            <div className="w-full flex items-center justify-center">
              <h1 className="font-courage uppercase whitespace-pre-line break-words phosphor-text w-full text-[clamp(1.1rem,3.6vw,2.15rem)] leading-[1.48] text-left">
                {activeSlide.typedText}
                {screenState === 'SPEAKING' && (
                  <span className="inline-block w-[0.45em] h-[0.78em] bg-[#E2F6C2] ml-1.5 align-baseline cursor-block" />
                )}
              </h1>
            </div>
          </div>
        );
      }

      // 3. SHOW LIST LAYOUT (1. and its content on top, 2. and its content directly underneath 1. — NEVER in a single sentence!)
      if (
        activeSlide.style === 'LIST' ||
        /\b1[.)]\s+.+\b2[.)]\s+/s.test(activeSlide.fullText || activeSlide.typedText)
      ) {
        const formattedTyped = formatNumberedListText(activeSlide.typedText);
        const listLines = formattedTyped
          .split(/\n+/)
          .map((l) => l.trim())
          .filter(Boolean);

        return (
          <div className="w-full max-w-5xl mx-auto flex flex-col items-center justify-center space-y-5 sm:space-y-7 px-1 crt-glitch">
            {activeSlide.boxTitle && (
              <div className="w-full max-w-3xl border-[2.5px] border-[#1E1A1B] bg-[#E3DCE1] px-5 py-3 sm:px-8 sm:py-4 shadow-xs">
                <h2 className="font-courage uppercase text-center text-[#5A181E] text-[clamp(1.1rem,3.6vw,2.2rem)] leading-[1.3]">
                  {activeSlide.boxTitle}
                </h2>
              </div>
            )}

            <div className="w-full max-w-4xl flex flex-col items-start justify-start space-y-3 sm:space-y-4 text-left">
              {listLines.map((lineText, idx) => (
                <div
                  key={idx}
                  className="font-courage uppercase break-words phosphor-text w-full text-left text-[clamp(1.18rem,4vw,2.35rem)] leading-[1.48]"
                >
                  {lineText}
                  {screenState === 'SPEAKING' && idx === listLines.length - 1 && (
                    <span className="inline-block w-[0.45em] h-[0.78em] bg-[#E2F6C2] ml-1.5 align-baseline cursor-block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      }

      // 4. GIANT PUNCHLINE / INSULT LAYOUT
      if (activeSlide.style === 'GIANT') {
        const giantSize =
          targetLen <= 14
            ? 'text-[clamp(2.25rem,8.8vw,5.4rem)] leading-[1.3]'
            : targetLen <= 38
            ? 'text-[clamp(1.55rem,5.5vw,3.65rem)] leading-[1.38]'
            : 'text-[clamp(1.3rem,4.4vw,2.75rem)] leading-[1.45]';

        return (
          <div className="w-full max-w-5xl mx-auto flex items-center justify-center text-center crt-glitch">
            <h1
              className={`font-courage uppercase whitespace-pre-line break-words phosphor-text w-full ${giantSize}`}
            >
              {activeSlide.typedText}
              {screenState === 'SPEAKING' && (
                <span className="inline-block w-[0.45em] h-[0.78em] bg-[#E2F6C2] ml-1.5 align-baseline cursor-block" />
              )}
            </h1>
          </div>
        );
      }

      // 5. NORMAL FULL-SCREEN DEADPAN SLIDE (Short, bold, show-accurate 1-2 sentences)
      const normalSize =
        targetLen <= 55
          ? 'text-[clamp(1.55rem,5.4vw,3.45rem)] leading-[1.42]'
          : targetLen <= 105
          ? 'text-[clamp(1.32rem,4.5vw,2.85rem)] leading-[1.46]'
          : 'text-[clamp(1.12rem,3.8vw,2.3rem)] leading-[1.48]';

      return (
        <div className="w-full max-w-5xl mx-auto flex items-center justify-center crt-glitch">
          <h1
            className={`font-courage uppercase whitespace-pre-line break-words phosphor-text w-full text-left ${normalSize}`}
          >
            {activeSlide.typedText}
            {screenState === 'SPEAKING' && (
              <span className="inline-block w-[0.45em] h-[0.78em] bg-[#E2F6C2] ml-1.5 align-baseline cursor-block" />
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
      trimmed.length <= 14;

    return (
      <div className="w-full max-w-5xl mx-auto flex items-center justify-center crt-glitch">
        <h1
          className={`font-courage uppercase whitespace-pre-line break-words phosphor-text w-full ${
            isShort
              ? 'text-[clamp(2.35rem,9vw,5.4rem)] leading-[1.32] text-center'
              : 'text-[clamp(1.3rem,4.4vw,2.65rem)] leading-[1.48] text-center'
          }`}
        >
          {plainScreenText}
          {screenState === 'LISTENING' && (
            <span
              className="inline-block w-[0.45em] h-[0.78em] bg-[#E2F6C2] ml-1.5 align-baseline cursor-block"
              aria-hidden="true"
            />
          )}
        </h1>
      </div>
    );
  };

  const isTyping = userDraft.length > 0;

  // Dynamic font sizing for user typing so even very long paragraphs never look cut off!
  const userDraftFontSize =
    userDraft.length <= 45
      ? 'text-[clamp(1.18rem,4vw,2.4rem)] leading-[1.52]'
      : userDraft.length <= 110
      ? 'text-[clamp(1.0rem,3.3vw,1.9rem)] leading-[1.48]'
      : userDraft.length <= 200
      ? 'text-[clamp(0.88rem,2.7vw,1.5rem)] leading-[1.45]'
      : 'text-[clamp(0.78rem,2.2vw,1.25rem)] leading-[1.42]';

  return (
    <main
      onPointerDown={(e) => {
        inputMethodRef.current = e.pointerType === 'touch' ? 'touchscreen' : 'mouse';
        if (screenHoldTimerRef.current !== null) {
          window.clearTimeout(screenHoldTimerRef.current);
        }
        if (userDraftRef.current.length === 0 && screenState === 'IDLE' && !micEnabled) {
          screenHoldTimerRef.current = window.setTimeout(() => {
            triggerLiveAwarenessEvent('SCREEN_HOLD');
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
        if (e.touches.length === 1) {
          touchStartYRef.current = e.touches[0].clientY;
        }
      }}
      onTouchEnd={(e) => {
        if (
          touchStartYRef.current !== null &&
          e.changedTouches.length === 1 &&
          userDraftRef.current.length === 0 &&
          screenState === 'IDLE'
        ) {
          const dy = Math.abs(e.changedTouches[0].clientY - touchStartYRef.current);
          if (dy > 65) {
            triggerLiveAwarenessEvent('SWIPE_SCROLL_ATTEMPT');
          }
        }
        touchStartYRef.current = null;
      }}
      onWheel={(e) => {
        if (userDraftRef.current.length === 0 && screenState === 'IDLE' && Math.abs(e.deltaY) > 40) {
          triggerLiveAwarenessEvent('SWIPE_SCROLL_ATTEMPT');
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        triggerLiveAwarenessEvent('COPY_ATTEMPT');
      }}
      onClick={() => {
        soundEngine.unlockAudio();
        // If user is speaking in LISTENING mode and taps the screen, finish recording immediately
        if (
          micEnabled &&
          screenState === 'LISTENING' &&
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === 'recording'
        ) {
          mediaRecorderRef.current.stop();
          return;
        }
        // Detect if the user is rapidly poking/tapping the empty screen (4+ taps in 2.4s) without typing!
        if (!micEnabled && screenState === 'IDLE' && userDraftRef.current.length === 0) {
          const now = Date.now();
          const recentTaps = screenTapTimestampsRef.current
            .filter((t) => now - t < 2400)
            .concat(now);
          screenTapTimestampsRef.current = recentTaps;
          if (recentTaps.length >= 4) {
            screenTapTimestampsRef.current = [];
            triggerLiveAwarenessEvent('SCREEN_POKING');
          }
        }
        if (
          !micEnabled &&
          screenState !== 'SEARCHING' &&
          screenState !== 'FOUND_BELL' &&
          screenState !== 'BOOTING'
        ) {
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

      {/* Top Subtle Replay / Mic / App Download Trigger */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="w-full flex items-center justify-between z-30 shrink-0"
      >
        {lastReplySlides && screenState === 'IDLE' ? (
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
              setScreenState('SPEAKING');
              soundEngine.playSlidePromisesSequentially(
                lastReplySlides.map((s) => Promise.resolve(s)),
                {
                  onSlideRender: (rendered) => setActiveSlide({ ...rendered }),
                  onAllComplete: () => setScreenState('IDLE'),
                }
              );
            }}
            className="min-h-[44px] px-2 font-cmd text-lg sm:text-xl uppercase phosphor-text opacity-65 hover:opacity-100 cursor-pointer touch-manipulation"
          >
            REPLAY
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-3 sm:gap-4">
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
            className="min-h-[44px] px-2.5 flex items-center gap-1.5 font-cmd text-lg sm:text-xl uppercase phosphor-text opacity-75 hover:opacity-100 cursor-pointer touch-manipulation border border-[#E2F6C2]/40 bg-[#0A261E]/40"
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
                className="inline-block w-[0.45em] h-[0.78em] bg-[#E2F6C2] ml-2 align-baseline cursor-block"
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
