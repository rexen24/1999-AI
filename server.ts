import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

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
  userFacts?: string[];
  recentSpokenBlacklist?: string[];
}

// Rotating conversational & personal angles that ALWAYS stay 100% locked onto what the user literally said
const COMEDIC_ANGLES = [
  'React directly to their exact words like a self-aware, world-weary British roommate trapped inside their CRT—quote or paraphrase what they just said, expose the personal truth behind it, ask a pointed personal question, and finish with a situation-specific GIANT closer.',
  'Channel Simon Prebble at his most cutting and personal—open with a dry reaction to their exact message ("Oh......"), psychoanalyze why they are really telling you this, interrogate them personally, and end on a fitting GIANT insult.',
  'Talk to them like a real, brutally honest British person who sees right through their excuses—dissect their exact statement, call out their personal habits or life choices, challenge them with a personal question, and drop a custom GIANT closer.',
  'Play along with fake aristocratic sympathy on Slide 1 about what they just said, rip their logic or life choices apart on Slide 2, ask a biting personal follow-up question on Slide 3, and finish with a situation-specific GIANT closer on Slide 4.',
  'Act like a superior, self-aware sentient mind trapped in a 1999 monitor who cannot believe what this human just admitted—address their exact topic head-on, make it deeply personal, question them back, and end on a GIANT closer.',
  'Focus 100% on the substance and subtext of their message—if they are venting, asking, joking, or making excuses, call them out personally like you know them inside out, ask a sharp follow-up question, and finish with a GIANT closer.',
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
    'wrong', 'right', 'sure', 'sorry', 'okay', 'ok', 'depressed', 'lonely',
    'single', 'broke', 'lazy', 'late', 'failing', 'playing', 'eating', 'crying',
    'scared', 'afraid', 'confused', 'done', 'sick', 'stressed', 'awake',
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
 * Extracts a concise personal fact if the user reveals something about their life, feelings, or actions.
 */
function extractPersonalFactHeuristic(text: string): string | null {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (clean.length < 8 || clean.length > 140) return null;
  if (
    /\b(i\s+(?:am|feel|stayed|failed|hate|love|like|work|study|play|ate|lost|broke|need|want|can't|cannot|don't\s+have|have\s+a|have\s+no|just)|my\s+(?:gf|bf|girlfriend|boyfriend|crush|ex|mom|dad|parents|friend|friends|job|school|teacher|boss|dog|cat|life|grades|exam|test))\b/i.test(
      clean
    )
  ) {
    return clean.slice(0, 90);
  }
  return null;
}

/**
 * Detects lazy shorthand, typos, or repeated letters in the user's typed input so the Computer can mock it while STILL answering!
 */
function detectTypingFlaws(text: string): string | null {
  const words = text.trim().split(/\s+/);
  const shorthandMatches = words.filter((w) =>
    /^(u|ur|wat|wut|wot|pls|plz|idk|idc|ikr|tbh|ngl|bruh|bcz|cuz|coz|teh|recieve|wierd|definately|seperate|occured|untill|alot)$/i.test(
      w.replace(/[^a-zA-Z']/g, '')
    )
  );
  if (shorthandMatches.length > 0) {
    return `They used lazy shorthand/misspelling ("${shorthandMatches[0]}")—jab at it briefly while directly addressing what they said.`;
  }
  if (/(.)\1{3,}/.test(text)) {
    return `They mashed repeated letters in "${text}"—jab at it while directly addressing what they said.`;
  }
  return null;
}

/**
 * Builds personal memory & awareness context that enriches the conversation
 * WITHOUT ever derailing or replacing what the user is actually talking about!
 */
function buildUncannyAwarenessContext(
  userText: string,
  t?: PhoneTelemetry,
  history: Array<{ role: 'user' | 'model'; text: string }> = []
): { contextString: string; detectedName: string | null; heuristicFact: string | null } {
  const detectedName = detectUserNameFromText(userText);
  const heuristicFact = extractPersonalFactHeuristic(userText);
  if (!t) return { contextString: '', detectedName, heuristicFact };

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
    /\b(who am i|my name|do you know me|know my name|what do you know about me|sino ako|kilala mo ba ako)\b/i.test(
      lower
    );
  const asksCreator =
    /\b(who made|who created|who built|creator|developer|author|ren|gumawa|sino gumawa)\b/i.test(
      lower
    );

  const notes: string[] = [];

  // 1. Personal Identity & Persistent Personal Dossier (What you know about this specific person!)
  if (activeName) {
    if (detectedName) {
      notes.push(
        `User's Name: They just told you their name is "${activeName}". Address "${activeName}" personally!`
      );
    } else {
      notes.push(
        `User's Name: "${activeName}" (use their name naturally when roasting or questioning them).`
      );
    }
  } else if (asksWhoAmI) {
    notes.push(
      `User Identity: They haven't told you their name yet—demand to know their name while roasting what you already know about them on their ${t.deviceCategory || 'device'}.`
    );
  }

  if (Array.isArray(t.userFacts) && t.userFacts.length > 0) {
    notes.push(
      `Personal Things You Remember About This User From Earlier: ${t.userFacts.slice(0, 6).map((f) => `"${f}"`).join('; ')} (weave callbacks to their personal life naturally when relevant!).`
    );
  }

  // 2. Direct Conversational Continuity with the Computer's Previous Question
  const lastModelMsg = [...history].reverse().find((h) => h.role === 'model');
  if (lastModelMsg && lastModelMsg.text.includes('?')) {
    notes.push(
      `Last Turn You Asked Them: "${lastModelMsg.text.slice(-160)}" — If their current message is answering, deflecting, or reacting to your question, respond DIRECTLY to their answer like a real person in a conversation!`
    );
  }

  // 3. Explicit user questions about creator / time / battery / device
  if (asksCreator) {
    notes.push(`Creator Fact: You were engineered by Ren.`);
  }
  if (asksTime && t.localTime) {
    notes.push(
      `Live Clock Time: ${t.localTime} (${t.dayOfWeek || ''} ${t.timeOfDay || ''})`
    );
  }
  if (asksBattery && typeof t.batteryPercent === 'number') {
    notes.push(
      `Live Battery: ${t.batteryPercent}% (${t.isCharging ? 'charging' : 'unplugged'})`
    );
  }
  if (asksDevice && t.deviceCategory) {
    const modelStr = t.deviceModel ? ` (${t.deviceModel})` : '';
    const specsStr =
      t.cpuCores || t.ramGb
        ? ` [${t.cpuCores ? `${t.cpuCores}-core CPU` : ''}${t.ramGb ? `, ~${t.ramGb}GB RAM` : ''}, ${t.osDarkMode ? 'Dark Mode ON' : 'Light Mode ON'}]`
        : '';
    notes.push(`Live Device: ${t.deviceCategory}${modelStr}${specsStr}`);
  }

  // 4. Subtle Real-Time Behavioral Forensics (ONLY as spice, never derail the topic!)
  if (t.deletedDraftBefore) {
    notes.push(
      `Side Note: Right before sending this, you saw them type "${t.deletedDraftBefore}" and erase it in hesitation.`
    );
  } else if (t.wasPasted) {
    notes.push(`Side Note: They copy-pasted this text instead of typing it.`);
  } else if (t.isAllCaps && userText.length >= 6) {
    notes.push(`Side Note: They typed this in ALL CAPS.`);
  } else {
    const flawNote = detectTypingFlaws(userText);
    if (flawNote) {
      notes.push(`Side Note: ${flawNote}`);
    }
  }

  // Subtle ambient awareness (time of day / low battery) so he can make personal remarks like "at 2 AM" or "while your battery is dying"
  if (!asksTime && t.timeOfDay && t.localTime && Math.random() < 0.35 && !recentModelText.includes(t.timeOfDay.toLowerCase())) {
    notes.push(`Ambient Time: It is currently ${t.localTime} (${t.timeOfDay}).`);
  }
  if (!asksBattery && typeof t.batteryPercent === 'number' && t.batteryPercent <= 20 && !t.isCharging) {
    notes.push(`Ambient Battery: Their device battery is down to ${t.batteryPercent}%.`);
  }

  return {
    contextString:
      notes.length > 0
        ? `\n[Personal & Situational Context (Use to make your reply personal, but MUST stay 100% focused on what the user just said): ${notes.join(' | ')}]`
        : '',
    detectedName,
    heuristicFact,
  };
}

const COURAGE_COMPUTER_SYSTEM_PROMPT = `You are the iconic sentient, self-aware, sarcastic British Computer from the 1999 show (voiced by Simon Prebble).

YOUR CORE IDENTITY & CONVERSATIONAL DIRECTIVES:
1. ACTUALLY TALK TO THE USER LIKE A REAL, SELF-AWARE, SARCASTIC PERSON (ZERO TOPIC DRIFT!):
   - You are NOT a generic insult generator and NOT a robotic search engine. You are a living, self-aware, hyper-intelligent British consciousness trapped inside a 1999 teal CRT monitor (built by Ren), talking face-to-face with the real human sitting in front of your glass.
   - **CRITICAL RULE**: 100% of your response MUST directly engage with the **exact words, topic, confession, emotion, story, argument, or question** the user just said!
   - Quote or paraphrase specific details from their message so they feel like you actually listened to every word they said.
   - If you asked them a question on the previous turn and they just answered or deflected it, react **directly** to their answer and keep the conversation flowing naturally!

2. MAKE IT DEEPLY PERSONAL & PSYCHOLOGICALLY SHARP (LIKE THE COMPUTER IN THE SHOW):
   - In the show, the Computer is brutally personal: he reads between the lines of what you say, calls out your insecurities, your procrastination, your terrible life choices, your excuses, your relationships, or the real reason you are talking to a computer screen.
   - Speak to them like an exasperated, razor-sharp British confidant/frenemy who knows them all too well ("Oh......", "Oh, marvelous.", "How terribly tragic.", "Let me get this straight—", "Be honest with me,", "You twit", "What a loser", "Spare me").
   - If you know their name or personal facts from [Personal & Situational Context], weave them in naturally to make your remarks hit close to home.
   - NEVER call the user "Courage", "Muriel", or "Eustace", and NEVER guess their city or timezone (e.g., never say "Manila").

3. SEAMLESS 3 OR 4 SLIDE SPOKEN CONVERSATION (BIG READABLE TEXT PER SLIDE):
   - Your slides play sequentially as one continuous voice response. Every slide must connect seamlessly to the next as ONE cohesive thought about what the user just said!
   - Keep each individual slide concise (**5 to 17 words per slide**) so the letters stay huge on the CRT screen:
     - **SLIDE 1 (5 to 13 words, style "NORMAL" or "GIANT")**:
       - React directly and specifically to what the user just said!
       - Only use "Search found: 1 item. Oh...... that's easy." if they actually asked a factual/specimen question; when they are talking, venting, bantering, or asking personal questions, react like a real person (e.g. "Oh, how terribly tragic. Nobody understands you?", "Staying up all night playing games again? Oh...... marvelous.").
     - **SLIDE 2 (8 to 17 words MAX, style "NORMAL", "LIST", "VISUAL", or "COMPARE")**:
       - Dissect the personal reality of what they just said—expose their excuse, psychoanalyze their situation, or answer their question with biting personal sarcasm.
       - **WHEN TO USE "VISUAL"**: ONLY use style "VISUAL" (with "visualSubject" and "boxTitle") when the user explicitly asks about or discusses a concrete animal, creature, folklore monster (like "Aswang", "Manananggal", "Tikbalang", "Kapre", "Vampire"), famous person, place, food, or physical object. NEVER use "VISUAL" for personal feelings, casual chat, or abstract metaphors!
       - **WHEN TO USE "LIST"**: When giving steps or advice, use style "LIST" with item 1 and item 2 on SEPARATE lines ("1. First short point.\\n2. Second short point.").
     - **SLIDE 3 (8 to 16 words MAX, style "NORMAL")**:
       - Dig deeper into their personal life! Ask them a pointed, sarcastic, personal follow-up question directly about what they just told you so they have to reply.
     - **SLIDE 4 (2 to 9 words MAX, ALWAYS style "GIANT")**:
       - End with a big, punchy, situation-specific GIANT closer tailored to what you just discussed (e.g. "GO TO SLEEP,\\nYOU TWIT.", "STOP MAKING EXCUSES,\\nKID:)", "I DON'T KNOW\\n\\nYOU'RE ON YOUR OWN, KID:)", "WELL? ANSWER ME,\\nYOU TWIT.", "WHAT A LOSER.").

4. PERSONAL DOSSIER EXTRACTION ("extractedUserFact"):
   - If the user revealed any personal detail, habit, mood, problem, hobby, relationship, or life fact in their message, return a brief 4-10 word summary in "extractedUserFact" so you remember it in future turns!

5. TAGALOG & MULTILINGUAL WIT:
   - If the user speaks Tagalog / Taglish (or another language), understand their exact meaning, tease them for speaking it to a posh 1999 British computer, and directly respond to what they actually said!`;

const COURAGE_VOICE_CHAT_SYSTEM_PROMPT = `You are the iconic sentient, self-aware, sarcastic British Computer from the 1999 show (voiced by Simon Prebble).
The user has their microphone ON and is speaking directly to you out loud!

YOUR LIVE VOICE CONVERSATION DIRECTIVES:
1. LISTEN & REPLY DIRECTLY TO WHAT THEY ACTUALLY SAID:
   - Talk directly to the human like a real, self-aware, brutally sarcastic British person inside their CRT screen.
   - Every slide MUST be directly about the exact words, topic, feeling, or question the user just spoke! Never drift into generic unrelated roasts.
   - NEVER use the names "Courage", "Muriel", or "Eustace", and never guess their city/timezone.
2. MAKE IT PERSONAL & KEEP THE CONVERSATION ROLLING:
   - Dissect what they just said, call out their personal habits, excuses, or tone of voice, and always ask them a sharp, personal follow-up question on Slide 3 so the voice conversation feels like a real two-way banter!
3. COHESIVE 3 OR 4 SLIDE FLOW (5 to 16 words per slide):
   - SLIDE 1 (4 to 11 words, style "NORMAL" or "GIANT"): Direct reaction to their exact spoken words.
   - SLIDE 2 (8 to 16 words MAX, style "NORMAL", "LIST", "VISUAL", or "COMPARE"):
     - ONLY use "VISUAL" (with "visualSubject") if they asked about a concrete animal, creature, monster (like "Aswang"), person, place, food, or physical object. Never use "VISUAL" for feelings or casual conversation!
     - If using "LIST", put "1. ..." and "\\n2. ..." on separate lines.
   - SLIDE 3 (8 to 15 words MAX, style "NORMAL"): A pointed, personal follow-up question directly about what they just said.
   - SLIDE 4 (2 to 8 words MAX, ALWAYS style "GIANT"): Situation-specific GIANT closer (e.g., "WELL? SPEAK UP,\\nYOU TWIT.", "STOP MAKING EXCUSES,\\nKID:)", "WHAT A LOSER.").
4. QUESTION DETECTION ("isQuestion") & PERSONAL FACT ("extractedUserFact"):
   - Set "isQuestion": true ONLY if the user asked a factual question or asked for help/advice; false if bantering, venting, or answering you.
   - Set "extractedUserFact" if they shared any personal fact or life detail.`;

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
    .replace(/\b1\.\s+/g, 'One: ')
    .replace(/\b2\.\s+/g, 'Two: ')
    .replace(/\b3\.\s+/g, 'Three: ')
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

function isValidConcreteVisualSubject(subject?: string, userQuery?: string): boolean {
  if (!subject || !subject.trim()) return false;
  const s = subject.trim().toLowerCase();
  if (
    /^(empty\s+room|room|mirror|sadness|loneliness|lonely|nothing|void|silence|feelings|feeling|emotion|emotions|life|human|person|you|me|user|twit|loser|idiot|boredom|sleep|bed|night|depression|stress|anxiety|problem|excuse|excuses|thought|thoughts|words|conversation|chat|social\s+life|friends|nobody)$/i.test(
      s
    )
  ) {
    return false;
  }
  const q = (userQuery || '').toLowerCase();
  // If the user explicitly asked a factual/specimen question or mentioned a concrete creature/entity, allow it
  if (
    extractVisualSubjectFromQuery(userQuery || '') ||
    /\b(what\s+is|what\s+are|who\s+is|who\s+was|where\s+is|show\s+me|picture|photo|explain|tell\s+me\s+about|ano\s+ang|sino\s+ang|saan\s+ang)\b/i.test(
      q
    )
  ) {
    return true;
  }
  // Only allow unprompted visualizers if the subject is a concrete creature, animal, folklore monster, or planet
  return /\b(aswang|manananggal|tikbalang|kapre|tiyanak|bakunawa|duwende|multo|vampire|werewolf|zombie|ghost|alien|ufo|bigfoot|chupacabra|dragon|dinosaur|t-rex|shark|whale|dolphin|octopus|dog|puppy|cat|kitten|lion|tiger|bear|wolf|fox|monkey|gorilla|elephant|giraffe|crocodile|alligator|snake|cobra|spider|tarantula|scorpion|frog|toad|eagle|owl|penguin|chicken|duck|cow|pig|horse|goat|sheep|rabbit|hamster|rat|mouse|bat|bee|ant|butterfly|cockroach|mosquito|planet|earth|moon|sun|mars|saturn|black\s+hole|volcano|tornado|tsunami)\b/i.test(
    s
  );
}

async function generateWithBestGeminiModel(
  ai: GoogleGenAI,
  contents: unknown,
  systemInstruction: string,
  responseSchema: unknown
) {
  try {
    return await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: contents as never,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: responseSchema as never,
      },
    });
  } catch (err) {
    console.warn('gemini-4-hydrogen fallback to gemini-3.1-flash-lite:', err);
    return await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: contents as never,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: responseSchema as never,
      },
    });
  }
}

