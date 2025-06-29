import {ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder, TextChannel} from "discord.js";
import {RestoreLastDailyStreak} from "../okash/daily";
import {CUSTOMIZATION_UNLOCKS, ITEMS} from "../okash/items";
import {AddOneToInventory, AddToWallet, GetInventory, RemoveOneFromInventory} from "../okash/wallet";
import {FLAG, GetUserProfile, UpdateUserProfile, USER_PROFILE} from "../user/prefs";
import {exLootboxReward, LOOTBOX_REWARD_TYPE, lootboxRewardCommon, rareLootboxReward} from "../okash/lootboxes";
import {EMOJI, GetEmoji} from "../../util/emoji";
import {PassesActive} from "../okash/games/blackjack";
import {ITEM_NAMES} from "./pockets";
import {Achievements, GrantAchievement} from "../passive/achievement";
import {BoostsActive} from "../passive/onMessage";
import {item_tracking_device} from "./usables/trackingDevice";

export async function HandleCommandUse(interaction: ChatInputCommandInteraction) {
    switch (interaction.options.getString('item')!.toLowerCase()) {
        case 'streak restore': case 'sr':
            item_streak_restore(interaction);
            break;

        case 'weighted coin': case 'wc':
            item_weighted_coin(interaction);
            break;

        case 'common lootbox': case 'clb': case 'lb':
            item_common_lootbox(interaction);
            break;

        case 'rare lootbox': case 'rlb':
            item_rare_lootbox(interaction);
            break;

        case 'ex lootbox': case 'exlb': case 'extra rare lootbox':
            item_ex_lootbox(interaction);
            break;

        case 'cp10':
            item_casino_pass(interaction, '10');
            break;

        case 'cp30':
            item_casino_pass(interaction, '30');
            break;

        case 'cp60':
            item_casino_pass(interaction, '60');
            break;

        case 'db15':
            item_drop_boost(interaction, '15');
            break;

        case 'db30':
            item_drop_boost(interaction, '30');
            break;

        case 'tracking device': case 'td':
            item_tracking_device(interaction);
            break;

        default:
            interaction.reply({
                content:':x: No such item exists, silly!',
                flags: [MessageFlags.Ephemeral]
            });
            break;
    }
}

