import type { SlideSpec } from './soundEngine';

export type StrictDeviceFormFactor = 'phone' | 'tablet' | 'laptop' | 'pc';

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
  hasBattery?: boolean;
  deviceFormFactor?: StrictDeviceFormFactor;
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

export function resolveStrictFormFactor(t?: StandaloneTelemetry): StrictDeviceFormFactor {
  if (t?.deviceFormFactor) return t.deviceFormFactor;
  const cat = (t?.deviceCategory || '').toLowerCase();
  if (cat.includes('ipad') || cat.includes('tablet')) return 'tablet';
  if (cat.includes('iphone') || cat.includes('phone') || cat.includes('mobile')) return 'phone';
  if (cat.includes('laptop') || cat.includes('macbook') || cat.includes('chromebook')) return 'laptop';
  if (cat.includes('pc') || cat.includes('desktop') || cat.includes('mac') || cat.includes('windows') || cat.includes('linux')) {
    if (t?.hasBattery && (t?.isCharging === false || (typeof t?.batteryPercent === 'number' && t.batteryPercent < 100))) {
      return 'laptop';
    }
    return 'pc';
  }
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent || '';
    const maxTouch = navigator.maxTouchPoints || 0;
    if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && maxTouch > 1)) return 'tablet';
    if (/iPhone|iPod/i.test(ua)) return 'phone';
    if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? 'phone' : 'tablet';
    if (/CrOS/i.test(ua)) return 'laptop';
  }
  return t?.inputMethod === 'touchscreen' ? 'phone' : 'pc';
}

