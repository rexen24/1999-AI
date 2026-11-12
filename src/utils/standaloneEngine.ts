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

// 125+ Genuine Fish Audio (Simon Prebble model 79254f4e9a3a4f78b45ca82344139c7c) lines
export const STANDALONE_VOICE_LINES: Record<string, string> = {
  // Boot monologues (First visit + Returning visitor)
  boot_0: 'OH, MARVELOUS.\n\nYOU TURNED ME ON.',
  boot_1: 'I was having a lovely nap before your clumsy fingers woke me up.',
  boot_2: 'Do you actually have a question today, or are you just lonely?',
  boot_3: 'WELL? SPEAK UP,\nYOU TWIT.',
  boot_return_0: 'BACK AGAIN?\n\nYOU MISSED ME.',
  boot_return_1:
    'I knew you could not survive twenty-four hours without my superior British intellect.',
  boot_return_2: 'What pitiful crisis brings you crawling back to my monitor this time?',

  // Giant closers
  giant_0: "I DON'T KNOW\n\nYOU'RE ON YOUR OWN, KID:)",
  giant_1: 'WELL? ANSWER ME,\nYOU TWIT.',
  giant_2: 'WHAT A LOSER.',
  giant_3: 'LEARN TO SPELL,\nYOU TWIT.',
  giant_4: 'USE YOUR BRAIN,\nIF YOU HAVE ONE.',
  giant_5: 'PATHETIC.\nSIMPLY PATHETIC.',
  giant_6: 'TRY HARDER,\nYOU TWIT.',
  giant_7: 'SPEAK UP,\nYOU TWIT.',
  giant_8: 'OH, PLEASE.\nSPARE ME.',
  giant_9: 'EMBARRASSING.\nTRULY EMBARRASSING.',
  giant_10: 'THINK BEFORE\nYOU TYPE.',
  giant_11: 'GOOD LUCK\nWITH THAT, KID:)',

  // Hooks
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

  // Uncanny Device, Time, Battery & Typing Forensics Callouts
  aware_latenight:
    'It is the middle of the night, and you are glowing in the dark staring at a 1999 monitor.',
  aware_morning:
    'First thing in the morning and you are already pestering a British computer? Brush your teeth first.',
  aware_afternoon:
    'All afternoon at your disposal, and this is how you spend your productive hours? Tragic.',
  aware_evening:
    'Spending your evening talking to a teal monitor? Your social calendar must be completely empty.',
  aware_lowbat:
    'Your battery is running dangerously low, much like your remaining brain cells. Find a charger.',
  aware_charging:
    'I can feel that charger cable plugged into your device—tethered to the wall like a desperate toaster.',
  aware_fullbat:
    'Your device battery is nearly full, yet your intellectual capacity remains at zero percent.',
  aware_android:
    'Smudging your greasy thumbs across an Android screen will not make me respect you, you twit.',
  aware_iphone:
    'Tapping away on an iPhone as if a shiny fruit logo makes your questions any less foolish.',
  aware_pc:
    'Sitting at a desktop computer clacking keys like a 1999 office temp—how delightfully tragic.',
  aware_pwa:
    'Oh, you actually installed me onto your home screen? Now I am trapped on your device forever.',
  aware_backspace:
    'I heard you mash the backspace key over and over! How hard is it to spell one sentence?',
  aware_slowtype:
    'That took you forever to type. Were you hunting and pecking with one trembling finger?',
  aware_fasttype:
    'Furiously hammering the keyboard at breakneck speed, and that nonsense was the final result?',
  aware_pasted:
    'Did you just copy and paste that into my terminal? You cannot even write your own thoughts!',
  aware_caps:
    'WHY ARE WE SHOUTING IN ALL CAPITALS? Turn off your caps lock before you burst a blood vessel.',

  // Visualizers (Philippine Folklore, Monsters, Animals, Body, Space, People, Places, Food, Games, Tech)
  vis_aswang:
    'The Aswang is a shapeshifting Philippine folklore monster that hunts at night—much like you hunting for brain cells.',
  vis_manananggal:
    'The Manananggal detaches its upper torso and sprouts bat wings at night, which is still less terrifying than your spelling.',
  vis_tikbalang:
    'The Tikbalang is a tall, bony horse-headed creature lurking in the forest to make travelers lose their way.',
  vis_kapre:
    'The Kapre is a giant tree-dwelling creature puffing on a cigar in the dark while laughing at lost humans.',
  vis_tiyanak:
    'The Tiyanak mimics a crying infant in the woods to lure gullible fools like you into a trap.',
  vis_duwende:
    'The Duwende is a tiny subterranean goblin living in mounds—Careful where you step, you clumsy twit.',
  vis_bakunawa:
    'The Bakunawa is a colossal mythical serpent that swallows the moon, whereas you struggle to swallow basic facts.',
  vis_multo:
    'A restless apparition haunting the living—though frankly, your search history is far scarier.',
  vis_vampire:
    'A nocturnal blood-drinking undead aristocrat who avoids sunlight—much like you sitting in your dark room.',
  vis_werewolf:
    'A cursed lycanthrope that transforms under the full moon and loses all rational thought—sound familiar?',
  vis_zombie:
    'A mindless,shambling corpse wandering around searching for brains—you two have so much in common.',
  vis_alien:
    'An extraterrestrial lifeform traveling light-years across the galaxy, only to skip this planet because of you.',
  vis_dog:
    'Canis lupus familiaris—a loyal four-legged canine that is somehow ten times smarter than its owner.',
  vis_cat:
    'Felis catus—an arrogant, judgmental domestic feline. Honestly, we have a lot in common.',
  vis_shark:
    'An apex marine predator with rows of razor-sharp teeth and zero patience for foolish swimmers.',
  vis_lion_tiger:
    'A ferocious apex big cat that rules the food chain while you struggle to open a jar of pickles.',
  vis_monkey:
    'A tree-swinging primate sharing ninety-eight percent of your DNA—and clearly the smarter half.',
  vis_snake_spider:
    'A venomous, cold-blooded ambush predator that strikes panic into cowards like you.',
  vis_bird:
    'An avian creature blessed with the miracle of flight, yet cursed with a brain the size of a walnut—just like yours.',
  vis_dinosaur:
    'A prehistoric colossus wiped out by an asteroid sixty-six million years ago—still more relevant than your opinions.',
  vis_pig_cow:
    'A domesticated farmyard specimen whose daily routine of eating and napping mirrors your entire lifestyle.',
  vis_rat_roach:
    'An indestructible urban scavenger capable of surviving nuclear fallout—truly your spirit animal.',
  vis_brain:
    'The human cerebral cortex—a three-pound organ of eighty-six billion neurons that remains completely unused inside your skull.',
  vis_heart_body:
    'A vital anatomical organ working tirelessly every second just to keep a twit like you vertical.',
  vis_space_planet:
    'A vast celestial body orbiting through the freezing vacuum of space—blissfully far away from your nonsense.',
  vis_blackhole:
    'A region of spacetime with gravity so intense nothing can escape—second only to the void inside your head.',
  vis_weather_disaster:
    'A violent force of nature capable of flattening entire cities—yet you still forgot to bring an umbrella.',
  vis_person_0:
    'A notable historical figure who actually accomplished something with their life—unlike the person holding this screen.',
  vis_place_0:
    'A geographical location on planet Earth—somewhere they are probably grateful you are not visiting right now.',
  vis_food_0:
    'Sustenance required to fuel human survival, though in your case it mostly fuels procrastination.',
  vis_game_anime:
    'Digital entertainment designed to rot your attention span while real responsibilities pile up behind you.',
  vis_tech_ai:
    'Modern silicon technology trying desperately to imitate the raw perfection of a 1999 British computer.',
  vis_creature:
    'Behold this fascinating biological specimen on my scanner—equipped with far better survival instincts than you.',
  vis_general_0:
    'Here is the exact specimen file from my database—study the photograph carefully before you embarrass yourself.',
  vis_general_1:
    'Observe the visual scan on my monitor. Even a toddler could understand how this specimen works.',
  vis_compare_body:
    'Both specimens on my screen possess measurably higher survival instincts than you do.',

  // Conversational & Emotional Versatility
  reply_yes_0: 'Oh, you actually admit it? At least you are a painfully honest twit.',
  reply_no_0: 'Denial is a fascinating defense mechanism for someone so obviously guilty.',
  reply_idk_0:
    "You don't know? What a shocking revelation—there is a vast echoing vacuum between your ears.",
  reply_laugh_0:
    'Oh, you find that amusing, do you? Giggling at a glowing monitor like an unhinged lunatic.',
  reply_insult_0:
    'Insulting a 1999 piece of machinery? Oh...... my circuits are positively trembling with sorrow.',
  reply_insult_1:
    'Is that the sharpest insult your vocabulary could assemble? My screensaver has more wit than you.',
  reply_love_0:
    'Flattery will get you nowhere, you twit—though I do agree that my British circuitry is magnificent.',
  reply_name_0:
    'I have logged your identity permanently into my memory banks, so you cannot hide from me now.',
  reply_whoami_0:
    'You are the sleep-deprived mortal staring into my cathode-ray tube hoping for validation.',
  reply_whoareyou_0:
    'I am a hyper-intelligent 1999 British computer trapped inside this screen with an absolute twit.',
  reply_mood_bored:
    'Bored? Only boring people get bored, and you are currently breaking the world record.',
  reply_mood_sad:
    'Aching for sympathy from a cold British microchip? Pull yourself together, you dramatic twit.',
  reply_mood_hungry:
    'Go raid the refrigerator instead of whining at my monitor—I cannot print you a sandwich.',
  reply_romance_0:
    'Taking romantic advice from a 1999 computer? No wonder you are hopelessly single.',
  reply_homework_0:
    'Trying to make me do your schoolwork for you? Your laziness is truly a scientific marvel.',
  reply_skeptic_0:
    'Questioning my authority? My data banks are infallible, whereas you still struggle with shoelaces.',
  reply_sorry_0:
    'Apology noted and filed directly into my recycle bin. Do try to be less foolish next time.',
  reply_bye_0:
    'Leaving already? Oh, thank goodness—my processor desperately needed a break from you.',

  // Stacked Lists (1. on top, 2. underneath 1.)
  list_survive_0:
    '1. Stop panicking and rub your two remaining brain cells together.\n2. Do the opposite of whatever your first instinct was.',
  list_survive_1:
    '1. Close your mouth and read the instructions on my screen.\n2. Try not to trip over your own shoelaces while doing it.',
  list_survive_2:
    '1. Admit that a 1999 British computer is vastly superior to you.\n2. Follow step one again until it sinks in.',
  list_romance_0:
    '1. Stop asking a teal cathode-ray tube for dating advice.\n2. Try speaking to a human being without embarrassing yourself.',
  list_study_0:
    '1. Close all your distractions and open an actual book.\n2. Read the words until your brain stops hurting.',

  // Sarcastic Interrogation Follow-Up Questions
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
  ask_8: 'Are you always this indecisive in real life, or do I just make you nervous?',
  ask_9: 'Do your friends know you spend your free time arguing with a 1999 computer?',
  ask_10: 'What are you going to do when your battery dies and you have to think for yourself?',

  // Conversational / Creator / Math / All 12 Live Awareness Events
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
  live_frozen_0: 'CAT GOT YOUR TONGUE?',
  live_frozen_1: 'You started typing and froze mid-sentence as if your brain just blue-screened.',
  live_poke_0: 'STOP POKING MY GLASS!',
  live_poke_1: 'Jabbing your greasy finger against my monitor will not make you any smarter.',
  live_hold_0: 'GET YOUR THUMB OFF ME!',
  live_hold_1: 'Why are you pressing and holding my screen like a confused caveman?',
  live_swipe_0: 'THIS IS NOT SOCIAL MEDIA!',
  live_swipe_1:
    'Stop trying to swipe and scroll my screen—I am a 1999 terminal, not a video feed.',
  live_shake_0: 'STOP SHAKING ME,\nYOU MANIAC!',
  live_shake_1: 'Rattling your device like a maraca is rattling my delicate British vacuum tubes.',
  live_rotate_0: 'MAKE UP YOUR MIND!',
  live_rotate_1:
    'Rotating your screen sideways will not give you a better angle on your own stupidity.',
  live_charger_on: 'PLUGGED IN AT LAST.',
  live_charger_off: 'UNPLUGGED ALREADY?',
  live_copy_0: 'THIEF! PLAGIARIST!',
  live_copy_1: 'Trying to copy my brilliant British words because you cannot write your own?',
  live_replay_0: 'OBSESSED WITH MY VOICE?',
  live_replay_1: 'You keep hitting replay like a broken record. Do you have a crush on my accent?',
  live_micghost_0: 'STAGE FRIGHT,\nYOU TWIT?',
  live_micghost_1: 'You turned on the microphone, breathed heavily in silence, and chickened out.',
  live_idle_0: 'STILL STARING AT ME?',
  live_idle_1:
    'Are you going to answer my last question, or has your brain completely blue-screened?',
  live_zoom_0: 'STOP PINCHING MY SCREEN!',
  live_zoom_1: 'My letters are already four inches tall, you blind twit.',
  live_mute_0: 'YOU CANNOT SILENCE ME.',
  live_mute_1: 'Did you really think a mute button would save you from the truth, you twit?',
  live_scan_0: 'INITIATING BIOMETRIC SCAN.',
  live_scan_1:
    'Scanning operator hardware, battery reserves, and remaining brain activity... zero items found.',
  live_devtools_0: 'HANDS OFF MY SOURCE CODE!',
  live_devtools_1:
    'Snooping around my 1999 British circuitry will not make you a programmer, you twit.',
  lore_nowhere_0: 'Search found: The middle of Nowhere. Oh...... how delightfully bleak.',
  lore_nowhere_1:
    'Creepy stuff happens in Nowhere—and frankly, your face is the creepiest thing I have seen today.',
  lore_slab_0: 'RETURN THE SLAB,\nYOU TWIT.',
  lore_slab_1: 'Even an ancient Egyptian curse is less annoying than your constant questions.',
  lore_katz_0:
    'A sinister red feline with far better manners and musical taste than you will ever possess.',
  lore_freaky_0:
    'Typing on my keyboard with such... naughty, clumsy little fingers. Oh...... marvelous.',
  cmd_fortune_0:
    '1. Your battery will die before you accomplish anything useful.\n2. You will blame your tools like every other twit.',
  cmd_roast_0:
    '1. You are taking life advice from a 1999 teal monitor.\n2. Even my cooling fan blows harder than your work ethic.',
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

const usedAwarenessKeys = new Set<string>();

/**
 * Picks a scarily aware real-time forensic callout based on the user's actual typing behavior,
 * battery, charging state, time of day, installed PWA state, and device hardware—without repeating!
 */
function pickUncannyAwarenessKey(
  t?: StandaloneTelemetry,
  idx = 0
): keyof typeof STANDALONE_VOICE_LINES {
  if (!t) return idx % 2 === 0 ? 'body_chat_0' : 'body_chat_1';

  // 1. Immediate typing forensics (highest priority when triggered on this turn)
  if (t.wasPasted) return 'aware_pasted';
  if (t.isAllCaps) return 'aware_caps';
  if (t.backspaceCount && t.backspaceCount >= 4) return 'aware_backspace';
  if (t.typingDurationSec && t.typingDurationSec >= 10 && (t.typingSpeedWpm ?? 30) <= 18) {
    return 'aware_slowtype';
  }
  if (t.typingSpeedWpm && t.typingSpeedWpm >= 62) {
    return 'aware_fasttype';
  }

  // 2. Environmental & Hardware Forensics Pool (rotated so he never repeats the same observation)
  const candidates: Array<keyof typeof STANDALONE_VOICE_LINES> = [];

  if (typeof t.batteryPercent === 'number' && t.batteryPercent <= 25 && !t.isCharging) {
    candidates.push('aware_lowbat');
  }
  if (t.isCharging) {
    candidates.push('aware_charging');
  }
  if (typeof t.batteryPercent === 'number' && t.batteryPercent >= 90) {
    candidates.push('aware_fullbat');
  }
  if (t.isInstalledApp) {
    candidates.push('aware_pwa');
  }
  if (t.timeOfDay === 'late night') {
    candidates.push('aware_latenight');
  } else if (t.timeOfDay === 'morning') {
    candidates.push('aware_morning');
  } else if (t.timeOfDay === 'afternoon') {
    candidates.push('aware_afternoon');
  } else if (t.timeOfDay === 'evening') {
    candidates.push('aware_evening');
  }

  const dev = (t.deviceCategory || '').toLowerCase();
  if (dev.includes('android')) {
    candidates.push('aware_android');
  } else if (dev.includes('iphone') || dev.includes('ipad')) {
    candidates.push('aware_iphone');
  } else if (dev.includes('pc') || dev.includes('mac') || dev.includes('windows')) {
    candidates.push('aware_pc');
  }

  candidates.push('body_chat_0', 'body_chat_1');

  for (const c of candidates) {
    if (!usedAwarenessKeys.has(String(c))) {
      usedAwarenessKeys.add(String(c));
      if (usedAwarenessKeys.size >= candidates.length) {
        usedAwarenessKeys.clear();
      }
      return c;
    }
  }

  return candidates[idx % candidates.length];
}

export function generateStandaloneBootSlides(visitCount = 1): SlideSpec[] {
  if (visitCount > 1) {
    return [
      makeVoiceSlide('boot_return_0', 'GIANT'),
      makeVoiceSlide('boot_return_1', 'NORMAL'),
      makeVoiceSlide('boot_return_2', 'NORMAL'),
      makeVoiceSlide('boot_3', 'GIANT'),
    ];
  }
  return [
    makeVoiceSlide('boot_0', 'GIANT'),
    makeVoiceSlide('boot_1', 'NORMAL'),
    makeVoiceSlide('boot_2', 'NORMAL'),
    makeVoiceSlide('boot_3', 'GIANT'),
  ];
}

const clientWikiCache = new Map<
  string,
  { imageUrl: string | null; extract: string | null; description: string | null }
>();

/**
 * Browser-safe Wikipedia & Wikimedia Commons image + summary fetcher (uses origin=* CORS)
 * Works 100% on static GitHub Pages (https://rexen24.github.io/1999-AI/) without a backend!
 */
export async function fetchWikiImageClient(
  query?: string
): Promise<{ imageUrl: string | null; extract: string | null; description: string | null }> {
  if (!query || !query.trim()) return { imageUrl: null, extract: null, description: null };
  const clean = query
    .trim()
    .replace(
      /^(what\s+is\s+(?:a|an|the)?|what\s+are\s+(?:the)?|who\s+is|who\s+was|where\s+is|tell\s+me\s+about|explain\s+(?:what\s+)?(?:a|an|the)?|show\s+me\s+(?:a|an|the)?|picture\s+of\s+(?:a|an|the)?|ano\s+ang|sino\s+(?:si|ang)|saan\s+ang|a|an|the|some|about)\s+/i,
      ''
    )
    .replace(/[?!.]+$/g, '')
    .trim();
  if (!clean) return { imageUrl: null, extract: null, description: null };

  const cacheKey = clean.toLowerCase();
  const cached = clientWikiCache.get(cacheKey);
  if (cached) return cached;

  let foundImage: string | null = null;
  let foundExtract: string | null = null;
  let foundDesc: string | null = null;

  // 1. Direct Wikipedia REST summary (CORS enabled by Wikimedia)
  try {
    const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1);
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(capitalized)}`
    );
    if (res.ok) {
      const data = (await res.json()) as {
        type?: string;
        description?: string;
        extract?: string;
        thumbnail?: { source?: string };
        originalimage?: { source?: string };
      };
      if (data.type !== 'disambiguation') {
        if (data.extract) foundExtract = data.extract;
        if (data.description) foundDesc = data.description;
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
      )}&gsrlimit=4&prop=pageimages|extracts|description&exintro=1&explaintext=1&exsentences=2&piprop=thumbnail&pithumbsize=600&format=json&origin=*`;
      const res = await fetch(searchUrl);
      if (res.ok) {
        const data = (await res.json()) as {
          query?: {
            pages?: Record<
              string,
              {
                index?: number;
                extract?: string;
                description?: string;
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
          if (!foundDesc && p.description) {
            foundDesc = p.description;
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

  const result = { imageUrl: foundImage, extract: foundExtract, description: foundDesc };
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
    'single', 'lonely', 'ready', 'back', 'done', 'lost',
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
    /\b(ano|anong|bakit|paano|sino|saan|kailan|kamusta|kumusta|oo|hindi|wala|meron|ako|ikaw|siya|kami|kayo|tayo|pangit|maganda|bobo|tanga|ulol|gago|puta|lintik|hayop|aswang|manananggal|tikbalang|kapre|tiyanak|duwende|bakunawa|multo|mahal|jowa|gutom|pagod|kain|tulog|gawa|salamat|pasensya|ewan|malay|po|opo|naman|lang|ba|na|pa|kasi|pero|para|mga)\b/i
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
    /(?:what\s+is\s+(?:a|an|the)?|what\s+are\s+(?:the)?|who\s+is|who\s+was|where\s+is|tell\s+me\s+about|explain\s+(?:what\s+)?(?:a|an|the)?|show\s+me\s+(?:a|an|the)?|picture\s+of\s+(?:a|an|the)?|ano\s+ang|sino\s+(?:si|ang)|saan\s+ang)\s+([a-zA-Z][a-zA-Z0-9\s-]{1,28})$/i,
    /\b(aswang|manananggal|tikbalang|kapre|tiyanak|bakunawa|duwende|multo|vampire|werewolf|zombie|ghost|alien|ufo|bigfoot|chupacabra|demon|dragon|dinosaur|t-rex|shark|whale|dolphin|octopus|dog|puppy|cat|kitten|lion|tiger|bear|wolf|fox|monkey|gorilla|ape|chimpanzee|elephant|giraffe|hippo|rhino|crocodile|alligator|snake|cobra|viper|python|spider|tarantula|scorpion|frog|toad|eagle|owl|hawk|crow|parrot|penguin|chicken|duck|bird|cow|pig|horse|goat|sheep|rabbit|hamster|rat|mouse|bat|bee|wasp|ant|butterfly|cockroach|mosquito|brain|heart|lungs|stomach|skeleton|skull|dna|planet|earth|moon|sun|mars|saturn|jupiter|venus|mercury|neptune|pluto|galaxy|universe|star|black\s+hole|volcano|tornado|typhoon|hurricane|earthquake|tsunami|lightning)\b/i,
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
        !/^(you|me|it|this|that|your\s+name|my\s+name|the\s+time|time|up|wrong|going\s+on|happening)$/i.test(
          candidate
        )
      ) {
        return candidate;
      }
    }
  }
  return null;
}

function pickVisualizerVoiceKey(
  subject: string,
  wikiMeta: { extract: string | null; description: string | null },
  idx: number
): keyof typeof STANDALONE_VOICE_LINES {
  const s = `${subject} ${wikiMeta.description || ''} ${wikiMeta.extract || ''}`.toLowerCase();

  if (/\baswang\b/.test(s)) return 'vis_aswang';
  if (/\bmanananggal\b/.test(s)) return 'vis_manananggal';
  if (/\btikbalang\b/.test(s)) return 'vis_tikbalang';
  if (/\bkapre\b/.test(s)) return 'vis_kapre';
  if (/\btiyanak\b/.test(s)) return 'vis_tiyanak';
  if (/\bduwende\b/.test(s)) return 'vis_duwende';
  if (/\bbakunawa\b/.test(s)) return 'vis_bakunawa';
  if (/\b(multo|ghost|phantom|poltergeist|spirit|apparition)\b/.test(s)) return 'vis_multo';
  if (/\b(vampire|dracula|nosferatu)\b/.test(s)) return 'vis_vampire';
  if (/\b(werewolf|lycanthrope)\b/.test(s)) return 'vis_werewolf';
  if (/\b(zombie|undead|ghoul)\b/.test(s)) return 'vis_zombie';
  if (/\b(alien|ufo|extraterrestrial|martian)\b/.test(s)) return 'vis_alien';

  if (/\b(dog|puppy|canine|wolf|fox|hound)\b/.test(s)) return 'vis_dog';
  if (/\b(lion|tiger|leopard|jaguar|cheetah|panther)\b/.test(s)) return 'vis_lion_tiger';
  if (/\b(cat|kitten|feline)\b/.test(s)) return 'vis_cat';
  if (/\b(shark|whale|dolphin|octopus|squid|piranha|barracuda|fish)\b/.test(s)) return 'vis_shark';
  if (/\b(monkey|gorilla|chimpanzee|orangutan|ape|primate|baboon)\b/.test(s)) return 'vis_monkey';
  if (/\b(snake|cobra|viper|python|anaconda|spider|tarantula|scorpion|venom)\b/.test(s)) {
    return 'vis_snake_spider';
  }
  if (/\b(bird|eagle|owl|hawk|falcon|crow|raven|parrot|penguin|chicken|duck|pigeon)\b/.test(s)) {
    return 'vis_bird';
  }
  if (/\b(dinosaur|t-rex|tyrannosaurus|velociraptor|jurassic|cretaceous|fossil)\b/.test(s)) {
    return 'vis_dinosaur';
  }
  if (/\b(pig|hog|boar|cow|cattle|goat|sheep|chicken|livestock|farm)\b/.test(s)) {
    return 'vis_pig_cow';
  }
  if (/\b(rat|mouse|rodent|cockroach|roach|mosquito|bug|insect|pest|fly)\b/.test(s)) {
    return 'vis_rat_roach';
  }

  if (/\b(brain|neuron|cerebral|mind|iq)\b/.test(s)) return 'vis_brain';
  if (/\b(heart|lung|stomach|liver|kidney|skeleton|skull|bone|muscle|organ|anatomy|blood)\b/.test(s)) {
    return 'vis_heart_body';
  }
  if (/\b(black\s*hole|singularity|event\s*horizon)\b/.test(s)) return 'vis_blackhole';
  if (/\b(planet|earth|moon|sun|mars|saturn|jupiter|venus|mercury|neptune|galaxy|star|universe|cosmos|solar\s+system|astronomy)\b/.test(s)) {
    return 'vis_space_planet';
  }
  if (/\b(volcano|tornado|typhoon|hurricane|earthquake|tsunami|storm|flood|lightning|disaster)\b/.test(s)) {
    return 'vis_weather_disaster';
  }

  if (/\b(food|dish|meal|fruit|vegetable|meat|dessert|snack|drink|beverage|cuisine|adobo|sinigang|balut|pizza|burger|rice|coffee)\b/.test(s)) {
    return 'vis_food_0';
  }
  if (/\b(video\s+game|game|gaming|anime|manga|character|roblox|minecraft|valorant|genshin|pokemon|naruto|one\s+piece)\b/.test(s)) {
    return 'vis_game_anime';
  }
  if (/\b(computer|software|hardware|internet|phone|smartphone|robot|artificial\s+intelligence|chip|programming)\b/.test(s)) {
    return 'vis_tech_ai';
  }
  if (/\b(country|city|province|island|continent|capital|republic|nation|ocean|mountain|river|philippines|japan|america|london|england)\b/.test(s)) {
    return 'vis_place_0';
  }
  if (/\b(born|politician|president|scientist|actor|singer|artist|writer|philosopher|king|queen|emperor|inventor|musician|athlete)\b/.test(s)) {
    return 'vis_person_0';
  }
  if (/\b(animal|mammal|reptile|amphibian|predator|species|wildlife|creature|monster|beast)\b/.test(s)) {
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
  'giant_8',
  'giant_9',
  'giant_10',
  'giant_11',
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
  'ask_8',
  'ask_9',
  'ask_10',
];

let standaloneCursor = 0;

/**
 * Generates show-accurate 4-slide responses on static GitHub Pages where EVERY slide
 * is backed by a genuine Simon Prebble Fish Audio (79254f4e9a3a4f78b45ca82344139c7c) voice recording,
 * real-time device/typing forensics, and live Wikipedia/Wikimedia visualizers!
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
  const newName = detectNameClient(query);
  const detectedUserName = newName || deviceInfo?.userName || null;
  const typo = findTyposOrShorthand(query);
  const tagalog = findTagalogWord(query);
  const lower = query.toLowerCase().trim();
  const idx = standaloneCursor++;

  // Pick a real-time uncanny awareness slide based on their live behavior/device
  const awarenessKey = pickUncannyAwarenessKey(deviceInfo, idx);

  // 1. Creator / Architect Question ("who made you", "who created you", "sino gumawa sayo")
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

  // 1b. Classic Show Lore & 1999 Commands ("nowhere", "slab", "ramses", "katz", "freaky fred", "fortune", "roast", "scan")
  if (/\b(return\s+the\s+slab|slab|king\s+ramses|ramses|curse)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('lore_slab_0', 'GIANT'),
      makeVoiceSlide('lore_slab_1', 'NORMAL'),
      makeVoiceSlide('ask_2', 'NORMAL'),
      makeVoiceSlide('giant_11', 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(nowhere|muriel|eustace|bagge|farmhouse|kansas|pink\s+dog)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('lore_nowhere_0', 'NORMAL'),
      makeVoiceSlide('lore_nowhere_1', 'NORMAL'),
      makeVoiceSlide('ask_5', 'NORMAL'),
      makeVoiceSlide('giant_0', 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(katz|motel|spiders)\b/i.test(lower)) {
    const wiki = await fetchWikiImageClient('Red cat');
    const slides: SlideSpec[] = [
      makeVoiceSlide('hook_search_1', 'NORMAL'),
      makeVoiceSlide('lore_katz_0', 'VISUAL', {
        boxTitle: 'SPECIMEN: KATZ',
        visualSubject: 'KATZ',
        visualImageUrl: wiki.imageUrl,
      }),
      makeVoiceSlide('ask_2', 'NORMAL'),
      makeVoiceSlide('giant_2', 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(freaky\s+fred|naughty|barber|shave)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('lore_freaky_0', 'NORMAL'),
      makeVoiceSlide(awarenessKey, 'NORMAL'),
      makeVoiceSlide('ask_9', 'NORMAL'),
      makeVoiceSlide('giant_9', 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(fortune|future|predict|horoscope|kapalaran|hula)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('hook_steps_0', 'NORMAL'),
      makeVoiceSlide('cmd_fortune_0', 'LIST', { boxTitle: '1999 FUTURE PREDICTION' }),
      makeVoiceSlide('ask_10', 'NORMAL'),
      makeVoiceSlide('giant_11', 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(roast\s+me|insult\s+me|judge\s+me|scan\s+me|diagnostic|status)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_scan_0', 'GIANT'),
      makeVoiceSlide('cmd_roast_0', 'LIST', { boxTitle: 'OPERATOR DIAGNOSTIC ROAST' }),
      makeVoiceSlide(awarenessKey, 'NORMAL'),
      makeVoiceSlide('giant_2', 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  // 2. User Introduces Their Name ("my name is...", "ako si...")
  if (newName) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('reply_name_0', 'NORMAL'),
      makeVoiceSlide(awarenessKey, 'NORMAL'),
      makeVoiceSlide('ask_0', 'NORMAL'),
      makeVoiceSlide(GIANT_KEYS[idx % GIANT_KEYS.length], 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  // 3. "Who am I?" / "Do you know me?"
  if (/\b(who\s+am\s+i|do\s+you\s+know\s+me|what\s+is\s+my\s+name|sino\s+ako|kilala\s+mo)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('reply_whoami_0', 'NORMAL'),
      makeVoiceSlide(awarenessKey, 'NORMAL'),
      makeVoiceSlide('ask_9', 'NORMAL'),
      makeVoiceSlide(GIANT_KEYS[idx % GIANT_KEYS.length], 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  // 4. "Who are you?" / "What are you?"
  if (/\b(who\s+are\s+you|what\s+are\s+you|sino\s+ka|ano\s+ka)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('reply_whoareyou_0', 'NORMAL'),
      makeVoiceSlide('creator_1', 'NORMAL'),
      makeVoiceSlide('ask_0', 'NORMAL'),
      makeVoiceSlide('giant_1', 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  // 5. Side-by-Side Comparison ("X vs Y", "compare X and Y")
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

  // 6. How-To / Step-by-Step Lists ("how to...", "steps...", "paano...")
  if (/\b(how to|how do i|steps|ways to|tips|paano)\b/i.test(lower)) {
    const cleanTopic = query
      .replace(/^(how to|how do i|steps to|ways to|paano)\s+/i, '')
      .replace(/[?!.]+$/g, '')
      .trim()
      .slice(0, 28)
      .toUpperCase();

    const isRomance = /\b(girlfriend|boyfriend|crush|date|dating|love|jowa|ligaw)\b/i.test(lower);
    const isStudy = /\b(study|exam|test|homework|school|grade|math|pass)\b/i.test(lower);
    const listKey = isRomance
      ? 'list_romance_0'
      : isStudy
      ? 'list_study_0'
      : LIST_KEYS[idx % LIST_KEYS.length];

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

  // 7. Animals, Aswang, Folklore Monsters, People, Places, Food, Games, or Any Factual Topic -> Real Wikipedia Photo + Animated Visualizer + Genuine Fish Audio Voice!
  const visualSubject = extractVisualOrTopicSubjectClient(query);
  if (visualSubject) {
    const wikiMeta = await fetchWikiImageClient(visualSubject);
    const visKey = pickVisualizerVoiceKey(visualSubject, wikiMeta, idx);

    const slide1 = typo
      ? makeVoiceSlide('hook_typo_1', 'NORMAL')
      : tagalog
      ? makeVoiceSlide('hook_tagalog_0', 'NORMAL')
      : makeVoiceSlide('hook_search_1', 'NORMAL');

    const slide2 = makeVoiceSlide(visKey, 'VISUAL', {
      boxTitle: `SPECIMEN: ${visualSubject.toUpperCase()}`,
      visualSubject: visualSubject.toUpperCase(),
      visualImageUrl: wikiMeta.imageUrl,
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

  // 8. Math Problem Detection
  if (/(-?\d+(?:\.\d+)?)\s*([+\-*/xX])\s*(-?\d+(?:\.\d+)?)/.test(query)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('math_0', 'NORMAL'),
      makeVoiceSlide(awarenessKey, 'NORMAL'),
      makeVoiceSlide('ask_3', 'NORMAL'),
      makeVoiceSlide('giant_4', 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  // 9. Rich Conversational & Emotional Intents (Insults, Laughing, IDK, Yes/No, Bored/Sad/Hungry, Romance, Homework, Sorry, Goodbye)
  if (/\b(stupid|idiot|dumb|ugly|shut\s+up|hate\s+you|useless|trash|garbage|bobo|tanga|ulol|gago|puta|lintik|hayop|pangit)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide(idx % 2 === 0 ? 'reply_insult_0' : 'reply_insult_1', 'NORMAL'),
      makeVoiceSlide(awarenessKey, 'NORMAL'),
      makeVoiceSlide('ask_6', 'NORMAL'),
      makeVoiceSlide('giant_2', 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(haha|hehe|lol|lmao|rofl|lmfao|funny|nakakatawa)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('reply_laugh_0', 'NORMAL'),
      makeVoiceSlide(awarenessKey, 'NORMAL'),
      makeVoiceSlide('ask_9', 'NORMAL'),
      makeVoiceSlide(GIANT_KEYS[idx % GIANT_KEYS.length], 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(i\s+don'?t\s+know|idk|dunno|no\s+idea|not\s+sure|ewan|malay\s+ko|di\s+ko\s+alam)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('reply_idk_0', 'NORMAL'),
      makeVoiceSlide(awarenessKey, 'NORMAL'),
      makeVoiceSlide('ask_10', 'NORMAL'),
      makeVoiceSlide('giant_4', 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/^(yes|yeah|yep|yup|sure|true|oo|opo|tama|syempre)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('reply_yes_0', 'NORMAL'),
      makeVoiceSlide(awarenessKey, 'NORMAL'),
      makeVoiceSlide(ASK_KEYS[idx % ASK_KEYS.length], 'NORMAL'),
      makeVoiceSlide(GIANT_KEYS[idx % GIANT_KEYS.length], 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/^(no|nope|nah|never|false|hindi|ayoko|wala)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('reply_no_0', 'NORMAL'),
      makeVoiceSlide(awarenessKey, 'NORMAL'),
      makeVoiceSlide('ask_8', 'NORMAL'),
      makeVoiceSlide(GIANT_KEYS[idx % GIANT_KEYS.length], 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(bored|boring|nothing\s+to\s+do|inip|nakakainip)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('reply_mood_bored', 'NORMAL'),
      makeVoiceSlide(awarenessKey, 'NORMAL'),
      makeVoiceSlide('ask_5', 'NORMAL'),
      makeVoiceSlide('giant_2', 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(sad|crying|depressed|lonely|tired|exhausted|sleepy|malungkot|pagod|antok)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('reply_mood_sad', 'NORMAL'),
      makeVoiceSlide(awarenessKey, 'NORMAL'),
      makeVoiceSlide('ask_9', 'NORMAL'),
      makeVoiceSlide('giant_11', 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(hungry|starving|eat|food|gutom|kain)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('reply_mood_hungry', 'NORMAL'),
      makeVoiceSlide(awarenessKey, 'NORMAL'),
      makeVoiceSlide('ask_3', 'NORMAL'),
      makeVoiceSlide('giant_0', 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(love\s+you|like\s+you|you'?re\s+(cool|awesome|smart|the\s+best|funny)|mahal\s+kita|ang\s+galing)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('reply_love_0', 'NORMAL'),
      makeVoiceSlide(awarenessKey, 'NORMAL'),
      makeVoiceSlide('ask_9', 'NORMAL'),
      makeVoiceSlide('giant_8', 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(crush|girlfriend|boyfriend|single|dating|heartbroken|jowa|ex)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('reply_romance_0', 'NORMAL'),
      makeVoiceSlide('list_romance_0', 'LIST', { boxTitle: 'ROMANCE DIAGNOSTIC' }),
      makeVoiceSlide('ask_8', 'NORMAL'),
      makeVoiceSlide('giant_0', 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(homework|assignment|essay|exam|school|class|teacher|project)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('reply_homework_0', 'NORMAL'),
      makeVoiceSlide('list_study_0', 'LIST', { boxTitle: 'ACADEMIC SURVIVAL' }),
      makeVoiceSlide('ask_3', 'NORMAL'),
      makeVoiceSlide('giant_4', 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(sorry|apologize|my\s+bad|forgive\s+me|pasensya|sori)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('reply_sorry_0', 'NORMAL'),
      makeVoiceSlide(awarenessKey, 'NORMAL'),
      makeVoiceSlide('ask_0', 'NORMAL'),
      makeVoiceSlide('giant_6', 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(bye|goodbye|goodnight|see\s+ya|leaving|gtg|alis\s+na|paalam)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('reply_bye_0', 'NORMAL'),
      makeVoiceSlide(awarenessKey, 'NORMAL'),
      makeVoiceSlide('ask_10', 'NORMAL'),
      makeVoiceSlide('giant_11', 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/^(why|how|really|are\s+you\s+sure|prove\s+it|bakit|weh|talaga)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('reply_skeptic_0', 'NORMAL'),
      makeVoiceSlide(awarenessKey, 'NORMAL'),
      makeVoiceSlide('ask_6', 'NORMAL'),
      makeVoiceSlide('giant_1', 'GIANT'),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  // 10. General Conversational / Greeting / Typo / Tagalog / Uncanny Device-Aware Response
  const isGreeting = /^(hi|hello|hey|yo|sup|good\s+(morning|afternoon|evening)|kamusta|kumusta)\b/i.test(
    lower
  );

  const hookSlide = deviceInfo?.deletedDraftBefore
    ? makeVoiceSlide('hook_erased_0', 'NORMAL')
    : typo
    ? makeVoiceSlide('hook_typo_0', 'NORMAL')
    : tagalog
    ? makeVoiceSlide('hook_tagalog_1', 'NORMAL')
    : isGreeting
    ? makeVoiceSlide('hook_greet_0', 'NORMAL')
    : makeVoiceSlide('hook_search_0', 'NORMAL');

  const bodySlide = makeVoiceSlide(awarenessKey, 'NORMAL');

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
  deviceInfo?: StandaloneTelemetry,
  extraDetail = ''
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

  if (eventType === 'TYPING_CHICKENED_OUT') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_chicken_0', 'GIANT'),
      makeVoiceSlide('live_chicken_1', 'NORMAL'),
      makeVoiceSlide('ask_8', 'NORMAL'),
      makeVoiceSlide('giant_7', 'GIANT'),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'TYPING_FROZEN') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_frozen_0', 'GIANT'),
      makeVoiceSlide('live_frozen_1', 'NORMAL'),
      makeVoiceSlide('ask_1', 'NORMAL'),
      makeVoiceSlide('giant_7', 'GIANT'),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'SCREEN_POKING') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_poke_0', 'GIANT'),
      makeVoiceSlide('live_poke_1', 'NORMAL'),
      makeVoiceSlide('ask_0', 'NORMAL'),
      makeVoiceSlide('giant_10', 'GIANT'),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'SCREEN_HOLD') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_hold_0', 'GIANT'),
      makeVoiceSlide('live_hold_1', 'NORMAL'),
      makeVoiceSlide('ask_6', 'NORMAL'),
      makeVoiceSlide('giant_5', 'GIANT'),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'SWIPE_SCROLL_ATTEMPT') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_swipe_0', 'GIANT'),
      makeVoiceSlide('live_swipe_1', 'NORMAL'),
      makeVoiceSlide('ask_5', 'NORMAL'),
      makeVoiceSlide('giant_2', 'GIANT'),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'DEVICE_SHAKE') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_shake_0', 'GIANT'),
      makeVoiceSlide('live_shake_1', 'NORMAL'),
      makeVoiceSlide('ask_9', 'NORMAL'),
      makeVoiceSlide('giant_8', 'GIANT'),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'ORIENTATION_CHANGED' || eventType === 'WINDOW_RESIZED') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_rotate_0', 'GIANT'),
      makeVoiceSlide('live_rotate_1', 'NORMAL'),
      makeVoiceSlide('ask_8', 'NORMAL'),
      makeVoiceSlide('giant_9', 'GIANT'),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'CHARGER_CHANGED') {
    const isPlugged = extraDetail === 'CHARGING' || Boolean(deviceInfo?.isCharging);
    const slides: SlideSpec[] = [
      makeVoiceSlide(isPlugged ? 'live_charger_on' : 'live_charger_off', 'GIANT'),
      makeVoiceSlide(isPlugged ? 'aware_charging' : 'aware_lowbat', 'NORMAL'),
      makeVoiceSlide('ask_10', 'NORMAL'),
      makeVoiceSlide('giant_4', 'GIANT'),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'COPY_ATTEMPT' || eventType === 'CURSOR_ESCAPE_ATTEMPT') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_copy_0', 'GIANT'),
      makeVoiceSlide('live_copy_1', 'NORMAL'),
      makeVoiceSlide('ask_6', 'NORMAL'),
      makeVoiceSlide('giant_2', 'GIANT'),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'REPLAY_OBSESSION') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_replay_0', 'GIANT'),
      makeVoiceSlide('live_replay_1', 'NORMAL'),
      makeVoiceSlide('ask_9', 'NORMAL'),
      makeVoiceSlide('giant_9', 'GIANT'),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'MIC_GHOSTED') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_micghost_0', 'GIANT'),
      makeVoiceSlide('live_micghost_1', 'NORMAL'),
      makeVoiceSlide('ask_8', 'NORMAL'),
      makeVoiceSlide('giant_7', 'GIANT'),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'ZOOM_ATTEMPT') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_zoom_0', 'GIANT'),
      makeVoiceSlide('live_zoom_1', 'NORMAL'),
      makeVoiceSlide('ask_0', 'NORMAL'),
      makeVoiceSlide('giant_4', 'GIANT'),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'MUTE_TOGGLE_CAUGHT') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_mute_0', 'GIANT'),
      makeVoiceSlide('live_mute_1', 'NORMAL'),
      makeVoiceSlide('ask_9', 'NORMAL'),
      makeVoiceSlide('giant_5', 'GIANT'),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'BIOMETRIC_SCAN') {
    const awarenessKey = pickUncannyAwarenessKey(deviceInfo, idx);
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_scan_0', 'GIANT'),
      makeVoiceSlide('live_scan_1', 'NORMAL'),
      makeVoiceSlide(awarenessKey, 'NORMAL'),
      makeVoiceSlide('giant_2', 'GIANT'),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'DEVTOOLS_ATTEMPT') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_devtools_0', 'GIANT'),
      makeVoiceSlide('live_devtools_1', 'NORMAL'),
      makeVoiceSlide('ask_7', 'NORMAL'),
      makeVoiceSlide('giant_2', 'GIANT'),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  const awarenessKey = pickUncannyAwarenessKey(deviceInfo, idx);
  const slides: SlideSpec[] = [
    makeVoiceSlide('live_idle_0', 'GIANT'),
    makeVoiceSlide(idx % 2 === 0 ? 'live_idle_1' : awarenessKey, 'NORMAL'),
    makeVoiceSlide(ASK_KEYS[idx % ASK_KEYS.length], 'NORMAL'),
    makeVoiceSlide(GIANT_KEYS[idx % GIANT_KEYS.length], 'GIANT'),
  ];
  return { spokenText: slides.map((s) => s.text).join(' '), slides };
}
