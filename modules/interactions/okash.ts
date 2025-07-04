import {ChatInputCommandInteraction, Locale, MessageFlags, SlashCommandBuilder, TextChannel} from "discord.js";
import {GetBank, GetWallet} from "../okash/wallet";
import {Achievements, GrantAchievement} from "../passive/achievement";
import {LANG_INTERACTION, LangGetAutoTranslatedString} from "../../util/language";
import {GetCurrentFines} from "../okash/games/rob";
import { GrantStoryAccess } from "../story/lorebook";


export async function HandleCommandOkash(interaction: ChatInputCommandInteraction) {
    // await interaction.deferReply();

    const bank = GetBank(interaction.user.id);
    const wallet = GetWallet(interaction.user.id);

    if (wallet+bank >= 10_000) GrantStoryAccess(interaction.user, 2, interaction.channel as TextChannel);
    if (bank >= 1_000_000) GrantAchievement(interaction.user, Achievements.CAPITALISM, interaction.channel as TextChannel);

    await interaction.reply({
        content: await LangGetAutoTranslatedString(LANG_INTERACTION.OKASH,
            interaction.okabot.translateable_locale,
            interaction.user.displayName,
            wallet.toString(),
            bank.toString(),
            GetCurrentFines().toString()
        )
    });
}


export const OkashSlashCommand = 
    new SlashCommandBuilder()
        .setName('okash').setNameLocalization('ja', 'okash')
        .setDescription('See how much okash you have on you').setDescriptionLocalization('ja', 'ポケットにと銀行にokash持ち見ます');