import { ChatInputCommandInteraction, MessageFlags, TextChannel } from "discord.js";
import { AddToWallet, GetWallet, RemoveFromWallet } from "../okash/wallet";
import { CheckOkashRestriction, FLAG, GetUserProfile, OKASH_ABILITY, RestrictUser, UpdateUserProfile } from "../user/prefs";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { BASE_DIRNAME } from "../..";
import { join } from "path";
import { getRandomValues } from "crypto";
import { AddXP } from "../levels/onMessage";
import { GetEmoji } from "../../util/emoji";

const ActiveFlips: Array<string> = [];
const UIDViolationTracker = new Map<string, number>();
const LastXPGain = new Map<string, number>(); // user_id, time

const USE_CUSTOMIZATION = false;
const WIN_CHANCE = 0.5;
const WEIGHTED_WIN_CHANCE = 0.3;

const COIN_EMOJIS_FLIP: {
    [key: number]: string
} = {
    0:'cfw',
    1:'cfw_red',
    2:'cfw_dblue',
    3:'cfw_blue',
    4:'cfw_pink',
    5:'cfw_purple',
    16:'cfw_dgreen',
    17:'cfw_rainbow'
}
const COIN_EMOJIS_DONE: {
    [key: number]: string
} = {
    0:'cff',
    1:'cff_red',
    2:'cff_dblue',
    3:'cff_blue',
    4:'cff_pink',
    5:'cff_purple',
    16:'cff_dgreen',
    17:'cff_rainbow'
}

interface coin_floats {
    coinflip:{
        high: {
            value: number,
            user_id: string
        },
        low: {
            value: number,
            user_id: string
        }
    }
}

