import { ActionRowBuilder, ChatInputCommandInteraction, ComponentType, EmbedBuilder, MessageFlags, SelectMenuBuilder, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { EMOJI, GetEmoji, GetEmojiID } from "../../util/emoji";
import {LangGetAutoTranslatedStringRaw} from "../../util/language";


const FirstPage = 
`
# Welcome to okabot!
Choose a menu below to see information!

:grey_exclamation: okabot just went publicly available! There may be some bugs!
If you encounter any, please report them [here](<https://github.com/okawaffles/okabot/issues/new>)!

Join the official okabot Discord: discord.gg/2yznVpbuCw
`

const CurrencyPage =
`
# The okash Currency
${GetEmoji(EMOJI.OKASH)} okash is okabot's currency. It can be earned by playing games,
leveling up, claiming your daily rewards, and more!

You can use okash in the shop to buy items or cosmetics.
`

const GamesPage =
`
# okash Games (page 1)
## Coinflip
Bet some okash and flip a coin for a 50/50 chance at doubling your money.
You can earn a one-time-use weighted coin from claiming your daily, 
which gives you a 70/30 chance of landing on heads!
## Blackjack
Bet some okash on a game of Blackjack for a chance at doubling or tripling your money.
In Blackjack, you and okabot start with two cards each. Your goal is to get to 21.
But be careful! If you go over 21, you lose! 
okabot must draw to at least 17 and then stand. You have these options:
- Hit: Get another card (unavailable if you have a Blackjack).
- Stand: Finish drawing and show the game results.
- Double Down: Only available on the first hit. You will double your money and draw one card, then you must stand.
Winning will double your bet, winning with a Blackjack hand will give you 3x your bet, and tying will refund you.
-# requires a Discord client which supports message components
`

const GamesPage2 = 
`
# okash Games (page 2)
## Roulette
Bet some okash on a roulette spin.
You can bet on numbers, sections, or a color.
The lower the chance of winning, the higher the reward!
-# requires a Discord client which supports message components
## Slots
Bet some okash on a slots game.
This is by far the most profitable gambling game.
You can win up to a 50x your bet if you get lucky!
`

const DailyRewardPage =
`
# Daily Rewards
Every 24 hours, you can claim your daily reward.
In your daily reward, you are guaranteed OKA**1500** and a weighted coin.
For each day in your daily reward streak, you gain 5% more okash, up to 200%.
`

const LevelPage = 
`
# The okabot Level System
Talking in the server and playing games all give you XP.
This XP will help you level up.
Levels 1-100 have unlockable titles which show on your /level banner.
When you level up, you will get a small okash reward and a lootbox, increasing with each level.
Levels such as 1, 2, 3... give a <:package:0> **Common Lootbox**
Levels such as 5, 15, 25... give a <:package:0> **Rare Lootbox**
Levels such as 10, 20, 30... give a <:package:0> <:sparkle:0> **EX Lootbox** <:sparkle:0>
`

const DropsPage = 
`
# Drops
Each message you send in the server has a chance of gaining you a random drop.
These drops include:
- Lootboxes
- okash Drops
Lootboxes include okash rewards, customizations, and Shop Vouchers, which can be used to get a free customization\*
okash Drops are either small or large. Small drops are less okash but more common, 
whereas large drops are more okash but less common.
-# \*Some rarer customizations cannot be unlocked via Shop Vouchers.
`


const EarthquakePage = 
`
# Earthquakes
## Auto Reports (CATGIRL CENTRAL-exclusive feature):
okabot is connected to [Project DM-D.S.S](<https://dmdata.jp>) to get live earthquake information.
When a new one is detected, a message is sent in <#1313343448354525214>
## Magnitude vs Shindo (try /recent-eq)
okabot shows both the earthquake magnitude and Shindo level. So what's the difference?
The magnitude of an earthquake is the educated estimation of the intensity at the epicenter.
The Shindo level is a recorded intensity felt at a station (listed as "Maximum Intensity").
okabot will show the maxmimum recorded Shindo intensity on the embed. Shindo is the most
common method of showing intensity in Japanese earthquake research.

You see the difference between the levels [here](<https://www.data.jma.go.jp/multi/quake/quake_advisory.html>).
`

const PetsPage =
`
# Pets
okabot has a pets feature where you can adopt an animal of your choice and take care of it.
You may adopt as many pets as you wish, but you must level up your most recent pet to level 25 before you can adopt another.
The Bunny pet is a supporter-exclusive pet. You must either support on Ko-Fi or boost CATGIRL CENTRAL.

Pets are unique. They each are assigned a seed which determines their most-liked and most-disliked foods.
Be careful! If you neglect a pet for 3 days or more and they're under level 25, they'll run away!
Pets can do some special things! If you take care of them enough, they might surprise you with something!
`


const ExtraPage =
`
# Extra info
okabot is created with the intent to be free and fun. 
If you want to support me and his development, you can do so [here](<https://ko-fi.com/okawaffles>).

okabot is available in English and Japanese. It will reflect your Discord language. 
Not all features are 100% translated, and some translations may be inaccurate.
If you would like to help translate okabot into another language, please contact okawaffles.

okabot was originally intended to be an exclusive bot for a specific server.
I'm in the process of converting it to be able to be used in any server.
If there are any bugs you encounter, please report them [here](<https://github.com/okawaffles/okabot/issues/new>)!

Thanks for using okabot, it really does mean a lot to me ${GetEmoji(EMOJI.NEKOHEART)}
`


const select_menu = new StringSelectMenuBuilder()
    .setCustomId('page')
    .setPlaceholder('Select a page')
    .addOptions(
        new StringSelectMenuOptionBuilder()
            .setLabel('okash')
            .setDescription('Get information on okash')
            .setValue('okash')
            .setEmoji(GetEmojiID(EMOJI.OKASH)),

        new StringSelectMenuOptionBuilder()
            .setLabel('Earthquakes')
            .setDescription('Get information on the earthquake information system')
            .setValue('earthquakes')
            .setEmoji('🌏'),

        new StringSelectMenuOptionBuilder()
            .setLabel('Games (1/2)')
            .setDescription('Get information on okabot games')
            .setValue('games')
            .setEmoji('🎲'),
        new StringSelectMenuOptionBuilder()
            .setLabel('Games (2/2)')
            .setDescription('Get information on okabot games')
            .setValue('games2')
            .setEmoji('🎲'),
        
        new StringSelectMenuOptionBuilder()
            .setLabel('Daily Rewards')
            .setDescription('Get information on the daily reward')
            .setValue('daily')
            .setEmoji('📅'),
        
        new StringSelectMenuOptionBuilder()
            .setLabel('Leveling')
            .setDescription('Get information on the leveling system')
            .setValue('level')
            .setEmoji('⬆️'),
        
        new StringSelectMenuOptionBuilder()
            .setLabel('Drops')
            .setDescription('Get information on how drops work')
            .setValue('drops')
            .setEmoji('📦'),

        new StringSelectMenuOptionBuilder()
            .setLabel('Pets')
            .setDescription('Get information on how pets work')
            .setValue('pets')
            .setEmoji('🦊'),

        new StringSelectMenuOptionBuilder()
            .setLabel('Extra')
            .setDescription('See some extra information')
            .setValue('extra')
            .setEmoji('❓'),
    )

export async function HandleCommandHelp(interaction: ChatInputCommandInteraction) {
    const row = new ActionRowBuilder<SelectMenuBuilder>()
        .addComponents(select_menu);

    const response = await interaction.reply({
        content: FirstPage,
        components: [row]
    });

    const collector = response.createMessageComponentCollector({componentType: ComponentType.StringSelect, time: 300_000});
    collector.on('collect', async i => {
        const selection = i.values[0];
        switch (selection) { 
            case 'okash':
                await i.update({
                    content: await LangGetAutoTranslatedStringRaw(CurrencyPage, interaction.okabot.translateable_locale),
                    components: [row]
                });
                break;
            case 'earthquakes':
                await i.update({
                    content: await LangGetAutoTranslatedStringRaw(EarthquakePage, interaction.okabot.translateable_locale),
                    components: [row]
                });
                break;
            case 'games':
                await i.update({
                    content: await LangGetAutoTranslatedStringRaw(GamesPage, interaction.okabot.translateable_locale),
                    components: [row]
                });
                break;
            case 'games2':
                await i.update({
                    content: await LangGetAutoTranslatedStringRaw(GamesPage2, interaction.okabot.translateable_locale),
                    components: [row]
                });
                break;
            case 'daily':
                await i.update({
                    content: await LangGetAutoTranslatedStringRaw(DailyRewardPage, interaction.okabot.translateable_locale),
                    components: [row]
                });
                break;
            
            case 'level':
                await i.update({
                    content: await LangGetAutoTranslatedStringRaw(LevelPage, interaction.okabot.translateable_locale),
                    components: [row]
                });
                break;
                
            case 'drops':
                await i.update({
                    content: await LangGetAutoTranslatedStringRaw(DropsPage, interaction.okabot.translateable_locale),
                    components: [row]
                });
                break;

            case 'pets':
                await i.update({
                    content: await LangGetAutoTranslatedStringRaw(PetsPage, interaction.okabot.translateable_locale),
                    components: [row]
                });
                break;

            case 'extra':
                await i.update({
                    content: await LangGetAutoTranslatedStringRaw(ExtraPage, interaction.okabot.translateable_locale),
                    components: [row]
                });
                break;
        }
    });  
}


export const HelpSlashCommand = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get information on everything okabot');