import { ChannelType, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { flush, getGuild, touch } from './store.js';

export const commands = [
  new SlashCommandBuilder().setName('rank').setDescription('Your level, or someone else\'s').addUserOption((o) => o.setName('user').setDescription('Whose')),
  new SlashCommandBuilder().setName('leaderboard').setDescription('The top members'),
  new SlashCommandBuilder()
    .setName('levels')
    .setDescription('Level settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('channel').setDescription('Where level-ups are announced').addChannelOption((o) => o.setName('channel').setDescription('The channel; leave it out to announce where the message was').addChannelTypes(ChannelType.GuildText)))
    .addSubcommand((s) => s.setName('ignore').setDescription('A channel that gives no experience').addChannelOption((o) => o.setName('channel').setDescription('The channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand((s) => s.setName('unignore').setDescription('A channel gives experience again').addChannelOption((o) => o.setName('channel').setDescription('The channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand((s) => s.setName('reset').setDescription('Reset a member to zero').addUserOption((o) => o.setName('user').setDescription('Whose').setRequired(true))),
].map((c) => c.toJSON());

const COOLDOWN_MS = 60_000;

/** Experience needed to go from this level to the next. */
export const xpForLevel = (level) => 5 * level * level + 50 * level + 100;

/** The level a total amount of experience amounts to, and the progress inside it. */
export function levelOf(totalXp) {
  let level = 0;
  let rest = totalXp;
  while (rest >= xpForLevel(level)) {
    rest -= xpForLevel(level);
    level++;
  }
  return { level, into: rest, needed: xpForLevel(level) };
}

export async function onMessage(message) {
  if (!message.guild || message.author.bot) return;
  const settings = await getGuild(message.guild.id);
  if (settings.ignored.includes(message.channelId)) return;
  const member = (settings.members[message.author.id] ??= { xp: 0, last: 0, messages: 0 });
  const now = Date.now();
  member.messages++;
  if (now - member.last < COOLDOWN_MS) {
    touch();
    return;
  }
  const before = levelOf(member.xp).level;
  member.xp += 15 + Math.floor(Math.random() * 11);
  member.last = now;
  touch();
  const after = levelOf(member.xp).level;
  if (after > before) {
    const channel = (settings.channelId && message.guild.channels.cache.get(settings.channelId)) || message.channel;
    await channel.send({ content: `<@${message.author.id}> reached level **${after}**.` }).catch(() => {});
  }
}

export async function handleCommand(interaction) {
  const settings = await getGuild(interaction.guildId);

  if (interaction.commandName === 'rank') {
    const user = interaction.options.getUser('user') ?? interaction.user;
    const member = settings.members[user.id] ?? { xp: 0, messages: 0 };
    const { level, into, needed } = levelOf(member.xp);
    const rank = Object.entries(settings.members).sort((a, b) => b[1].xp - a[1].xp).findIndex(([id]) => id === user.id) + 1;
    const filled = Math.round((into / needed) * 20);
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ size: 64 }) })
          .setColor(0x5865f2)
          .addFields(
            { name: 'Level', value: String(level), inline: true },
            { name: 'Rank', value: rank ? `#${rank}` : '-', inline: true },
            { name: 'Messages', value: String(member.messages ?? 0), inline: true },
            { name: 'Progress', value: `${'█'.repeat(filled)}${'░'.repeat(20 - filled)} ${into} / ${needed} XP` },
          ),
      ],
    });
    return;
  }

  if (interaction.commandName === 'leaderboard') {
    const top = Object.entries(settings.members).sort((a, b) => b[1].xp - a[1].xp).slice(0, 10);
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`Top members of ${interaction.guild.name}`)
          .setColor(0xfee75c)
          .setDescription(top.length ? top.map(([id, m], i) => `**${i + 1}.** <@${id}>, level ${levelOf(m.xp).level} (${m.xp} XP)`).join('\n') : 'Nobody has chatted yet.'),
      ],
    });
    return;
  }

  const sub = interaction.options.getSubcommand();
  if (sub === 'channel') {
    const channel = interaction.options.getChannel('channel');
    settings.channelId = channel ? channel.id : null;
    touch();
    await flush();
    await interaction.reply({ content: channel ? `Level-ups are announced in <#${channel.id}>.` : 'Level-ups are announced where the message was.', ephemeral: true });
  } else if (sub === 'ignore' || sub === 'unignore') {
    const channel = interaction.options.getChannel('channel');
    settings.ignored = settings.ignored.filter((id) => id !== channel.id);
    if (sub === 'ignore') settings.ignored.push(channel.id);
    touch();
    await flush();
    await interaction.reply({ content: sub === 'ignore' ? `<#${channel.id}> gives no experience.` : `<#${channel.id}> gives experience again.`, ephemeral: true });
  } else if (sub === 'reset') {
    const user = interaction.options.getUser('user');
    delete settings.members[user.id];
    touch();
    await flush();
    await interaction.reply({ content: `${user.username} starts over at level 0.`, ephemeral: true });
  }
}
