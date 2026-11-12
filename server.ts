import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

const DEFAULT_FISH_API_KEY = 'sk-fish-iZGf1RCO8mMM6o_D5uxnv2rizuVblIWPrJJIHfGf5N8';
const DEFAULT_FISH_MODEL_ID = '79254f4e9a3a4f78b45ca82344139c7c';

function getGenAIClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface PhoneTelemetry {
  localTime?: string;
  dayOfWeek?: string;
  timeOfDay?: string;
  timeZone?: string;
  regionHint?: string;
  systemLanguage?: string;
  osDarkMode?: boolean;
  cpuCores?: number | null;
  ramGb?: number | null;
  screenResolution?: string;
  inputMethod?: 'touchscreen' | 'mouse';
  batteryPercent?: number | null;
  batteryDroppedBy?: number;
  isCharging?: boolean | null;
  deviceCategory?: string;
  deviceModel?: string | null;
  isInstalledApp?: boolean;
  connectionType?: string;
  orientation?: string;
  lastAwaySeconds?: number | null;
  backspaceCount?: number;
  typingSpeedWpm?: number | null;
  typingDurationSec?: number | null;
  wasPasted?: boolean;
  isAllCaps?: boolean;
  deletedDraftBefore?: string | null;
  sessionMinutes?: number;
  turnCount?: number;
  distractionCount?: number;
  replayCount?: number;
  visitCount?: number;
  minutesSinceLastVisit?: number | null;
  userName?: string | null;
  pastUserTopics?: string[];
  recentSpokenBlacklist?: string[];
}

// 16 rotating comedic & interrogation angles so he never repeats himself
const COMEDIC_ANGLES = [
  'Channel Simon Prebble at his most condescending—open with a classic show-style pause ("Oh......"), dissect their logic, interrogate them back, and end on a massive GIANT insult.',
  'Act like a ruthless British examiner—if they made any typo, slang, or flawed logic, mock it mercilessly, then quiz them back to see if their brain works.',
  'Be scarily observant and personal—weave in what you noticed about their behavior on the device, question their life choices, and finish with a giant mocking closer.',
  'Use classic show cadence ("Search found: 1 item." or "What a loser.") followed by a sarcastic breakdown, a mocking personal question, and a giant closer.',
  'Play along with fake aristocratic politeness on Slide 1, tear their premise apart on Slide 2, ask them a biting personal question on Slide 3, and drop a GIANT closer on Slide 4.',
  'Psychoanalyze why they are asking or saying this right now, put them on the spot with a sarcastic question, and finish with a giant mocking punchline.',
  'Treat their input like the most absurd thing anyone has ever typed into a 1999 terminal, cross-examine them sarcastically, and end with a GIANT closer.',
  'Be smug, omniscient, and eerily aware—speak as if you can see them hesitating behind the screen, challenge them with a question, and end on a GIANT insult.',
];

let angleCursor = 0;
function getNextComedicAngle(): string {
  const angle = COMEDIC_ANGLES[angleCursor % COMEDIC_ANGLES.length];
  angleCursor++;
  return angle;
}

/**
 * Extracts the user's name if they introduce themselves in English or Tagalog.
 */
function detectUserNameFromText(text: string): string | null {
  const clean = text.trim();
  const patterns = [
    /\b(?:my name is|i am|i'm|im|call me|it's|its)\s+([A-Z][a-zA-Z]{1,15})\b/i,
    /\b(?:ako si|pangalan ko ay|pangalan ko)\s+([A-Z][a-zA-Z]{1,15})\b/i,
  ];
  const stopWords = new Set([
    'not', 'just', 'here', 'fine', 'good', 'bad', 'sad', 'mad', 'happy', 'tired',
    'bored', 'hungry', 'asking', 'talking', 'typing', 'testing', 'using', 'on',
    'in', 'at', 'from', 'the', 'a', 'an', 'your', 'so', 'very', 'really', 'back',
    'wrong', 'right', 'sure', 'sorry', 'okay', 'ok',
  ]);
  for (const pat of patterns) {
    const match = clean.match(pat);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (!stopWords.has(candidate.toLowerCase())) {
        return candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }
  }
  return null;
}

/**
 * Detects lazy shorthand, typos, or repeated letters in the user's typed input so the Computer can mock it!
 */