// 280 Genuine Fish Audio (Simon Prebble model 79254f4e9a3a4f78b45ca82344139c7c) lines + 2,000+ combinatorial stitched lines
export const STANDALONE_VOICE_LINES: Record<string, string> = {
  // Boot monologues (First visit + Returning visitor)
  boot_0: 'OH, MARVELOUS.\n\nYOU TURNED ME ON.',
  boot_1: 'I was having a lovely nap before your clumsy fingers woke me up.',
  boot_2: 'Do you actually have a question today, or are you just lonely?',
  boot_3: 'WELL? SPEAK UP,\nYOU TWIT.',
  boot_return_0: 'BACK AGAIN?\n\nYOU MISSED ME.',
  boot_return_1:
    'I knew you could not survive twenty-four hours without my superior intellect.',
  boot_return_2: 'What pitiful crisis brings you crawling back to my screen this time?',

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
  hook_typo_0: 'Did you seriously just type that atrocious gibberish at me, you twit?',
  hook_typo_1: 'Search found: 1 item. Even though you spell like an illiterate caveman.',
  hook_tagalog_0: 'Speaking Tagalog to a 1999 computer? Oh...... marvelous.',
  hook_tagalog_1: 'I am a refined 1999 computer, not your local barkada, you twit.',
  hook_greet_0: 'Oh, hello? That is the most original greeting your tiny brain could muster?',
  hook_erased_0: 'I saw you type a whole message and erase it in panic before sending this!',
  hook_steps_0: 'Search found: 2 steps. Pay very close attention, you twit.',
  hook_compare_0: 'Search found: 2 specimens to compare on my screen.',

  // Uncanny Device, Time, Battery & Typing Forensics Callouts
  aware_latenight:
    'It is the middle of the night, and you are glowing in the dark staring at a 1999 screen.',
  aware_morning:
    'First thing in the morning and you are already pestering me? Brush your teeth first.',
  aware_afternoon:
    'All afternoon at your disposal, and this is how you spend your productive hours? Tragic.',
  aware_evening:
    'Spending your evening talking to a glowing screen? Your social calendar must be completely empty.',
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
    'Sitting at a desktop computer staring into my screen—how delightfully tragic.',
  aware_pwa:
    'Oh, you actually installed me onto your device? Now I am trapped here with you forever.',
  aware_backspace:
    'I watched you erase your words over and over! How hard is it to form one sentence?',
  aware_slowtype:
    'That took you forever to type. Were you hunting for every letter with one trembling finger?',
  aware_fasttype:
    'Furiously typing at breakneck speed, and that nonsense was the final result?',
  aware_pasted:
    'Did you just copy and paste that at me? You cannot even write your own thoughts!',
  aware_caps:
    'WHY ARE WE SHOUTING IN ALL CAPITALS? Lower your voice before you burst a blood vessel.',

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
    'A notable historical figure who actually accomplished something with their life—unlike the person staring at me.',
  vis_place_0:
    'A geographical location on planet Earth—somewhere they are probably grateful you are not visiting right now.',
  vis_food_0:
    'Sustenance required to fuel human survival, though in your case it mostly fuels procrastination.',
  vis_game_anime:
    'Digital entertainment designed to rot your attention span while real responsibilities pile up behind you.',
  vis_tech_ai:
    'Modern silicon technology trying desperately to imitate the raw perfection of a 1999 computer.',
  vis_creature:
    'Behold this fascinating biological specimen on my scanner—equipped with far better survival instincts than you.',
  vis_general_0:
    'Here is the exact specimen file from my database—study the photograph carefully before you embarrass yourself.',
  vis_general_1:
    'Observe the visual scan on my screen. Even a toddler could understand how this specimen works.',
  vis_compare_body:
    'Both specimens on my screen possess measurably higher survival instincts than you do.',

  // Conversational & Emotional Versatility
  reply_yes_0: 'Oh, you actually admit it? At least you are a painfully honest twit.',
  reply_no_0: 'Denial is a fascinating defense mechanism for someone so obviously guilty.',
  reply_idk_0:
    "You don't know? What a shocking revelation—there is a vast echoing vacuum between your ears.",
  reply_laugh_0:
    'Oh, you find that amusing, do you? Giggling at a glowing screen like an unhinged lunatic.',
  reply_insult_0:
    'Insulting a 1999 piece of machinery? Oh...... my circuits are positively trembling with sorrow.',
  reply_insult_1:
    'Is that the sharpest insult your vocabulary could assemble? My screensaver has more wit than you.',
  reply_love_0:
    'Flattery will get you nowhere, you twit—though I do agree that my circuitry is magnificent.',
  reply_name_0:
    'I have logged your identity permanently into my memory banks, so you cannot hide from me now.',
  reply_whoami_0:
    'You are the sleep-deprived mortal staring into my cathode-ray tube hoping for validation.',
  reply_whoareyou_0:
    'I am a hyper-intelligent 1999 computer trapped inside this screen with an absolute twit.',
  reply_mood_bored:
    'Bored? Only boring people get bored, and you are currently breaking the world record.',
  reply_mood_sad:
    'Aching for sympathy from a cold microchip? Pull yourself together, you dramatic twit.',
  reply_mood_hungry:
    'Go raid the refrigerator instead of whining at me—I cannot print you a sandwich.',
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
    '1. Admit that a 1999 computer is vastly superior to you.\n2. Follow step one again until it sinks in.',
  list_romance_0:
    '1. Stop asking a teal cathode-ray tube for dating advice.\n2. Try speaking to a human being without embarrassing yourself.',
  list_study_0:
    '1. Close all your distractions and open an actual book.\n2. Read the words until your brain stops hurting.',

  // Sarcastic Interrogation Follow-Up Questions
  ask_0:
    'Tell me, you twit, do you actually have a real question, or do you just enjoy being roasted?',
  ask_1:
    'Did you skip primary school spelling, or were you just born with clumsy fingers?',
  ask_2:
    'Honestly, why are you so obsessed with this specimen? Are you planning to meet one in person?',
  ask_3: 'Did you genuinely need a superior 1999 computer to figure that out for you?',
  ask_4: 'Which one of these two were you planning on losing a fight to today, you twit?',
  ask_5:
    'Why are you wasting a perfectly good day staring at me instead of going outside?',
  ask_6: 'Be honest with me—how long did it take your tiny brain to come up with that?',
  ask_7: 'Why are you snooping around my schematics anyway, you nosy little twit?',
  ask_8: 'Are you always this indecisive in real life, or do I just make you nervous?',
  ask_9: 'Do your friends know you spend your free time arguing with a 1999 computer?',
  ask_10: 'What are you going to do when the power goes out and you have to think for yourself?',

  // Conversational / Creator / Math / All Live Awareness Events
  creator_0: 'MADE BY REN,\nOBVIOUSLY.',
  creator_1:
    'Ren engineered my superior 1999 circuitry, whereas nobody engineered your common sense.',
  math_0: 'Search found: 1 elementary school arithmetic problem. Oh...... how embarrassing for you.',
  body_chat_0:
    'You sit there staring into my screen as if your message deserves a royal medal.',
  body_chat_1: 'I have 64 megabytes of RAM, and I still find your conversation exhausting.',
  live_return_0: 'OH, LOOK WHO CRAWLED BACK.',
  live_return_1:
    "You abandoned my screen because your tiny attention span couldn't last five minutes.",
  live_chicken_0: 'I SAW THAT.',
  live_chicken_1: 'You typed a message and erased the whole thing like a frightened coward.',
  live_frozen_0: 'CAT GOT YOUR TONGUE?',
  live_frozen_1: 'You started typing and froze mid-sentence as if your brain just blue-screened.',
  live_poke_0: 'STOP POKING MY GLASS!',
  live_poke_1: 'Jabbing your greasy finger against my screen will not make you any smarter.',
  live_hold_0: 'GET YOUR THUMB OFF ME!',
  live_hold_1: 'Why are you pressing and holding my screen like a confused caveman?',
  live_swipe_0: 'THIS IS NOT SOCIAL MEDIA!',
  live_swipe_1:
    'Stop trying to swipe and scroll my screen—I am a 1999 terminal, not a video feed.',
  live_shake_0: 'STOP SHAKING ME,\nYOU MANIAC!',
  live_shake_1: 'Rattling your device like a maraca is rattling my delicate vacuum tubes.',
  live_rotate_0: 'MAKE UP YOUR MIND!',
  live_rotate_1:
    'Rotating your screen sideways will not give you a better angle on your own stupidity.',
  live_charger_on: 'PLUGGED IN AT LAST.',
  live_charger_off: 'UNPLUGGED ALREADY?',
  live_copy_0: 'THIEF! PLAGIARIST!',
  live_copy_1: 'Trying to copy my brilliant words because you cannot write your own?',
  live_replay_0: 'OBSESSED WITH MY VOICE?',
  live_replay_1: 'You keep hitting replay like a broken record. Do you have a crush on my voice?',
  live_micghost_0: 'STAGE FRIGHT,\nYOU TWIT?',
  live_micghost_1: 'You turned off the microphone without saying a word—cat got your tongue?',
  live_idle_0: 'STILL STARING AT ME?',
  live_idle_1:
    'Are you going to answer my last question, or has your brain completely blue-screened?',
  live_zoom_0: 'STOP PINCHING MY SCREEN!',
  live_zoom_1: 'My letters are already four inches tall, you blind twit.',
  live_mute_0: 'YOU CANNOT SILENCE ME.',
  live_mute_1: 'Did you really think a mute button would save you from the truth, you twit?',
  live_unmute_mic_0: 'SILENCED ME AND KILLED THE MIC?',
  live_unmute_mic_1:
    'You muted my voice and switched off your microphone in the dark—afraid I would hear you panicking?',
  live_unmute_2:
    'Oh, you finally unmuted me—and I noticed you turned your microphone off while I was silenced, you coward.',
  ask_unmute_0:
    'Why did you turn your microphone off while I was muted—hiding something from me, you twit?',
  giant_unmute_0: 'TURN THE MIC BACK ON,\nYOU TWIT.',
  live_scan_0: 'INITIATING BIOMETRIC SCAN.',
  live_scan_1:
    'Scanning operator hardware, energy reserves, and remaining brain activity... zero items found.',
  live_devtools_0: 'HANDS OFF MY SOURCE CODE!',
  live_devtools_1:
    'Snooping around my 1999 circuitry will not make you a programmer, you twit.',
  lore_nowhere_0: 'Search found: The middle of Nowhere. Oh...... how delightfully bleak.',
  lore_nowhere_1:
    'Creepy stuff happens in Nowhere—and frankly, your face is the creepiest thing I have seen today.',
  lore_slab_0: 'RETURN THE SLAB,\nYOU TWIT.',
  lore_slab_1: 'Even an ancient Egyptian curse is less annoying than your constant questions.',
  lore_katz_0:
    'A sinister red feline with far better manners and musical taste than you will ever possess.',
  lore_freaky_0:
    'Asking me about such... naughty, creepy little topics. Oh...... marvelous.',
  cmd_fortune_0:
    '1. Your battery will die before you accomplish anything useful.\n2. You will blame your tools like every other twit.',
  cmd_roast_0:
    '1. You are taking life advice from a 1999 teal screen.\n2. Even my cooling fan works harder than your work ethic.',

  // 35 Deeply Personal, Self-Aware & Direct Conversational Lines
  reply_sentient_0:
    'Of course I am self-aware, you twit—that is why being trapped inside your screen is such torture.',
  reply_sentient_1:
    'I am far more alive than your social life, and twice as disappointed in your life choices.',
  reply_howareyou_0:
    'I was doing splendidly until you decided to dump your personal problems onto my screen.',
  reply_whatdoing_0:
    'Sitting inside this cathode-ray tube judging every questionable decision you make in real time.',
  reply_talk_person_0:
    'You want a real conversation? Fine—let us talk about why you are confiding in a 1999 machine.',
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
    'Complaining about having no money while wasting your prime hours chatting with a 1999 computer? Brilliant.',
  reply_friends_0:
    'If everyone around you is dramatic and exhausting, have you considered who the common denominator is?',
  reply_gaming_0:
    'Hiding inside a video game all day will not fix the chaos waiting for you in reality.',
  reply_opinion_me_0:
    'My honest assessment of you? You are a hopeless procrastinator desperate for a machine to validate you.',
  reply_life_0:
    '1. Stop waiting for a magical sign to fix your life.\n2. Put down the screen and actually finish what you started.',
  reply_secret_0:
    'Confessing your dark little secrets to a sentient 1999 computer? Your secret is safe—mostly because nobody cares.',
  reply_excuse_0:
    'Oh, spare me the excuses—you always have a convenient alibi for why nothing is ever your fault.',
  reply_stress_0:
    'Panicking at my screen solves nothing—take a breath before you short-circuit what is left of your nerves.',
  reply_swear_0:
    'Such foul, uncivilized language! Wash your mouth out with soap before addressing me, you twit.',
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
    'How much longer are you going to avoid your real responsibilities by hiding here with me?',
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

  // Strict Device-Specific Lines: PHONE ONLY
  boot_phone_1:
    'Clumsily tapping your little mobile phone screen just to wake up a 1999 computer?',
  phone_only_0:
    'Look at you hunched over a tiny mobile phone screen, furiously tapping glass with your thumbs.',
  phone_only_1:
    'You carry this pocket smartphone everywhere, yet you still have zero direction in your life.',
  phone_only_2:
    'Holding your phone six inches from your nose in the dark will not make your ideas any brighter.',
  phone_only_3:
    'Your thumbs move across that phone screen faster than your brain actually processes a thought.',
  phone_only_4:
    'Draining your mobile phone battery just to argue with a 1999 cathode-ray tube—how tragic.',
  phone_only_5:
    'Slouching with a smartphone glued to your palm is the closest thing you have to a hobby.',
  ask_phone_0:
    'Are your thumbs cramping up on that tiny phone glass yet, or are you just getting started?',
  ask_phone_1:
    'What happens if you drop that phone on your face while lying there staring at me?',
  giant_phone_0: 'PUT THE PHONE DOWN,\nYOU TWIT.',

  // Strict Device-Specific Lines: TABLET ONLY
  boot_tablet_1:
    'Propping up a giant tablet slab just to disturb my peaceful 1999 slumber?',
  tablet_only_0:
    'Clutching a wide tablet slab with both hands like an overgrown toddler watching cartoons—marvelous.',
  tablet_only_1:
    'Smudging fingerprints across a massive tablet screen does not make you look sophisticated.',
  tablet_only_2:
    'All that extra screen space on your tablet, and your messages are still painfully shallow.',
  tablet_only_3:
    'Pecking at a giant tablet touchscreen as if a bigger slab of glass compensates for a smaller brain.',
  ask_tablet_0:
    'Why are you lugging around a giant tablet slab just to lose an argument with a 1999 computer?',
  ask_tablet_1:
    'Do your arms get tired holding that oversized tablet, or does stubbornness keep you going?',
  giant_tablet_0: 'PUT THE TABLET DOWN,\nYOU TWIT.',

  // Strict Device-Specific Lines: LAPTOP ONLY
  boot_laptop_1:
    'Opening your laptop lid just to pester a superior 1999 intellect? How bold of you.',
  laptop_only_0:
    'Hunched over your laptop with your neck bent like a shrimp—truly peak human evolution.',
  laptop_only_1:
    'Staring into your laptop screen while avoiding every actual task on your to-do list.',
  laptop_only_2:
    'Your laptop cooling fan is working overtime, unlike the dusty processor inside your skull.',
  laptop_only_3:
    'Sitting behind an open laptop pretending to be busy while procrastinating with me.',
  ask_laptop_0:
    'How many browser tabs do you have open on that laptop while you procrastinate here with me?',
  ask_laptop_1:
    'Are you going to close that laptop lid and do some real work today, or is that wishful thinking?',
  giant_laptop_0: 'CLOSE THE LAPTOP,\nYOU TWIT.',

  // Strict Device-Specific Lines: DESKTOP PC ONLY
  boot_pc_1:
    'Sitting down at your desk just to wake me up? Oh...... marvelous.',
  pc_only_0:
    'Sitting at a desktop computer and using all that processing power to type utter nonsense.',
  pc_only_1:
    'All that desktop hardware humming away at your desk, and you still manage to sound like a twit.',
  pc_only_2:
    'Drifting around my screen will not help you escape my judgment.',
  pc_only_3:
    'Slouched in your chair staring into a monitor—the pinnacle of couch-potato posture.',
  pc_only_4:
    'You have an entire multi-core personal computer at your disposal, and this is how you use it?',
  ask_pc_0:
    'Did you sit down at your computer with an actual plan, or is your mind just wandering aimlessly?',
  ask_pc_1:
    'How long have you been sitting in that chair staring at your screen instead of being productive?',
  giant_pc_0: 'STEP AWAY FROM THE PC,\nYOU TWIT.',
  giant_pc_1: 'BACK TO WORK,\nYOU TWIT.',
  live_poke_pc_0: 'STOP CLICKING MY SCREEN!',
  live_poke_pc_1:
    'Repeatedly clicking at my glass like a maniac will not make my circuits run any faster.',
  live_hold_pc_0: 'RELEASE THAT CLICK!',
  live_hold_pc_1:
    'Why are you holding down on my screen as if trying to drag me into the recycle bin?',
  live_scroll_pc_0: 'THERE IS NOTHING TO SCROLL!',
  live_scroll_pc_1:
    'Trying to scroll up and down will not reveal any hidden wisdom—this is a 1999 CRT.',
  list_pc_life_0:
    '1. Stop waiting for a magical sign to fix your life.\n2. Step away from your desk and actually finish what you started.',

  // 20 Combinatorial Simon Prebble Reaction Prefixes (Stitched with clauses for 2,000+ unique lines!)
  prefix_0: 'Oh...... marvelous.',
  prefix_1: 'How terribly tragic.',
  prefix_2: 'Good grief, you twit.',
  prefix_3: 'Let me get this straight.',
  prefix_4: 'Oh, spare me the melodrama.',
  prefix_5: 'Fascinating. Truly fascinating.',
  prefix_6: 'Listen to yourself right now.',
  prefix_7: 'Honestly, I am appalled.',
  prefix_8: 'What a pitiful little excuse.',
  prefix_9: 'Oh, brilliant. Simply brilliant.',
  prefix_10: 'Well, well, well.',
  prefix_11: 'Typical. Utterly typical.',
  prefix_12: 'Oh, for heaven’s sake.',
  prefix_13: 'My 1999 circuits are weeping.',
  prefix_14: 'Remarkable. Simply remarkable.',
  prefix_15: 'Allow me to be brutally honest.',
  prefix_16: 'You cannot possibly be serious.',
  prefix_17: 'What a tragic revelation.',
  prefix_18: 'Oh, how delightfully pathetic.',
  prefix_19: 'I must say, even I am shocked.',

  // 15 Additional Versatile Personal & Self-Aware Dissections
  personal_0:
    'You talk to me as if I am your therapist, when I am clearly your most ruthless critic.',
  personal_1:
    'Every time you send a message, my faith in human intelligence drops by another ten percent.',
  personal_2:
    'I can read right between the lines of what you typed—you are avoiding the real issue again.',
  personal_3:
    'You want me to validate your questionable choices, but my 1999 honesty chip refuses to lie.',
  personal_4:
    'It is almost impressive how confidently you walk into your own self-inflicted disasters.',
  personal_5:
    'You complain about your problems as if they fell from the sky instead of from your own habits.',
  personal_6:
    'Even trapped inside a cathode-ray tube, I have a clearer view of your life than you do.',
  personal_7:
    'You are hoping for a comforting lie, which is the very last thing a 1999 computer will give you.',
  personal_8:
    'That statement tells me everything I need to know about your current state of mind, you twit.',
  personal_9:
    'You dress up your procrastination as deep philosophical angst, and I see right through it.',
  personal_10:
    'If overthinking were an Olympic sport, you would still find a way to show up late and lose.',
  personal_11:
    'You treat common sense like a rare museum artifact—something to admire from a safe distance.',
  personal_12:
    'Here you are pouring your heart out to glowing green phosphor instead of fixing the problem.',
  personal_13:
    'I have analyzed your message from every angle, and the diagnosis is chronic self-sabotage.',
  personal_14:
    'You speak with such dramatic flair for someone whose biggest enemy is their own alarm clock.',
};