// was GEMS.STREAK_RESTORE, now is ITEMS.STREAK_RESTORE
async function item_streak_restore(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const inventory = GetInventory(interaction.user.id);

    if (inventory.indexOf(ITEMS.STREAK_RESTORE) == -1)
        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have a ${GetEmoji(EMOJI.STREAK_RESTORE_GEM)} **Streak Restore**!`
        });

    const success = await RestoreLastDailyStreak(interaction);

    if (success) RemoveOneFromInventory(interaction.user.id, ITEMS.STREAK_RESTORE);
}


async function item_weighted_coin(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const inventory = GetInventory(interaction.user.id);
    const preferences: USER_PROFILE = GetUserProfile(interaction.user.id);

    if (inventory.indexOf(ITEMS.WEIGHTED_COIN_ONE_USE) == -1) {
        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have any ${GetEmoji(EMOJI.WEIGHTED_COIN_STATIONARY)} **Weighted Coin**s!`
        });
    }

    if (preferences.flags.indexOf(FLAG.WEIGHTED_COIN_EQUIPPED) != -1) {
        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you only need one coin to coinflip!`
        });
    }

    // equip the weighted coin
    preferences.flags.push(FLAG.WEIGHTED_COIN_EQUIPPED);
    UpdateUserProfile(interaction.user.id, preferences);

    RemoveOneFromInventory(interaction.user.id, ITEMS.WEIGHTED_COIN_ONE_USE);

    interaction.editReply({
        content: `${GetEmoji(EMOJI.CAT_SUNGLASSES)} **${interaction.user.displayName}** can already feel ${preferences.customization.global.pronouns.possessive} luck increasing while equipping ${preferences.customization.global.pronouns.possessive} ${GetEmoji(EMOJI.WEIGHTED_COIN_STATIONARY)} **Weighted Coin**.`
    });
}

async function item_common_lootbox(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const inventory = GetInventory(interaction.user.id);
    const preferences: USER_PROFILE = GetUserProfile(interaction.user.id);

    if (inventory.indexOf(ITEMS.LOOTBOX_COMMON) == -1) {
        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have a :package: **Common Lootbox** to open!`
        });
    }

    RemoveOneFromInventory(interaction.user.id, ITEMS.LOOTBOX_COMMON);

    await interaction.editReply({
        content: `**${interaction.user.displayName}** opens ${preferences.customization.global.pronouns.possessive} :package: **Common Lootbox** and finds...`
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const reward = lootboxRewardCommon(interaction.user.id);
    let rewardMessage = '';

    switch (reward.type) {
        case LOOTBOX_REWARD_TYPE.ITEM:
            AddOneToInventory(interaction.user.id, reward.item_id)
            rewardMessage = reward.item_id==ITEMS.WEIGHTED_COIN_ONE_USE?`a ${GetEmoji(EMOJI.WEIGHTED_COIN_STATIONARY)} **Weighted Coin**!`:`a ${GetEmoji(EMOJI.STREAK_RESTORE_GEM)} **Streak Restore**!`;
            break;

        case LOOTBOX_REWARD_TYPE.OKASH:
            AddToWallet(interaction.user.id, reward.amount)
            rewardMessage = `${GetEmoji(EMOJI.OKASH)} OKA**${reward.amount}**`;
            break;

        case LOOTBOX_REWARD_TYPE.SCRAPS:
            rewardMessage = `some **scraps**!\n`;
            const s = reward.amount;
            rewardMessage += `**${GetEmoji(EMOJI.SCRAP_METAL)} x ${s.m}, ${GetEmoji(EMOJI.SCRAP_PLASTIC)} x ${s.p}, ${GetEmoji(EMOJI.SCRAP_WOOD)} x ${s.w}, ${GetEmoji(EMOJI.SCRAP_RUBBER)} x ${s.r}, ${GetEmoji(EMOJI.SCRAP_ELECTRICAL)} x ${s.e}**`;
            break;

        default:
            break;
    }


    await interaction.editReply({
        content: `**${interaction.user.displayName}** opens ${preferences.customization.global.pronouns.possessive} :package: **Common Lootbox** and finds ${rewardMessage}`
    })
}
async function item_rare_lootbox(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const inventory = GetInventory(interaction.user.id);
    const preferences: USER_PROFILE = GetUserProfile(interaction.user.id);

    if (inventory.indexOf(ITEMS.LOOTBOX_RARE) == -1) {
        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have any :package: **Rare Lootboxes**!`
        });
    }

    RemoveOneFromInventory(interaction.user.id, ITEMS.LOOTBOX_RARE);

    await interaction.editReply({
        content: `**${interaction.user.displayName}** opens ${preferences.customization.global.pronouns.possessive} :package: **Rare Lootbox** and finds...`
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const reward = rareLootboxReward(interaction.user.id);
    let rewardMessage = '';

    switch (reward.type) {
        case LOOTBOX_REWARD_TYPE.ITEM:
            AddOneToInventory(interaction.user.id, reward.value);

            // Dynamic message based on the item received
            if (reward.value === ITEMS.WEIGHTED_COIN_ONE_USE) {
                rewardMessage = `a ${GetEmoji(EMOJI.WEIGHTED_COIN_STATIONARY)} **Weighted Coin**!`;
            } else if (reward.value === ITEMS.SHOP_VOUCHER) {
                rewardMessage = `a ${GetEmoji(EMOJI.SHOP_VOUCHER)} **Shop Voucher**!`;
            }
            break;

        case LOOTBOX_REWARD_TYPE.OKASH:
            AddToWallet(interaction.user.id, reward.value)
            rewardMessage = `${GetEmoji(EMOJI.OKASH)} OKA**${reward.value}**`;
            break;

        default:
            break;
    }
    await interaction.editReply({
        content: `**${interaction.user.displayName}** opens ${preferences.customization.global.pronouns.possessive} :package: **Rare Lootbox** and finds ${rewardMessage}`
    })
}


async function item_ex_lootbox(interaction: ChatInputCommandInteraction) {
    const preferences = GetUserProfile(interaction.user.id);

    if (GetInventory(interaction.user.id).indexOf(ITEMS.LOOTBOX_EX) == -1) return interaction.reply({
        content: `**${interaction.user.displayName}**, you don't have an :sparkles: **EX Lootbox** :sparkles: to open!` 
    });

    //

    await interaction.reply({
        content: `**${interaction.user.displayName}** opens ${preferences.customization.global.pronouns.possessive} :sparkles: **EX Lootbox** :sparkles: and finds...`
    });

    RemoveOneFromInventory(interaction.user.id, ITEMS.LOOTBOX_EX);
    const result = exLootboxReward(interaction.user.id);

    await new Promise((r) => setTimeout(r, 3000));

    switch (result.type) {
        case LOOTBOX_REWARD_TYPE.OKASH:
            AddToWallet(interaction.user.id, result.value);
            return await interaction.editReply({
                content: `**${interaction.user.displayName}** opens ${preferences.customization.global.pronouns.possessive} :sparkles: **EX Lootbox** :sparkles: and finds ${GetEmoji(EMOJI.OKASH)} OKA**${result.value}**!`
            });

        case LOOTBOX_REWARD_TYPE.ITEM:
            AddOneToInventory(interaction.user.id, result.value);
            return await interaction.editReply({
                content: `**${interaction.user.displayName}** opens ${preferences.customization.global.pronouns.possessive} :sparkles: **EX Lootbox** :sparkles: and finds a **${ITEM_NAMES[result.value].name}**!`
            });

        case LOOTBOX_REWARD_TYPE.CUSTOMIZATION:
            // you can only get a rainbow coin lol
            if (GetUserProfile(interaction.user.id).customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.COIN_RAINBOW) == -1) { 
                AddToWallet(interaction.user.id, 500_000);
                return await interaction.editReply({
                    content: `**${interaction.user.displayName}** opens ${preferences.customization.global.pronouns.possessive} :sparkles: **EX Lootbox** :sparkles: and finds a ${GetEmoji(EMOJI.COIN_RAINBOW_STATIONARY)} **Rainbow Coin**!\nYou already have this customization, so I deposited ${GetEmoji(EMOJI.OKASH)} OKA**500,000**`
                });
            }
            // doesn't have
            return await interaction.editReply({
                content: `**${interaction.user.displayName}** opens ${preferences.customization.global.pronouns.possessive} :sparkles: **EX Lootbox** :sparkles: and finds a ${GetEmoji(EMOJI.COIN_RAINBOW_STATIONARY)} **Rainbow Coin**!`
            });
    }
}


