import {
    ApplicationIntegrationType, AttachmentBuilder,
    ChatInputCommandInteraction,
    InteractionContextType,
    SlashCommandBuilder
} from "discord.js";
import axios from "axios";

async function fetchImage(url: string) {
    const response = await axios.get(url, {responseType: 'arraybuffer'});
    return Buffer.from(response.data, 'binary');
}

export async function HandleCommandCatgirl(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const rating = (interaction.options.getBoolean('suggestive') || false) ? 'suggestive' : 'safe';

    try {
        const resp = await (await fetch(`https://api.nekosia.cat/api/v1/images/catgirl?count=1&rating=${rating}`)).json();
        const item = resp.image.original.url;
        const image = await fetchImage(item);
        const attachment = new AttachmentBuilder(image, {name:'okabot-catgirl.png'}).setSpoiler(rating == 'suggestive');

        interaction.editReply({
            content:`**[${resp.rating == 'safe' ? 'G' : 'S'}]** [Source](<${resp.source.url}>)\nby [${resp.attribution.artist.username || '???'}](<${resp.attribution.artist.profile || 'https://nekosia.cat'}>)\n-# ${resp.tags.join(', ')}`,
            files: [attachment]
        });
    } catch (err) {
        console.error(err);
        interaction.editReply({
            content:`an error occurred, [maybe the API is not responding?](<https://status.nekosia.cat>)`
        });
    }
}

export const CatgirlSlashCommand = new SlashCommandBuilder()
    .setName('catgirl')
    .setDescription('Get a picture of a catgirl. That\'s it.')
    .addBooleanOption(option => option
        .setName('suggestive')
        .setDescription('do you want a photo of a suggestive catgirl?')
        .setRequired(false)
    )
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
    .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall);