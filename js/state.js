/* 
    ============================================================================
    FANTASY ZOO - GLOBAL GAME STATE (js/state.js)
    ============================================================================
    This file defines the **single source of truth** for the entire game.

    IMPORTANT NOTES:
    ----------------
    - Every system (hatching, feeding, cleaning, economy, happiness, etc.)
      reads and writes from this shared GameState object.
    
    - If the game behaves strangely (wrong coin numbers, pets not showing,
      bath queue not updating, etc.), 90% of the time the issue is:
          ➜ Wrong values stored in GameState
          ➜ A system writing incorrect data
          ➜ Data missing from here
    
    - NOTHING in this file should contain logic. 
      It should ONLY contain the initial state and defaults.
    
    - This file must be loaded before ANY other JS, otherwise GameState
      will be undefined and everything will break.
*/


// ============================================================================
// GLOBAL GAME STATE OBJECT
// This is declared on the window object so all JS files can access it.
// ============================================================================

window.GameState = {

    /* 
        -------------------------
        BASIC CURRENCY & INCOME
        -------------------------

        coins:
            The player's current coin balance. This should always be a number
            and will be updated once per tick by the EconomySystem.

        incomePerSecond:
            The total coins earned per second from all active animals.
            Used ONLY for display; EconomySystem always recalculates it.
    */
    coins: 100,               // Starting amount; adjust anytime
    incomePerSecond: 0,       // Calculated every tick


    /* 
        -------------------------
        EGGS (INCUBATOR)
        -------------------------

        eggs:
            An array of egg objects currently incubating.
            Each egg object will have:
                - id: unique id
                - type: common / rare / mystic
                - start: timestamp when incubation started
                - hatchTime: how long until it hatches (ms)
    */
    eggs: [],


    /* 
        -------------------------
        ANIMALS (ZOO)
        -------------------------

        animals:
            An array of animal objects currently in the zoo.
            Each animal object will contain:
                - id
                - name
                - emoji
                - rarity
                - income
                - hunger (0–100)
                - cleanliness (0–100)
                - happiness (0–100)   [future system]
                - healthStatus        [future system]
                - habitat             [future system]
    */
    animals: [],


    /* 
        -------------------------
        BATH HOUSE QUEUE
        -------------------------

        bathQueue:
            Stores animal IDs waiting for a bath.
            The CleaningSystem processes this array in FIFO order.

        currentBath:
            Object describing the animal currently in the bath.
            Contains:
                - id: animal ID
                - start: timestamp when bath began
            If null → bath is empty.
    */
    bathQueue: [],
    currentBath: null,


    /* 
        -------------------------
        HABITATS (FUTURE SYSTEM)
        -------------------------

        habitats:
            Stores habitat structures like:
            {
                forest: { level: 1, animals: [...] },
                desert: { level: 1, animals: [...] },
                ... etc ...
            }
            For now it starts empty and will be filled once habitat system is added.
    */
    habitats: {},


    /* 
        -------------------------
        LEADERBOARD (LOCAL STORAGE)
        -------------------------

        leaderboard:
            Contains previous run summaries.
            Example:
            [
                {
                    coins: 5000,
                    maxCoins: 9000,
                    petsHatched: 30,
                    highestRarity: "Legendary",
                    prestiges: 2,
                    timePlayed: 600000
                }
            ]
    */
    leaderboard: [],


    /* 
        -------------------------
        GAME TIMESTAMP
        -------------------------

        lastTick:
            Used by main.js to track delta time between ticks.
            While most idle games don't need delta precision, this allows future
            expansion (offline earnings, speed boosts, tick smoothing).
    */
    lastTick: Date.now()
};
