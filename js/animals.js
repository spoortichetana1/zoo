/* 
    =============================================================================
    FANTASY ZOO - ANIMAL POOLS (js/animals.js)
    =============================================================================
    This file defines the complete list of possible animals that each egg type
    can hatch into.

    PURPOSE OF THIS FILE:
    ---------------------
    - Each egg type randomly selects one animal from its corresponding pool.
    - Rarity + income values are defined here.
    - HatchingSystem uses this data to generate fully formed animal objects.

    TROUBLESHOOTING TIPS:
    ----------------------
    If:
      ✔ an egg hatches into the wrong animal
      ✔ animals have wrong income
      ✔ missing emojis
      ✔ rarity not displayed
      ✔ animals not showing in zoo
    → this file is the first place to check.

    STRUCTURE:
    ----------
    window.AnimalPools = {
        common: [ ... ],
        rare: [ ... ],
        mystic: [ ... ]
    };

    Each entry inside a pool must include:
        name       → display name
        emoji      → shown on card
        rarity     → Common / Uncommon / Rare / Epic / Legendary
        income     → base coins per second
*/


// ============================================================================
// ANIMAL POOLS FOR EACH EGG TYPE
// ============================================================================

window.AnimalPools = {

    /* 
        -------------------------------------------------------------------------
        COMMON EGG → common / uncommon low-income creatures
        -------------------------------------------------------------------------
    */
    common: [
        { name: "Cloudy Chick", emoji: "🐤", rarity: "Common", income: 1 },
        { name: "Leafy Bun", emoji: "🐰", rarity: "Common", income: 1 },
        { name: "Berry Mouse", emoji: "🐭", rarity: "Common", income: 1 },
        { name: "Puff Squirrel", emoji: "🐿️", rarity: "Common", income: 1 },
        { name: "Moss Turtle", emoji: "🐢", rarity: "Uncommon", income: 2 },
        { name: "Bubble Fish", emoji: "🐟", rarity: "Uncommon", income: 2 },
        { name: "Tiny Pupper", emoji: "🐶", rarity: "Uncommon", income: 2 },
        { name: "Fluffy Lamb", emoji: "🐑", rarity: "Uncommon", income: 2 },
        { name: "Mini Cowlet", emoji: "🐄", rarity: "Uncommon", income: 2 },
        { name: "Pebble Frog", emoji: "🐸", rarity: "Uncommon", income: 2 }
    ],


    /* 
        -------------------------------------------------------------------------
        RARE EGG → rare / epic mid-income creatures
        -------------------------------------------------------------------------
    */
    rare: [
        { name: "Spark Fox", emoji: "🦊", rarity: "Rare", income: 3 },
        { name: "Glimmer Cat", emoji: "🐱", rarity: "Rare", income: 3 },
        { name: "Shine Owl", emoji: "🦉", rarity: "Rare", income: 3 },
        { name: "Crystal Wolf", emoji: "🐺", rarity: "Epic", income: 4 },
        { name: "Star Bear", emoji: "🐻", rarity: "Epic", income: 4 },
        { name: "Glow Beetle", emoji: "🪲", rarity: "Rare", income: 3 },
        { name: "Storm Eagle", emoji: "🦅", rarity: "Epic", income: 4 },
        { name: "Sparkle Hare", emoji: "🐇", rarity: "Rare", income: 3 },
        { name: "Frost Lynx", emoji: "🐈‍⬛", rarity: "Epic", income: 4 },
        { name: "Thunder Pup", emoji: "🐕‍🦺", rarity: "Epic", income: 4 }
    ],


    /* 
        -------------------------------------------------------------------------
        MYSTIC EGG → epic / legendary high-income creatures
        -------------------------------------------------------------------------
    */
    mystic: [
        { name: "Nebula Dragon", emoji: "🐲", rarity: "Legendary", income: 6 },
        { name: "Void Phoenix", emoji: "🕊️", rarity: "Legendary", income: 6 },
        { name: "Aurora Serpent", emoji: "🐍", rarity: "Epic", income: 5 },
        { name: "Starlight Tiger", emoji: "🐅", rarity: "Legendary", income: 6 },
        { name: "Cosmic Panda", emoji: "🐼", rarity: "Epic", income: 5 },
        { name: "Galaxy Lion", emoji: "🦁", rarity: "Legendary", income: 6 },
        { name: "Mystic Gryphon", emoji: "🦅🦁", rarity: "Legendary", income: 6 },
        { name: "Astral Deer", emoji: "🦌", rarity: "Epic", income: 5 },
        { name: "Eclipse Fox", emoji: "🦊🌑", rarity: "Epic", income: 5 },
        { name: "Comet Wolf", emoji: "🐺✨", rarity: "Legendary", income: 6 }
    ]
};