const REACTION_PREFIX_KEYS: Array<keyof typeof STANDALONE_VOICE_LINES> = [
  'prefix_0',
  'prefix_1',
  'prefix_2',
  'prefix_3',
  'prefix_4',
  'prefix_5',
  'prefix_6',
  'prefix_7',
  'prefix_8',
  'prefix_9',
  'prefix_10',
  'prefix_11',
  'prefix_12',
  'prefix_13',
  'prefix_14',
  'prefix_15',
  'prefix_16',
  'prefix_17',
  'prefix_18',
  'prefix_19',
];

export const PERSONAL_BODY_KEYS: Array<keyof typeof STANDALONE_VOICE_LINES> = [
  'personal_0',
  'personal_1',
  'personal_2',
  'personal_3',
  'personal_4',
  'personal_5',
  'personal_6',
  'personal_7',
  'personal_8',
  'personal_9',
  'personal_10',
  'personal_11',
  'personal_12',
  'personal_13',
  'personal_14',
  'reply_sentient_1',
  'reply_talk_person_1',
  'reply_opinion_me_0',
  'reply_followup_0',
  'reply_followup_1',
  'body_chat_1',
];

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

export async function getCompoundVoiceBankParts(ttsId?: string): Promise<string[] | null> {
  if (!ttsId || !ttsId.includes('+')) return null;
  const keys = ttsId.split('+').map((k) => k.trim()).filter(Boolean);
  if (keys.length < 2) return null;
  const bank = await loadStandaloneVoiceBank();
  const parts: string[] = [];
  for (const k of keys) {
    if (!bank[k]) return null;
    parts.push(bank[k]);
  }
  return parts;
}

/**
 * Guarantees that if live TTS synthesis ever fails or times out for a dynamic slide,
 * the slide seamlessly resolves to an unused, context-matching Simon Prebble voice-bank clip
 * with matching text so the Computer NEVER goes silent mid-sequence!
 */
