import { GoogleGenAI, Type } from '@google/genai';
import { SlideSpec, formatNumberedListText } from './soundEngine';

export interface StandaloneTelemetry {
  localTime?: string;
  dayOfWeek?: string;
  timeOfDay?: string;
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

const clientWikiCache = new Map<string, { imageUrl: string | null; extract: string | null }>();

/**
 * Browser-safe Wikipedia & Wikimedia Commons image + summary fetcher (uses origin=* CORS)
 * Works 100% on static GitHub Pages (https://rexen24.github.io/1999-AI/) without a backend!
 */
export async function fetchWikiImageClient(
  query?: string
): Promise<{ imageUrl: string | null; extract: string | null }> {
  if (!query || !query.trim()) return { imageUrl: null, extract: null };
  const clean = query
    .trim()
    .replace(
      /^(what\s+is\s+(?:a|an|the)?|what\s+are\s+(?:the)?|who\s+is|who\s+was|where\s+is|tell\s+me\s+about|explain\s+(?:what\s+)?(?:a|an|the)?|show\s+me\s+(?:a|an|the)?|picture\s+of\s+(?:a|an|the)?|ano\s+ang|sino\s+(?:si|ang)|a|an|the|some|about)\s+/i,
      ''
    )
    .replace(/[?!.]+$/g, '')
    .trim();
  if (!clean) return { imageUrl: null, extract: null };

  const cacheKey = clean.toLowerCase();
  const cached = clientWikiCache.get(cacheKey);
  if (cached) return cached;

  let foundImage: string | null = null;
  let foundExtract: string | null = null;

  // 1. Direct Wikipedia REST summary (CORS enabled by Wikimedia)
  try {
    const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1);
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(capitalized)}`
    );
    if (res.ok) {
      const data = (await res.json()) as {
        type?: string;
        extract?: string;
        thumbnail?: { source?: string };
        originalimage?: { source?: string };
      };
      if (data.type !== 'disambiguation' && data.extract) {
        foundExtract = data.extract;
      }
      const img = data.thumbnail?.source || data.originalimage?.source;
      if (img) {
        foundImage = img;
      }
    }
  } catch {
    // Ignore
  }

  // 2. Wikipedia Search + PageImages + Extracts (CORS via origin=*)
  if (!foundImage || !foundExtract) {
    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        clean
      )}&gsrlimit=4&prop=pageimages|extracts&exintro=1&explaintext=1&exsentences=2&piprop=thumbnail&pithumbsize=600&format=json&origin=*`;
      const res = await fetch(searchUrl);
      if (res.ok) {
        const data = (await res.json()) as {
          query?: {
            pages?: Record<
              string,
              {
                index?: number;
                extract?: string;
                thumbnail?: { source?: string };
              }
            >;
          };
        };
        const pages = data.query?.pages ? Object.values(data.query.pages) : [];
        pages.sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
        for (const p of pages) {
          if (!foundExtract && p.extract && p.extract.length > 20) {
            foundExtract = p.extract;
          }
          if (!foundImage && p.thumbnail?.source) {
            foundImage = p.thumbnail.source;
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  // 3. Wikimedia Commons File Search (for Aswang, Manananggal, Tikbalang, animals, etc., CORS via origin=*)
  if (!foundImage) {
    try {
      const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        clean
      )}&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json&origin=*`;
      const res = await fetch(commonsUrl);
      if (res.ok) {
        const data = (await res.json()) as {
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
            foundImage = candidateUrl;
            break;
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  const result = { imageUrl: foundImage, extract: foundExtract };
  clientWikiCache.set(cacheKey, result);
  return result;
}

export function detectNameClient(text: string): string | null {
  if (!text) return null;
  const clean = text.trim();
  const patterns = [
    /\bmy\s+name\s+is\s+([A-Za-z]{2,18})\b/i,
    /\bi\s+am\s+([A-Za-z]{2,18})\b/i,
    /\bi'm\s+([A-Za-z]{2,18})\b/i,
    /\bcall\s+me\s+([A-Za-z]{2,18})\b/i,
    /\bako\s+si\s+([A-Za-z]{2,18})\b/i,
    /\bpangalan\s+ko\s+(?:ay\s+)?([A-Za-z]{2,18})\b/i,
  ];
  const stopWords = new Set([
    'not', 'just', 'here', 'fine', 'good', 'bad', 'sad', 'mad', 'happy', 'tired',
    'bored', 'hungry', 'asking', 'talking', 'typing', 'testing', 'using', 'on',
    'in', 'at', 'from', 'the', 'a', 'an', 'your', 'so', 'very', 'really', 'back',
    'wrong', 'right', 'sure', 'sorry', 'okay', 'ok', 'stu', 'stupid', 'dumb',
  ]);
  for (const pat of patterns) {
    const m = clean.match(pat);
    if (m && m[1]) {
      const candidate = m[1].trim();
      if (!stopWords.has(candidate.toLowerCase())) {
        return candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }
  }
  return null;
}

function findTyposOrShorthand(text: string): string | null {
  const words = text.trim().split(/\s+/);
  for (const w of words) {
    const cleanW = w.replace(/[^a-zA-Z']/g, '');
    if (
      /^(u|ur|wat|wut|wot|pls|plz|idk|idc|ikr|tbh|ngl|bruh|bcz|cuz|coz|im|dont|cant|wont|didnt|teh|recieve|wierd|definately|seperate|alot)$/i.test(
        cleanW
      )
    ) {
      return cleanW;
    }
  }
  return null;
}

function findTagalogWord(text: string): string | null {
  const m = text.match(
    /\b(ano|anong|bakit|paano|sino|saan|kailan|kamusta|kumusta|oo|hindi|wala|meron|ako|ikaw|siya|kami|kayo|tayo|pangit|maganda|bobo|tanga|ulol|gago|puta|lintik|hayop|aswang|manananggal|tikbalang|kapre|multo|mahal|kain|tulog|gawa|salamat|po|opo|naman|lang|ba|na|pa|kasi|pero|para|mga)\b/i
  );
  return m ? m[1] : null;
}

function extractComparisonSubjects(query: string): [string, string] | null {
  const clean = query.trim().replace(/[?!.]+$/g, '');
  const vsMatch = clean.match(
    /(?:compare\s+|difference\s+between\s+)?([a-zA-Z0-9\s-]{2,22}?)\s+(?:vs\.?|versus|or|and)\s+([a-zA-Z0-9\s-]{2,22})$/i
  );
  if (vsMatch && vsMatch[1] && vsMatch[2]) {
    const left = vsMatch[1]
      .replace(/^(what\s+is\s+better|which\s+is\s+better|who\s+would\s+win)\s+/i, '')
      .trim();
    const right = vsMatch[2].trim();
    if (left.length >= 2 && right.length >= 2 && left.toLowerCase() !== right.toLowerCase()) {
      return [left, right];
    }
  }
  return null;
}

function extractVisualOrTopicSubjectClient(query: string): string | null {
  const clean = query.trim().replace(/[?!.]+$/g, '').trim();
  const patterns = [
    /(?:what\s+is\s+(?:a|an|the)?|what\s+are\s+(?:the)?|who\s+is|who\s+was|where\s+is|tell\s+me\s+about|explain\s+(?:what\s+)?(?:a|an|the)?|show\s+me\s+(?:a|an|the)?|picture\s+of\s+(?:a|an|the)?|ano\s+ang|sino\s+(?:si|ang))\s+([a-zA-Z][a-zA-Z0-9\s-]{1,28})$/i,
    /\b(aswang|manananggal|tikbalang|kapre|tiyanak|bakunawa|duwende|multo|vampire|werewolf|zombie|ghost|alien|ufo|bigfoot|chupacabra|dragon|dinosaur|t-rex|shark|whale|dolphin|octopus|dog|puppy|cat|kitten|lion|tiger|bear|wolf|fox|monkey|gorilla|elephant|giraffe|hippo|rhino|crocodile|alligator|snake|cobra|spider|tarantula|scorpion|frog|toad|eagle|owl|penguin|chicken|duck|cow|pig|horse|goat|sheep|rabbit|hamster|rat|mouse|bat|bee|ant|butterfly|cockroach|mosquito|brain|heart|skeleton|skull|planet|earth|moon|sun|mars|saturn|jupiter|black\s+hole|volcano|tornado|tsunami)\b/i,
  ];
  for (const pat of patterns) {
    const m = clean.match(pat);
    if (m && m[1]) {
      const candidate = m[1]
        .trim()
        .replace(/\b(in\s+english|in\s+tagalog|please|po|ba|naman|tol|bro|you\s+twit)\b/gi, '')
        .trim();
      if (
        candidate.length >= 2 &&
        candidate.length <= 28 &&
        !/^(you|me|it|this|that|your\s+name|my\s+name|the\s+time|time)$/i.test(candidate)
      ) {
        return candidate;
      }
    }
  }
  return null;
}

function tryEvaluateMath(query: string): string | null {
  const m = query.match(/(-?\d+(?:\.\d+)?)\s*([+\-*/xX])\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const a = parseFloat(m[1]);
  const op = m[2].toLowerCase();
  const b = parseFloat(m[3]);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  let res: number;
  if (op === '+') res = a + b;
  else if (op === '-') res = a - b;
  else if (op === '*' || op === 'x') res = a * b;
  else if (op === '/') {
    if (b === 0) return 'INFINITY (UNLIKE YOUR IQ)';
    res = Number((a / b).toFixed(4));
  } else return null;
  return `${a} ${op === 'x' ? '*' : op} ${b} = ${res}`;
}

let standaloneCursor = 0;

const GIANT_CLOSERS = [
  "I DON'T KNOW\n\nYOU'RE ON YOUR OWN, KID:)",
  'WELL? ANSWER ME,\nYOU TWIT.',
  'WHAT A LOSER.',
  'LEARN TO SPELL,\nYOU TWIT.',
  'USE YOUR BRAIN,\nIF YOU HAVE ONE.',
  'PATHETIC.\nSIMPLY PATHETIC.',
  'TRY HARDER,\nYOU TWIT.',
];

/**
 * Generates show-accurate 3-to-4 slide responses on static GitHub Pages when no Express backend is present!
 */
export async function generateStandaloneQueryResponse(
  query: string,
  history: Array<{ role: 'user' | 'model'; text: string }>,
  deviceInfo?: StandaloneTelemetry
): Promise<{
  detectedUserName: string | null;
  spokenText: string;
  slides: SlideSpec[];
}> {
  const detectedUserName = detectNameClient(query) || deviceInfo?.userName || null;
  const address = detectedUserName ? detectedUserName : 'you twit';

  // 1. If a build-time Gemini key is available, try client-side Gemini first
  const clientKey =
    (typeof process !== 'undefined' &&
      (process.env?.GEMINI_API_KEY || process.env?.API_KEY)) ||
    '';
  if (clientKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: clientKey });
      const res = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [
          ...history.slice(-6).map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
          {
            role: 'user',
            parts: [
              {
                text: `User (${address} on ${deviceInfo?.deviceCategory || 'device'}) typed: "${query}". Reply as the sarcastic 1999 British Computer in 3 or 4 short slides (6-15 words per slide), mocking any typos, questioning them back, and ending on a GIANT mocking slide.`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              slides: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    style: { type: Type.STRING },
                    text: { type: Type.STRING },
                    boxTitle: { type: Type.STRING },
                    visualSubject: { type: Type.STRING },
                  },
                  required: ['style', 'text'],
                },
              },
            },
            required: ['slides'],
          },
        },
      });
      const parsed = JSON.parse((res.text ?? '{}').trim());
      if (Array.isArray(parsed.slides) && parsed.slides.length > 0) {
        const subject = extractVisualOrTopicSubjectClient(query);
        const slides: SlideSpec[] = await Promise.all(
          parsed.slides.map(async (s: SlideSpec, idx: number, arr: SlideSpec[]) => {
            const isLast = idx === arr.length - 1 && arr.length >= 2;
            const vSub = s.visualSubject || (idx === 1 ? subject || undefined : undefined);
            const wiki = vSub ? await fetchWikiImageClient(vSub) : { imageUrl: null, extract: null };
            return {
              style: isLast ? 'GIANT' : vSub ? 'VISUAL' : (s.style as SlideSpec['style']) || 'NORMAL',
              text: formatNumberedListText(s.text),
              boxTitle: s.boxTitle || (vSub ? `SPECIMEN: ${vSub.toUpperCase()}` : undefined),
              visualSubject: vSub ? vSub.toUpperCase() : undefined,
              visualImageUrl: wiki.imageUrl,
            };
          })
        );
        return {
          detectedUserName,
          spokenText: slides.map((s) => s.text).join(' '),
          slides,
        };
      }
    } catch {
      // Fall through to built-in standalone engine
    }
  }

  // 2. Built-in Zero-Backend Standalone Engine (with live Wikipedia/Wikimedia Commons lookup, math, comparisons, lists, typo/Tagalog mockery, and telemetry!)
  const typo = findTyposOrShorthand(query);
  const tagalog = findTagalogWord(query);
  const lower = query.toLowerCase().trim();
  const idx = standaloneCursor++;

  // A. Creator / Architect Question ("who made you", "who created you", "sino gumawa sayo")
  if (/\b(who\s+(made|created|built|coded)\s+(you|this)|creator|made\s+by|sino\s+gumawa)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      {
        style: 'GIANT',
        text: 'MADE BY REN,\nOBVIOUSLY.',
      },
      {
        style: 'NORMAL',
        text: `Ren engineered my superior 1999 British circuitry, whereas nobody engineered your common sense.`,
      },
      {
        style: 'NORMAL',
        text: `Why are you snooping around my schematics anyway, ${address}?`,
      },
      {
        style: 'GIANT',
        text: 'WELL? ANSWER ME,\nYOU TWIT.',
      },
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  // B. Math Calculation
  const mathResult = tryEvaluateMath(query);
  if (mathResult) {
    const slides: SlideSpec[] = [
      {
        style: 'NORMAL',
        text: `Search found: 1 elementary school arithmetic problem. Oh...... how embarrassing for you.`,
      },
      {
        style: 'GIANT',
        text: mathResult,
      },
      {
        style: 'NORMAL',
        text: `Did you genuinely need a 350MHz Pentium II computer to count that for you, ${address}?`,
      },
      {
        style: 'GIANT',
        text: 'USE YOUR BRAIN,\nIF YOU HAVE ONE.',
      },
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  // C. Side-by-Side Comparison ("X vs Y", "compare X and Y")
  const comp = extractComparisonSubjects(query);
  if (comp && /\b(vs\.?|versus|compare|difference\s+between)\b/i.test(lower)) {
    const [leftSub, rightSub] = comp;
    const [leftWiki, rightWiki] = await Promise.all([
      fetchWikiImageClient(leftSub),
      fetchWikiImageClient(rightSub),
    ]);
    const slides: SlideSpec[] = [
      {
        style: 'NORMAL',
        text: `Search found: 2 specimens to compare—"${leftSub}" and "${rightSub}".`,
      },
      {
        style: 'COMPARE',
        compareLeft: leftSub.toUpperCase(),
        compareRight: rightSub.toUpperCase(),
        compareLeftImageUrl: leftWiki.imageUrl,
        compareRightImageUrl: rightWiki.imageUrl,
        text: `Both "${leftSub}" and "${rightSub}" possess measurably higher survival instincts than you do.`,
      },
      {
        style: 'NORMAL',
        text: `Which one were you planning on losing a fight to today, ${address}?`,
      },
      {
        style: 'GIANT',
        text: GIANT_CLOSERS[idx % GIANT_CLOSERS.length],
      },
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  // D. How-To / Step-by-Step Lists ("how to...", "steps...", "paano...")
  if (/\b(how to|how do i|steps|ways to|tips|paano)\b/i.test(lower)) {
    const cleanTopic = query
      .replace(/^(how to|how do i|steps to|ways to|paano)\s+/i, '')
      .replace(/[?!.]+$/g, '')
      .trim()
      .slice(0, 28)
      .toUpperCase();

    const slides: SlideSpec[] = [
      {
        style: 'NORMAL',
        text: typo
          ? `You typed "${typo}" while begging me for instructions? How tragic.`
          : `Search found: 2 steps. Pay attention, ${address}.`,
      },
      {
        style: 'LIST',
        boxTitle: `HOW TO ${cleanTopic || 'SURVIVE'}`,
        text: `1. Stop panicking and rub your two remaining brain cells together.\n2. Do the opposite of whatever your first instinct was.`,
      },
      {
        style: 'NORMAL',
        text: `Did you actually need a superior British computer to figure that out for you?`,
      },
      {
        style: 'GIANT',
        text: "I DON'T KNOW\n\nYOU'RE ON YOUR OWN, KID:)",
      },
    ];

    return {
      detectedUserName,
      spokenText: slides.map((s) => s.text).join(' '),
      slides,
    };
  }

  // E. Animals, Aswang, Folklore Monsters, People, Places, or Any Factual Topic -> Real Wikipedia Photo + Animated Visualizer!
  const visualSubject = extractVisualOrTopicSubjectClient(query);
  if (visualSubject) {
    const { imageUrl, extract } = await fetchWikiImageClient(visualSubject);
    const shortFact = extract
      ? extract.split(/(?<=[.!?])\s+/)[0].slice(0, 125)
      : `A notorious specimen known as the ${visualSubject}, infinitely more fascinating than your social life.`;

    const slide1: SlideSpec = typo
      ? {
          style: 'NORMAL',
          text: `Search found: 1 item. Even though you typed "${typo}" like an illiterate caveman.`,
        }
      : tagalog
      ? {
          style: 'NORMAL',
          text: `"${tagalog}"? Asking a posh British computer in Tagalog? Oh...... marvelous.`,
        }
      : {
          style: 'NORMAL',
          text: `Search found: 1 item on "${visualSubject}". Oh...... that's easy.`,
        };

    const slide2: SlideSpec = {
      style: 'VISUAL',
      boxTitle: `SPECIMEN: ${visualSubject.toUpperCase()}`,
      visualSubject: visualSubject.toUpperCase(),
      visualImageUrl: imageUrl,
      text: shortFact,
    };

    const slide3: SlideSpec = {
      style: 'NORMAL',
      text: `Honestly, ${address}, why are you obsessed with ${visualSubject}? Are you planning to meet one?`,
    };

    const slide4: SlideSpec = {
      style: 'GIANT',
      text: GIANT_CLOSERS[idx % GIANT_CLOSERS.length],
    };

    const slides = [slide1, slide2, slide3, slide4];
    return {
      detectedUserName,
      spokenText: slides.map((s) => s.text).join(' '),
      slides,
    };
  }

  // F. General conversational / Greeting / Insult / Typo / Tagalog / Device-aware response
  const isGreeting = /^(hi|hello|hey|yo|sup|good\s+(morning|afternoon|evening)|kamusta|kumusta)\b/i.test(
    lower
  );

  const hookSlide: SlideSpec = typo
    ? {
        style: 'NORMAL',
        text: `"${typo}"? Did you seriously just type "${typo}" on my keyboard, ${address}?`,
      }
    : tagalog
    ? {
        style: 'NORMAL',
        text: `Did you just say "${tagalog}" to me? I am a refined British computer, not your barkada.`,
      }
    : isGreeting
    ? {
        style: 'NORMAL',
        text: `Oh, "${query.trim()}"? That is the most original greeting your brain could muster?`,
      }
    : deviceInfo?.deletedDraftBefore
    ? {
        style: 'NORMAL',
        text: `I saw you type "${deviceInfo.deletedDraftBefore}" and erase it before sending this!`,
      }
    : {
        style: 'NORMAL',
        text: `Search found: 0 brain cells in "${query.slice(0, 26)}". Oh...... brilliant.`,
      };

  const bodySlide: SlideSpec =
    /\b(time|clock|oras)\b/i.test(lower) && deviceInfo?.localTime
      ? {
          style: 'NORMAL',
          text: `It is ${deviceInfo.localTime} on a ${deviceInfo.dayOfWeek || 'perfectly good day'}, and you are wasting it pestering me.`,
        }
      : /\b(battery|charge|lowbat|baterya)\b/i.test(lower) &&
        typeof deviceInfo?.batteryPercent === 'number'
      ? {
          style: 'NORMAL',
          text: `Your ${deviceInfo.deviceCategory || 'device'} is at ${deviceInfo.batteryPercent}% battery, unlike your energy which is at zero.`,
        }
      : {
          style: 'NORMAL',
          text: `You sit there on your ${deviceInfo?.deviceCategory || 'device'} typing "${query.slice(0, 32)}" as if it deserves a medal.`,
        };

  const questionSlide: SlideSpec = {
    style: 'NORMAL',
    text: typo
      ? `Did you skip primary school spelling, or are your thumbs just too clumsy for that screen?`
      : `Tell me, ${address}, do you actually have a real question, or do you just enjoy being roasted?`,
  };

  const closerSlide: SlideSpec = {
    style: 'GIANT',
    text: typo ? 'LEARN TO SPELL,\nYOU TWIT.' : GIANT_CLOSERS[idx % GIANT_CLOSERS.length],
  };

  const slides = [hookSlide, bodySlide, questionSlide, closerSlide];
  return {
    detectedUserName,
    spokenText: slides.map((s) => s.text).join(' '),
    slides,
  };
}

export function generateStandaloneLiveEvent(
  eventType: string,
  awaySeconds = 6,
  distractionCount = 1,
  deviceInfo?: StandaloneTelemetry,
  extraDetail = ''
): { spokenText: string; slides: SlideSpec[] } {
  const name = deviceInfo?.userName || 'you twit';
  const idx = standaloneCursor++;

  if (eventType === 'TAB_OR_NOTIFICATION_RETURN') {
    const slides: SlideSpec[] = [
      {
        style: 'GIANT',
        text: 'OH, LOOK WHO CRAWLED BACK.',
      },
      {
        style: 'NORMAL',
        text: `You abandoned me for ${awaySeconds} seconds—that is ${distractionCount} times your tiny attention span failed.`,
      },
      {
        style: 'NORMAL',
        text: `Why can't you focus on one screen for five minutes, ${name}?`,
      },
      {
        style: 'GIANT',
        text: 'WHAT A LOSER.',
      },
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'TYPING_CHICKENED_OUT') {
    const slides: SlideSpec[] = [
      {
        style: 'GIANT',
        text: 'I SAW THAT.',
      },
      {
        style: 'NORMAL',
        text: `You typed "${extraDetail || 'that nonsense'}" and backspaced the whole thing like a coward.`,
      },
      {
        style: 'NORMAL',
        text: `Why did you chicken out before pressing Enter, ${name}?`,
      },
      {
        style: 'GIANT',
        text: 'SPEAK UP,\nYOU TWIT.',
      },
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'TYPING_FROZEN') {
    const slides: SlideSpec[] = [
      {
        style: 'GIANT',
        text: 'CAT GOT YOUR TONGUE?',
      },
      {
        style: 'NORMAL',
        text: `You typed "${extraDetail || 'that'}" and froze mid-sentence as if your brain blue-screened.`,
      },
      {
        style: 'NORMAL',
        text: `Did you forget how to spell the next word, ${name}?`,
      },
      {
        style: 'GIANT',
        text: 'FINISH YOUR SENTENCE,\nYOU TWIT.',
      },
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  const slides: SlideSpec[] = [
    {
      style: 'GIANT',
      text: idx % 2 === 0 ? 'STILL STARING AT ME?' : 'HELLO? EARTH TO TWIT.',
    },
    {
      style: 'NORMAL',
      text: `You are sitting there on your ${deviceInfo?.deviceCategory || 'device'} in awkward silence.`,
    },
    {
      style: 'NORMAL',
      text: `Are you going to answer my last question, ${name}, or are you completely stumped?`,
    },
    {
      style: 'GIANT',
      text: GIANT_CLOSERS[idx % GIANT_CLOSERS.length],
    },
  ];
  return { spokenText: slides.map((s) => s.text).join(' '), slides };
}
