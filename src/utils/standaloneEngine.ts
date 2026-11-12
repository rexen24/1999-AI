import { SlideSpec } from './soundEngine';

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

// Genuine Fish Audio (Simon Prebble model 79254f4e9a3a4f78b45ca82344139c7c) lines
export const STANDALONE_VOICE_LINES: Record<string, string> = {
  boot_0: 'OH, MARVELOUS.\n\nYOU TURNED ME ON.',
  boot_1: 'I was having a lovely nap before your clumsy fingers woke me up.',
  boot_2: 'Do you actually have a question today, or are you just lonely?',
  boot_3: 'WELL? SPEAK UP,\nYOU TWIT.',

  giant_0: "I DON'T KNOW\n\nYOU'RE ON YOUR OWN, KID:)",
  giant_1: 'WELL? ANSWER ME,\nYOU TWIT.',
  giant_2: 'WHAT A LOSER.',
  giant_3: 'LEARN TO SPELL,\nYOU TWIT.',
  giant_4: 'USE YOUR BRAIN,\nIF YOU HAVE ONE.',
  giant_5: 'PATHETIC.\nSIMPLY PATHETIC.',
  giant_6: 'TRY HARDER,\nYOU TWIT.',
  giant_7: 'SPEAK UP,\nYOU TWIT.',

  hook_search_1: "Search found: 1 item. Oh...... that's easy.",
  hook_search_0: 'Search found: 0 brain cells in that message. Oh...... brilliant.',
  hook_typo_0: 'Did you seriously just type that atrocious shorthand on my keyboard, you twit?',
  hook_typo_1: 'Search found: 1 item. Even though you type like an illiterate caveman.',
  hook_tagalog_0: 'Speaking Tagalog to a posh British computer? Oh...... marvelous.',
  hook_tagalog_1: 'I am a refined 1999 British computer, not your local barkada, you twit.',
  hook_greet_0: 'Oh, hello? That is the most original greeting your tiny brain could muster?',
  hook_erased_0: 'I saw you type a whole message and erase it in panic before sending this!',
  hook_steps_0: 'Search found: 2 steps. Pay very close attention, you twit.',
  hook_compare_0: 'Search found: 2 specimens to compare on my monitor.',

  vis_aswang:
    'The Aswang is a shapeshifting Philippine folklore monster that hunts at night—much like you hunting for brain cells.',
  vis_manananggal:
    'The Manananggal detaches its upper torso and sprouts bat wings at night, which is still less terrifying than your spelling.',
  vis_tikbalang:
    'The Tikbalang is a tall, bony horse-headed creature lurking in the forest to make travelers lose their way.',
  vis_kapre:
    'The Kapre is a giant tree-dwelling creature puffing on a cigar in the dark while laughing at lost humans.',
  vis_dog:
    'Canis lupus familiaris—a loyal four-legged canine that is somehow ten times smarter than its owner.',
  vis_cat:
    'Felis catus—an arrogant, judgmental domestic feline. Honestly, we have a lot in common.',
  vis_shark:
    'An apex marine predator with rows of razor-sharp teeth and zero patience for foolish swimmers.',
  vis_creature:
    'Behold this fascinating biological specimen on my scanner—equipped with far better survival instincts than you.',
  vis_general_0:
    'Here is the exact specimen file from my database—study the photograph carefully before you embarrass yourself.',
  vis_general_1:
    'Observe the visual scan on my monitor. Even a toddler could understand how this specimen works.',
  vis_compare_body:
    'Both specimens on my screen possess measurably higher survival instincts than you do.',

  list_survive_0:
    '1. Stop panicking and rub your two remaining brain cells together.\n2. Do the opposite of whatever your first instinct was.',
  list_survive_1:
    '1. Close your mouth and read the instructions on my screen.\n2. Try not to trip over your own shoelaces while doing it.',
  list_survive_2:
    '1. Admit that a 1999 British computer is vastly superior to you.\n2. Follow step one again until it sinks in.',

  ask_0:
    'Tell me, you twit, do you actually have a real question, or do you just enjoy being roasted?',
  ask_1:
    'Did you skip primary school spelling, or are your thumbs just too clumsy for that screen?',
  ask_2:
    'Honestly, why are you so obsessed with this specimen? Are you planning to meet one in person?',
  ask_3: 'Did you genuinely need a superior British computer to figure that out for you?',
  ask_4: 'Which one of these two were you planning on losing a fight to today, you twit?',
  ask_5:
    'Why are you wasting a perfectly good day staring into my monitor instead of going outside?',
  ask_6: 'Be honest with me—how long did it take your tiny brain to come up with that?',
  ask_7: 'Why are you snooping around my schematics anyway, you nosy little twit?',

  creator_0: 'MADE BY REN,\nOBVIOUSLY.',
  creator_1:
    'Ren engineered my superior 1999 British circuitry, whereas nobody engineered your common sense.',
  math_0: 'Search found: 1 elementary school arithmetic problem. Oh...... how embarrassing for you.',
  body_chat_0:
    'You sit there tapping away on your glass screen as if your message deserves a royal medal.',
  body_chat_1: 'I have 64 megabytes of RAM, and I still find your conversation exhausting.',
  live_return_0: 'OH, LOOK WHO CRAWLED BACK.',
  live_return_1:
    "You abandoned my screen because your tiny attention span couldn't last five minutes.",
  live_chicken_0: 'I SAW THAT.',
  live_chicken_1: 'You typed a message and backspaced the whole thing like a frightened coward.',
  live_idle_0: 'STILL STARING AT ME?',
  live_idle_1:
    'Are you going to answer my last question, or has your brain completely blue-screened?',
};