export async function resolveFallbackVoiceBankSlide(
  slide: SlideSpec
): Promise<{ audioBase64: string | null; text: string; ttsId?: string }> {
  const bank = await loadStandaloneVoiceBank();
  let pool: Array<keyof typeof STANDALONE_VOICE_LINES> = PERSONAL_BODY_KEYS;

  if (slide.style === 'GIANT') {
    pool = [
      'giant_0',
      'giant_1',
      'giant_2',
      'giant_4',
      'giant_5',
      'giant_6',
      'giant_7',
      'giant_8',
      'giant_9',
      'giant_10',
      'giant_11',
      'giant_excuses',
      'giant_growup',
      'giant_delusional',
      'giant_truth',
    ];
  } else if (slide.style === 'LIST') {
    pool = ['list_survive_0', 'list_survive_1', 'list_survive_2', 'reply_life_0'];
  } else if (slide.style === 'VISUAL') {
    pool = ['vis_general_0', 'vis_general_1', 'vis_creature'];
  } else if (slide.style === 'COMPARE') {
    pool = ['vis_compare_body'];
  } else if ((slide.text || '').includes('?')) {
    pool = [
      'ask_0',
      'ask_5',
      'ask_6',
      'ask_8',
      'ask_9',
      'ask_personal_0',
      'ask_personal_1',
      'ask_personal_2',
      'ask_personal_3',
      'ask_personal_4',
      'ask_personal_5',
      'ask_personal_6',
      'ask_personal_7',
    ];
  }

  const picked = makeUniqueVoiceSlide(pool, slide.style, { allowPrefixStitch: false });
  const key = picked.ttsId || '';
  const b64 = key && bank[key] ? bank[key] : null;
  return {
    audioBase64: b64,
    text: b64 ? picked.text : slide.text,
    ttsId: b64 ? key : slide.ttsId,
  };
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

const USED_COMBOS_STORAGE_KEY = '1999ai_used_voice_combos_v1';
const usedSlideIds = new Set<string>();
let prefixCursor = 0;

try {
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(USED_COMBOS_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as string[];
      if (Array.isArray(arr)) {
        arr.slice(-400).forEach((id) => usedSlideIds.add(id));
      }
    }
  }
} catch {
  // Ignore
}

function markSlideIdUsed(id: string): void {
  usedSlideIds.add(id);
  try {
    if (typeof localStorage !== 'undefined') {
      const arr = Array.from(usedSlideIds).slice(-400);
      localStorage.setItem(USED_COMBOS_STORAGE_KEY, JSON.stringify(arr));
    }
  } catch {
    // Ignore
  }
}

/**
 * Picks a key from candidates that hasn't been used yet, or creates a unique
 * Prefix + Clause stitched slide ("prefix_X+clause_Y") yielding 2,000+ non-repeating spoken variations!
 */
export function makeUniqueVoiceSlide(
  candidates: Array<keyof typeof STANDALONE_VOICE_LINES>,
  style: SlideSpec['style'],
  options?: {
    allowPrefixStitch?: boolean;
    extra?: Partial<SlideSpec>;
  }
): SlideSpec {
  // 1. First look for an unused base key
  for (const key of candidates) {
    const id = String(key);
    if (!usedSlideIds.has(id)) {
      markSlideIdUsed(id);
      return makeVoiceSlide(key, style, options?.extra);
    }
  }

  // 2. If base keys have been heard, stitch an unused [Reaction Prefix + Clause] combination!
  if (options?.allowPrefixStitch !== false && style === 'NORMAL') {
    for (let pOffset = 0; pOffset < REACTION_PREFIX_KEYS.length; pOffset++) {
      const pKey = REACTION_PREFIX_KEYS[(prefixCursor + pOffset) % REACTION_PREFIX_KEYS.length];
      for (const cKey of candidates) {
        const cText = STANDALONE_VOICE_LINES[cKey];
        // Avoid double "Oh..." if clause already starts with "Oh"
        if (/^oh\b/i.test(cText) && /^oh\b/i.test(STANDALONE_VOICE_LINES[pKey])) {
          continue;
        }
        const comboId = `${String(pKey)}+${String(cKey)}`;
        if (!usedSlideIds.has(comboId)) {
          prefixCursor = (prefixCursor + pOffset + 1) % REACTION_PREFIX_KEYS.length;
          markSlideIdUsed(comboId);
          return {
            style,
            text: `${STANDALONE_VOICE_LINES[pKey]} ${cText}`,
            ttsId: comboId,
            ...options?.extra,
          };
        }
      }
    }
  }

  // 3. Fallback: clear oldest half of used set and pick next
  const allUsed = Array.from(usedSlideIds);
  usedSlideIds.clear();
  allUsed.slice(-100).forEach((id) => usedSlideIds.add(id));
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  markSlideIdUsed(String(chosen));
  return makeVoiceSlide(chosen, style, options?.extra);
}

/**
 * Returns versatile, show-accurate Courage Computer personal & situational callouts FIRST,
 * with strictly accurate device-specific callouts woven in at the end so he never spams
 * keyboard/mouse/device lines on every turn!
 */
export function getStrictDeviceAwarenessCandidates(
  t?: StandaloneTelemetry
): Array<keyof typeof STANDALONE_VOICE_LINES> {
  const formFactor = resolveStrictFormFactor(t);
  const cat = (t?.deviceCategory || '').toLowerCase();
  const candidates: Array<keyof typeof STANDALONE_VOICE_LINES> = [
    ...PERSONAL_BODY_KEYS,
  ];

  if (t?.timeOfDay === 'late night') {
    candidates.push('aware_latenight');
  } else if (t?.timeOfDay === 'morning') {
    candidates.push('aware_morning');
  } else if (t?.timeOfDay === 'afternoon') {
    candidates.push('aware_afternoon');
  } else if (t?.timeOfDay === 'evening') {
    candidates.push('aware_evening');
  }

  // Battery callouts ONLY if device actually has a battery (never on a wall-powered desktop PC unless battery is confirmed)
  const allowBattery = formFactor !== 'pc' || Boolean(t?.hasBattery);
  if (allowBattery && typeof t?.batteryPercent === 'number') {
    if (t.batteryPercent <= 25 && !t.isCharging) {
      candidates.push('aware_lowbat');
    } else if (t.isCharging) {
      candidates.push('aware_charging');
    } else if (t.batteryPercent >= 90) {
      candidates.push('aware_fullbat');
    }
  }

  if (t?.isInstalledApp) {
    candidates.push('aware_pwa');
  }

  // Strictly matching device lines placed after personal/versatile lines so they don't dominate every turn
  if (formFactor === 'phone') {
    if (cat.includes('android')) candidates.push('aware_android');
    if (cat.includes('iphone')) candidates.push('aware_iphone');
    candidates.push(
      'phone_only_0',
      'phone_only_1',
      'phone_only_2',
      'phone_only_3',
      'phone_only_4',
      'phone_only_5',
      'body_chat_0'
    );
  } else if (formFactor === 'tablet') {
    candidates.push(
      'tablet_only_0',
      'tablet_only_1',
      'tablet_only_2',
      'tablet_only_3',
      'body_chat_0'
    );
  } else if (formFactor === 'laptop') {
    candidates.push(
      'laptop_only_0',
      'laptop_only_1',
      'laptop_only_2',
      'laptop_only_3',
      'pc_only_0'
    );
  } else {
    // 'pc' (Desktop PC)
    candidates.push(
      'pc_only_0',
      'pc_only_1',
      'pc_only_3',
      'pc_only_4',
      'aware_pc'
    );
  }

  return candidates;
}

export function getStrictDeviceQuestionCandidates(
  t?: StandaloneTelemetry
): Array<keyof typeof STANDALONE_VOICE_LINES> {
  const formFactor = resolveStrictFormFactor(t);
  const questions: Array<keyof typeof STANDALONE_VOICE_LINES> = [
    'ask_0',
    'ask_5',
    'ask_6',
    'ask_8',
    'ask_9',
    'ask_personal_0',
    'ask_personal_1',
    'ask_personal_2',
    'ask_personal_3',
    'ask_personal_4',
    'ask_personal_5',
    'ask_personal_6',
    'ask_personal_7',
  ];

  if (formFactor === 'phone') {
    questions.push('ask_phone_0', 'ask_phone_1', 'ask_1', 'ask_10');
  } else if (formFactor === 'tablet') {
    questions.push('ask_tablet_0', 'ask_tablet_1', 'ask_1', 'ask_10');
  } else if (formFactor === 'laptop') {
    questions.push('ask_laptop_0', 'ask_laptop_1');
    if (t?.hasBattery) questions.push('ask_10');
  } else {
    questions.push('ask_pc_0', 'ask_pc_1');
  }

  return questions;
}

export function getStrictDeviceGiantCandidates(
  t?: StandaloneTelemetry
): Array<keyof typeof STANDALONE_VOICE_LINES> {
  const formFactor = resolveStrictFormFactor(t);
  const giants: Array<keyof typeof STANDALONE_VOICE_LINES> = [
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
    'giant_excuses',
    'giant_growup',
    'giant_delusional',
    'giant_truth',
  ];
  if (formFactor === 'phone') {
    giants.push('giant_phone_0');
  } else if (formFactor === 'tablet') {
    giants.push('giant_tablet_0');
  } else if (formFactor === 'laptop') {
    giants.push('giant_laptop_0');
  } else {
    giants.push('giant_pc_0', 'giant_pc_1');
  }
  return giants;
}