async function item_casino_pass(interaction: ChatInputCommandInteraction, time: '10' | '30' | '60') {
    await interaction.deferReply();

    const pockets = GetInventory(interaction.user.id);
    const preferences = GetUserProfile(interaction.user.id);

    const item = {'10': ITEMS.CASINO_PASS_10_MIN, '30': ITEMS.CASINO_PASS_30_MIN, '60': ITEMS.CASINO_PASS_1_HOUR}[time];

    if (pockets.indexOf(item) == -1)
        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have a :credit_card: **${time}-minute Casino Pass**!`
        });

    RemoveOneFromInventory(interaction.user.id, item);
    GrantAchievement(interaction.user, Achievements.CASINO_PASS, interaction.channel as TextChannel);

    const d = new Date();

    if (PassesActive.has(interaction.user.id) && PassesActive.get(interaction.user.id)! > d.getTime()/1000) return interaction.editReply({
        content: `:crying_cat_face: **${interaction.user.displayName}**, you've already got a **Casino Pass** active until <t:${PassesActive.get(interaction.user.id)}>`
    });

    const expiry_time = Math.round(d.getTime()/1000) + {
        '10': 10*60,
        '30': 30*60,
        '60': 60*60
    }[time];

    PassesActive.set(interaction.user.id, expiry_time);

    interaction.editReply({
        content: `${GetEmoji(EMOJI.CAT_MONEY_EYES)} **${interaction.user.displayName}** wastes no time activating ${preferences.customization.global.pronouns.possessive} :credit_card: **Casino Pass**!\n-# Effect expires at <t:${expiry_time}>`
    });
}


async function item_drop_boost(interaction: ChatInputCommandInteraction, time: '15' | '30') {
    await interaction.deferReply();

    const pockets = GetInventory(interaction.user.id);
    const now = Math.round(new Date().getTime() / 1000);
    const preferences = GetUserProfile(interaction.user.id);

    if (BoostsActive.has(interaction.user.id) && BoostsActive.get(interaction.user.id)! > now) return interaction.editReply({
        content: `:crying_cat_face: **${interaction.user.displayName}**, you've already got a **Drop Boost** active until <t:${BoostsActive.get(interaction.user.id)}>`
    })

    const item = {'15': ITEMS.LOOTBOX_INCREASE_15_MIN, '30': ITEMS.LOOTBOX_INCREASE_30_MIN}[time];

    if (pockets.indexOf(item) == -1)
        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have a **${time}-minute Drop Boost**!`
        });

    RemoveOneFromInventory(interaction.user.id, item);
    GrantAchievement(interaction.user, Achievements.DROP_BOOST, interaction.channel as TextChannel);

    const expiry = {
        '15': now + 900,
        '30': now + 1800
    }[time];

    BoostsActive.set(interaction.user.id, expiry);

    interaction.editReply({
        content: `${GetEmoji(EMOJI.CAT_MONEY_EYES)} **${interaction.user.displayName}** feels ${preferences.customization.global.pronouns.possessive} luck while activating ${preferences.customization.global.pronouns.possessive} **Drop Boost**!\n-# Effect expires at <t:${expiry}>`
    });
}


export const UseSlashCommand = new SlashCommandBuilder()
    .setName('use').setNameLocalization('ja', '使う')
    .setDescription('Use an item from your pockets!').setDescriptionLocalization('ja', 'ポケットでアイテムを使う')
    .addStringOption(option => 
        option.setName('item').setNameLocalization('ja', 'アイテム')
        .setDescription('The item to use').setDescriptionLocalization('ja', 'どのアイテムを使う')
        .setRequired(true)
    )
    .addStringOption(option => option
        .setName('on')
        .setDescription('What to use the item on, if applicable')
        .setRequired(false)
    )