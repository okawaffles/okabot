import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Locale,
    SlashCommandBuilder,
    TextChannel
} from "discord.js";
import {ClaimDaily, GetDailyStreak} from "../okash/daily";
import {quickdraw, ScheduleDailyReminder} from "../tasks/dailyRemind";
import {Achievements, GrantAchievement} from "../passive/achievement";
import {LANG_INTERACTION, LANG_ITEMS, LangGetAutoTranslatedString} from "../../util/language";
import {GetUserProfile, UpdateUserProfile} from "../user/prefs";
import {EMOJI, GetEmoji} from "../../util/emoji";
import {GetUserSupportStatus, GetUserTesterStatus} from "../../util/users";

export async function HandleCommandDaily(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const d = new Date();

    const result: number = ClaimDaily(interaction.user.id, false, interaction.channel as TextChannel);

    if (result < 0) {
        let response;

        const localizedRemindButton = new ButtonBuilder()
            .setCustomId('remindme')
            .setStyle(ButtonStyle.Primary)
            .setLabel(await LangGetAutoTranslatedString(LANG_INTERACTION.DAILY_REMINDER_BUTTON, interaction.okabot.translateable_locale));

        const earlyBar = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                localizedRemindButton
            );

        // must wait
        console.log(result);
        response = await interaction.editReply({
            content: await LangGetAutoTranslatedString(LANG_INTERACTION.DAILY_TOO_EARLY, interaction.okabot.translateable_locale, interaction.user.displayName, -result),
            components: [earlyBar]
        });

        const collectorFilter = (i: any) => i.user.id === interaction.user.id;

        const collector = response.createMessageComponentCollector({ filter: collectorFilter, time: 30_000 });

        collector.on('collect', async i => {
            // remind me button
            // requires supporter
            const d = new Date;
            const hours_until = Math.round((-(result*1000) - d.getTime())/1000) / 3600;
            console.log(`${hours_until} hours until...`);
            if ((GetUserSupportStatus(i.user.id) != 'ko-fi' && GetUserTesterStatus(i.user.id) != 'cgc-beta') && hours_until > 6) return i.update({
                content: `:crying_cat_face: Sorry, **${interaction.user.displayName}**, but in order to get reminders more than 6 hours later, you must be a supporter!`,
                components: []
            });

            const ready = -(result * 1000);
            const success = ScheduleDailyReminder(ready, interaction.user.id, interaction.channel as TextChannel); // 5 seconds for testing purposes
        
            if (!success) GrantAchievement(i.user, Achievements.ANGER_OKABOT, i.channel as TextChannel);

            i.update({
                content: success?await LangGetAutoTranslatedString(LANG_INTERACTION.DAILY_REMINDER_SCHEDULED, interaction.okabot.translateable_locale)
                :await LangGetAutoTranslatedString(LANG_INTERACTION.DAILY_REMINDER_ANGRY, interaction.okabot.translateable_locale, interaction.user.displayName),
                components:[]
            });
        });

        return;
    }

    const remindButtonNext = new ButtonBuilder()
        .setCustomId('remindmen')
        .setStyle(ButtonStyle.Primary)
        .setLabel(await LangGetAutoTranslatedString(LANG_INTERACTION.DAILY_REMINDER_BUTTON, interaction.okabot.translateable_locale));

    const onClaimBar = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            remindButtonNext
        );

    if (result == 1500) {
        // 1500 = no streak (technically 1 day)
        GrantAchievement(interaction.user, Achievements.DAILY, interaction.channel as TextChannel);

        if (quickdraw.has(interaction.user.id) && quickdraw.get(interaction.user.id)! + 60_000 > d.getTime()) GrantAchievement(interaction.user, Achievements.FAST_CLAIM_REMINDER, interaction.channel as TextChannel);

        let response;
        let reply_content = await LangGetAutoTranslatedString(LANG_INTERACTION.DAILY, interaction.okabot.translateable_locale, await LangGetAutoTranslatedString(LANG_ITEMS.WEIGHTED_COIN, interaction.okabot.translateable_locale));

        // new! scraps!
        // user will get 3 types of scraps per day. they can get between 5-15 of each.
        const scrap_names: {[key: string]: string} = {
            'plastic':`**${GetEmoji(EMOJI.SCRAP_PLASTIC)} Plastic**`,
            'metal':`**${GetEmoji(EMOJI.SCRAP_METAL)} Metal**`,
            'wood':`**${GetEmoji(EMOJI.SCRAP_WOOD)} Wood**`,
            'rubber':`**${GetEmoji(EMOJI.SCRAP_RUBBER)} Rubber**`,
            'electrical':`**${GetEmoji(EMOJI.SCRAP_ELECTRICAL)} Electrical**`,
        };
        const profile = GetUserProfile(interaction.user.id);
        let scrap_types: ['plastic','metal','wood','rubber','electrical'] = ['plastic','metal','wood','rubber','electrical'];
        shuffle(scrap_types);
        let scrap_message_parts = [];
        for (let i = 0; i < 3; i++) {
            const amount_given = 5 + Math.floor(Math.random() * 10);
            profile.inventory_scraps[scrap_types[i]] += amount_given;
            scrap_message_parts.push(scrap_names[scrap_types[i]] + ` x ${amount_given}`);
        }
        UpdateUserProfile(interaction.user.id, profile);

        reply_content += '\nGot Scraps: ' + scrap_message_parts.join(', ') + '!';

        response = await interaction.editReply({
            content: reply_content,
            components: [onClaimBar]
        });

        const collectorFilter = (i: any) => i.user.id === interaction.user.id;
        const collector = response.createMessageComponentCollector({ filter: collectorFilter, time: 30_000 });
        collector.on('collect', async i => {
            const d = new Date();
            const ready = d.getTime() + (24*60*60*1000);
            ScheduleDailyReminder(ready, interaction.user.id, interaction.channel as TextChannel);

            let previous_content = i.message;
        
            i.update({
                content: `${previous_content}\n\n` + await LangGetAutoTranslatedString(LANG_INTERACTION.DAILY_REMINDER_SCHEDULED, interaction.okabot.translateable_locale),
                components:[]
            });
        });

        return;
    }

    // plus streak bonus
    const bonus = result - 1500;
    const streak_count = GetDailyStreak(interaction.user.id);

    GrantAchievement(interaction.user, Achievements.DAILY, interaction.channel as TextChannel);
    if (streak_count >= 7) GrantAchievement(interaction.user, Achievements.DAILY_7, interaction.channel as TextChannel);
    if (streak_count >= 30) GrantAchievement(interaction.user, Achievements.DAILY_30, interaction.channel as TextChannel);
    if (streak_count >= 61) GrantAchievement(interaction.user, Achievements.DAILY_61, interaction.channel as TextChannel);
    if (streak_count >= 100) GrantAchievement(interaction.user, Achievements.DAILY_100, interaction.channel as TextChannel);
    if (streak_count >= 365) GrantAchievement(interaction.user, Achievements.DAILY_365, interaction.channel as TextChannel);

    // new! scraps!
    // user will get 3 types of scraps per day. they can get between 5-15 of each.
    const scrap_names: {[key: string]: string} = {
        'plastic':`**${GetEmoji(EMOJI.SCRAP_PLASTIC)} Plastic**`,
        'metal':`**${GetEmoji(EMOJI.SCRAP_METAL)} Metal**`,
        'wood':`**${GetEmoji(EMOJI.SCRAP_WOOD)} Wood**`,
        'rubber':`**${GetEmoji(EMOJI.SCRAP_RUBBER)} Rubber**`,
        'electrical':`**${GetEmoji(EMOJI.SCRAP_ELECTRICAL)} Electrical**`,
    };
    const profile = GetUserProfile(interaction.user.id);
    let scrap_types: ['plastic','metal','wood','rubber','electrical'] = ['plastic','metal','wood','rubber','electrical'];
    shuffle(scrap_types);
    let scrap_message_parts = [];
    for (let i = 0; i < 3; i++) {
        const amount_given = 5 + Math.floor(Math.random() * 10);
        profile.inventory_scraps[scrap_types[i]] += amount_given;
        scrap_message_parts.push(scrap_names[scrap_types[i]] + ` x ${amount_given}`);
    }
    UpdateUserProfile(interaction.user.id, profile);

    let percentage = 100+(100*0.05*(streak_count-1));
    if (percentage > 200) percentage = 200;

    if (quickdraw.has(interaction.user.id) && quickdraw.get(interaction.user.id)! + 60_000 > d.getTime()) GrantAchievement(interaction.user, Achievements.FAST_CLAIM_REMINDER, interaction.channel as TextChannel);

    let response;

    let content = await LangGetAutoTranslatedString(LANG_INTERACTION.DAILY, interaction.okabot.translateable_locale, await LangGetAutoTranslatedString(LANG_ITEMS.WEIGHTED_COIN, interaction.okabot.translateable_locale)) + '\n' + await LangGetAutoTranslatedString(LANG_INTERACTION.DAILY_STREAK, interaction.okabot.translateable_locale, streak_count, bonus);
    content += '\nGot Scraps: ' + scrap_message_parts.join(', ') + '!';

    response = await interaction.editReply({
        content,
        components: [onClaimBar]
    });

    const collectorFilter = (i: any) => i.user.id === interaction.user.id;
    const collector = response.createMessageComponentCollector({ filter: collectorFilter, time: 30_000 });
    collector.on('collect', async i => {
        // remind me button
        let previous_content = i.message;

        // requires supporter
        if ((GetUserSupportStatus(i.user.id) != 'ko-fi' && GetUserTesterStatus(i.user.id) != 'cgc-beta')) return i.update({
            content: `${previous_content}\n\n:crying_cat_face: Sorry, **${interaction.user.displayName}**, but in order to get reminders more than 6 hours later, you must be a supporter!`,
            components: []
        });

        const d = new Date();
        const ready = d.getTime() + (24*60*60*1000);
        ScheduleDailyReminder(ready, interaction.user.id, interaction.channel as TextChannel);

        i.update({
            content: `${previous_content}\n\n` + await LangGetAutoTranslatedString(LANG_INTERACTION.DAILY_REMINDER_SCHEDULED, interaction.okabot.translateable_locale),
            components:[]
        });
    });
}

// from https://stackoverflow.com/questions/2450954
function shuffle(array: Array<string>) {
    let currentIndex = array.length;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {

        // Pick a remaining element...
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
}

export const DailySlashCommand = 
    new SlashCommandBuilder()
        .setName('daily').setNameLocalization('ja', '日常の褒美')
        .setDescription('Get your daily okash reward').setDescriptionLocalization('ja', '日常の褒美をゲットする');