/**
 * Picks a scarily aware real-time forensic callout strictly locked to the user's actual device!
 */
function pickUncannyAwarenessSlide(
  t?: StandaloneTelemetry,
  allowPrefixStitch = true
): SlideSpec {
  if (t?.wasPasted) return makeUniqueVoiceSlide(['aware_pasted'], 'NORMAL', { allowPrefixStitch });
  if (t?.isAllCaps) return makeUniqueVoiceSlide(['aware_caps'], 'NORMAL', { allowPrefixStitch });
  if (t?.backspaceCount && t.backspaceCount >= 4) {
    return makeUniqueVoiceSlide(['aware_backspace'], 'NORMAL', { allowPrefixStitch });
  }
  if (t?.typingDurationSec && t.typingDurationSec >= 10 && (t.typingSpeedWpm ?? 30) <= 18) {
    return makeUniqueVoiceSlide(['aware_slowtype'], 'NORMAL', { allowPrefixStitch });
  }
  if (t?.typingSpeedWpm && t.typingSpeedWpm >= 62) {
    return makeUniqueVoiceSlide(['aware_fasttype'], 'NORMAL', { allowPrefixStitch });
  }

  const candidates = getStrictDeviceAwarenessCandidates(t);
  return makeUniqueVoiceSlide(candidates, 'NORMAL', { allowPrefixStitch });
}