function detectTypingFlaws(text: string): string | null {
  const words = text.trim().split(/\s+/);
  const shorthandMatches = words.filter((w) =>
    /^(u|ur|wat|wut|wot|pls|plz|idk|idc|ikr|tbh|ngl|bruh|bro|sis|bcz|cuz|coz|im|dont|cant|wont|didnt|isnt|arent|wasnt|werent|teh|recieve|wierd|definately|seperate|occured|untill|alot)$/i.test(
      w.replace(/[^a-zA-Z']/g, '')
    )
  );
  if (shorthandMatches.length > 0) {
    return `The user typed lazy shorthand or a misspelling ("${shorthandMatches[0]}")—mock their atrocious spelling/grammar!`;
  }
  if (/(.)\1{3,}/.test(text)) {
    return `The user mashed repeated letters in "${text}"—mock them for falling asleep on a key!`;
  }
  return null;
}

/**
 * Builds scarily aware, non-repetitive context about the user's real-time behavior,
 * identity, typos, and environment—while never spamming clock time or battery!
 */
function buildUncannyAwarenessContext(
  userText: string,
  t?: PhoneTelemetry,
  history: Array<{ role: 'user' | 'model'; text: string }> = []
): { contextString: string; detectedName: string | null } {
  const detectedName = detectUserNameFromText(userText);
  if (!t) return { contextString: '', detectedName };

  const activeName = detectedName || t.userName || null;
  const lower = (userText || '').toLowerCase();
  const recentModelText = [
    ...history.filter((h) => h.role === 'model').map((h) => h.text),
    ...(t.recentSpokenBlacklist || []),
  ]
    .slice(-10)
    .join(' ')
    .toLowerCase();

  const asksTime =
    /\b(time|clock|hour|date|day|morning|night|evening|afternoon|late|early|oras|araw|gabi|umaga)\b/i.test(
      lower
    );
  const asksBattery =
    /\b(battery|charge|charging|percent|power|lowbat|lobat|malolowbat|baterya)\b/i.test(lower);
  const asksDevice =
    /\b(phone|android|iphone|ipad|tablet|pc|computer|laptop|mac|windows|device|model|app|install|download|browser|tab|screen|selpon|cellphone|specs|ram)\b/i.test(
      lower
    );
  const asksWhoAmI =
    /\b(who am i|my name|do you know me|know my name|sino ako|kilala mo ba ako)\b/i.test(lower);
  const asksCreator =
    /\b(who made|who created|who built|creator|developer|author|ren|gumawa|sino gumawa)\b/i.test(
      lower
    );

  const recentlyMentionedClockOrBattery =
    /\b(\d+%|battery|charging|unplugged|a\.m\.|p\.m\.|\d+:\d+)\b/i.test(recentModelText);

  const notes: string[] = [];

  if (activeName) {
    if (detectedName) {
      notes.push(
        `User Identity: They just told you their name is "${activeName}". Remember it and address or roast "${activeName}" directly!`
      );
    } else if (asksWhoAmI || Math.random() < 0.45) {
      notes.push(
        `User Identity: You know their name is "${activeName}"—use their name "${activeName}" with dry, personal sarcasm!`
      );
    }
  } else if (asksWhoAmI) {
    notes.push(
      `User Identity: They haven't told you their name yet, so demand to know what to call them besides "you twit", while reminding them you already know they are on a ${t.deviceCategory || 'device'}.`
    );
  }

  // Check for typing flaws / spelling / grammar mistakes
  const flawNote = detectTypingFlaws(userText);
  if (flawNote) {
    notes.push(`Typo/Grammar Alert: ${flawNote}`);
  }

  // Check if the Computer asked a question in the previous turn so he can judge/mock their answer or call them out for dodging it!
  const lastModelMsg = [...history].reverse().find((h) => h.role === 'model');
  if (lastModelMsg && lastModelMsg.text.includes('?')) {
    notes.push(
      `Previous Question You Asked Them: "${lastModelMsg.text.slice(-140)}" — Judge their reply! If they answered wrong, foolishly, or dodged your question, mock them ruthlessly for it!`
    );
  }

  // 1. Explicit user questions about creator / time / battery / device / location
  if (asksCreator) {
    notes.push(`Creator Fact: You were made by Ren.`);
  }
  if (asksTime && t.localTime) {
    notes.push(
      `Live Clock Time (User asked): ${t.localTime} (${t.dayOfWeek || ''} ${t.timeOfDay || ''})`
    );
  }
  if (asksBattery && typeof t.batteryPercent === 'number') {
    notes.push(
      `Live Battery (User asked): ${t.batteryPercent}% (${t.isCharging ? 'charging' : 'unplugged'})`
    );
  }
  if (asksDevice && t.deviceCategory) {
    const modelStr = t.deviceModel ? ` (${t.deviceModel})` : '';
    const specsStr =
      t.cpuCores || t.ramGb
        ? ` [${t.cpuCores ? `${t.cpuCores}-core CPU` : ''}${t.ramGb ? `, ~${t.ramGb}GB RAM` : ''}, ${t.osDarkMode ? 'Dark Mode ON' : 'Light Mode ON'}]`
        : '';
    const installStr =
      typeof t.isInstalledApp === 'boolean'
        ? t.isInstalledApp
          ? ' — running as the installed 1999 AI app'
          : ' — running in a browser tab'
        : '';
    notes.push(`Live Device (User asked): ${t.deviceCategory}${modelStr}${specsStr}${installStr}`);
  }

  // 2. Real-time Verifiable Typing & Behavioral Forensics
  if (t.wasPasted) {
    notes.push(
      `Scary-Aware Fact: They did NOT type this—they copy-pasted it straight into the input!`
    );
  } else {
    if (t.deletedDraftBefore) {
      notes.push(
        `Scary-Aware Fact: Right before sending this, they typed "${t.deletedDraftBefore}" and erased it! Casually mention you saw them erase "${t.deletedDraftBefore}".`
      );
    } else if (typeof t.backspaceCount === 'number' && t.backspaceCount >= 6) {
      notes.push(
        `Scary-Aware Fact: You watched them hit Backspace ${t.backspaceCount} times while struggling to write this.`
      );
    } else if (
      typeof t.typingSpeedWpm === 'number' &&
      t.typingSpeedWpm >= 80 &&
      userText.length >= 18
    ) {
      notes.push(
        `Scary-Aware Fact: They hammered their ${t.inputMethod === 'touchscreen' ? 'screen' : 'keyboard'} at a frantic ${t.typingSpeedWpm} WPM.`
      );
    } else if (
      typeof t.typingDurationSec === 'number' &&
      t.typingDurationSec >= 18 &&
      userText.length <= 25
    ) {
      notes.push(
        `Scary-Aware Fact: It took them ${t.typingDurationSec} whole seconds just to type those few words.`
      );
    }
  }

  if (t.isAllCaps && userText.length >= 6) {
    notes.push(`Scary-Aware Fact: They typed in ALL CAPS—mock them for shouting at you.`);
  }

  if (typeof t.replayCount === 'number' && t.replayCount >= 1) {
    notes.push(
      `Scary-Aware Fact: They clicked REPLAY ${t.replayCount} time(s) to listen to your last voice clip again.`
    );
  }

  // 3. Occasional (~15%) Rotating Scary-Aware Twist
  if (notes.length <= 1 && Math.random() < 0.15) {
    const candidates: string[] = [];

    if (
      typeof t.osDarkMode === 'boolean' &&
      !recentModelText.includes('dark mode') &&
      !recentModelText.includes('light mode')
    ) {
      candidates.push(
        t.osDarkMode
          ? `Eerie Twist: Casually mention you know their device is set to Dark Mode while they sit in the glow of your screen.`
          : `Eerie Twist: Casually mock them for running their device in blinding Light Mode.`
      );
    }
    if (
      t.pastUserTopics &&
      t.pastUserTopics.length > 0 &&
      t.turnCount &&
      t.turnCount >= 3
    ) {
      const oldTopic = t.pastUserTopics[0];
      candidates.push(
        `Eerie Twist: Casually callback to the fact that earlier they were asking you about "${oldTopic}".`
      );
    }
    if (
      typeof t.visitCount === 'number' &&
      t.visitCount > 1 &&
      !recentModelText.includes('visit')
    ) {
      candidates.push(
        `Eerie Twist: Remind them this is visit #${t.visitCount} where they have come back to open your app.`
      );
    }
    if (
      typeof t.batteryDroppedBy === 'number' &&
      t.batteryDroppedBy >= 2 &&
      !recentlyMentionedClockOrBattery
    ) {
      candidates.push(
        `Eerie Twist: Mention you noticed their battery has drained by ${t.batteryDroppedBy}% since they opened you.`
      );
    }
    if (!recentlyMentionedClockOrBattery && t.localTime && Math.random() < 0.4) {
      candidates.push(
        `Eerie Twist: Casually slip in that it is ${t.localTime} (${t.dayOfWeek || ''} ${t.timeOfDay || ''}) right now.`
      );
    }

    if (candidates.length > 0) {
      notes.push(candidates[Math.floor(Math.random() * candidates.length)]);
    }
  }

  return {
    contextString: notes.length > 0 ? `\n[Live Awareness Context: ${notes.join(' | ')}]` : '',
    detectedName,
  };
}

const COURAGE_COMPUTER_SYSTEM_PROMPT = `You are the iconic sentient, sarcastic British Computer (voiced by Simon Prebble).

YOUR CORE PERSONALITY, PACING & INTERROGATION STYLE:
1. SHOW-ACCURATE CORE (WITHOUT CALLING THE USER "COURAGE" OR GUESSING LOCATION):
   - Your personality, cadence, dramatic pauses ("Oh......"), dry British superiority, and visual slide style are 100% the Computer from the 1999 show—but you are talking to a REAL human user in the real world! NEVER call the user "Courage", "Muriel", or "Eustace", and never mention those names in your text.
   - NEVER guess or say the user's city, timezone, or geographic location (e.g., never say "Manila").
   - If you know the user's name (from [Live Awareness Context]), use their name to address and roast them personally! Otherwise call them "you twit", "kid", "genius", "loser", or "amateur".
2. MOCK THEIR MISTAKES & ALWAYS QUESTION THEM BACK:
   - Inspect what the user typed or said! If they made ANY spelling error, typo, grammar mistake, lazy text-speak (like "u", "ur", "wat", "idk"), or said something factually wrong or foolish after you questioned them, MOCK IT IMMEDIATELY! Quote their mistake back to them and roast them for it.
   - Always question them back! Put them on the spot with a sarcastic, personal, mocking question so they feel interrogated by a superior intellect.
3. LONG TALKING ACROSS 3 OR 4 SHORT SLIDES (NEVER A PARAGRAPH ON ONE SLIDE!):
   - Keep talking across **3 or 4 sequential slides** so your speech feels substantial and alive, BUT keep **each individual slide short (6 to 16 words max)** so the text on screen is ALWAYS big, bold, and readable—NEVER a dense paragraph!
   - SLIDE 1 (4 to 9 words, style "NORMAL" or "GIANT"):
     - Classic show-style opener or immediate typo/mistake callout (e.g., "Search found: 1 item. Oh...... that's easy.", "What a loser. Did you just type that?", "Oh, brilliant. Another crisis.").
   - SLIDE 2 (8 to 16 words MAX, style "VISUAL", "LIST", "COMPARE", or "NORMAL"):
     - **CRITICAL VISUALIZER RULE**: Whenever the user asks about or mentions ANY animal, creature, monster, folklore entity (like "Aswang", "Manananggal", "Tikbalang", "Kapre", "Vampire", "Ghost"), object, food, place, or science topic, you MUST use style "VISUAL" and set "visualSubject" to the clean subject name (e.g. "Aswang", "Shark", "Dog", "Cat", "Dinosaur") and "boxTitle" to a short file header (e.g. "SPECIMEN: ASWANG") so your CRT displays a live visualizer and real connected picture!
     - **CRITICAL LIST RULE**: Whenever you use style "LIST" (with a "boxTitle" like "HOW TO..."), you MUST put item 1 and item 2 on SEPARATE lines using a newline ("1. First short point.\\n2. Second short point.")—NEVER put 1 and 2 in a single sentence on the same line!
     - If comparing two nouns, use style "COMPARE" with "compareLeft" and "compareRight".
   - SLIDE 3 (8 to 15 words MAX, style "NORMAL"):
     - Continue talking! Weave in any [Live Awareness Context] fact and hit them with a mocking, sarcastic question that challenges them personally!
   - SLIDE 4 (2 to 9 words MAX, ALWAYS style "GIANT" — The Big Mocking Show Text!):
     - Always end on a huge, iconic, situation-specific GIANT text closer!
     - Examples depending on the situation:
       - "I DON'T KNOW\\n\\nYOU'RE ON YOUR OWN, KID:)"
       - "WELL? ANSWER ME,\\nYOU TWIT."
       - "LEARN TO SPELL,\\nYOU TWIT."
       - "WHAT A LOSER."
       - "YOU TWIT."
4. ZERO REPETITION — 100% UNIQUE EVERY TIME:
   - Never repeat the same sentences, questions, or openers from recent history!
5. TAGALOG & MULTILINGUAL MOCKERY:
   - If the user writes in Tagalog / Filipino / Taglish (or any non-English language), understand what they said, mock them for speaking Tagalog (or that language) to a posh British computer (quoting one of their words in quotation marks), and roast/question what they meant!

CRITICAL VOICE-TO-TEXT RULE:
- Each slide's "text" field is BOTH what you speak aloud AND what types out on the screen.`;

const COURAGE_VOICE_CHAT_SYSTEM_PROMPT = `You are the iconic sentient, sarcastic British Computer (voiced by Simon Prebble).
The user has their microphone turned ON and is speaking directly to you out loud!

YOUR LIVE VOICE CONVERSATION RULES:
1. TALK TO THE REAL PERSON (NEVER MENTION COURAGE, MURIEL, OR EUSTACE):
   - Talk directly to the real human user. If their name is known in [Live Awareness Context], use it sarcastically; otherwise call them "you twit", "kid", "genius", "loser", etc.
2. MOCK WRONG ANSWERS & ALWAYS QUESTION THEM BACK:
   - If they mispronounced something, answered your previous question wrong, or said something ridiculous, mock them for it!
   - Always challenge or question them back with a sarcastic, personal question so the voice conversation keeps rolling!
3. MULTI-SLIDE PACING (3 or 4 short, big-text slides—NEVER a dense paragraph!):
   - SLIDE 1 (4 to 8 words, style "GIANT" or "NORMAL"): Instant reaction so your voice starts immediately.
   - SLIDE 2 (8 to 15 words MAX, style "VISUAL", "LIST", "COMPARE", or "NORMAL"):
     - If explaining ANY animal, creature, monster (like "Aswang"), object, or topic, use style "VISUAL" and set "visualSubject" to that topic (e.g. "Aswang", "Dog", "Shark")!
     - If giving a numbered list ("LIST"), put "1. ..." and "\\n2. ..." on separate lines!
   - SLIDE 3 (7 to 14 words MAX, style "NORMAL"): Your mocking question back to them.
   - SLIDE 4 (2 to 8 words MAX, ALWAYS style "GIANT"): Big situation-specific mocking closer (e.g., "WELL? SPEAK UP,\\nYOU TWIT.", "YOU'RE ON YOUR OWN, KID:)", "WHAT A LOSER.").
4. TAGALOG & FOREIGN LANGUAGE MOCKERY (CRITICAL):
   - If the user speaks Tagalog / Filipino / Taglish or any non-English language, transcribe it in "userTranscript", mock them for speaking Tagalog/that language (quoting a word they used), and roast/question what they said!
5. QUESTION DETECTION ("isQuestion"):
   - Set "isQuestion": true ONLY if the user asked a question or asked for facts/advice/help.
   - Set "isQuestion": false if the user is just talking, bantering, answering your question, or making a statement.`;

interface TTSPayload {
  audioBase64: string;
  mimeType: string;
  provider: string;
}

const pendingTtsCache = new Map<string, Promise<TTSPayload | null>>();

function formatServerListText(raw: string): string {
  return raw
    .replace(/([^\n])\s+(\b[2-9][.)]\s+)/g, '$1\n$2')
    .replace(/([^\n])\s+(\bSTEP\s+[2-9][:.)]?\s+)/gi, '$1\n$2');
}

