import fs from 'fs';
import path from 'path';

const API_KEY = 'sk-fish-iZGf1RCO8mMM6o_D5uxnv2rizuVblIWPrJJIHfGf5N8';
const MODEL_ID = '79254f4e9a3a4f78b45ca82344139c7c';

const ACRONYMS = new Set([
  'PC',
  'CRT',
  'RAM',
  'CPU',
  'IQ',
  'AI',
  'OS',
  'BIOS',
  'ROM',
  'USB',
  'TV',
  'ID',
  'OK',
  'UI',
]);

export function sanitizeTextForTts(raw) {
  let s = String(raw || '')
    .replace(/:\)|:-\)|:\(|;-\)|;\)/g, '')
    .replace(/\b1\.\s*/g, 'First: ')
    .replace(/\b2\.\s*/g, 'Second: ')
    .replace(/\b3\.\s*/g, 'Third: ')
    .replace(/\.{3,}/g, '... ');

  // Double newline is a dramatic clause break — never duplicate existing terminal punctuation
  s = s.replace(/([^\n])\n\s*\n+/g, (_, prev) => {
    return /[.?!,:;—-]/.test(prev) ? `${prev} ` : `${prev}. `;
  });

  // Single newline is a visual CRT line wrap — replace with a space (never inject a mid-phrase period!)
  s = s.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

  // Convert uppercase words to natural lowercase (except real acronyms) so Fish Audio BPE never clips ALL-CAPS words
  s = s.replace(/\b([A-Z]+(?:'[A-Z]+)?)\b/g, (word) => {
    if (ACRONYMS.has(word)) return word;
    if (word.length === 1 && word !== 'A' && word !== 'I') return word;
    return word.toLowerCase();
  });

  // Capitalize first letter of string and after sentence-ending punctuation
  s = s.replace(/(^|[.?!]\s+)([a-z])/g, (_, prefix, ch) => prefix + ch.toUpperCase());

  // Capitalize standalone I / I'm / I've / I'll / I'd and proper noun Ren
  s = s
    .replace(/\bi((?:'m|'ve|'ll|'d)?)\b/g, (_, suffix) => 'I' + suffix.toLowerCase())
    .replace(/\bren\b/gi, 'Ren');

  // Ensure Fish Audio S2 articulates both "Back" and "again?" clearly with a natural pause
  s = s.replace(/\bBack again\?/g, 'Back, again?');

  // Ensure terminal punctuation if stripped by ':)'
  if (s && !/[.?!]$/.test(s)) {
    s += '.';
  }

  return s;
}

function loadVoiceLinesFromStandaloneEngine() {
  const seSrc = fs.readFileSync(path.resolve('src/utils/standaloneEngine.ts'), 'utf8');
  const startIdx = seSrc.indexOf('export const STANDALONE_VOICE_LINES');
  const endIdx = seSrc.indexOf('export const REACTION_PREFIX_KEYS');
  const block = seSrc.slice(startIdx, endIdx);
  const map = {};
  const re = /^\s*'?([a-z0-9_]+)'?:\s*\n?\s*(['"])((?:\\.|(?!\2).)*)\2/gm;
  let m;
  while ((m = re.exec(block)) !== null) {
    map[m[1]] = m[3]
      .replace(/\\n/g, '\n')
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"');
  }
  return map;
}

export const VOICE_LINES = loadVoiceLinesFromStandaloneEngine();

// Rebuild all keys that had text updates OR were previously synthesized with ALL-CAPS / broken newline punctuation
const FORCE_REBUILD_KEYS = new Set([
  // Boot & Giant & Multi-line / ALL-CAPS lines (so Fish Audio pronounces every single word!)
  'boot_0',
  'boot_3',
  'boot_return_0',
  'boot_return_2',
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
  'giant_sleep',
  'giant_excuses',
  'giant_growup',
  'giant_delusional',
  'giant_truth',
  'giant_phone_0',
  'giant_tablet_0',
  'giant_laptop_0',
  'giant_pc_0',
  'giant_pc_1',
  'giant_unmute_0',
  'creator_0',
  'lore_slab_0',
  'live_return_0',
  'live_chicken_0',
  'live_frozen_0',
  'live_poke_0',
  'live_hold_0',
  'live_swipe_0',
  'live_shake_0',
  'live_rotate_0',
  'live_charger_on',
  'live_charger_off',
  'live_copy_0',
  'live_replay_0',
  'live_micghost_0',
  'live_idle_0',
  'live_zoom_0',
  'live_mute_0',
  'live_unmute_mic_0',
  'live_scan_0',
  'live_devtools_0',
  'live_poke_pc_0',
  'live_hold_pc_0',
  'live_scroll_pc_0',
  // All 59 keys whose text in standaloneEngine.ts was updated
  'hook_typo_0',
  'hook_typo_1',
  'hook_compare_0',
  'aware_latenight',
  'aware_morning',
  'aware_evening',
  'aware_pc',
  'aware_pwa',
  'aware_backspace',
  'aware_slowtype',
  'aware_fasttype',
  'aware_pasted',
  'aware_caps',
  'vis_general_1',
  'reply_laugh_0',
  'reply_mood_hungry',
  'ask_1',
  'ask_3',
  'ask_5',
  'ask_10',
  'body_chat_0',
  'live_chicken_1',
  'live_poke_1',
  'live_micghost_1',
  'live_unmute_mic_1',
  'live_unmute_2',
  'ask_unmute_0',
  'live_scan_1',
  'lore_freaky_0',
  'cmd_roast_0',
  'reply_talk_person_0',
  'reply_broke_0',
  'reply_gaming_0',
  'reply_secret_0',
  'reply_swear_0',
  'ask_personal_3',
  'ask_tablet_0',
  'laptop_only_0',
  'laptop_only_1',
  'laptop_only_3',
  'boot_pc_1',
  'pc_only_1',
  'pc_only_2',
  'pc_only_3',
  'pc_only_4',
  'ask_pc_0',
  'ask_pc_1',
  'live_poke_pc_1',
  'live_hold_pc_1',
  'live_scroll_pc_1',
  'prefix_13',
  'personal_2',
  'personal_7',
]);

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
      await new Promise((r) => setTimeout(r, 400));
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
  const toFetch = entries.filter(([k]) => !bank[k] || FORCE_REBUILD_KEYS.has(k));
  console.log(
    `Loaded ${entries.length} lines from standaloneEngine.ts. Reusing ${
      entries.length - toFetch.length
    } existing clips, regenerating ${toFetch.length} clips...`
  );

  const concurrency = 3;
  let index = 0;

  async function worker() {
    while (index < toFetch.length) {
      const current = index++;
      const [key, text] = toFetch[current];
      const clean = sanitizeTextForTts(text);
      const b64 = await synthLine(key, text);
      if (b64) {
        bank[key] = b64;
        console.log(`[OK] ${key} (${Math.round(b64.length / 1024)} KB b64) -> "${clean}"`);
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