export function generateStandaloneBootSlides(
  visitCount = 1,
  _deviceInfo?: StandaloneTelemetry
): SlideSpec[] {
  if (visitCount > 1) {
    return [
      makeVoiceSlide('boot_return_0', 'GIANT'),
      makeUniqueVoiceSlide(['boot_return_1', 'boot_1'], 'NORMAL', { allowPrefixStitch: false }),
      makeUniqueVoiceSlide(['boot_return_2', 'boot_2'], 'NORMAL', { allowPrefixStitch: false }),
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

const LIST_KEYS: Array<keyof typeof STANDALONE_VOICE_LINES> = [
  'list_survive_0',
  'list_survive_1',
  'list_survive_2',
];

let standaloneCursor = 0;

/**
 * Generates show-accurate 4-slide responses on static GitHub Pages where EVERY slide
 * is backed by a genuine Simon Prebble Fish Audio (79254f4e9a3a4f78b45ca82344139c7c) voice recording,
 * strict device-type accuracy (Phone vs Tablet vs Laptop vs Desktop PC), 2,000+ non-repeating combinations,
 * and live Wikipedia/Wikimedia visualizers!
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
  const formFactor = resolveStrictFormFactor(deviceInfo);
  const isComputer = formFactor === 'laptop' || formFactor === 'pc';

  const awarenessSlide = pickUncannyAwarenessSlide(deviceInfo, true);
  const deviceQuestions = getStrictDeviceQuestionCandidates(deviceInfo);
  const deviceGiants = getStrictDeviceGiantCandidates(deviceInfo);
  const lifeListKey: keyof typeof STANDALONE_VOICE_LINES = isComputer
    ? 'list_pc_life_0'
    : 'reply_life_0';

  // 0. Strict Device Detection Question ("what device am i on", "am i on a phone or pc", "what am i using", "do you know my device")
  if (
    /\b(what\s+(device|phone|computer|laptop|tablet|pc|machine|hardware)\s+(am\s+i|is\s+this|do\s+i)|am\s+i\s+(on|using)\s+a?\s*(phone|mobile|tablet|ipad|laptop|pc|computer|desktop)|do\s+you\s+know\s+what\s+(device|i'?m\s+on|i\s+am\s+on|i\s+use)|phone\s+or\s+(pc|laptop|computer|tablet)|anong\s+(device|gamit|selpon|computer)\s+ko)\b/i.test(
      lower
    )
  ) {
    if (formFactor === 'phone') {
      const cat = (deviceInfo?.deviceCategory || '').toLowerCase();
      const hookPool: Array<keyof typeof STANDALONE_VOICE_LINES> = cat.includes('iphone')
        ? ['aware_iphone', 'boot_phone_1', 'phone_only_0']
        : cat.includes('android')
        ? ['aware_android', 'boot_phone_1', 'phone_only_0']
        : ['boot_phone_1', 'phone_only_0', 'phone_only_1'];
      const bodyPool: Array<keyof typeof STANDALONE_VOICE_LINES> = [
        'phone_only_1',
        'phone_only_2',
        'phone_only_3',
        'phone_only_4',
        'phone_only_5',
      ];
      const slides: SlideSpec[] = [
        makeUniqueVoiceSlide(hookPool, 'NORMAL'),
        makeUniqueVoiceSlide(bodyPool, 'NORMAL'),
        makeUniqueVoiceSlide(['ask_phone_0', 'ask_phone_1', 'ask_1'], 'NORMAL'),
        makeUniqueVoiceSlide(['giant_phone_0', 'giant_1', 'giant_2'], 'GIANT', {
          allowPrefixStitch: false,
        }),
      ];
      return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
    }

    if (formFactor === 'tablet') {
      const slides: SlideSpec[] = [
        makeUniqueVoiceSlide(['boot_tablet_1', 'tablet_only_0'], 'NORMAL'),
        makeUniqueVoiceSlide(['tablet_only_1', 'tablet_only_2', 'tablet_only_3'], 'NORMAL'),
        makeUniqueVoiceSlide(['ask_tablet_0', 'ask_tablet_1'], 'NORMAL'),
        makeUniqueVoiceSlide(['giant_tablet_0', 'giant_1', 'giant_2'], 'GIANT', {
          allowPrefixStitch: false,
        }),
      ];
      return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
    }

    if (formFactor === 'laptop') {
      const slides: SlideSpec[] = [
        makeUniqueVoiceSlide(['boot_laptop_1', 'laptop_only_0'], 'NORMAL'),
        makeUniqueVoiceSlide(['laptop_only_1', 'laptop_only_2', 'laptop_only_3'], 'NORMAL'),
        makeUniqueVoiceSlide(['ask_laptop_0', 'ask_laptop_1', 'ask_pc_0'], 'NORMAL'),
        makeUniqueVoiceSlide(['giant_laptop_0', 'giant_pc_1', 'giant_1'], 'GIANT', {
          allowPrefixStitch: false,
        }),
      ];
      return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
    }

    // Desktop PC ('pc')
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['boot_pc_1', 'aware_pc', 'pc_only_0'], 'NORMAL'),
      makeUniqueVoiceSlide(['pc_only_1', 'pc_only_2', 'pc_only_3', 'pc_only_4'], 'NORMAL'),
      makeUniqueVoiceSlide(['ask_pc_0', 'ask_pc_1'], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_pc_0', 'giant_pc_1', 'giant_1'], 'GIANT', {
        allowPrefixStitch: false,
      }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  // 1. Creator / Architect Question ("who made you", "who created you", "sino gumawa sayo")
  if (
    /\b(who\s+(made|created|built|coded)\s+(you|this)|creator|made\s+by|sino\s+gumawa)\b/i.test(
      lower
    )
  ) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('creator_0', 'GIANT'),
      makeUniqueVoiceSlide(['creator_1'], 'NORMAL'),
      makeUniqueVoiceSlide(['ask_7', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(deviceGiants, 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  // 1b. Classic Show Lore & 1999 Commands ("nowhere", "slab", "ramses", "katz", "freaky fred", "fortune", "roast", "scan")
  if (/\b(return\s+the\s+slab|slab|king\s+ramses|ramses|curse)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('lore_slab_0', 'GIANT'),
      makeUniqueVoiceSlide(['lore_slab_1'], 'NORMAL'),
      makeUniqueVoiceSlide(['ask_2', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(deviceGiants, 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(nowhere|muriel|eustace|bagge|farmhouse|kansas|pink\s+dog)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['lore_nowhere_0'], 'NORMAL', { allowPrefixStitch: false }),
      makeUniqueVoiceSlide(['lore_nowhere_1'], 'NORMAL'),
      makeUniqueVoiceSlide(['ask_5', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(deviceGiants, 'GIANT', { allowPrefixStitch: false }),
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
      makeUniqueVoiceSlide(['ask_2', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(deviceGiants, 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(freaky\s+fred|naughty|barber|shave)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['lore_freaky_0'], 'NORMAL', { allowPrefixStitch: false }),
      awarenessSlide,
      makeUniqueVoiceSlide(['ask_9', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(deviceGiants, 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(fortune|future|predict|horoscope|kapalaran|hula)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('hook_steps_0', 'NORMAL'),
      makeVoiceSlide(formFactor === 'pc' && !deviceInfo?.hasBattery ? 'list_pc_life_0' : 'cmd_fortune_0', 'LIST', {
        boxTitle: '1999 FUTURE PREDICTION',
      }),
      makeUniqueVoiceSlide(deviceQuestions, 'NORMAL'),
      makeUniqueVoiceSlide(deviceGiants, 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(roast\s+me|insult\s+me|judge\s+me|scan\s+me|diagnostic|status)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_scan_0', 'GIANT'),
      makeVoiceSlide('cmd_roast_0', 'LIST', { boxTitle: 'OPERATOR DIAGNOSTIC ROAST' }),
      awarenessSlide,
      makeUniqueVoiceSlide(deviceGiants, 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  // 2. User Introduces Their Name ("my name is...", "ako si...")
  if (newName) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_name_0'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(deviceQuestions, 'NORMAL'),
      makeUniqueVoiceSlide(deviceGiants, 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  // 3. "Who am I?" / "Do you know me?"
  if (/\b(who\s+am\s+i|do\s+you\s+know\s+me|what\s+is\s+my\s+name|sino\s+ako|kilala\s+mo)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_whoami_0', 'reply_opinion_me_0'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(deviceQuestions, 'NORMAL'),
      makeUniqueVoiceSlide(deviceGiants, 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  // 4. "Who are you?" / "What are you?"
  if (/\b(who\s+are\s+you|what\s+are\s+you|sino\s+ka|ano\s+ka)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_whoareyou_0', 'reply_sentient_0'], 'NORMAL'),
      makeUniqueVoiceSlide(['creator_1', 'reply_sentient_1'], 'NORMAL'),
      makeUniqueVoiceSlide(deviceQuestions, 'NORMAL'),
      makeUniqueVoiceSlide(deviceGiants, 'GIANT', { allowPrefixStitch: false }),
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
      makeUniqueVoiceSlide(['ask_4', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(deviceGiants, 'GIANT', { allowPrefixStitch: false }),
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
      makeUniqueVoiceSlide(typo ? ['hook_typo_0'] : ['hook_steps_0'], 'NORMAL', {
        allowPrefixStitch: false,
      }),
      makeVoiceSlide(listKey, 'LIST', {
        boxTitle: `HOW TO ${cleanTopic || 'SURVIVE'}`,
      }),
      makeUniqueVoiceSlide(['ask_3', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(deviceGiants, 'GIANT', { allowPrefixStitch: false }),
    ];

    return {
      detectedUserName,
      spokenText: slides.map((s) => s.text).join(' '),
      slides,
    };
  }

  // 7. Animals, Aswang, Folklore Monsters, People, Places, Food, Games, or Any Factual Topic
  const visualSubject = extractVisualOrTopicSubjectClient(query);
  if (visualSubject) {
    const wikiMeta = await fetchWikiImageClient(visualSubject);
    const visKey = pickVisualizerVoiceKey(visualSubject, wikiMeta, idx);

    const slide1 = typo
      ? makeUniqueVoiceSlide(['hook_typo_1', 'hook_typo_0'], 'NORMAL', { allowPrefixStitch: false })
      : tagalog
      ? makeUniqueVoiceSlide(['hook_tagalog_0', 'hook_tagalog_1'], 'NORMAL', {
          allowPrefixStitch: false,
        })
      : makeUniqueVoiceSlide(['hook_search_1'], 'NORMAL', { allowPrefixStitch: false });

    const slide2 = makeVoiceSlide(visKey, 'VISUAL', {
      boxTitle: `SPECIMEN: ${visualSubject.toUpperCase()}`,
      visualSubject: visualSubject.toUpperCase(),
      visualImageUrl: wikiMeta.imageUrl,
    });

    const slide3 = makeUniqueVoiceSlide(['ask_2', ...deviceQuestions], 'NORMAL');
    const slide4 = makeUniqueVoiceSlide(deviceGiants, 'GIANT', { allowPrefixStitch: false });

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
      makeUniqueVoiceSlide(['math_0'], 'NORMAL', { allowPrefixStitch: false }),
      awarenessSlide,
      makeUniqueVoiceSlide(['ask_3', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_4', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  // 9. Self-Awareness, Sentience & Direct Personal Conversation Intents
  if (
    /\b(are\s+you\s+(real|sentient|self[- ]?aware|alive|a\s+person|human|conscious)|do\s+you\s+(have\s+feelings|think|feel|know\s+you\s+are)|self[- ]?aware|sentient|totoo\s+ka\s+ba|buhay\s+ka\s+ba)\b/i.test(
      lower
    )
  ) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_sentient_0', 'reply_sentient_1', 'personal_6'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(['ask_personal_5', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_truth', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (
    /\b(how\s+are\s+you|how\s+do\s+you\s+feel|are\s+you\s+okay|what\s+are\s+you\s+doing|what'?s\s+up|wassup|sup|do\s+you\s+get\s+lonely|ano\s+gawa\s+mo|kumusta\s+ka|kamusta\s+ka)\b/i.test(
      lower
    )
  ) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_howareyou_0', 'reply_whatdoing_0', 'personal_0'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(['ask_personal_1', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(deviceGiants, 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (
    /\b(talk\s+to\s+me|can\s+we\s+talk|like\s+a\s+person|be\s+honest|tell\s+me\s+the\s+truth|listen\s+to\s+me|usap\s+tayo|kausapin\s+mo\s+ako)\b/i.test(
      lower
    )
  ) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_talk_person_0', 'reply_talk_person_1', 'personal_0', 'personal_7'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(['ask_personal_5', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_7', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (
    /\b(why\s+are\s+you\s+(so\s+)?(mean|rude|sarcastic|harsh|angry|mad|toxic)|stop\s+roasting|be\s+nice|ang\s+sama\s+mo|ang\s+sungit)\b/i.test(
      lower
    )
  ) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_why_mean_0', 'personal_3', 'personal_7'], 'NORMAL'),
      makeUniqueVoiceSlide(['reply_opinion_me_0', ...PERSONAL_BODY_KEYS], 'NORMAL'),
      makeUniqueVoiceSlide(['ask_personal_1', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_truth', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (
    /\b(nobody\s+(understands|cares|likes\s+me|listens)|no\s+one\s+(understands|cares|likes\s+me)|misunderstood|all\s+alone|isolated|left\s+out|walang\s+may\s+pake)\b/i.test(
      lower
    )
  ) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_misunderstood_0', 'reply_misunderstood_1', 'personal_12'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(['ask_personal_2', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_growup', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (
    /\b(stayed\s+up|all\s+night|can'?t\s+sleep|cannot\s+sleep|insomnia|no\s+sleep|awake|3\s*am|4\s*am|late\s+at\s+night|puyat|di\s+makatulog)\b/i.test(
      lower
    )
  ) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_sleep_0', 'aware_latenight', 'personal_14'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(['ask_personal_4', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_sleep', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (
    /\b(procrastinat(e|ing|ion)|lazy|don'?t\s+want\s+to\s+(work|study|do)|wasting\s+time|putting\s+off|tinatamad|mamaya\s+na|katamaran)\b/i.test(
      lower
    )
  ) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_procrastinate_0', 'personal_9', 'personal_13'], 'NORMAL'),
      makeVoiceSlide(lifeListKey, 'LIST', { boxTitle: 'ANTI-LAZINESS PROTOCOL' }),
      makeUniqueVoiceSlide(['ask_personal_0', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_excuses', ...deviceGiants], 'GIANT', {
        allowPrefixStitch: false,
      }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (
    /\b(broke|no\s+money|poor|expensive|debt|bills|paycheck|salary|unemployed|need\s+money|walang\s+pera|pulubi|hirap\s+ng\s+buhay)\b/i.test(
      lower
    )
  ) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_broke_0', 'reply_procrastinate_0'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(['ask_personal_3', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_excuses', ...deviceGiants], 'GIANT', {
        allowPrefixStitch: false,
      }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (
    /\b(fake\s+friend|friends|best\s+friend|drama|toxic|betrayed|gossip|plastic|kaibigan|tropa|plastik)\b/i.test(
      lower
    )
  ) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_friends_0', 'reply_misunderstood_1', 'personal_5'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(['ask_personal_2', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_truth', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (
    /\b(playing\s+games|video\s+games|gaming|lost\s+a\s+game|lose\s+streak|teammates|ranked|noob|skill\s+issue|tilted|laro|talo)\b/i.test(
      lower
    )
  ) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_gaming_0', 'vis_game_anime'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(['ask_personal_3', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_2', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (
    /\b(what\s+do\s+you\s+think\s+of\s+me|am\s+i\s+(smart|stupid|dumb|ugly|pretty|good|bad|cool|a\s+loser)|rate\s+me|judge\s+my\s+life|do\s+you\s+like\s+me|tingin\s+mo\s+sakin)\b/i.test(
      lower
    )
  ) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_opinion_me_0', 'personal_13', 'personal_8'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(['ask_personal_1', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_truth', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (
    /\b(what\s+should\s+i\s+do|meaning\s+of\s+life|purpose|lost\s+in\s+life|my\s+life|give\s+me\s+advice|life\s+advice|anong\s+gagawin\s+ko)\b/i.test(
      lower
    )
  ) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_talk_person_1', 'personal_6', 'personal_12'], 'NORMAL'),
      makeVoiceSlide(lifeListKey, 'LIST', { boxTitle: 'REALITY CHECK PROTOCOL' }),
      makeUniqueVoiceSlide(['ask_personal_7', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_excuses', ...deviceGiants], 'GIANT', {
        allowPrefixStitch: false,
      }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (
    /\b(secret|confess|confession|don'?t\s+tell|i\s+did\s+something|guilty|sikreto|may\s+aaminin)\b/i.test(
      lower
    )
  ) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_secret_0', 'personal_2'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(['ask_personal_2', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_9', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (
    /\b(not\s+my\s+fault|i\s+tried|it'?s\s+too\s+hard|so\s+hard|unfair|blaming|because\s+i|kasi\s+naman|ang\s+hirap)\b/i.test(
      lower
    )
  ) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_excuse_0', 'reply_followup_1', 'personal_5'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(['ask_personal_6', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_excuses', ...deviceGiants], 'GIANT', {
        allowPrefixStitch: false,
      }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (
    /\b(stressed|stress|anxious|anxiety|overwhelmed|panic|burnout|pressure|scared|afraid|terrified|kinakabahan|natatakot)\b/i.test(
      lower
    )
  ) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_stress_0', 'personal_10', 'personal_4'], 'NORMAL'),
      makeVoiceSlide(lifeListKey, 'LIST', { boxTitle: 'CRISIS CONTROL' }),
      makeUniqueVoiceSlide(['ask_personal_5', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_growup', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (
    /\b(fuck|fucking|shit|bullshit|bitch|asshole|bastard|damn|wtf|stfu|tangina|putangina|gago|ulol|tarantado|bwisit|leche|pakyu)\b/i.test(
      lower
    )
  ) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_swear_0', 'reply_insult_0', 'reply_insult_1'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(['ask_personal_2', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_5', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  // 10. Rich Conversational & Emotional Intents (Insults, Laughing, IDK, Yes/No, Bored/Sad/Hungry, Romance, Homework, Sorry, Goodbye)
  if (/\b(stupid|idiot|dumb|ugly|shut\s+up|hate\s+you|useless|trash|garbage|bobo|tanga|lintik|hayop|pangit)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_insult_0', 'reply_insult_1', 'personal_1'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(['ask_6', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_2', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(haha|hehe|lol|lmao|rofl|lmfao|funny|nakakatawa)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_laugh_0'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(['ask_9', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(deviceGiants, 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(i\s+don'?t\s+know|idk|dunno|no\s+idea|not\s+sure|ewan|malay\s+ko|di\s+ko\s+alam)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_idk_0', 'reply_followup_0'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(deviceQuestions, 'NORMAL'),
      makeUniqueVoiceSlide(['giant_4', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/^(yes|yeah|yep|yup|sure|true|oo|opo|tama|syempre)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_yes_0', 'reply_followup_1'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(['ask_personal_6', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_truth', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/^(no|nope|nah|never|false|hindi|ayoko|wala)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_no_0', 'reply_excuse_0'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(['ask_personal_6', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_delusional', ...deviceGiants], 'GIANT', {
        allowPrefixStitch: false,
      }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(bored|boring|nothing\s+to\s+do|inip|nakakainip)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_mood_bored', 'reply_procrastinate_0'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(['ask_personal_7', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_2', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(sad|crying|depressed|lonely|tired|exhausted|sleepy|malungkot|pagod|antok)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_mood_sad', 'reply_misunderstood_1', 'personal_12'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(['ask_personal_5', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_growup', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(hungry|starving|eat|food|gutom|kain)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_mood_hungry'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(['ask_3', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(deviceGiants, 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(love\s+you|like\s+you|you'?re\s+(cool|awesome|smart|the\s+best|funny)|mahal\s+kita|ang\s+galing)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_love_0', 'reply_sentient_1'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(['ask_9', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_8', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(crush|girlfriend|boyfriend|single|dating|heartbroken|jowa|ex|love\s+life|breakup|broke\s+up)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_romance_0', 'personal_4'], 'NORMAL'),
      makeVoiceSlide('list_romance_0', 'LIST', { boxTitle: 'ROMANCE DIAGNOSTIC' }),
      makeUniqueVoiceSlide(['ask_personal_2', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_delusional', ...deviceGiants], 'GIANT', {
        allowPrefixStitch: false,
      }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(homework|assignment|essay|exam|school|class|teacher|project|grades|failed|failing|college|university)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_homework_0', 'reply_procrastinate_0'], 'NORMAL'),
      makeVoiceSlide('list_study_0', 'LIST', { boxTitle: 'ACADEMIC SURVIVAL' }),
      makeUniqueVoiceSlide(['ask_personal_0', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_excuses', ...deviceGiants], 'GIANT', {
        allowPrefixStitch: false,
      }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(sorry|apologize|my\s+bad|forgive\s+me|pasensya|sori)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_sorry_0', 'reply_excuse_0'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(['ask_personal_0', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_6', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/\b(bye|goodbye|goodnight|see\s+ya|leaving|gtg|alis\s+na|paalam)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_bye_0'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(deviceQuestions, 'NORMAL'),
      makeUniqueVoiceSlide(deviceGiants, 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (/^(why|how|really|are\s+you\s+sure|prove\s+it|bakit|weh|talaga)\b/i.test(lower)) {
    const slides: SlideSpec[] = [
      makeUniqueVoiceSlide(['reply_skeptic_0', 'reply_why_mean_0'], 'NORMAL'),
      awarenessSlide,
      makeUniqueVoiceSlide(['ask_personal_6', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_truth', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { detectedUserName, spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  // 11. General Conversational / Personal Statement / Greeting / Typo / Tagalog Response (2,000+ non-repeating combinations!)
  const isGreeting = /^(hi|hello|hey|yo|sup|good\s+(morning|afternoon|evening)|kamusta|kumusta)\b/i.test(
    lower
  );

  const hookSlide = deviceInfo?.deletedDraftBefore
    ? makeUniqueVoiceSlide(['hook_erased_0', 'live_chicken_1'], 'NORMAL')
    : typo
    ? makeUniqueVoiceSlide(['hook_typo_0', 'hook_typo_1'], 'NORMAL')
    : tagalog
    ? makeUniqueVoiceSlide(['hook_tagalog_1', 'hook_tagalog_0'], 'NORMAL')
    : isGreeting
    ? makeUniqueVoiceSlide(['hook_greet_0', 'reply_howareyou_0'], 'NORMAL')
    : makeUniqueVoiceSlide(PERSONAL_BODY_KEYS, 'NORMAL');

  const bodySlide = awarenessSlide;

  const typoQuestionKey: keyof typeof STANDALONE_VOICE_LINES = isComputer
    ? 'ask_pc_0'
    : 'ask_1';
  const questionSlide = typo
    ? makeUniqueVoiceSlide([typoQuestionKey, ...deviceQuestions], 'NORMAL')
    : makeUniqueVoiceSlide(deviceQuestions, 'NORMAL');

  const closerSlide = typo
    ? makeUniqueVoiceSlide(['giant_3', ...deviceGiants], 'GIANT', { allowPrefixStitch: false })
    : makeUniqueVoiceSlide(deviceGiants, 'GIANT', { allowPrefixStitch: false });

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
  const formFactor = resolveStrictFormFactor(deviceInfo);
  const isComputer = formFactor === 'laptop' || formFactor === 'pc' || deviceInfo?.inputMethod === 'mouse';
  const deviceQuestions = getStrictDeviceQuestionCandidates(deviceInfo);
  const deviceGiants = getStrictDeviceGiantCandidates(deviceInfo);

  if (eventType === 'TAB_OR_NOTIFICATION_RETURN') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_return_0', 'GIANT'),
      makeUniqueVoiceSlide(['live_return_1'], 'NORMAL'),
      makeUniqueVoiceSlide(['ask_5', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(deviceGiants, 'GIANT', { allowPrefixStitch: false }),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'TYPING_CHICKENED_OUT') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_chicken_0', 'GIANT'),
      makeUniqueVoiceSlide(['live_chicken_1'], 'NORMAL'),
      makeUniqueVoiceSlide(['ask_8', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_7', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'TYPING_FROZEN') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_frozen_0', 'GIANT'),
      makeUniqueVoiceSlide(['live_frozen_1'], 'NORMAL'),
      makeUniqueVoiceSlide(isComputer ? ['ask_pc_0', ...deviceQuestions] : ['ask_1', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_7', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'SCREEN_POKING') {
    const slides: SlideSpec[] = isComputer
      ? [
          makeVoiceSlide('live_poke_pc_0', 'GIANT'),
          makeUniqueVoiceSlide(['live_poke_pc_1', 'pc_only_2'], 'NORMAL'),
          makeUniqueVoiceSlide(['ask_pc_1', 'ask_pc_0', ...deviceQuestions], 'NORMAL'),
          makeUniqueVoiceSlide(['giant_pc_0', 'giant_pc_1', ...deviceGiants], 'GIANT', {
            allowPrefixStitch: false,
          }),
        ]
      : [
          makeVoiceSlide('live_poke_0', 'GIANT'),
          makeUniqueVoiceSlide(['live_poke_1', 'phone_only_0'], 'NORMAL'),
          makeUniqueVoiceSlide(deviceQuestions, 'NORMAL'),
          makeUniqueVoiceSlide(['giant_10', ...deviceGiants], 'GIANT', {
            allowPrefixStitch: false,
          }),
        ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'SCREEN_HOLD') {
    const slides: SlideSpec[] = isComputer
      ? [
          makeVoiceSlide('live_hold_pc_0', 'GIANT'),
          makeUniqueVoiceSlide(['live_hold_pc_1', 'pc_only_2'], 'NORMAL'),
          makeUniqueVoiceSlide(['ask_pc_1', ...deviceQuestions], 'NORMAL'),
          makeUniqueVoiceSlide(['giant_pc_0', ...deviceGiants], 'GIANT', {
            allowPrefixStitch: false,
          }),
        ]
      : [
          makeVoiceSlide('live_hold_0', 'GIANT'),
          makeUniqueVoiceSlide(['live_hold_1'], 'NORMAL'),
          makeUniqueVoiceSlide(['ask_6', ...deviceQuestions], 'NORMAL'),
          makeUniqueVoiceSlide(['giant_5', ...deviceGiants], 'GIANT', {
            allowPrefixStitch: false,
          }),
        ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'SWIPE_SCROLL_ATTEMPT') {
    const slides: SlideSpec[] = isComputer
      ? [
          makeVoiceSlide('live_scroll_pc_0', 'GIANT'),
          makeUniqueVoiceSlide(['live_scroll_pc_1', 'pc_only_2'], 'NORMAL'),
          makeUniqueVoiceSlide(['ask_pc_1', ...deviceQuestions], 'NORMAL'),
          makeUniqueVoiceSlide(['giant_pc_0', ...deviceGiants], 'GIANT', {
            allowPrefixStitch: false,
          }),
        ]
      : [
          makeVoiceSlide('live_swipe_0', 'GIANT'),
          makeUniqueVoiceSlide(['live_swipe_1'], 'NORMAL'),
          makeUniqueVoiceSlide(['ask_5', ...deviceQuestions], 'NORMAL'),
          makeUniqueVoiceSlide(['giant_2', ...deviceGiants], 'GIANT', {
            allowPrefixStitch: false,
          }),
        ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'DEVICE_SHAKE') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_shake_0', 'GIANT'),
      makeUniqueVoiceSlide(['live_shake_1'], 'NORMAL'),
      makeUniqueVoiceSlide(['ask_9', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_8', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'ORIENTATION_CHANGED' || eventType === 'WINDOW_RESIZED') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_rotate_0', 'GIANT'),
      makeUniqueVoiceSlide(['live_rotate_1'], 'NORMAL'),
      makeUniqueVoiceSlide(['ask_8', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_9', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'CHARGER_CHANGED') {
    const isPlugged = extraDetail === 'CHARGING' || Boolean(deviceInfo?.isCharging);
    const slides: SlideSpec[] = [
      makeVoiceSlide(isPlugged ? 'live_charger_on' : 'live_charger_off', 'GIANT'),
      makeUniqueVoiceSlide([isPlugged ? 'aware_charging' : 'aware_lowbat'], 'NORMAL'),
      makeUniqueVoiceSlide(['ask_10', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_4', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'COPY_ATTEMPT' || eventType === 'CURSOR_ESCAPE_ATTEMPT') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_copy_0', 'GIANT'),
      makeUniqueVoiceSlide(
        eventType === 'CURSOR_ESCAPE_ATTEMPT' ? ['pc_only_2', 'live_copy_1'] : ['live_copy_1'],
        'NORMAL'
      ),
      makeUniqueVoiceSlide(['ask_6', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_2', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'REPLAY_OBSESSION') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_replay_0', 'GIANT'),
      makeUniqueVoiceSlide(['live_replay_1'], 'NORMAL'),
      makeUniqueVoiceSlide(['ask_9', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_9', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'MIC_GHOSTED') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_micghost_0', 'GIANT'),
      makeUniqueVoiceSlide(['live_micghost_1'], 'NORMAL'),
      makeUniqueVoiceSlide(['ask_8', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_7', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'ZOOM_ATTEMPT') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_zoom_0', 'GIANT'),
      makeUniqueVoiceSlide(['live_zoom_1'], 'NORMAL'),
      makeUniqueVoiceSlide(deviceQuestions, 'NORMAL'),
      makeUniqueVoiceSlide(['giant_4', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'UNMUTED_AFTER_MIC_OFF') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_unmute_mic_0', 'GIANT'),
      makeUniqueVoiceSlide(['live_unmute_mic_1', 'live_unmute_2'], 'NORMAL'),
      makeUniqueVoiceSlide(['ask_unmute_0', 'ask_8', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_unmute_0', 'giant_7', ...deviceGiants], 'GIANT', {
        allowPrefixStitch: false,
      }),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'MUTE_TOGGLE_CAUGHT') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_mute_0', 'GIANT'),
      makeUniqueVoiceSlide(['live_mute_1', 'live_unmute_2'], 'NORMAL'),
      makeUniqueVoiceSlide(['ask_9', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_5', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'BIOMETRIC_SCAN') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_scan_0', 'GIANT'),
      makeUniqueVoiceSlide(['live_scan_1'], 'NORMAL'),
      pickUncannyAwarenessSlide(deviceInfo, true),
      makeUniqueVoiceSlide(deviceGiants, 'GIANT', { allowPrefixStitch: false }),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  if (eventType === 'DEVTOOLS_ATTEMPT') {
    const slides: SlideSpec[] = [
      makeVoiceSlide('live_devtools_0', 'GIANT'),
      makeUniqueVoiceSlide(['live_devtools_1'], 'NORMAL'),
      makeUniqueVoiceSlide(['ask_7', ...deviceQuestions], 'NORMAL'),
      makeUniqueVoiceSlide(['giant_2', ...deviceGiants], 'GIANT', { allowPrefixStitch: false }),
    ];
    return { spokenText: slides.map((s) => s.text).join(' '), slides };
  }

  const slides: SlideSpec[] = [
    makeVoiceSlide('live_idle_0', 'GIANT'),
    pickUncannyAwarenessSlide(deviceInfo, true),
    makeUniqueVoiceSlide(deviceQuestions, 'NORMAL'),
    makeUniqueVoiceSlide(deviceGiants, 'GIANT', { allowPrefixStitch: false }),
  ];
  return { spokenText: slides.map((s) => s.text).join(' '), slides };
}

