import { Client, GatewayIntentBits, Events, REST, Routes } from 'discord.js';
import { commands, handleCommand, onMessage } from './src/levels.js';
import { flush } from './src/store.js';

const token = (process.env.DISCORD_TOKEN || '').trim();
if (!token) {
  console.error('[level-bot] DISCORD_TOKEN is not set. Add your bot token in the FadeHost panel, under Environment variables.');
  process.exit(1);
}

// Message Content is a privileged intent: turn it on under Bot, Privileged
// Gateway Intents in the Discord Developer Portal, or messages never arrive.
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once(Events.ClientReady, async (c) => {
  console.log(`[level-bot] online as ${c.user.tag} in ${c.guilds.cache.size} server(s)`);
  c.user.setActivity('the chat', { type: 3 });
  try {
    await new REST().setToken(token).put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log('[level-bot] slash commands registered');
  } catch (err) {
    console.error('[level-bot] failed to register commands:', err.message);
  }
});

client.on(Events.MessageCreate, (message) => {
  onMessage(message).catch((err) => console.error('[level-bot] message error:', err.message));
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  try {
    await handleCommand(interaction);
  } catch (err) {
    console.error('[level-bot] command error:', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Something went wrong.', ephemeral: true }).catch(() => {});
    }
  }
});

client.login(token).catch((error) => {
  if (String(error.code) === 'TokenInvalid' || String(error).includes('TOKEN_INVALID')) {
    console.error('[level-bot] Discord rejected DISCORD_TOKEN. Reset it at discord.com/developers, your app, Bot, Reset Token; paste the new one under Environment variables in the FadeHost panel and restart.');
  } else if (String(error.code) === 'DisallowedIntents' || String(error).includes('disallowed intents')) {
    console.error('[level-bot] Discord refused the Message Content intent. Open discord.com/developers, your app, Bot, Privileged Gateway Intents, turn on MESSAGE CONTENT INTENT and restart the bot.');
  } else {
    console.error(`[level-bot] Could not log in to Discord: ${error.message}`);
  }
  process.exit(1);
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, async () => {
    await flush();
    client.destroy();
    process.exit(0);
  });
}
