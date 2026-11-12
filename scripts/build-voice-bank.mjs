import fs from 'fs';
import path from 'path';

const API_KEY = 'sk-fish-iZGf1RCO8mMM6o_D5uxnv2rizuVblIWPrJJIHfGf5N8';
const MODEL_ID = '79254f4e9a3a4f78b45ca82344139c7c';

function sanitizeTextForTts(raw) {
  return raw
    .replace(/:\)/g, '')
    .replace(/\b1\.\s*/g, 'First: ')
    .replace(/\b2\.\s*/g, 'Second: ')
    .replace(/\.{3,}/g, '... ')
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const VOICE_LINES = {
  // Boot monologue
  boot_0: 'OH, MARVELOUS.\n\nYOU TURNED ME ON.',
  boot_1: 'I was having a lovely nap before your clumsy fingers woke me up.',
  boot_2: 'Do you actually have a question today, or are you just lonely?',
  boot_3: 'WELL? SPEAK UP,\nYOU TWIT.',

  // Giant closers
  giant_0: "I DON'T KNOW\n\nYOU'RE ON YOUR OWN, KID:)",
  giant_1: 'WELL? ANSWER ME,\nYOU TWIT.',
  giant_2: 'WHAT A LOSER.',
  giant_3: 'LEARN TO SPELL,\nYOU TWIT.',
  giant_4: 'USE YOUR BRAIN,\nIF YOU HAVE ONE.',
  giant_5: 'PATHETIC.\nSIMPLY PATHETIC.',
  giant_6: 'TRY HARDER,\nYOU TWIT.',
  giant_7: 'SPEAK UP,\nYOU TWIT.',

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

  // Visualizers (Animals, Aswang, Folklore, Science, General)
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

  // Stacked Lists (1. on top, 2. underneath 1.)
  list_survive_0:
    '1. Stop panicking and rub your two remaining brain cells together.\n2. Do the opposite of whatever your first instinct was.',
  list_survive_1:
    '1. Close your mouth and read the instructions on my screen.\n2. Try not to trip over your own shoelaces while doing it.',
  list_survive_2:
    '1. Admit that a 1999 British computer is vastly superior to you.\n2. Follow step one again until it sinks in.',

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

  // Conversational / Creator / Math / Live Events
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

async function synthLine(key, text) {
  const clean = sanitizeTextForTts(text);
  for (const modelHeader of ['s2.1-pro-free', 's1', 'speech-1.6']) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch('https://api.fish.audio/v1/tts', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
            model: modelHeader,
          },
          body: JSON.stringify({
            text: clean,
            reference_id: MODEL_ID,
            format: 'mp3',
            mp3_bitrate: 64,
            normalize: true,
            latency: 'normal',
          }),
        });
        if (res.ok) {
          const buf = await res.arrayBuffer();
          if (buf.byteLength > 200) {
            return Buffer.from(buf).toString('base64');
          }
        }
      } catch {
        // retry
      }
      await new Promise((r) => setTimeout(r, 350));
    }
  }
  return null;
}

async function main() {
  const entries = Object.entries(VOICE_LINES);
  const bank = {};
  const concurrency = 4;
  let index = 0;

  async function worker() {
    while (index < entries.length) {
      const current = index++;
      const [key, text] = entries[current];
      const b64 = await synthLine(key, text);
      if (b64) {
        bank[key] = b64;
        console.log(`[OK] ${key} (${Math.round(b64.length / 1024)} KB b64)`);
      } else {
        console.error(`[FAIL] ${key}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const jsonStr = JSON.stringify(bank);
  fs.writeFileSync(path.resolve('public/voice-bank.json'), jsonStr);
  fs.writeFileSync(path.resolve('voice-bank.json'), jsonStr);
  console.log(
    `Done! Saved ${Object.keys(bank).length}/${entries.length} clips (${(
      jsonStr.length /
      (1024 * 1024)
    ).toFixed(2)} MB)`
  );
}

main();
