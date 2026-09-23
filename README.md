# FadeHost Level Bot

Members earn experience for chatting (once a minute at most), climb levels, and see where they stand with `/rank` and `/leaderboard`. Level-ups are announced.

## Setup on FadeHost
1. Create a bot at https://discord.com/developers/applications: New Application, Bot, Reset Token.
2. Under Bot, Privileged Gateway Intents, turn on **Message Content Intent** (messages never arrive without it).
3. Invite it with the `bot` and `applications.commands` scopes and the **Send Messages** and **Embed Links** permissions.
4. In your FadeHost panel, deploy the **Level Bot** template and paste the token as `DISCORD_TOKEN`.
5. Optional, in Discord: `/levels channel #level-ups`, `/levels ignore #bot-spam`.

## Commands
| Command | What it does |
|---|---|
| `/rank [user]` | Level, rank, message count and progress. |
| `/leaderboard` | The top ten members. |
| `/levels channel [#channel]` | Where level-ups are announced; leave it out to announce in place. |
| `/levels ignore #channel` and `/levels unignore` | Channels that give no experience. |
| `/levels reset user` | A member starts over. |

Each message worth experience gives 15 to 25 XP; a level needs `5 × level² + 50 × level + 100` XP, so level 10 is about 4,700 XP.

## Environment variables
| Variable | Default | What it does |
|---|---|---|
| `DISCORD_TOKEN` | | **Required.** Your bot token. |
| `LEVELUP_CHANNEL_ID` | | Optional default channel for level-up messages. |

Experience is saved to the bot's persistent storage every fifteen seconds and on shutdown, so it survives restarts.

Built and maintained by [FadeHost](https://fadehost.com). MIT licensed.
