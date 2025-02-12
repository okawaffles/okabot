// once these have been used you **CANNOT** change the order of them
// if you add an item, it MUST be at the end, otherwise you will BREAK a user file!

export enum GEMS {
    STREAK_RESTORE,     // g00
    DROP_BOOST,         // gb0
    HIGH_DROP_BOOST,    // gb1
    MYSTERY_GEM,        // g01
    DAILY_DOUBLE_CLAIM  // g02
}

export enum ITEMS {
    RANDOM_DROP_COMMON,
    RANDOM_DROP_RARE,
    RANDOM_DROP_RAREST,
    WEIGHTED_COIN_ONE_USE,
    WEIGHTED_COIN_THREE_USE,
    GEM_SHARD,
    SHOP_VOUCHER,
    LOT_SCRATCH,
}

export enum CUSTOMIZATION_UNLOCKS {
    COIN_DEF,
    COIN_RED,
    COIN_DBLUE,
    COIN_BLUE, // considered light blue
    COIN_PINK,
    COIN_PURPLE,
    CV_LEVEL_BANNER_DEF,
    CV_LEVEL_BAR_RED,
    CV_LEVEL_BAR_GREEN,
    CV_LEVEL_BAR_BLUE,
    CV_LEVEL_BAR_PINK,
    CV_LEVEL_BAR_OKABOT,
    STR_COINFLIP,
    STR_OKASH,
    SYS_BANK_ACCESS,
    SYS_LOAN_ACCESS,
    COIN_DGREEN, // normal green = reserved for weighted coin
    COIN_RAINBOW,
    CV_LEVEL_BANNER_USER,
    CV_LEVEL_BAR_CUSTOM,
    CV_LEVEL_BAR_CUSTOM_PENDING
}

export enum ITEM_TYPE {
    ITEM,
    GEM,
    CUSTOMIZATION
}