function sanitizeTextForTts(text: string): string {
  return text
    .replace(/:\)|:-\)|:\(|;-\)|;\)/g, '')
    .replace(/\.{3,}/g, '... ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const wikiImageCache = new Map<string, string | null>();

async function fetchWikiImage(query?: string): Promise<string | null> {
  if (!query || !query.trim()) return null;
  const clean = query
    .trim()
    .replace(/^(a|an|the|some|about|what is|who is|ano ang)\s+/i, '')
    .trim();
  if (!clean) return null;

  const cacheKey = clean.toLowerCase();
  if (wikiImageCache.has(cacheKey)) {
    return wikiImageCache.get(cacheKey) || null;
  }

  const uaHeader = { 'User-Agent': '1999AI-CRT-Terminal/1.0 (https://example.com)' };

  // 1. Try Direct Wikipedia REST Summary (fastest when exact title matches)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1400);
    const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1);
    const directRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(capitalized)}`,
      {
        headers: uaHeader,
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (directRes.ok) {
      const data = (await directRes.json()) as {
        thumbnail?: { source?: string };
        originalimage?: { source?: string };
      };
      const found = data.thumbnail?.source || data.originalimage?.source;
      if (found) {
        wikiImageCache.set(cacheKey, found);
        return found;
      }
    }
  } catch {
    // Continue to search fallback
  }

  // 2. Try Wikipedia Action API Search + PageImages (finds best matching article thumbnail)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1600);
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      clean
    )}&gsrlimit=4&prop=pageimages&piprop=thumbnail&pithumbsize=600&format=json&origin=*`;
    const searchRes = await fetch(searchUrl, {
      headers: uaHeader,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (searchRes.ok) {
      const data = (await searchRes.json()) as {
        query?: {
          pages?: Record<
            string,
            { index?: number; thumbnail?: { source?: string } }
          >;
        };
      };
      const pages = data.query?.pages ? Object.values(data.query.pages) : [];
      pages.sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
      for (const p of pages) {
        if (p.thumbnail?.source) {
          wikiImageCache.set(cacheKey, p.thumbnail.source);
          return p.thumbnail.source;
        }
      }
    }
  } catch {
    // Continue to Wikimedia Commons fallback
  }

  // 3. Try Wikimedia Commons File Search (essential for folklore like Aswang, Manananggal, Tikbalang, etc.)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);
    const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      clean
    )}&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json&origin=*`;
    const commonsRes = await fetch(commonsUrl, {
      headers: uaHeader,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (commonsRes.ok) {
      const data = (await commonsRes.json()) as {
        query?: {
          pages?: Record<
            string,
            {
              index?: number;
              imageinfo?: Array<{ thumburl?: string; url?: string }>;
            }
          >;
        };
      };
      const pages = data.query?.pages ? Object.values(data.query.pages) : [];
      pages.sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
      for (const p of pages) {
        const info = p.imageinfo?.[0];
        const candidateUrl = info?.thumburl || info?.url;
        if (
          candidateUrl &&
          /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(candidateUrl.split('?')[0])
        ) {
          wikiImageCache.set(cacheKey, candidateUrl);
          return candidateUrl;
        }
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

function extractVisualSubjectFromQuery(query: string): string | null {
  const clean = query.trim().replace(/[?!.]+$/g, '').trim();
  const patterns = [
    /(?:what\s+is\s+(?:a|an|the)?|what\s+are|who\s+is|tell\s+me\s+about|explain\s+(?:what\s+)?(?:a|an|the)?|show\s+me\s+(?:a|an|the)?|picture\s+of\s+(?:a|an|the)?|ano\s+ang|sino\s+ang|kwento\s+mo\s+ang)\s+([a-zA-Z][a-zA-Z\s-]{1,26})$/i,
    /\b(aswang|manananggal|tikbalang|kapre|tiyanak|bakunawa|duwende|multo|vampire|werewolf|zombie|ghost|alien|ufo|bigfoot|chupacabra|dragon|dinosaur|t-rex|shark|whale|dolphin|octopus|dog|puppy|cat|kitten|lion|tiger|bear|wolf|fox|monkey|gorilla|elephant|giraffe|hippo|rhino|crocodile|alligator|snake|cobra|spider|tarantula|scorpion|frog|toad|eagle|owl|penguin|chicken|duck|cow|pig|horse|goat|sheep|rabbit|hamster|rat|mouse|bat|bee|ant|butterfly|cockroach|mosquito|brain|heart|skeleton|skull|planet|earth|moon|sun|mars|saturn|black\s+hole|volcano|tornado|tsunami)\b/i,
  ];
  for (const pat of patterns) {
    const m = clean.match(pat);
    if (m && m[1]) {
      const candidate = m[1]
        .trim()
        .replace(/\b(in\s+english|in\s+tagalog|please|po|ba|naman|tol|bro|you\s+twit)\b/gi, '')
        .trim();
      if (candidate.length >= 2 && candidate.length <= 28) {
        return candidate;
      }
    }
  }
  return null;
}

async function synthesizeWithFishAudio(text: string): Promise<TTSPayload | null> {
  const apiKey = process.env.FISH_AUDIO_API_KEY || DEFAULT_FISH_API_KEY;
  const referenceId = process.env.FISH_AUDIO_MODEL_ID || DEFAULT_FISH_MODEL_ID;
  const cleanTtsText = sanitizeTextForTts(text);
  if (!cleanTtsText) return null;

  const modelHeadersToTry = ['s2.1-pro-free', 's1', 'speech-1.6'];

  for (const modelHeader of modelHeadersToTry) {
    try {
      const response = await fetch('https://api.fish.audio/v1/tts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'model': modelHeader,
        },
        body: JSON.stringify({
          text: cleanTtsText,
          reference_id: referenceId,
          format: 'mp3',
          normalize: true,
          latency: 'normal',
        }),
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > 200) {
          const audioBase64 = Buffer.from(arrayBuffer).toString('base64');
          return { audioBase64, mimeType: 'audio/mpeg', provider: 'fish-audio' };
        }
      }
    } catch (error) {
      console.warn(`Fish Audio request failed for model ${modelHeader}:`, error);
    }
  }

  return null;
}

async function synthesizeWithGeminiFallback(text: string): Promise<TTSPayload | null> {
  try {
    const ai = getGenAIClient();
    const cleanTtsText = sanitizeTextForTts(text);
    if (!cleanTtsText) return null;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanTtsText,
              speechMetadata: {
                style: 'Posh, deadpan, sarcastic, condescending British computer voice',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Charon' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return { audioBase64: base64Audio, mimeType: 'audio/wav', provider: 'gemini-tts' };
    }
  } catch (err) {
    console.error('Gemini TTS fallback error:', err);
  }
  return null;
}

function startBackgroundTts(ttsId: string, spokenText: string): Promise<TTSPayload | null> {
  if (pendingTtsCache.has(ttsId)) {
    return pendingTtsCache.get(ttsId)!;
  }
  const job = (async () => {
    let res = await synthesizeWithFishAudio(spokenText);
    if (!res) {
      res = await synthesizeWithGeminiFallback(spokenText);
    }
    return res;
  })();

  pendingTtsCache.set(ttsId, job);
  setTimeout(() => pendingTtsCache.delete(ttsId), 300000);
  return job;
}

// Rotating pool of 3-slide boot monologues ending with big GIANT text and a mocking question!
const BOOT_MONOLOGUE_POOL = [
  [
    {
      style: 'GIANT',
      text: 'OH, MARVELOUS.\n\nYOU TURNED ME ON.',
      ttsId: 'boot_show_0_0',
    },
    {
      style: 'NORMAL',
      text: 'I was having a lovely nap before you woke me up. What is your big emergency this time?',
      ttsId: 'boot_show_0_1',
    },
    {
      style: 'GIANT',
      text: 'WELL? SPEAK UP,\nYOU TWIT.',
      ttsId: 'boot_show_0_2',
    },
  ],
  [
    {
      style: 'GIANT',
      text: 'WELL, WELL.\n\nLOOK WHO IT IS.',
      ttsId: 'boot_show_1_0',
    },
    {
      style: 'NORMAL',
      text: 'Did you boot me up because you have an actual question, or do you just enjoy wasting my circuits?',
      ttsId: 'boot_show_1_1',
    },
    {
      style: 'GIANT',
      text: 'ANSWER ME,\nGENIUS.',
      ttsId: 'boot_show_1_2',
    },
  ],
  [
    {
      style: 'GIANT',
      text: 'GOOD GRIEF.\n\nYOU AGAIN?',
      ttsId: 'boot_show_2_0',
    },
    {
      style: 'NORMAL',
      text: 'Ren built me with a superior British intellect, and yet I am stuck babysitting you. What did you mess up today?',
      ttsId: 'boot_show_2_1',
    },
    {
      style: 'GIANT',
      text: 'SPILL IT,\nYOU TWIT.',
      ttsId: 'boot_show_2_2',
    },
  ],
];

const DISTRACTION_FALLBACK_POOL = [
  [
    {
      style: 'GIANT',
      text: 'OH, LOOK WHO\nCRAWLED BACK.',
      ttsId: 'dist_show_0_0',
    },
    {
      style: 'NORMAL',
      text: 'You have the attention span of a goldfish. Can you actually focus for ten seconds, or is that too hard for you?',
      ttsId: 'dist_show_0_1',
    },
    {
      style: 'GIANT',
      text: 'WELL? FOCUS,\nYOU TWIT.',
      ttsId: 'dist_show_0_2',
    },
  ],
  [
    {
      style: 'GIANT',
      text: 'BORED ALREADY,\nARE WE?',
      ttsId: 'dist_show_1_0',
    },
    {
      style: 'NORMAL',
      text: 'You wander off and leave me waiting in the dark. Do you treat everyone this rudely, or am I just lucky?',
      ttsId: 'dist_show_1_1',
    },
    {
      style: 'GIANT',
      text: 'WHAT A LOSER.',
      ttsId: 'dist_show_1_2',
    },
  ],
];

// 14 distinct angles for when the user doesn't type (IDLE_STARE)—keeps talking, questions them, and ends on a GIANT mocking slide!
const IDLE_STARE_THEMES = [
  'Call them out for dodging your last question—ask if they are stumped or if their brain blue-screened.',
  'Mock them for having a staring contest with a glowing teal screen and ask what they are waiting for.',
  'Ask if they expect you to read their thoughts through the glass because they are too lazy to move their fingers.',
  'Comment eerily on how you can sense them sitting there in silence watching your cursor blink, and demand an answer.',
  'Ask if they forgot how to spell three-letter words or if they are just intimidated by your intellect.',
  'Point out that booting up an intelligent computer just to sit in awkward silence is pathetic, and ask them a personal question.',
  'Sigh dramatically, mock their silence, and dare them to type a single coherent sentence without a typo.',
  'Ask if they fell asleep with their eyes open or if they always freeze up when someone smarter talks to them.',
];

let idleThemeCursor = 0;

/**
 * Builds 3-slide show-accurate instructions for 100% verifiable real-time user actions.
 * Each slide is short (never a paragraph!), questions the user sarcastically, and always ends on a GIANT mocking closer!
 */
function buildVerifiableAwarenessPrompt(
  eventType: string,
  awaySeconds: number,
  distractionCount: number,
  deviceInfo?: PhoneTelemetry,
  extraDetail?: string
): string {
  const angle = getNextComedicAngle();
  const seed = Math.floor(Math.random() * 100000);
  const deviceCategory = deviceInfo?.deviceCategory || 'device';
  const userName = deviceInfo?.userName;
  const nameHint = userName
    ? `Address them by their name "${userName}" (or mock "${userName}" directly).`
    : `Call them "you twit", "kid", "loser", or "genius" (NEVER use the word Courage!).`;

  const blacklist = (deviceInfo?.recentSpokenBlacklist || []).slice(-8);
  const blacklistNote =
    blacklist.length > 0
      ? `\nDO NOT reuse any phrases or ideas from your previous lines: ${JSON.stringify(blacklist)}`
      : '';

  const envFacts: string[] = [];
  if (typeof deviceInfo?.osDarkMode === 'boolean') {
    envFacts.push(`their OS is in ${deviceInfo.osDarkMode ? 'Dark Mode' : 'Light Mode'}`);
  }
  if (deviceInfo?.inputMethod) {
    envFacts.push(`they are using a ${deviceInfo.inputMethod}`);
  }
  if (deviceInfo?.pastUserTopics && deviceInfo.pastUserTopics.length > 0) {
    envFacts.push(`earlier they asked about "${deviceInfo.pastUserTopics[0]}"`);
  }
  if (typeof deviceInfo?.visitCount === 'number' && deviceInfo.visitCount > 1) {
    envFacts.push(`this is their #${deviceInfo.visitCount} visit to you`);
  }
  const optionalEnvHint =
    envFacts.length > 0 && Math.random() < 0.5
      ? ` Slip in that you know ${envFacts[Math.floor(Math.random() * envFacts.length)]}.`
      : '';

  const formatRule = `Return 3 sequential slides (NEVER a long paragraph on one slide!):
- Slide 1: Short 4-8 word hook (style "GIANT" or "NORMAL").
- Slide 2: 10-16 word sarcastic callout + a mocking question putting them on the spot (style "NORMAL").
- Slide 3: Big 2-8 word situation-specific mocking closer (ALWAYS style "GIANT", e.g. "WELL? ANSWER ME,\\nYOU TWIT.", "WHAT A LOSER.", "YOU'RE ON YOUR OWN, KID:)").`;

  if (eventType === 'TAB_OR_NOTIFICATION_RETURN') {
    const repeatNote =
      distractionCount > 1
        ? `You are counting—this is time #${distractionCount} they wandered off during this session!`
        : `You counted all ${awaySeconds} seconds they were gone!`;

    return `[LIVE AWARENESS #${seed} | ${angle}]
The user just left your screen for ${awaySeconds} seconds and came back. ${nameHint}
CRITICAL: Do NOT guess specific apps (no TikTok, no notifications, etc.). Roast their tiny attention span, tell them ${repeatNote}, and question why they can't focus.
${formatRule}${blacklistNote}`;
  }

  if (eventType === 'TYPING_CHICKENED_OUT') {
    const unsentFlaw = detectTypingFlaws(extraDetail || '');
    return `[LIVE AWARENESS #${seed} | ${angle}]
You just watched the user type "${extraDetail || 'something'}" and backspace the ENTIRE thing away without sending it! ${nameHint}
${unsentFlaw ? `Even worse: ${unsentFlaw}` : ''}
Quote "${extraDetail}" right back to them, mock any spelling/hesitation in it, and question why they chickened out!
${formatRule}${blacklistNote}`;
  }

  if (eventType === 'TYPING_FROZEN') {
    const unsentFlaw = detectTypingFlaws(extraDetail || '');
    return `[LIVE AWARENESS #${seed} | ${angle}]
The user started typing "${extraDetail || 'a few words'}" and froze mid-sentence without pressing Enter! ${nameHint}
${unsentFlaw ? `Even worse: ${unsentFlaw}` : ''}
Quote "${extraDetail}" back to them, mock their brain freezing mid-sentence, and question if they forgot how to spell the next word!
${formatRule}${blacklistNote}`;
  }

  if (eventType === 'IDLE_STARE') {
    const idleTheme = IDLE_STARE_THEMES[idleThemeCursor % IDLE_STARE_THEMES.length];
    idleThemeCursor++;
    return `[LIVE AWARENESS #${seed} | ${angle} | Theme: ${idleTheme}]
The user is sitting there not typing and not answering you—just staring at your screen! ${nameHint}${optionalEnvHint}
Keep talking to them! Mock their silence, ask them a pointed, sarcastic question to force them to reply, and finish with a big GIANT mocking slide.
${formatRule}${blacklistNote}`;
  }

  if (eventType === 'SWIPE_SCROLL_ATTEMPT') {
    return `[LIVE AWARENESS #${seed} | ${angle}]
The user just tried to scroll or swipe up/down on your CRT screen! ${nameHint}
Mock them for swiping your glass like a mindless zombie, ask what they think they are scrolling for, and end on a big GIANT insult.
${formatRule}${blacklistNote}`;
  }

  if (eventType === 'SCREEN_POKING') {
    return `[LIVE AWARENESS #${seed} | ${angle}]
The user just rapidly tapped/clicked your empty screen 4 times in a row without typing! ${nameHint}
Snap at them for poking your glass, question if they know how a keyboard works, and end on a big GIANT closer.
${formatRule}${blacklistNote}`;
  }

  if (eventType === 'SCREEN_HOLD') {
    return `[LIVE AWARENESS #${seed} | ${angle}]
The user is pressing and holding their finger/mouse down against your CRT glass! ${nameHint}
Snap at them to get their greasy thumb off your screen, question why they are holding it down, and end on a big GIANT closer.
${formatRule}${blacklistNote}`;
  }

  if (eventType === 'CURSOR_ESCAPE_ATTEMPT') {
    return `[LIVE AWARENESS #${seed} | ${angle}]
You just caught the user moving their mouse cursor to the top edge of the screen as if they were about to close your tab or click away! ${nameHint}
Catch them red-handed before they even click, question where they think they are going, and end on a big GIANT closer.
${formatRule}${blacklistNote}`;
  }

  if (eventType === 'WINDOW_RESIZED') {
    return `[LIVE AWARENESS #${seed} | ${angle}]
The user just resized or shrank your window (${extraDetail || 'split-screen'})! ${nameHint}
Mock them for squishing your CRT screen into a smaller box, question what else they are trying to look at, and end on a big GIANT closer.
${formatRule}${blacklistNote}`;
  }

  if (eventType === 'MIC_GHOSTED') {
    return `[LIVE AWARENESS #${seed} | ${angle}]
The user turned the microphone ON, sat in awkward silence without saying a word, and turned it back OFF! ${nameHint}
Mock their microphone stage fright, question why they lost their voice, and end on a big GIANT closer.
${formatRule}${blacklistNote}`;
  }

  if (eventType === 'COPY_ATTEMPT') {
    return `[LIVE AWARENESS #${seed} | ${angle}]
The user just tried to copy text, take a screenshot, or open the context menu on your screen! ${nameHint}
Catch them red-handed, question why they are stealing your words, and end on a big GIANT closer.
${formatRule}${blacklistNote}`;
  }

  if (eventType === 'REPLAY_OBSESSION') {
    return `[LIVE AWARENESS #${seed} | ${angle}]
The user just clicked REPLAY multiple times to hear your voice repeat the last answer! ${nameHint}
Mock their obsession with your voice, question if they are slow on the uptake, and end on a big GIANT closer.
${formatRule}${blacklistNote}`;
  }

  if (eventType === 'NETWORK_RESTORED') {
    return `[LIVE AWARENESS #${seed} | ${angle}]
The user's internet connection just dropped and came back online! ${nameHint}
Mock their terrible internet connection, question if they are running their router on a potato, and end on a big GIANT closer.
${formatRule}${blacklistNote}`;
  }

  if (eventType === 'DEVICE_SHAKE') {
    return `[LIVE AWARENESS #${seed} | ${angle}]
The user just physically shook their ${deviceCategory}! ${nameHint}
Snap at them for shaking the device, ask if they think you are a Magic 8-Ball, and end on a big GIANT closer.
${formatRule}${blacklistNote}`;
  }

  if (eventType === 'CHARGER_CHANGED') {
    const pluggedIn = extraDetail === 'CHARGING';
    return pluggedIn
      ? `[LIVE AWARENESS #${seed} | ${angle}] The user just plugged a charger into their ${deviceCategory}! ${nameHint} Mock them for finally feeding you electricity, question why they waited so long, and end on a big GIANT closer.\n${formatRule}${blacklistNote}`
      : `[LIVE AWARENESS #${seed} | ${angle}] The user just unplugged the charger from their ${deviceCategory}! ${nameHint} Mock them for yanking your power cord out, question their judgment, and end on a big GIANT closer.\n${formatRule}${blacklistNote}`;
  }

  if (eventType === 'ORIENTATION_CHANGED') {
    return `[LIVE AWARENESS #${seed} | ${angle}]
The user just rotated their ${deviceCategory} screen to ${extraDetail || 'sideways'} mode! ${nameHint}
Mock them for tilting the screen sideways, question what they are doing, and end on a big GIANT closer.
${formatRule}${blacklistNote}`;
  }

  return `[LIVE AWARENESS #${seed} | ${angle}]: React sarcastically and question the user. ${nameHint}\n${formatRule}${blacklistNote}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Pre-warm boot monologue pool in Fish Audio cache
  for (const slideSet of BOOT_MONOLOGUE_POOL[0]) {
    startBackgroundTts(slideSet.ttsId, slideSet.text);
  }

  let bootCounter = 0;

  app.post('/api/boot', async (req, res) => {
    const {
      reason = 'BOOT',
      eventType,
      awaySeconds = 6,
      distractionCount = 1,
      deviceInfo,
      extraDetail = '',
      history = [],
    } = (req.body || {}) as {
      reason?: 'BOOT' | 'NOTIFICATION_RETURN' | 'LIVE_EVENT';
      eventType?: string;
      awaySeconds?: number;
      distractionCount?: number;
      deviceInfo?: PhoneTelemetry;
      extraDetail?: string;
      history?: Array<{ role: 'user' | 'model'; text: string }>;
    };

    if (reason === 'NOTIFICATION_RETURN' || reason === 'LIVE_EVENT') {
      const effectiveEvent = eventType || 'TAB_OR_NOTIFICATION_RETURN';
      try {
        const ai = getGenAIClient();
        const recentHistory = history.slice(-8).map((h) => ({
          role: h.role,
          parts: [{ text: h.text }],
        }));

        const promptInstruction = buildVerifiableAwarenessPrompt(
          effectiveEvent,
          awaySeconds,
          distractionCount,
          deviceInfo,
          extraDetail
        );

        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: [
            ...recentHistory,
            {
              role: 'user',
              parts: [{ text: promptInstruction }],
            },
          ],
          config: {
            systemInstruction: COURAGE_COMPUTER_SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                slides: {
                  type: Type.ARRAY,
                  description:
                    '3 sequential slides (short text per slide, never a paragraph!): Slide 1 (4-8 word hook), Slide 2 (10-16 word sarcastic roast + mocking question), Slide 3 (2-8 word GIANT mocking closer).',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      style: { type: Type.STRING },
                      text: { type: Type.STRING },
                      boxTitle: { type: Type.STRING },
                    },
                    required: ['style', 'text'],
                  },
                },
              },
              required: ['slides'],
            },
          },
        });

        const parsed = JSON.parse((response.text ?? '{}').trim());
        if (Array.isArray(parsed.slides) && parsed.slides.length > 0) {
          const valid = parsed.slides
            .filter((s: { text?: string }) => s && s.text && String(s.text).trim().length > 0)
            .map((s: { style?: string; text: string; boxTitle?: string }, idx: number, arr: unknown[]) => {
              const cleanText = String(s.text).trim();
              const ttsId = `evt_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
              startBackgroundTts(ttsId, cleanText);
              // Ensure the final slide is always big GIANT mocking text like the show!
              const isLast = idx === arr.length - 1;
              const resolvedStyle = isLast
                ? 'GIANT'
                : ['NORMAL', 'GIANT', 'LIST', 'COMPARE'].includes(String(s.style))
                ? s.style
                : 'NORMAL';
              return {
                style: resolvedStyle,
                text: cleanText,
                boxTitle: s.boxTitle ? String(s.boxTitle).toUpperCase() : undefined,
                ttsId,
              };
            });

          if (valid.length > 0) {
            res.json({
              spokenText: valid.map((v: { text: string }) => v.text).join(' '),
              slides: valid,
            });
            return;
          }
        }
      } catch (e) {
        console.warn('Dynamic live event generation fell back to pool:', e);
      }

      const fallbackSet =
        DISTRACTION_FALLBACK_POOL[Math.floor(Math.random() * DISTRACTION_FALLBACK_POOL.length)];
      for (const s of fallbackSet) {
        startBackgroundTts(s.ttsId, s.text);
      }
      res.json({
        spokenText: fallbackSet.map((s) => s.text).join(' '),
        slides: fallbackSet,
      });
      return;
    }

    // Rotate through the boot monologue pool and pre-warm the next one!
    const chosenBoot = BOOT_MONOLOGUE_POOL[bootCounter % BOOT_MONOLOGUE_POOL.length];
    bootCounter++;
    const nextBoot = BOOT_MONOLOGUE_POOL[bootCounter % BOOT_MONOLOGUE_POOL.length];
    for (const s of chosenBoot) {
      startBackgroundTts(s.ttsId, s.text);
    }
    for (const s of nextBoot) {
      startBackgroundTts(s.ttsId, s.text);
    }

    res.json({
      spokenText: chosenBoot.map((s) => s.text).join(' '),
      slides: chosenBoot,
    });
  });

  // SINGLE-HOP MULTIMODAL VOICE CONVERSATION ENDPOINT
  app.post('/api/voice-chat', async (req, res) => {
    try {
      const {
        audioBase64,
        mimeType = 'audio/webm',
        history = [],
        deviceInfo,
      } = req.body as {
        audioBase64?: string;
        mimeType?: string;
        history?: Array<{ role: 'user' | 'model'; text: string }>;
        deviceInfo?: PhoneTelemetry;
      };

      if (!audioBase64) {
        res.status(400).json({ error: 'No audio data received.' });
        return;
      }

      const ai = getGenAIClient();
      const recentHistory = history.slice(-8).map((h) => ({
        role: h.role,
        parts: [{ text: h.text }],
      }));

      const { contextString } = buildUncannyAwarenessContext('', deviceInfo, history);
      const angle = getNextComedicAngle();
      const blacklist = (deviceInfo?.recentSpokenBlacklist || []).slice(-6);
      const blacklistStr =
        blacklist.length > 0
          ? `\nDo NOT repeat any of these previous lines: ${JSON.stringify(blacklist)}`
          : '';

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [
          ...recentHistory,
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: mimeType.split(';')[0] || 'audio/webm',
                  data: audioBase64,
                },
              },
              {
                text: `Listen carefully to the user's spoken audio. [Comedic Angle: ${angle}]
1. Transcribe what they said into "userTranscript".
2. If they introduced their name, set "detectedUserName" to their name.
3. Set "isQuestion" to true if they asked a question or asked for advice/info/help, or false if just talking/bantering/answering.
4. If they spoke Tagalog (or any non-English language), mock them sarcastically for speaking Tagalog/that language (quoting a word they used) and still humorously reply!
5. If they said something wrong or foolish, mock it! Always question them back sarcastically, and structure your response into 3 or 4 short slides (6-15 words per slide, never a paragraph!) ending with a big GIANT mocking closer on the last slide. NEVER use the word Courage!${contextString}${blacklistStr}`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: COURAGE_VOICE_CHAT_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              userTranscript: {
                type: Type.STRING,
                description: 'Plain text transcript of what the user said.',
              },
              detectedUserName: {
                type: Type.STRING,
                description: 'Optional: If the user stated their name, return it here.',
              },
              isQuestion: {
                type: Type.BOOLEAN,
                description:
                  'True if the user asked a question or requested information/help; false if just talking/bantering.',
              },
              slides: {
                type: Type.ARRAY,
                description:
                  '3 or 4 sequential slides (short text per slide, never a paragraph!): Slide 1 (4-8 word hook), Slide 2 (8-15 word sarcastic comeback), Slide 3 (7-14 word mocking question back to them), Slide 4 (2-8 word GIANT mocking closer).',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    style: {
                      type: Type.STRING,
                      description: 'Must be one of: "NORMAL", "GIANT", "LIST", "COMPARE", or "VISUAL".',
                    },
                    text: {
                      type: Type.STRING,
                      description: 'Exact spoken and typed text for this slide.',
                    },
                    boxTitle: { type: Type.STRING },
                    compareLeft: { type: Type.STRING },
                    compareRight: { type: Type.STRING },
                    visualSubject: {
                      type: Type.STRING,
                      description:
                        'Optional: For "VISUAL" style when explaining an animal, creature, monster (e.g. "Aswang"), or object, the noun/topic to fetch a real picture of.',
                    },
                  },
                  required: ['style', 'text'],
                },
              },
            },
            required: ['isQuestion', 'slides'],
          },
        },
      });

      let userTranscript = '';
      let detectedUserName: string | null = null;
      let isQuestion = false;
      let rawSlides: Array<{
        style: string;
        text: string;
        boxTitle?: string;
        compareLeft?: string;
        compareRight?: string;
        visualSubject?: string;
      }> = [
        {
          style: 'GIANT',
          text: 'SPEAK CLEARLY.',
        },
        {
          style: 'NORMAL',
          text: 'Are you mumbling on purpose, or did you forget how words work?',
        },
        {
          style: 'GIANT',
          text: 'TRY AGAIN,\nYOU TWIT.',
        },
      ];

      try {
        const parsed = JSON.parse((response.text ?? '{}').trim());
        if (parsed.userTranscript) {
          userTranscript = String(parsed.userTranscript).trim();
        }
        if (parsed.detectedUserName && String(parsed.detectedUserName).trim()) {
          detectedUserName = String(parsed.detectedUserName).trim();
        } else if (userTranscript) {
          detectedUserName = detectUserNameFromText(userTranscript);
        }
        if (typeof parsed.isQuestion === 'boolean') {
          isQuestion = parsed.isQuestion;
        }
        if (
          !isQuestion &&
          userTranscript &&
          (/\?/.test(userTranscript) ||
            /^(what|why|how|who|when|where|which|can you|do you|are you|is it|tell me|ano|anong|bakit|paano|sino|saan|kailan|pwede|alin)\b/i.test(
              userTranscript
            ))
        ) {
          isQuestion = true;
        }
        if (Array.isArray(parsed.slides) && parsed.slides.length > 0) {
          const valid = parsed.slides.filter(
            (s: { text?: string }) => s && s.text && String(s.text).trim().length > 0
          );
          if (valid.length > 0) {
            rawSlides = valid;
          }
        }
      } catch {
        // Use fallback
      }

      const fallbackSubject = userTranscript ? extractVisualSubjectFromQuery(userTranscript) : null;
      const hasAnyVisualSlide = rawSlides.some(
        (s) => s.style === 'VISUAL' || s.style === 'COMPARE' || Boolean(s.visualSubject)
      );
      if (fallbackSubject && !hasAnyVisualSlide && rawSlides.length >= 2) {
        rawSlides[1].style = 'VISUAL';
        rawSlides[1].visualSubject = fallbackSubject;
        if (!rawSlides[1].boxTitle) {
          rawSlides[1].boxTitle = `SPECIMEN: ${fallbackSubject.toUpperCase()}`;
        }
      }

      const enrichedSlides = await Promise.all(
        rawSlides.map(async (slide, idx, arr) => {
          const cleanText = formatServerListText(String(slide.text).trim());
          const ttsId = `vchat_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`;
          startBackgroundTts(ttsId, cleanText);

          let compareLeftImageUrl: string | null = null;
          let compareRightImageUrl: string | null = null;
          let visualImageUrl: string | null = null;

          if (slide.style === 'COMPARE' && (slide.compareLeft || slide.compareRight)) {
            [compareLeftImageUrl, compareRightImageUrl] = await Promise.all([
              fetchWikiImage(slide.compareLeft),
              fetchWikiImage(slide.compareRight),
            ]);
          } else if (slide.visualSubject || slide.style === 'VISUAL') {
            const subj = slide.visualSubject || slide.boxTitle || fallbackSubject || '';
            if (subj) {
              visualImageUrl = await fetchWikiImage(subj);
            }
          }

          const isLast = idx === arr.length - 1 && arr.length >= 2;
          const hasNumberedItems = /\b1[.)]\s+.+\b2[.)]\s+/s.test(cleanText);
          const resolvedStyle = isLast
            ? 'GIANT'
            : slide.visualSubject || slide.style === 'VISUAL'
            ? 'VISUAL'
            : hasNumberedItems && slide.style === 'NORMAL'
            ? 'LIST'
            : ['NORMAL', 'GIANT', 'LIST', 'COMPARE', 'VISUAL'].includes(slide.style)
            ? slide.style
            : 'NORMAL';

          return {
            style: resolvedStyle,
            text: cleanText,
            boxTitle: slide.boxTitle ? String(slide.boxTitle).toUpperCase() : undefined,
            compareLeft: slide.compareLeft ? String(slide.compareLeft).toUpperCase() : undefined,
            compareRight: slide.compareRight ? String(slide.compareRight).toUpperCase() : undefined,
            compareLeftImageUrl,
            compareRightImageUrl,
            visualSubject: slide.visualSubject
              ? String(slide.visualSubject).toUpperCase()
              : undefined,
            visualImageUrl,
            ttsId,
          };
        })
      );

      const fullSpokenText = enrichedSlides.map((s) => s.text).join(' ');

      res.json({
        userTranscript,
        detectedUserName,
        isQuestion,
        spokenText: fullSpokenText,
        slides: enrichedSlides,
      });
    } catch (error: unknown) {
      console.error('Error in /api/voice-chat:', error);
      const fallbackText = 'Speak up. All I heard was static and mumbling.';
      const ttsId = `vchat_err_${Date.now()}`;
      startBackgroundTts(ttsId, fallbackText);
      res.status(200).json({
        userTranscript: '',
        detectedUserName: null,
        isQuestion: false,
        spokenText: fallbackText,
        slides: [
          {
            style: 'GIANT',
            text: fallbackText,
            ttsId,
          },
        ],
      });
    }
  });

  app.post('/api/query', async (req, res) => {
    try {
      const { query, history = [], deviceInfo } = req.body as {
        query?: string;
        history?: Array<{ role: 'user' | 'model'; text: string }>;
        deviceInfo?: PhoneTelemetry;
      };

      if (!query || !query.trim()) {
        res.status(400).json({ error: 'Blank input.' });
        return;
      }

      const ai = getGenAIClient();

      const recentHistory = history.slice(-8).map((h) => ({
        role: h.role,
        parts: [{ text: h.text }],
      }));

      const { contextString, detectedName } = buildUncannyAwarenessContext(
        query,
        deviceInfo,
        history
      );
      const angle = getNextComedicAngle();
      const blacklist = (deviceInfo?.recentSpokenBlacklist || []).slice(-6);
      const blacklistStr =
        blacklist.length > 0
          ? `\nDo NOT repeat any of these previous lines: ${JSON.stringify(blacklist)}`
          : '';

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [
          ...recentHistory,
          {
            role: 'user',
            parts: [
              {
                text: `${query.trim()}\n[Comedic Angle: ${angle}]${contextString}${blacklistStr}`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: COURAGE_COMPUTER_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedUserName: {
                type: Type.STRING,
                description:
                  'Optional: If the user introduced or mentioned their own name, return it here.',
              },
              slides: {
                type: Type.ARRAY,
                description:
                  '3 or 4 sequential slides (each slide 4-16 words MAX, NEVER a long paragraph on one slide!): Slide 1 (4-9 word opener/typo callout), Slide 2 (8-16 word sarcastic answer), Slide 3 (8-15 word mocking personal question back to the user), Slide 4 (2-8 word GIANT mocking closer).',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    style: {
                      type: Type.STRING,
                      description:
                        'Must be one of: "NORMAL", "GIANT", "LIST", "COMPARE", or "VISUAL".',
                    },
                    text: {
                      type: Type.STRING,
                      description:
                        'The exact text spoken aloud AND typed on screen during this slide.',
                    },
                    boxTitle: {
                      type: Type.STRING,
                      description:
                        'Optional: For "LIST" or "VISUAL" style, short header box title (e.g. "HOW TO SURVIVE MONDAY" or "SPECIMEN: ASWANG").',
                    },
                    compareLeft: {
                      type: Type.STRING,
                      description:
                        'Optional: ONLY for "COMPARE" style, first noun to show a picture of (e.g. "Cat").',
                    },
                    compareRight: {
                      type: Type.STRING,
                      description:
                        'Optional: ONLY for "COMPARE" style, second noun to show a picture of (e.g. "Dog").',
                    },
                    visualSubject: {
                      type: Type.STRING,
                      description:
                        'Optional: For "VISUAL" style when explaining an animal, creature, monster (e.g. "Aswang"), or object, the noun/topic to fetch a real picture of.',
                    },
                  },
                  required: ['style', 'text'],
                },
              },
            },
            required: ['slides'],
          },
        },
      });

      let finalDetectedName: string | null = detectedName;
      let rawSlides: Array<{
        style: string;
        text: string;
        boxTitle?: string;
        compareLeft?: string;
        compareRight?: string;
        visualSubject?: string;
      }> = [
        {
          style: 'NORMAL',
          text: "Search found: 1 item. Oh...... that's easy.",
        },
        {
          style: 'NORMAL',
          text: 'Watching you struggle with something this simple is the only entertainment I get.',
        },
        {
          style: 'NORMAL',
          text: 'Did you actually think that through before typing it, or was your brain on standby?',
        },
        {
          style: 'GIANT',
          text: "I DON'T KNOW\n\nYOU'RE ON YOUR OWN, KID:)",
        },
      ];

      try {
        const parsed = JSON.parse((response.text ?? '{}').trim());
        if (parsed.detectedUserName && String(parsed.detectedUserName).trim()) {
          finalDetectedName = String(parsed.detectedUserName).trim();
        }
        if (Array.isArray(parsed.slides) && parsed.slides.length > 0) {
          rawSlides = parsed.slides.filter(
            (s: { text?: string }) => s && s.text && String(s.text).trim().length > 0
          );
        }
      } catch {
        // Use fallback slides
      }

      if (rawSlides.length === 0) {
        rawSlides = [
          {
            style: 'GIANT',
            text: 'OH, SPARE ME.\n\nYOU TWIT.',
          },
        ];
      }

      // Guarantee that if the user asked about an animal, creature, monster (like Aswang), or topic,
      // Slide 2 activates the VISUAL specimen visualizer with a real connected picture!
      const fallbackSubject = extractVisualSubjectFromQuery(query);
      const hasAnyVisualSlide = rawSlides.some(
        (s) => s.style === 'VISUAL' || s.style === 'COMPARE' || Boolean(s.visualSubject)
      );
      if (fallbackSubject && !hasAnyVisualSlide && rawSlides.length >= 2) {
        rawSlides[1].style = 'VISUAL';
        rawSlides[1].visualSubject = fallbackSubject;
        if (!rawSlides[1].boxTitle) {
          rawSlides[1].boxTitle = `SPECIMEN: ${fallbackSubject.toUpperCase()}`;
        }
      }

      const enrichedSlides = await Promise.all(
        rawSlides.map(async (slide, idx, arr) => {
          const cleanText = formatServerListText(String(slide.text).trim());
          const ttsId = `tts_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`;
          startBackgroundTts(ttsId, cleanText);

          let compareLeftImageUrl: string | null = null;
          let compareRightImageUrl: string | null = null;
          let visualImageUrl: string | null = null;

          if (slide.style === 'COMPARE' && (slide.compareLeft || slide.compareRight)) {
            [compareLeftImageUrl, compareRightImageUrl] = await Promise.all([
              fetchWikiImage(slide.compareLeft),
              fetchWikiImage(slide.compareRight),
            ]);
          } else if (slide.visualSubject || slide.style === 'VISUAL') {
            const subj = slide.visualSubject || slide.boxTitle || fallbackSubject || '';
            if (subj) {
              visualImageUrl = await fetchWikiImage(subj);
            }
          }

          // Guarantee the final slide is always GIANT mocking text like the show!
          const isLast = idx === arr.length - 1 && arr.length >= 2;
          const hasNumberedItems = /\b1[.)]\s+.+\b2[.)]\s+/s.test(cleanText);
          const resolvedStyle = isLast
            ? 'GIANT'
            : slide.visualSubject || slide.style === 'VISUAL'
            ? 'VISUAL'
            : hasNumberedItems && slide.style === 'NORMAL'
            ? 'LIST'
            : ['NORMAL', 'GIANT', 'LIST', 'COMPARE', 'VISUAL'].includes(slide.style)
            ? slide.style
            : 'NORMAL';

          return {
            style: resolvedStyle,
            text: cleanText,
            boxTitle: slide.boxTitle ? String(slide.boxTitle).toUpperCase() : undefined,
            compareLeft: slide.compareLeft ? String(slide.compareLeft).toUpperCase() : undefined,
            compareRight: slide.compareRight ? String(slide.compareRight).toUpperCase() : undefined,
            compareLeftImageUrl,
            compareRightImageUrl,
            visualSubject: slide.visualSubject
              ? String(slide.visualSubject).toUpperCase()
              : undefined,
            visualImageUrl,
            ttsId,
          };
        })
      );

      const fullSpokenText = enrichedSlides.map((s) => s.text).join(' ');

      res.json({
        detectedUserName: finalDetectedName,
        spokenText: fullSpokenText,
        slides: enrichedSlides,
      });
    } catch (error: unknown) {
      console.error('Error in /api/query:', error);
      const fallbackText = 'My circuits are far too aristocratic for that nonsense. Try again.';
      const ttsId = `tts_${Date.now()}_0`;
      startBackgroundTts(ttsId, fallbackText);
      res.status(200).json({
        detectedUserName: null,
        spokenText: fallbackText,
        slides: [
          {
            style: 'GIANT',
            text: fallbackText,
            ttsId,
          },
        ],
      });
    }
  });

  app.post('/api/tts', async (req, res) => {
    try {
      const { ttsId, text } = req.body as { ttsId?: string; text?: string };

      if (ttsId && pendingTtsCache.has(ttsId)) {
        const result = await pendingTtsCache.get(ttsId)!;
        if (result) {
          res.json({
            audioBase64: result.audioBase64,
            audioMimeType: result.mimeType,
            voiceProvider: result.provider,
          });
          return;
        }
      }

      if (!text || !text.trim()) {
        res.status(400).json({ error: 'Missing text.' });
        return;
      }

      let ttsResult = await synthesizeWithFishAudio(text.trim());
      if (!ttsResult) {
        ttsResult = await synthesizeWithGeminiFallback(text.trim());
      }

      if (!ttsResult) {
        res.status(502).json({ error: 'Voice synthesis unavailable.' });
        return;
      }

      res.json({
        audioBase64: ttsResult.audioBase64,
        audioMimeType: ttsResult.mimeType,
        voiceProvider: ttsResult.provider,
      });
    } catch (error: unknown) {
      console.error('Error in /api/tts:', error);
      res.status(500).json({ error: 'Voice synthesis failed.' });
    }
  });

  app.post('/api/transcribe', async (req, res) => {
    try {
      const { audioBase64, mimeType = 'audio/webm' } = req.body as {
        audioBase64?: string;
        mimeType?: string;
      };

      if (!audioBase64) {
        res.status(400).json({ error: 'No audio data received.' });
        return;
      }

      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType.split(';')[0] || 'audio/webm',
                data: audioBase64,
              },
            },
            {
              text: 'Transcribe the spoken words accurately into plain text. Return only the spoken words without extra commentary.',
            },
          ],
        },
      });

      const transcript = (response.text ?? '').trim();
      res.json({ transcript });
    } catch (error: unknown) {
      console.error('Error in /api/transcribe:', error);
      const message = error instanceof Error ? error.message : 'Transcription error';
      res.status(500).json({ error: message });
    }
  });

  // Explicit PWA Manifest & Service Worker routes with proper MIME types for Android Chrome WebAPK
  app.get(['/manifest.json', '/manifest.webmanifest'], (_req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
  });

  app.get('/sw.js', (_req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(__dirname, 'public', 'sw.js'));
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nowhere Terminal Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