export async function HandleCommandCoinflip(interaction: ChatInputCommandInteraction) {
    const has_restriction = await CheckOkashRestriction(interaction, OKASH_ABILITY.GAMBLE);
    if (has_restriction) return;

    const stats_file = join(BASE_DIRNAME, 'stats.oka');

    if (ActiveFlips.indexOf(interaction.user.id) != -1) {
        let violations = UIDViolationTracker.get(interaction.user.id)! + 1 || 1;

        console.log(`violations: ${violations}`);

        UIDViolationTracker.set(interaction.user.id, violations);
        
        if (violations == 5) {
            const d = new Date();
            const unrestrict_date = new Date(d.getTime()+600000);
            RestrictUser(interaction.client, interaction.user.id, `${unrestrict_date.toISOString()}`, 'gamble', 'Potential macro abuse (automatically issued by okabot)');
            UIDViolationTracker.set(interaction.user.id, 0);
        } 
        
        return interaction.reply({
            content: `:bangbang: Woah there, **${interaction.user.displayName}**! You can only flip one coin at a time!`,
            flags: [MessageFlags.SuppressNotifications]
        });
    }

    const wallet = GetWallet(interaction.user.id);
    const bet = interaction.options.getNumber('amount')!;
    const side = interaction.options.getString('side');

    // terrible way of checking whether its a float or not lol
    if (bet.toString().includes('.')) return interaction.reply({
        content:`:x: **${interaction.user.displayName}**, I don't have change!`
    });

    // checks
    if (bet <= 0) return interaction.reply({content:`:x: **${interaction.user.displayName}**, you cannot flip that amount.`,
        flags: [MessageFlags.SuppressNotifications]});
    if (wallet < bet) return interaction.reply({content:`:crying_cat_face: **${interaction.user.displayName}**, you cannot flip more than you have in your wallet.`,
        flags: [MessageFlags.SuppressNotifications]});

    // don't let the user do multiple coinflips and take the money immediately
    ActiveFlips.push(interaction.user.id);
    RemoveFromWallet(interaction.user.id, bet);

    // check if user has weighted coin
    const prefs = GetUserProfile(interaction.user.id);
    const weighted_coin_equipped = (prefs.flags.indexOf(FLAG.WEIGHTED_COIN_EQUIPPED) != -1);
    const emoji_waiting = weighted_coin_equipped?GetEmoji('cfw_green'):GetEmoji(COIN_EMOJIS_FLIP[prefs.customization.coin_color]);
    const emoji_finish = weighted_coin_equipped?GetEmoji('cff_green'):GetEmoji(COIN_EMOJIS_DONE[prefs.customization.coin_color]);
    
    // set probabilities and decide outcome
    const rolled = Math.random();
    let win: boolean = false; 

    // .5 is always inclusive bc idgaf
    if (side == 'heads') win = rolled >= (weighted_coin_equipped?WEIGHTED_WIN_CHANCE:WIN_CHANCE);
    else if (side == 'tails') win = rolled <= (weighted_coin_equipped?WEIGHTED_WIN_CHANCE:WIN_CHANCE);
    else win = rolled >= (weighted_coin_equipped?WEIGHTED_WIN_CHANCE:WIN_CHANCE);
        
        
    let first_message = `**${interaction.user.displayName}** flips a coin for ${GetEmoji('okash')} OKA**${bet}** on **${side || 'heads'}**...`
    let next_message = `**${interaction.user.displayName}** flips a coin for ${GetEmoji('okash')} OKA**${bet}** on **${side || 'heads'}**... and ${win?'won the bet, doubling the money!' + GetEmoji('cat_money') + '**(+15XP)**':'lost the bet, losing the money. :crying_cat_face: **(+5XP)**'}\n-# ${rolled} (must be ${(side=='heads'||!side)?'>=':'<='} ${weighted_coin_equipped?WEIGHTED_WIN_CHANCE:WIN_CHANCE} to win)` + ``;

    // toggle for customization of messages (this could potentially be a bad idea but i hope not cuz its cool)
    if (USE_CUSTOMIZATION) {
        const prefs = GetUserProfile(interaction.user.id);
        first_message = prefs.customization.messages.coinflip_first
            .replaceAll('{user}', `**${interaction.user.displayName}**`)
            .replaceAll('{amount}', `OKA**${bet}**`);

        next_message = (win?prefs.customization.messages.coinflip_win:prefs.customization.messages.coinflip_loss)
            .replaceAll('{user}', `**${interaction.user.displayName}**`)
            .replaceAll('{amount}', `OKA**${bet}**`);
    }

    await interaction.reply({
        content: `${emoji_waiting} ${first_message}`,
        flags: [MessageFlags.SuppressNotifications]
    });

    if (rolled >= 0.5 && rolled < 0.50001) {
        setTimeout(() => {
            // win regardless, it landed on the side!!!
            next_message = `${first_message} and it... lands on the side:interrobang: They now get 5x their bet, earning ${GetEmoji('okash')} OKA**${bet*5}**! **(+50XP)**\n-# Roll was ${rolled} | If a weighted coin was equipped, it has not been used.`;
            
            AddXP(interaction.user.id, interaction.channel as TextChannel, 50);

            ActiveFlips.splice(ActiveFlips.indexOf(interaction.user.id), 1);
            AddToWallet(interaction.user.id, bet*5);
            
            interaction.editReply({
                content: `${emoji_finish} ${next_message}`
            });
        }, 3000);

        return;
    }

    // get rid of weighted coin after one use
    if (weighted_coin_equipped) {
        prefs.flags.splice(prefs.flags.indexOf(FLAG.WEIGHTED_COIN_EQUIPPED), 1);
        UpdateUserProfile(interaction.user.id, prefs);
    }

    setTimeout(() => {
        const stats: coin_floats = JSON.parse(readFileSync(stats_file, 'utf-8'));

        let new_float = '';
        const REWARD = 250;

        if (stats.coinflip.high.value < rolled) { 
            new_float += `\n**NEW HIGHEST ROLL:** \`${rolled}\` is the highest float someone has rolled on okabot! ${GetEmoji('okash')} You have earned OKA**${Math.floor(rolled * REWARD)}**!`;
            stats.coinflip.high.value = rolled;
            stats.coinflip.high.user_id = interaction.user.id;
            AddToWallet(interaction.user.id, Math.abs(Math.floor(rolled * REWARD)));
        }
        if (stats.coinflip.low.value > rolled) {
            new_float += `\n**NEW LOWEST ROLL:** \`${rolled}\` is the lowest float someone has rolled on okabot! ${GetEmoji('okash')} You have earned OKA**${Math.abs(Math.floor(REWARD - (rolled*REWARD)))}**!`;
            stats.coinflip.low.value = rolled;
            stats.coinflip.low.user_id = interaction.user.id;
            AddToWallet(interaction.user.id, Math.abs(Math.floor(REWARD - (rolled*REWARD))));
        }

        interaction.editReply({
            content: `${emoji_finish} ${next_message}${new_float}`
        });
        
        writeFileSync(stats_file, JSON.stringify(stats), 'utf-8');

        ActiveFlips.splice(ActiveFlips.indexOf(interaction.user.id), 1);

        AddXP(interaction.user.id, interaction.channel as TextChannel, win?15:5);

        if (win)
            AddToWallet(interaction.user.id, bet*2);
    }, 3000);
}