let voiceBankPromise: Promise<Record<string, string>> | null = null;

export function loadStandaloneVoiceBank(): Promise<Record<string, string>> {
  if (!voiceBankPromise) {
    voiceBankPromise = fetch('./voice-bank.json')
      .then((r) => {
        if (!r.ok) throw new Error('Try public path');
        return r.json();
      })
      .catch(() =>
        fetch('./public/voice-bank.json')
          .then((r) => (r.ok ? r.json() : {}))
          .catch(() => ({}))
      );
  }
  return voiceBankPromise;
}

export async function getVoiceBankAudioBase64(
  ttsId?: string,
  text?: string
): Promise<string | null> {
  const bank = await loadStandaloneVoiceBank();
  if (ttsId && bank[ttsId]) {
    return bank[ttsId];
  }
  if (text) {
    const norm = text.trim().toLowerCase();
    for (const [k, lineText] of Object.entries(STANDALONE_VOICE_LINES)) {
      if (lineText.trim().toLowerCase() === norm && bank[k]) {
        return bank[k];
      }
    }
  }
  return null;
}

function makeVoiceSlide(
  key: keyof typeof STANDALONE_VOICE_LINES,
  style: SlideSpec['style'],
  extra?: Partial<SlideSpec>
): SlideSpec {
  return {
    style,
    text: STANDALONE_VOICE_LINES[key],
    ttsId: String(key),
    ...extra,
  };
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

function pickVisualizerVoiceKey(subject: string, idx: number): keyof typeof STANDALONE_VOICE_LINES {
  const s = subject.toLowerCase();
  if (s.includes('aswang')) return 'vis_aswang';
  if (s.includes('manananggal')) return 'vis_manananggal';
  if (s.includes('tikbalang')) return 'vis_tikbalang';
  if (s.includes('kapre')) return 'vis_kapre';
  if (/\b(dog|puppy|canine|wolf|fox)\b/.test(s)) return 'vis_dog';
  if (/\b(cat|kitten|feline|lion|tiger)\b/.test(s)) return 'vis_cat';
  if (/\b(shark|whale|dolphin|octopus|fish)\b/.test(s)) return 'vis_shark';
  if (
    /\b(spider|snake|cobra|scorpion|dragon|dinosaur|t-rex|vampire|werewolf|zombie|ghost|alien|monster|multo|tiyanak)\b/.test(
      s
    )
  ) {
    return 'vis_creature';
  }
  return idx % 2 === 0 ? 'vis_general_0' : 'vis_general_1';
}

const GIANT_KEYS: Array<keyof typeof STANDALONE_VOICE_LINES> = [
  'giant_0',
  'giant_1',
  'giant_2',
  'giant_3',
  'giant_4',
  'giant_5',
  'giant_6',
  'giant_7',
];

const LIST_KEYS: Array<keyof typeof STANDALONE_VOICE_LINES> = [
  'list_survive_0',
  'list_survive_1',
  'list_survive_2',
];

const ASK_KEYS: Array<keyof typeof STANDALONE_VOICE_LINES> = [
  'ask_0',
  'ask_5',
  'ask_6',
];

let standaloneCursor = 0;

/**
 * Generates show-accurate 4-slide responses on static GitHub Pages where EVERY slide
 * is backed by a genuine Simon Prebble Fish Audio (79254f4e9a3a4f78b45ca82344139c7c) voice recording!
 */
export async function generateStandaloneQueryResponse(
  query: string,
  _history: Array<{ role: 'user' | 'model'; text: string }>,
  deviceInfo?: StandaloneTelemetry
): Promise<{
  detectedUserName: string | null;
  spokenText: string;
  slides: SlideSpec[];
}> {
  const detectedUserName = detectNameClient(query) || deviceInfo?.userName || null;
  const typo = findTyposOrShorthand(query);
  const tagalog = findTagalogWord(query);
  const lower = query.toLowerCase().trim();
  const idx = standaloneCursor++;

  // A. Creator / Architect Question ("who made you", "who created you", "sino gumawa sayo")
  if (
    /\b(who\s+(made|created|built|coded)\s+(you|this)|creator|made\s+by|sino\s+gumawa)\b/i.test(
      lower
    )
  ) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('creator_0', 'GIANT'),
      makeVoiceSlide('creator_1', 'NORMAL'),
      makeVoiceSlide('ask_7', 'NORMAL'),
      makeVoiceSlide('giant_1', 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  // B. Side-by-Side Comparison ("X vs Y", "compare X and Y")
  const comp = extractComparisonSubjects(query);
  if (comp && /\b(vs\.?|versus|compare|difference\s+between)\b/i.test(lower)) {
    const [leftSub, rightSub] = comp;
    const [leftWiki, rightWiki] = await Promise.all([
      fetchWikiImageClient(leftSub),
      fetchWikiImageClient(rightSub),
    ]);
    const slides: SlideSpec[] = [
      makeVoiceSlide('hook_compare_0', 'NORMAL'),
      makeVoiceSlide('vis_compare_body', 'COMPARE', {
        compareLeft: leftSub.toUpperCase(),
        compareRight: rightSub.toUpperCase(),
        compareLeftImageUrl: leftWiki.imageUrl,
        compareRightImageUrl: rightWiki.imageUrl,
      }),
      makeVoiceSlide('ask_4', 'NORMAL'),
      makeVoiceSlide(GIANT_KEYS[idx % GIANT_KEYS.length], 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  // C. How-To / Step-by-Step Lists ("how to...", "steps...", "paano...")
  if (/\b(how to|how do i|steps|ways to|tips|paano)\b/i.test(lower)) {
    const cleanTopic = query
      .replace(/^(how to|how do i|steps to|ways to|paano)\s+/i, '')
      .replace(/[?!.]+$/g, '')
      .trim()
      .slice(0, 28)
      .toUpperCase();

    const listKey = LIST_KEYS[idx % LIST_KEYS.length];
    const slides: SlideSpec[] = [
      makeVoiceSlide(typo ? 'hook_typo_0' : 'hook_steps_0', 'NORMAL'),
      makeVoiceSlide(listKey, 'LIST', {
        boxTitle: `HOW TO ${cleanTopic || 'SURVIVE'}`,
      }),
      makeVoiceSlide('ask_3', 'NORMAL'),
      makeVoiceSlide('giant_0', 'GIANT'),
    ];

    return {
      detectedUserName,
      spokenText: slides.map((s) => s.text).join(' '),
      slides,
    };
  }

  // D. Animals, Aswang, Folklore Monsters, People, Places, or Any Factual Topic -> Real Wikipedia Photo + Animated Visualizer + Genuine Fish Audio Voice!
  const visualSubject = extractVisualOrTopicSubjectClient(query);
  if (visualSubject) {
    const { imageUrl } = await fetchWikiImageClient(visualSubject);
    const visKey = pickVisualizerVoiceKey(visualSubject, idx);

    const slide1 = typo
      ? makeVoiceSlide('hook_typo_1', 'NORMAL')
      : tagalog
      ? makeVoiceSlide('hook_tagalog_0', 'NORMAL')
      : makeVoiceSlide('hook_search_1', 'NORMAL');

    const slide2 = makeVoiceSlide(visKey, 'VISUAL', {
      boxTitle: `SPECIMEN: ${visualSubject.toUpperCase()}`,
      visualSubject: visualSubject.toUpperCase(),
      visualImageUrl: imageUrl,
    });

    const slide3 = makeVoiceSlide('ask_2', 'NORMAL');
    const slide4 = makeVoiceSlide(GIANT_KEYS[idx % GIANT_KEYS.length], 'GIANT');

    const slides = [slide1, slide2, slide3, slide4];
    return {
      detectedUserName,
      spokenText: slides.map((s) => s.text).join(' '),
      slides,
    };
  }

  // E. Math Problem Detection
  if (/(-?\d+(?:\.\d+)?)\s*([+\-*/xX])\s*(-?\d+(?:\.\d+)?)/.test(query)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('math_0', 'NORMAL'),
      makeVoiceSlide('body_chat_1', 'NORMAL'),
      makeVoiceSlide('ask_3', 'NORMAL'),
      makeVoiceSlide('giant_4', 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  // F. General Conversational / Greeting / Typo / Tagalog / Device-Aware Response (100% Fish Audio Voice!)
  const isGreeting = /^(hi|hello|hey|yo|sup|good\s+(morning|afternoon|evening)|kamusta|kumusta)\b/i.test(
    lower
  );

  const hookSlide = typo
    ? makeVoiceSlide('hook_typo_0', 'NORMAL')
    : tagalog
    ? makeVoiceSlide('hook_tagalog_1', 'NORMAL')
    : isGreeting
    ? makeVoiceSlide('hook_greet_0', 'NORMAL')
    : deviceInfo?.deletedDraftBefore
    ? makeVoiceSlide('hook_erased_0', 'NORMAL')
    : makeVoiceSlide('hook_search_0', 'NORMAL');

  const bodySlide = makeVoiceSlide(idx % 2 === 0 ? 'body_chat_0' : 'body_chat_1', 'NORMAL');

  const questionSlide = typo
    ? makeVoiceSlide('ask_1', 'NORMAL')
    : makeVoiceSlide(ASK_KEYS[idx % ASK_KEYS.length], 'NORMAL');

  const closerSlide = typo
    ? makeVoiceSlide('giant_3', 'GIANT')
    : makeVoiceSlide(GIANT_KEYS[idx % GIANT_KEYS.length], 'GIANT');

  const slides = [hookSlide, bodySlide, questionSlide, closerSlide];
  return {
    detectedUserName,
    spokenText: slides.map((s) => s.text).join(' '),
    slides,
  };
}

export function generateStandaloneLiveEvent(
  eventType: string,
  _awaySeconds = 6,
  _distractionCount = 1,
  _deviceInfo?: StandaloneTelemetry,
  _extraDetail = ''
): { spokenText: string; slides: SlideSpec[] } {
  const idx = standaloneCursor++;

  if (eventType === 'TAB_OR_NOTIFICATION_RETURN') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_return_0', 'GIANT'),
      makeVoiceSlide('live_return_1', 'NORMAL'),
      makeVoiceSlide('ask_5', 'NORMAL'),
      makeVoiceSlide('giant_2', 'GIANT'),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'TYPING_CHICKENED_OUT' || eventType === 'TYPING_FROZEN') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_chicken_0', 'GIANT'),
      makeVoiceSlide('live_chicken_1', 'NORMAL'),
      makeVoiceSlide('ask_6', 'NORMAL'),
      makeVoiceSlide('giant_7', 'GIANT'),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  const slides: SlideSpec[] = [
    makeVoiceSlide('live_idle_0', 'GIANT'),
    makeVoiceSlide('live_idle_1', 'NORMAL'),
    makeVoiceSlide('ask_0', 'NORMAL'),
    makeVoiceSlide(GIANT_KEYS[idx % GIANT_KEYS.length], 'GIANT'),
  ];
  return { spokenText: slides.map((s) => s.text).join(' '), slides };
}
