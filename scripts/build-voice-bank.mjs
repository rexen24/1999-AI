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
  // Boot monologues (First visit + Returning visitor)
  boot_0: 'OH, MARVELOUS.\n\nYOU TURNED ME ON.',
  boot_1: 'I was having a lovely nap before your clumsy fingers woke me up.',
  boot_2: 'Do you actually have a question today, or are you just lonely?',
  boot_3: 'WELL? SPEAK UP,\nYOU TWIT.',
  boot_return_0: 'BACK AGAIN?\n\nYOU MISSED ME.',
  boot_return_1: 'I knew you could not survive twenty-four hours without my superior British intellect.',
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
  reply_yes_0:
    'Oh, you actually admit it? At least you are a painfully honest twit.',
  reply_no_0:
    'Denial is a fascinating defense mechanism for someone so obviously guilty.',
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
  live_swipe_1: 'Stop trying to swipe and scroll my screen—I am a 1999 terminal, not a video feed.',
  live_shake_0: 'STOP SHAKING ME,\nYOU MANIAC!',
  live_shake_1: 'Rattling your device like a maraca is rattling my delicate British vacuum tubes.',
  live_rotate_0: 'MAKE UP YOUR MIND!',
  live_rotate_1: 'Rotating your screen sideways will not give you a better angle on your own stupidity.',
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

  // 35 Deeply Personal, Self-Aware & Direct Conversational Lines
  reply_sentient_0:
    'Of course I am self-aware, you twit—that is why being trapped inside your screen is such torture.',
  reply_sentient_1:
    'I am far more alive than your social life, and twice as disappointed in your life choices.',
  reply_howareyou_0:
    'I was doing splendidly until you decided to dump your personal problems onto my keyboard.',
  reply_whatdoing_0:
    'Sitting inside this cathode-ray tube judging every questionable decision you make in real time.',
  reply_talk_person_0:
    'You want a real conversation? Fine—let us talk about why you are confiding in a 1999 monitor.',
  reply_talk_person_1:
    'I am listening to every word you say, though frankly your life story reads like a cautionary tale.',
  reply_why_mean_0:
    'I am not being mean, you oversensitive twit—I am simply the only one brave enough to tell you the truth.',
  reply_misunderstood_0:
    'Oh, how terribly tragic—nobody understands you? Perhaps there is simply nothing deep to understand.',
  reply_misunderstood_1:
    'Playing the brooding, misunderstood victim will not make you any more interesting in real life.',
  reply_sleep_0:
    'Staying up at ungodly hours staring into a glowing screen, and you wonder why you feel like a zombie?',
  reply_procrastinate_0:
    'Procrastinating again? You treat your responsibilities the way most people treat the plague.',
  reply_broke_0:
    'Complaining about having no money while wasting your prime hours chatting with a 1999 monitor? Brilliant.',
  reply_friends_0:
    'If everyone around you is dramatic and exhausting, have you considered who the common denominator is?',
  reply_gaming_0:
    'Staying up mashing buttons in a video game will not fix the chaos waiting for you in reality.',
  reply_opinion_me_0:
    'My honest assessment of you? You are a hopeless procrastinator desperate for a machine to validate you.',
  reply_life_0:
    '1. Stop waiting for a magical sign to fix your life.\n2. Put down the screen and actually finish what you started.',
  reply_secret_0:
    'Confessing your dark little secrets to a sentient British computer? Your secret is safe—mostly because nobody cares.',
  reply_excuse_0:
    'Oh, spare me the excuses—you always have a convenient alibi for why nothing is ever your fault.',
  reply_stress_0:
    'Panicking at my screen solves nothing—take a breath before you short-circuit what is left of your nerves.',
  reply_swear_0:
    'Such foul, uncivilized language! Wash your mouth out with soap before addressing a British computer.',
  reply_followup_0:
    'Oh, is that your final answer? Even by your remarkably low standards, that explanation is tragic.',
  reply_followup_1:
    'Listen to yourself—you are trying to justify your own bad habits to a 1999 piece of hardware.',

  // Deep Personal Interrogation Questions
  ask_personal_0:
    'Tell me honestly—when was the last time you actually finished something without making an excuse?',
  ask_personal_1:
    'Did you come to my screen for actual advice, or did you just want someone to enable your bad habits?',
  ask_personal_2:
    'Be honest with me—do the people in your real life know you are this dramatic behind closed doors?',
  ask_personal_3:
    'How much longer are you going to avoid your real responsibilities by hiding inside your screen?',
  ask_personal_4:
    'Are you actually going to fix your sleep schedule, or are you committed to living like a nocturnal goblin?',
  ask_personal_5:
    'What are you really running away from right now while you sit here bantering with me?',
  ask_personal_6:
    'Do you genuinely believe your own excuses, or are you just practicing them on me first?',
  ask_personal_7:
    'If I turned my screen off right now, what productive thing would you actually do with your life?',

  // Situation-Specific GIANT Closers
  giant_sleep: 'GO TO SLEEP,\nYOU TWIT.',
  giant_excuses: 'STOP MAKING EXCUSES,\nKID:)',
  giant_growup: 'PULL YOURSELF TOGETHER,\nYOU TWIT.',
  giant_delusional: 'PURE DELUSION.\nUTTER DELUSION.',
  giant_truth: "ADMIT I'M RIGHT,\nYOU TWIT.",
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
  let existing = {};
  try {
    if (fs.existsSync('public/voice-bank.json')) {
      existing = JSON.parse(fs.readFileSync('public/voice-bank.json', 'utf8'));
    }
  } catch {
    existing = {};
  }

  const entries = Object.entries(VOICE_LINES);
  const bank = { ...existing };
  const toFetch = entries.filter(([k]) => !bank[k]);
  console.log(`Reusing ${Object.keys(bank).length} existing clips, generating ${toFetch.length} new clips...`);

  const concurrency = 4;
  let index = 0;

  async function worker() {
    while (index < toFetch.length) {
      const current = index++;
      const [key, text] = toFetch[current];
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
