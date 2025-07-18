import {ChatInputCommandInteraction, Locale, MessageFlags, SlashCommandBuilder} from "discord.js";
import { GetUserProfile, UpdateUserProfile } from "../user/prefs";
import {EMOJI, GetEmoji} from "../../util/emoji";


export async function HandleCommandToggle(interaction: ChatInputCommandInteraction) {
    const prefs = GetUserProfile(interaction.user.id);

    const subcommand = interaction.options.getSubcommand(true);

    switch (subcommand) {
        case 'okash-notification':
            const active = interaction.options.getString('active') == 'on';
            interaction.reply({
                content: active?`${GetEmoji(EMOJI.CAT_SUNGLASSES)} okaaay! i'll try to send you notifications every time you receive/transfer okash on your account.`:`${GetEmoji(EMOJI.CAT_SUNGLASSES)} too many notifications? i get that, i\'ll chill out with the notifications`,
                flags:[MessageFlags.Ephemeral]
            
            });
            prefs.customization.global.okash_notifications = active;
            UpdateUserProfile(interaction.user.id, prefs);
            break;

        case 'preferred-pronouns':
            if (interaction.locale != Locale.EnglishUS && interaction.locale != Locale.EnglishGB) {
                let message = 'Sorry, but this feature is not supported on your selected language. Change your Discord language to English to use this feature.';
                return interaction.reply(message);
            }
            const preferred = interaction.options.getString('pronouns', true);
            prefs.customization.global.pronouns.subjective = preferred.split('/')[0];
            prefs.customization.global.pronouns.objective = preferred.split('/')[1];
            prefs.customization.global.pronouns.possessive = preferred.split('/')[2];
            UpdateUserProfile(interaction.user.id, prefs);
            interaction.reply({
                content: `${GetEmoji(EMOJI.CAT_SUNGLASSES)} okaaay! your pronouns are now set to "${preferred}!"`,
                flags:[MessageFlags.Ephemeral]
            });
            break;

        case 'okabot-updates':
            if (interaction.guild?.id != "1019089377705611294") return interaction.reply({
                content: 'This function is not available in this server.'
            });
            const guild = interaction.client.guilds.cache.get(interaction.guild!.id)!;
            const member = guild.members.cache.get(interaction.user.id)!;
            const role = guild.roles.cache.find(r => r.name === 'okabot updates')!;
            const enabled = member.roles.cache.some(r => r.id === role.id)

            if (!enabled) {
                member.roles.add(role);
                interaction.reply({
                    content: `${GetEmoji(EMOJI.CAT_SUNGLASSES)} okaaay! you'll now receive pings when okabot updates are announced!`,
                    flags: [MessageFlags.Ephemeral]
                });
            } else {
                member.roles.remove(role);
                interaction.reply({
                    content: `:crying_cat_face: oh... okay. you'll no longer receive pings when okabot updates are announced!`,
                    flags: [MessageFlags.Ephemeral]
                });
            }
            break;
    
        default:
            break;
    }
}


export const ToggleSlashCommand = new SlashCommandBuilder()
    .setName('toggle')
    .setDescription('Change a toggleable okabot setting!')
    .addSubcommand(sc => sc
        .setName('okash-notification')
        .setDescription('Get a notification when okash is transferred in/out of your account?')
        .addStringOption(option => option
            .setName('active')
            .setDescription('whether you want the option on or off')
            .setRequired(true)
            .addChoices(
                {name:'Yeah!', value:'on'},
                {name:'Nah', value:'off'}
            ))
    )
    .addSubcommand(sc => sc
        .setName('preferred-pronouns')
        .setDescription('Set your preferred pronouns okabot will use')
        .addStringOption(option => option
            .setName('pronouns')
            .setDescription('which pronouns you want to use')
            .setRequired(true)
            .addChoices(
                // the value is only she/her etc because we don't use pronouns such as "him" or "them"
                {name:'She/her/her', value:'she/her/her'},
                {name:'He/him/his', value:'he/him/his'},
                {name:'They/them/their', value:'they/them/their'},
            ))
    )
    .addSubcommand(sc => sc
        .setName('okabot-updates')
        .setDescription('Toggle whether you want to receive okabot updates when announced')
    )
