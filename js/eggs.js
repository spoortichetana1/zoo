/* 
    ============================================================================
    FANTASY ZOO - EGG DEFINITIONS (js/eggs.js)
    ============================================================================
    This file defines all egg types available in the game.

    PURPOSE OF THIS FILE:
    ---------------------
    - Central place to configure egg prices, hatch times, display names, and icons.
    - Allows easy balancing (making eggs cheaper/more expensive).
    - Keeps egg-related data separate from logic (cleaner architecture).

    HOW OTHER FILES USE THIS:
    -------------------------
    - UI renders egg-shop buttons based on this data.
    - HatchingSystem uses these values to create egg instances.
    - Economy & rarity systems depend on egg types.

    HOW TO DEBUG:
    -------------
    If an egg:
        ✔ doesn't show in the shop  
        ✔ buys wrong type  
        ✔ hatches too fast/slow  
        ✔ displays wrong emoji  
    → the issue is likely here.
*/


// ============================================================================
// GLOBAL EGG TYPE DEFINITIONS
// These are static templates, not actual eggs in the incubator.
// ============================================================================

window.EggData = {

    /* 
        ----------------------------------------------------------------------
        COMMON EGG
        ----------------------------------------------------------------------
        Cheap egg with fast hatch time.
        Produces common / uncommon pets.
    */
    common: {
        type: "common",             // Type ID (used when creating eggs)
        name: "Common Egg",         // Display name
        price: 20,                  // Coin cost to purchase
        hatchTime: 7000,            // Time (ms) to hatch
        icon: "🥚",                 // Emoji shown in incubator and shop
        description: "Hatches basic cute creatures quickly."
    },

    /* 
        ----------------------------------------------------------------------
        RARE EGG
        ----------------------------------------------------------------------
        More expensive egg that can hatch rare or epic pets.
    */
    rare: {
        type: "rare",
        name: "Rare Egg",
        price: 45,
        hatchTime: 11000,
        icon: "🐣",
        description: "Contains rare creatures with better income."
    },

    /* 
        ----------------------------------------------------------------------
        MYSTIC EGG
        ----------------------------------------------------------------------
        The highest tier egg.
        Slowest to hatch but produces the strongest creatures.
    */
    mystic: {
        type: "mystic",
        name: "Mystic Egg",
        price: 90,
        hatchTime: 15000,
        icon: "🐉",
        description: "Hatches mystical beasts with powerful earning rates."
    }
};
