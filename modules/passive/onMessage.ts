import { EmbedBuilder, Message, TextChannel } from "discord.js";
import { AddOneToInventory, AddToWallet, GetWallet, RemoveFromWallet } from "../okash/wallet";
import { GEMS, ITEM_TYPE } from "../okash/items";


export async function CheckAdminShorthands(message: Message) {
    try {
        if (message.author.id == "796201956255334452") {
            if (message.content.startsWith('oka dep ')) {
                const params = message.content.split(' ');
                if (params.length != 4) return message.react('❌');

                if (params[2] == 'me') params[2] = message.author.id;
                if (params[2] == 'them') params[2] = (message.channel as TextChannel).messages.cache.find((msg) => msg.id == message.reference?.messageId)!.author.id;

                if (Number.isNaN(parseInt(params[2]))) throw new Error('params[2] is NaN');

                let receiver_bank_amount = GetWallet(params[2]);
                receiver_bank_amount += parseInt(params[3]);
                AddToWallet(params[2], parseInt(params[3]));

                message.react('✅');
                (message.channel as TextChannel).send(`<@!${params[2]}>, your new balance is OKA${receiver_bank_amount}.`);
            }
            if (message.content.startsWith('oka wd ')) {
                const params = message.content.split(' ');
                if (params.length != 4) return message.react('❌');

                if (params[2] == 'me') params[2] = message.author.id;
                if (params[2] == 'them') params[2] = (message.channel as TextChannel).messages.cache.find((msg) => msg.id == message.reference?.messageId)!.author.id;
                
                if (Number.isNaN(parseInt(params[2]))) throw new Error('params[2] is NaN');

                let receiver_bank_amount = GetWallet(params[2]);
                receiver_bank_amount -= parseInt(params[3]);
                RemoveFromWallet(params[2], parseInt(params[3]));

                message.react('✅');
                (message.channel as TextChannel).send(`<@!${params[2]}>, your new balance is OKA${receiver_bank_amount}.`);
            }

            if (message.content.startsWith('oka i ')) {
                const params = message.content.split(' ');
                if (params.length != 4) return message.react('❌');

                if (params[2] == 'me') params[2] = message.author.id;
                if (params[2] == 'them') params[2] = (message.channel as TextChannel).messages.cache.find((msg) => msg.id == message.reference?.messageId)!.author.id;
                
                if (Number.isNaN(parseInt(params[2]))) throw new Error('params[2] is NaN');

                AddOneToInventory(params[2], ITEM_TYPE.GEM, GEMS.STREAK_RESTORE);

                message.react('✅');
                (message.channel as TextChannel).send(`<@!${params[2]}>, inserted one \`${params[3]}\` into your inventory.`);
            }


            if (message.content.startsWith('oka w ')) {
                const params = message.content.split(' ');
                if (params.length != 4) return message.react('❌');

                if (params[2] == 'me') params[2] = message.author.id;
                if (params[2] == 'them') params[2] = (message.channel as TextChannel).messages.cache.find((msg) => msg.id == message.reference?.messageId)!.author.id;
                
                if (Number.isNaN(parseInt(params[2]))) throw new Error('params[2] is NaN');

                message.react('✅');
                
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('Warning')
                    .setDescription('You have received a warning for your behavior with the bot. Continuing with this behavior may result in a ban.')
                    .addFields({
                        name:'Reason', value:params[3]
                    });

                message.client.users.cache.find((user) => user.id == params[2])!.send({embeds:[embed]});
            }
        }
    } catch (err) {
        message.reply({content:'error while parsing your command. check the params and try again.\n`' + err + '`'})
        return message.react('❌');
    }
}

export async function DoRandomOkashRolls(message: Message) {
    // random cash rolls for each message
    // 1 in 500 seems decent enough for 1-1000 i think...
    const small_roll = Math.floor(Math.random() * 500);
    // console.log('small roll: ' + small_roll);
    if (small_roll == 250) {
        console.log('trigger small reward');
        const find_money_msg = await message.reply(':grey_question: ...oh? what\'s this..?');
        return setTimeout(() => {
            const found_amount = Math.floor(Math.random() * 1000);

            AddToWallet(message.author.id, found_amount);

            find_money_msg.edit(`:scream_cat: **${message.author.username}**! You found OKA${found_amount}!`);
        }, 3000);
    }

    // 1 in 2500 for a BIG payout
    // arbitrary number 1561 cuz why not!
    const big_roll = Math.floor(Math.random() * 2500);
    // console.log(`big roll: ${big_roll}`);
    if (big_roll == 1561) {
        console.log('trigger big reward');
        const find_money_msg = await message.reply(':question: ...oh? what\'s this..?');
        return setTimeout(() => {
            let max = 10000;
            let min = 5000;
            const found_amount = Math.floor(Math.random() * (max - min) + min);

            AddToWallet(message.author.id, found_amount);

            find_money_msg.edit(`:scream_cat: **${message.author.username}**, holy beans!! You found OKA${found_amount}!`);
        }, 3000);
    }
}