import { scheduleJob } from 'node-schedule';
import { Logger } from 'okayulogger';
import { join } from 'path';
import { BASE_DIRNAME, DEV } from '../../index';
import { Client, TextChannel } from 'discord.js';
import { GetEmoji } from '../../util/emoji';
import { AddXP } from '../levels/onMessage';
import { AddToWallet } from '../okash/wallet';
import { readFileSync, writeFileSync } from 'fs';

const DO_IT_EVERY_MINUTE_BECAUSE_WHY_NOT = false;

const COINFLIP_MINMAX_BONUS = 5000;
const COINFLIP_MINMAX_FREQUENCY = !DO_IT_EVERY_MINUTE_BECAUSE_WHY_NOT?'0 9 * * 1':'0 * * * * *';
let BROADCAST_CHANNEL = '1019089378343137373'; // #chatsies / #okabot-private-test
const L = new Logger('coinflip reset bonus');

export interface CoinFloats {
    coinflip:{
        high: {
            value: number,
            user_id: string
        },
        low: {
            value: number,
            user_id: string
        },
        all_time: {
            high: {
                value: number,
                user_id: string
            },
            low: {
                value: number,
                user_id: string
            }
        },
        daily?: {
            next: number, // when the next day will start
            high: {
                value: number,
                user_id: string,
            },
            low: {
                value: number,
                user_id: string
            }
        },
        all_rolls: Array<number>
    }
}

let c: Client;

export function ScheduleJob(client: Client) {
    c = client;
    if (DEV) BROADCAST_CHANNEL = '941843973641736253';
    scheduleJob(COINFLIP_MINMAX_FREQUENCY, async () => {
        L.info('Bonus time has arrived, running tasks...');

        // read stats.oka file for cf minmax
        const stats: CoinFloats = JSON.parse(readFileSync(join(BASE_DIRNAME, 'stats.oka'), 'utf-8'));

        if (!stats.coinflip.daily) return L.info('No daily information, skipping today...');
        if (stats.coinflip.daily.high.user_id == 'okabot' || stats.coinflip.daily.low.user_id == 'okabot') return;

        const channel = c.channels.cache.get(BROADCAST_CHANNEL) as TextChannel;
        L.info(`channel: #${channel.name}`);

        await channel.send(`${GetEmoji('cff')} The weekly coinflip results are in!\n:medal: Highest: <@${stats.coinflip.daily.high.user_id}> with **${stats.coinflip.daily.high.value}**\n:medal: Lowest: <@${stats.coinflip.daily.low.user_id}> with **${stats.coinflip.daily.low.value}**`);
        await channel.send(`The winner(s) have been given ${GetEmoji('okash')} OKA**5000** and **+350XP**`);

        AddXP(stats.coinflip.daily.high.user_id, channel, 7*50);
        AddToWallet(stats.coinflip.daily.high.user_id, COINFLIP_MINMAX_BONUS);

        AddXP(stats.coinflip.daily.low.user_id, channel, 7*50);
        AddToWallet(stats.coinflip.daily.low.user_id, COINFLIP_MINMAX_BONUS);

        // reset them
        stats.coinflip.daily.high.user_id = 'okabot'; // set these to okabot so that we know to skip if no one coinflips that day
        stats.coinflip.daily.low.user_id = 'okabot';
        stats.coinflip.daily.high.value = 0; // setting high to 0 and low to 1 makes any new flip a best regardless
        stats.coinflip.daily.low.value = 1;

        // update stats
        writeFileSync(join(BASE_DIRNAME, 'stats.oka'), JSON.stringify(stats), 'utf-8');
    });
}