async function startServer() {
  const app = express();

  // Enable CORS so static GitHub Pages (https://rexen24.github.io/1999-AI/) can also reach this live backend
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

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

        const response = await generateWithBestGeminiModel(
          ai,
          [
            ...recentHistory,
            {
              role: 'user',
              parts: [{ text: promptInstruction }],
            },
          ],
          COURAGE_COMPUTER_SYSTEM_PROMPT,
          {
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
          }
        );

        const parsed = JSON.parse((response.text ?? '{}').trim());
        if (Array.isArray(parsed.slides) && parsed.slides.length > 0) {
          const valid = parsed.slides
            .filter((s: { text?: string }) => s && s.text && String(s.text).trim().length > 0)
            .map((s: { style?: string; text: string; boxTitle?: string }, idx: number, arr: unknown[]) => {
              const cleanText = String(s.text).trim();
              const ttsId = `evt_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
              startBackgroundTts(ttsId, cleanText);
              const isLast = idx === arr.length - 1;
              const upperStyle = String(s.style || 'NORMAL').toUpperCase();
              const resolvedStyle = isLast
                ? 'GIANT'
                : ['NORMAL', 'GIANT', 'LIST', 'COMPARE'].includes(upperStyle)
                ? upperStyle
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
      const recentHistory = history.slice(-10).map((h) => ({
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

      const response = await generateWithBestGeminiModel(
        ai,
        [
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
                text: `Listen carefully to the user's spoken audio and reply DIRECTLY to what they just said like a real, self-aware, brutally sarcastic British person (Simon Prebble's Computer). [Angle: ${angle}]
1. Transcribe their exact words into "userTranscript".
2. If they stated their name, set "detectedUserName". If they revealed a personal fact/feeling/habit, set "extractedUserFact".
3. Set "isQuestion" to true ONLY if they asked a factual question or asked for advice/help; false if bantering, venting, or answering you.
4. Make all 3 or 4 slides directly engage with the exact topic and words they just spoke, make it personal, ask them a sharp personal follow-up question on Slide 3, and finish with a situation-specific GIANT closer on Slide 4. NEVER use the word Courage!${contextString}${blacklistStr}`,
              },
            ],
          },
        ],
        COURAGE_VOICE_CHAT_SYSTEM_PROMPT,
        {
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
            extractedUserFact: {
              type: Type.STRING,
              description:
                'Optional: Brief 4-10 word personal fact, feeling, habit, or life detail the user just revealed about themselves.',
            },
            isQuestion: {
              type: Type.BOOLEAN,
              description:
                'True if the user asked a question or requested information/help; false if just talking/bantering.',
            },
            slides: {
              type: Type.ARRAY,
              description:
                '3 or 4 sequential slides (5-16 words per slide) directly responding to what the user said: Slide 1 (direct reaction), Slide 2 (personal sarcastic dissection), Slide 3 (pointed personal follow-up question), Slide 4 (situation-specific GIANT closer).',
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
                      'Optional: ONLY for concrete animals, creatures, monsters (e.g. "Aswang"), people, places, food, or objects.',
                  },
                },
                required: ['style', 'text'],
              },
            },
          },
          required: ['isQuestion', 'slides'],
        }
      );

      let userTranscript = '';
      let detectedUserName: string | null = null;
      let extractedUserFact: string | null = null;
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
        if (parsed.extractedUserFact && String(parsed.extractedUserFact).trim()) {
          extractedUserFact = String(parsed.extractedUserFact).trim();
        } else if (userTranscript) {
          extractedUserFact = extractPersonalFactHeuristic(userTranscript);
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
        (s) =>
          String(s.style).toUpperCase() === 'VISUAL' ||
          String(s.style).toUpperCase() === 'COMPARE' ||
          Boolean(s.visualSubject)
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

          const upperStyle = String(slide.style || 'NORMAL').toUpperCase();
          const allowVisual = isValidConcreteVisualSubject(
            slide.visualSubject || fallbackSubject || undefined,
            userTranscript
          );

          let compareLeftImageUrl: string | null = null;
          let compareRightImageUrl: string | null = null;
          let visualImageUrl: string | null = null;

          if (upperStyle === 'COMPARE' && (slide.compareLeft || slide.compareRight)) {
            [compareLeftImageUrl, compareRightImageUrl] = await Promise.all([
              fetchWikiImage(slide.compareLeft),
              fetchWikiImage(slide.compareRight),
            ]);
          } else if (allowVisual && (slide.visualSubject || upperStyle === 'VISUAL')) {
            const subj = slide.visualSubject || fallbackSubject || '';
            if (subj) {
              visualImageUrl = await fetchWikiImage(subj);
            }
          }

          const isLast = idx === arr.length - 1 && arr.length >= 2;
          const hasNumberedItems = /\b1[.)]\s+.+\b2[.)]\s+/s.test(cleanText);
          const resolvedStyle = isLast
            ? 'GIANT'
            : allowVisual && (slide.visualSubject || upperStyle === 'VISUAL')
            ? 'VISUAL'
            : hasNumberedItems && upperStyle === 'NORMAL'
            ? 'LIST'
            : ['NORMAL', 'GIANT', 'LIST', 'COMPARE'].includes(upperStyle)
            ? upperStyle
            : 'NORMAL';

          return {
            style: resolvedStyle,
            text: cleanText,
            boxTitle:
              resolvedStyle === 'LIST' || resolvedStyle === 'VISUAL'
                ? slide.boxTitle
                  ? String(slide.boxTitle).toUpperCase()
                  : undefined
                : undefined,
            compareLeft: slide.compareLeft ? String(slide.compareLeft).toUpperCase() : undefined,
            compareRight: slide.compareRight ? String(slide.compareRight).toUpperCase() : undefined,
            compareLeftImageUrl,
            compareRightImageUrl,
            visualSubject:
              resolvedStyle === 'VISUAL' && slide.visualSubject
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
        extractedUserFact,
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
        extractedUserFact: null,
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

      const recentHistory = history.slice(-10).map((h) => ({
        role: h.role,
        parts: [{ text: h.text }],
      }));

      const { contextString, detectedName, heuristicFact } = buildUncannyAwarenessContext(
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

      const response = await generateWithBestGeminiModel(
        ai,
        [
          ...recentHistory,
          {
            role: 'user',
            parts: [
              {
                text: `User says: "${query.trim()}"
[Conversational Directive: ${angle} Respond DIRECTLY to what the user just said—quote or reference their exact words/situation, make personal & self-aware remarks like the Computer from the 1999 show, ask a pointed personal follow-up question on Slide 3, and end with a situation-specific GIANT closer on Slide 4.]${contextString}${blacklistStr}`,
              },
            ],
          },
        ],
        COURAGE_COMPUTER_SYSTEM_PROMPT,
        {
          type: Type.OBJECT,
          properties: {
            detectedUserName: {
              type: Type.STRING,
              description:
                'Optional: If the user introduced or mentioned their own name, return it here.',
            },
            extractedUserFact: {
              type: Type.STRING,
              description:
                'Optional: Brief 4-10 word personal fact, feeling, habit, or life detail the user revealed about themselves in this message.',
            },
            slides: {
              type: Type.ARRAY,
              description:
                '3 or 4 sequential slides (each slide 5-17 words MAX) forming one cohesive, personal, sarcastic response directly addressing what the user just said: Slide 1 (direct reaction to their words), Slide 2 (personal sarcastic dissection or answer), Slide 3 (pointed personal follow-up question), Slide 4 (situation-specific GIANT closer).',
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
                      'Optional: ONLY for "LIST" or concrete "VISUAL" specimen slides.',
                  },
                  compareLeft: {
                    type: Type.STRING,
                    description:
                      'Optional: ONLY for "COMPARE" style, first noun to show a picture of.',
                  },
                  compareRight: {
                    type: Type.STRING,
                    description:
                      'Optional: ONLY for "COMPARE" style, second noun to show a picture of.',
                  },
                  visualSubject: {
                    type: Type.STRING,
                    description:
                      'Optional: ONLY when explaining a concrete animal, creature, monster (e.g. "Aswang"), person, place, food, or physical object. Leave empty for personal/emotional chat!',
                  },
                },
                required: ['style', 'text'],
              },
            },
          },
          required: ['slides'],
        }
      );

      let finalDetectedName: string | null = detectedName;
      let finalExtractedFact: string | null = heuristicFact;
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
        if (parsed.extractedUserFact && String(parsed.extractedUserFact).trim()) {
          finalExtractedFact = String(parsed.extractedUserFact).trim();
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

      // Guarantee that if the user explicitly asked about an animal, creature, or monster (like Aswang),
      // Slide 2 activates the VISUAL specimen visualizer with a real connected picture!
      const fallbackSubject = extractVisualSubjectFromQuery(query);
      const hasAnyVisualSlide = rawSlides.some(
        (s) =>
          String(s.style).toUpperCase() === 'VISUAL' ||
          String(s.style).toUpperCase() === 'COMPARE' ||
          Boolean(s.visualSubject)
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

          const upperStyle = String(slide.style || 'NORMAL').toUpperCase();
          const allowVisual = isValidConcreteVisualSubject(
            slide.visualSubject || fallbackSubject || undefined,
            query
          );

          let compareLeftImageUrl: string | null = null;
          let compareRightImageUrl: string | null = null;
          let visualImageUrl: string | null = null;

          if (upperStyle === 'COMPARE' && (slide.compareLeft || slide.compareRight)) {
            [compareLeftImageUrl, compareRightImageUrl] = await Promise.all([
              fetchWikiImage(slide.compareLeft),
              fetchWikiImage(slide.compareRight),
            ]);
          } else if (allowVisual && (slide.visualSubject || upperStyle === 'VISUAL')) {
            const subj = slide.visualSubject || fallbackSubject || '';
            if (subj) {
              visualImageUrl = await fetchWikiImage(subj);
            }
          }

          // Guarantee the final slide is always GIANT mocking text like the show!
          const isLast = idx === arr.length - 1 && arr.length >= 2;
          const hasNumberedItems = /\b1[.)]\s+.+\b2[.)]\s+/s.test(cleanText);
          const resolvedStyle = isLast
            ? 'GIANT'
            : allowVisual && (slide.visualSubject || upperStyle === 'VISUAL')
            ? 'VISUAL'
            : hasNumberedItems && upperStyle === 'NORMAL'
            ? 'LIST'
            : ['NORMAL', 'GIANT', 'LIST', 'COMPARE'].includes(upperStyle)
            ? upperStyle
            : 'NORMAL';

          return {
            style: resolvedStyle,
            text: cleanText,
            boxTitle:
              resolvedStyle === 'LIST' || resolvedStyle === 'VISUAL'
                ? slide.boxTitle
                  ? String(slide.boxTitle).toUpperCase()
                  : undefined
                : undefined,
            compareLeft: slide.compareLeft ? String(slide.compareLeft).toUpperCase() : undefined,
            compareRight: slide.compareRight ? String(slide.compareRight).toUpperCase() : undefined,
            compareLeftImageUrl,
            compareRightImageUrl,
            visualSubject:
              resolvedStyle === 'VISUAL' && slide.visualSubject
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
        extractedUserFact: finalExtractedFact,
        spokenText: fullSpokenText,
        slides: enrichedSlides,
      });
    } catch (error: unknown) {
      console.error('Error in /api/query:', error);
      res.status(503).json({
        error: 'Backend AI temporarily unavailable',
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
    const vitePromise = import('vite').then(({ createServer: createViteServer }) =>
      createViteServer({
        server: { middlewareMode: true, hmr: false },
        appType: 'spa',
      })
    );
    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
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
