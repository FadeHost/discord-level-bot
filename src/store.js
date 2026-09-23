import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

// Experience and settings persist to the FadeHost bot's /data volume.
// Writes are batched: a busy server chats faster than a disk should be hit.
const DATA_FILE = process.env.CONFIG_PATH || '/data/levels.json';

let cache = null;
let dirty = false;

export async function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(await readFile(DATA_FILE, 'utf8'));
  } catch {
    cache = { guilds: {} };
  }
  setInterval(() => void flush(), 15_000).unref();
  return cache;
}

export function touch() {
  dirty = true;
}

export async function flush() {
  if (!dirty || !cache) return;
  dirty = false;
  try {
    await mkdir(dirname(DATA_FILE), { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(cache));
  } catch (err) {
    dirty = true;
    console.error('[level-bot] could not save:', err.message);
  }
}

export async function getGuild(guildId) {
  const data = await load();
  if (!data.guilds[guildId]) {
    data.guilds[guildId] = {
      channelId: (process.env.LEVELUP_CHANNEL_ID || '').trim() || null,
      ignored: [],
      members: {},
    };
    touch();
  }
  return data.guilds[guildId];
}
