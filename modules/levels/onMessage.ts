import { ChatInputCommandInteraction, Message, MessageFlags, TextChannel } from "discord.js";
import { GetUserProfile, UpdateUserProfile, USER_PROFILE } from "../user/prefs";
import { CalculateOkashReward, CalculateTargetXP, LEVEL_NAMES_EN, LEVEL_NAMES_JA } from "./levels";
import { AddToWallet } from "../okash/wallet";
import { EventType, RecordMonitorEvent } from "../../util/monitortool";

let XPCooldown: Map<string, number> = new Map<string, number>();

export async function DoLeveling(message: Message) {
    // no spamming for levels allowed
    const d = new Date();
    const current_time = Math.floor(d.getTime() / 1000);
    const cooldown = XPCooldown.get(message.author.id) || 0;
    if (cooldown >= current_time) return;

    // 30 second cooldown between xp gains
    XPCooldown.set(message.author.id, current_time + 30);

    AddXP(message.author.id, message.channel as TextChannel);
} 


export async function AddXP(user_id: string, channel: TextChannel, amount?: number) {
    const profile = GetUserProfile(user_id);
    
    profile.level.current_xp += amount || Math.floor(Math.random() * 7) + 3; // anywhere between 3-10 xp per message
    let target_xp = CalculateTargetXP(profile.level.level);

    if (profile.level.current_xp >= target_xp) {
        profile.level.current_xp = profile.level.current_xp - target_xp; // carry over extra XP
        profile.level.level++;

        target_xp = CalculateTargetXP(profile.level.level);

        const okash_reward = CalculateOkashReward(profile.level.level);
        AddToWallet(user_id, okash_reward);
        
        channel.send({
            content: `Congrats, <@${user_id}>! You're now level **${LEVEL_NAMES_EN[profile.level.level - 1]}** (${profile.level.level})!\nYou earned <:okash:1315058783889657928> OKA**${okash_reward}**!\nYour next level will be in **${target_xp}XP**.`,
            flags: [MessageFlags.SuppressNotifications]
        });

        RecordMonitorEvent(EventType.GAIN_LEVEL, {user_id, level:profile.level.level}, `${user_id} is now level ${profile.level.level}`)
    }

    UpdateUserProfile(user_id, profile);

    RecordMonitorEvent(EventType.GAIN_XP, {user_id, xp:profile.level.current_xp}, `${user_id} now has ${profile.level.current_xp} XP`);
}