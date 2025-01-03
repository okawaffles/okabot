const { SlashCommandBuilder, Routes, ChannelType } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { clientId, token, devtoken, devclientId } = require('./config.json');
const config = require('./config.json');

const commands = [
	new SlashCommandBuilder().setName('info').setDescription('Get some info on the bot!'),
	new SlashCommandBuilder().setName('debug').setDescription('Replies with debug info!'),
	new SlashCommandBuilder().setName('daily').setDescription('Get your daily okash reward!'),
	new SlashCommandBuilder().setName('okash').setDescription('View your bank balance!'),
    new SlashCommandBuilder().setName('pay').setDescription('Pay someone some okash!')
        .addUserOption(option => option.setName('user').setDescription('The person to pay').setRequired(true))
        .addNumberOption(option => option.setName('amount').setDescription('The amount to pay them').setRequired(true)),
    
    new SlashCommandBuilder().setName('leaderboard').setDescription('Get the leaderboard of the biggest okash-holders in the server!')
        .addStringOption(option => option.setName('category').setDescription('Which leaderboard category to display').setRequired(true).addChoices(
            {name:'okash', value:'okash'},
            {name:'XP Levels', value:'levels'}
        )),

	new SlashCommandBuilder().setName('coinflip')
        .setDescription('Flip a coin with a chance of doubling your amount!')
        .addNumberOption(option => option.setName('amount').setDescription('The amount of okash you want to bet').setRequired(true).setMinValue(1).setMaxValue(10_000))
        .addStringOption(option => option.setName('side').setDescription('Optionally, pick heads or tails').addChoices(
            {name:'heads', value:'heads'},
            {name:'tails', value:'tails'}
        ).setRequired(false)),

    new SlashCommandBuilder()
        .setName('recent-eq')
        .setDescription('Get the most recent earthquake data from the Japan Meteorological Agency!'),

    new SlashCommandBuilder()
        .setName('use')
        .setDescription('Use an item or gem from you inventory!')
        .addStringOption(option => option.setName('item').setDescription('The item to use').setRequired(true)),

    new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Buy an item from the shop!')
        .addStringOption(option => option.setName('item').setDescription('The item to buy').setRequired(true)),

    new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Get the shop item and price listings')
        .addStringOption(option => option.setName('page').setDescription('The shop category to display').addChoices(
            {name:'Gems', value: 'gems'},
            {name:'Customization - Coinflip', value:'customization.coin'},
            {name:'Customization - Profile', value:'customization.profile'},
        ).setRequired(true)),

    new SlashCommandBuilder().setName('pockets').setDescription('See what you\'ve got on you!')
        .addStringOption(option => option.setName('page').setDescription('The pockets category to display').addChoices(
            {name:'Items and Gems', value:'items'},
            {name:'Customization Unlocks', value:'customize'}
        ).setRequired(true)),

    new SlashCommandBuilder().setName('customize').setDescription('Customize your experience with your unlocked customizations!')
        .addSubcommand(subcommand => 
            subcommand
                .setName('coinflip')
                .setDescription('Customize your coinflip experience')
                .addStringOption(option => option
                    .setName('coin')
                    .setDescription('The coin you want to use when flipping')
                    .setRequired(true))
                )
        .addSubcommand(subcommand =>
            subcommand
                .setName('levelbar')
                .setDescription('Customize the colors of your level banner\'s XP bar')
                .addStringOption(option => 
                    option
                        .setName('background')
                        .setDescription('The background color of the bar. Must be a valid hex code, like #abcdef')
                        .setRequired(true))
                .addStringOption(option => 
                    option
                        .setName('foreground')
                        .setDescription('The foreground color of the bar. Must be a valid hex code, like #abcdef')
                        .setRequired(true))
                .addStringOption(option => 
                    option
                        .setName('xptext')
                        .setDescription('The text color of the bar (100 XP, 500 XP). Must be a valid hex code, like #abcdef')
                        .setRequired(true))
        ),

    new SlashCommandBuilder()
        .setName('toggle')
        .setDescription('Change a toggleable okabot setting!')
        .addStringOption(option => option.setName('setting')
            .setDescription('The toggle to change')
            .setRequired(true)
            .addChoices(
                { name:'okash notifications when money is transferred/received on your account', value: 'okash_notifications' }
            ))
        .addStringOption(option => option.setName('active')
            .setDescription('whether you want the option on or off')
            .setRequired(true)
            .addChoices(
                {name:'ON', value:'on'},
                {name:'OFF', value:'off'}
            )),
        

    new SlashCommandBuilder().setName('level').setDescription('Get information on your current level!')
        .addUserOption(option => option.setName('user').setDescription('Get another user\'s level info').setRequired(false)),


    new SlashCommandBuilder().setName('blackjack').setDescription('Play a game of blackjack for a chance at increasing your money!')
        .addNumberOption(option => option.setName('bet').setRequired(true).setDescription('The amount of okash to bet').setMaxValue(5_000).setMinValue(1))

].map(command => command.toJSON());
 
const rest = new REST({ version: '10' }).setToken((config['extra'] && config['extra'].includes('use dev token'))?devtoken:token);

rest.put(Routes.applicationCommands((config['extra'] && config['extra'].includes('use dev token'))?devclientId:clientId), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);
