/* 
    =============================================================================
    FANTASY ZOO - PRESTIGE SYSTEM (js/systems/prestige.js)
    =============================================================================
    RESPONSIBILITY:
    ---------------
    This system handles EVERYTHING related to "prestiging" the zoo:

      - Checking if the player is allowed to prestige.
      - Resetting the zoo (coins, animals, eggs, queues, etc.).
      - Granting permanent long-term bonuses for future runs.
      - Recording the finished run into the leaderboard.

    WHAT IS "PRESTIGE" IN THIS GAME?
    --------------------------------
    - The player reaches a strong zoo state (enough coins / animals).
    - They choose to prestige:
        ✔ Current run is saved to leaderboard as a "finished zoo".
        ✔ The zoo is RESET back to early game.
        ✔ The player gains "prestige bonuses" that make the next run stronger.

    WHAT THIS FILE DOES **NOT** DO:
    --------------------------------
    - Does NOT render any UI (no DOM code here).
    - Does NOT attach button listeners.
      (UI.js will later call PrestigeSystem.canPrestige() and PrestigeSystem.doPrestige().)
    - Does NOT control income each tick (EconomySystem does that).
      It just sets long-term multipliers / counters.

    GAMESTATE FIELDS USED / CREATED:
    --------------------------------
    - GameState.coins
    - GameState.animals
    - GameState.eggs
    - GameState.bathQueue
    - GameState.currentBath
    - GameState.habitats
    - GameState.leaderboard
    - GameState.events
    - GameState.clinicQueue
    - GameState.currentPatient
    - GameState.modifiers
        * globalPrestigeMultiplier  (income bonus from prestiges)
    - GameState.prestige
        {
          count: number,
          totalPrestigePoints: number,
          lastPrestigeTime: number
        }
    - GameState.runStartTime   (optional, used to estimate run duration)

    PUBLIC API:
    -----------
      - PrestigeSystem.canPrestige()
      - PrestigeSystem.doPrestige()

    RETURN VALUES:
    --------------
      - canPrestige() → boolean
      - doPrestige():
            {
              success: boolean,
              reason?: string,  // only if success === false
              summary?: {...}   // run summary saved to leaderboard (if success)
            }
*/


(function () {
    "use strict";

    const GS = window.GameState;
    const U  = window.Utils;

    if (!GS) {
        console.warn("PrestigeSystem: GameState is not defined. Check js/state.js load order.");
    }
    if (!U) {
        console.warn("PrestigeSystem: Utils is not defined. Check js/utils.js load order.");
    }

    // =========================================================================
    // CONFIGURATION CONSTANTS
    // =========================================================================

    /*
        STARTING_COINS_AFTER_PRESTIGE:
        ------------------------------
        How many coins the player starts with on a *fresh* run after prestige.
        You can tweak this anytime.
    */
    const STARTING_COINS_AFTER_PRESTIGE = 100;

    /*
        PRESTIGE REQUIREMENTS:
        ----------------------
        Simple rules to decide when a player is allowed to prestige.

        - MIN_COINS_FOR_PRESTIGE:
            * Minimum current coins required.
        - MIN_ANIMALS_FOR_PRESTIGE:
            * Minimum number of animals in the zoo.

        These are deliberately small for testing. You can increase them later.
    */
    const MIN_COINS_FOR_PRESTIGE   = 200;
    const MIN_ANIMALS_FOR_PRESTIGE = 3;

    /*
        PRESTIGE_REWARD_INCOME_BOOST_PER_PRESTIGE:
        ------------------------------------------
        Each prestige gives a permanent global income boost.

        Example:
            0.10 → +10% income each prestige
            after 3 prestiges → +30% permanent global income boost

        Stored in:
            GameState.modifiers.globalPrestigeMultiplier
    */
    const PRESTIGE_REWARD_INCOME_BOOST_PER_PRESTIGE = 0.10;

    // =========================================================================
    // INTERNAL: ensurePrestigeState()
    // =========================================================================
    /*
        Makes sure GameState.prestige and GameState.modifiers exist and
        have safe defaults.

        GameState.prestige structure:
            {
                count: number,              // how many times player has prestiged
                totalPrestigePoints: number,// can be used later for shop
                lastPrestigeTime: number    // timestamp in ms
            }

        GameState.modifiers:
            {
                globalPrestigeMultiplier: number
            }
    */
    function ensurePrestigeState() {
        if (!GS.prestige || typeof GS.prestige !== "object") {
            GS.prestige = {
                count: 0,
                totalPrestigePoints: 0,
                lastPrestigeTime: 0
            };
        } else {
            if (typeof GS.prestige.count !== "number") GS.prestige.count = 0;
            if (typeof GS.prestige.totalPrestigePoints !== "number") {
                GS.prestige.totalPrestigePoints = 0;
            }
            if (typeof GS.prestige.lastPrestigeTime !== "number") {
                GS.prestige.lastPrestigeTime = 0;
            }
        }

        if (!GS.modifiers || typeof GS.modifiers !== "object") {
            GS.modifiers = {};
        }
        if (typeof GS.modifiers.globalPrestigeMultiplier !== "number") {
            GS.modifiers.globalPrestigeMultiplier = 1.0; // base multiplier = 1x
        }
    }

    // =========================================================================
    // INTERNAL: ensureLeaderboard()
    // =========================================================================
    /*
        Makes sure GameState.leaderboard is an array.
    */
    function ensureLeaderboard() {
        if (!Array.isArray(GS.leaderboard)) {
            GS.leaderboard = [];
        }
    }

    // =========================================================================
    // PUBLIC: canPrestige()
    // =========================================================================
    /*
        Checks whether the player is allowed to prestige RIGHT NOW.

        Conditions:
        -----------
        - GameState exists and animals array exists.
        - coins >= MIN_COINS_FOR_PRESTIGE
        - animals.length >= MIN_ANIMALS_FOR_PRESTIGE

        Returns:
        --------
        boolean:
            true  → allowed to prestige
            false → not yet allowed
    */
    function canPrestige() {
        if (!GS || !Array.isArray(GS.animals)) return false;

        const coins = Number(GS.coins) || 0;
        const animalCount = GS.animals.length;

        if (coins < MIN_COINS_FOR_PRESTIGE) return false;
        if (animalCount < MIN_ANIMALS_FOR_PRESTIGE) return false;

        return true;
    }

    // =========================================================================
    // INTERNAL: rarityRank(rarityString)
    // =========================================================================
    /*
        Helper function to convert rarity strings into numeric ranks so we
        can compare which rarity is "highest".

        Order (low → high):
            Common (1)
            Uncommon (2)
            Rare (3)
            Epic (4)
            Legendary (5)

        If string not recognized, treat as 0 (lowest).
    */
    function rarityRank(r) {
        if (!r) return 0;
        const val = String(r).toLowerCase();
        switch (val) {
            case "common":    return 1;
            case "uncommon":  return 2;
            case "rare":      return 3;
            case "epic":      return 4;
            case "legendary": return 5;
            default:          return 0;
        }
    }

    // =========================================================================
    // INTERNAL: buildRunSummary()
    // =========================================================================
    /*
        Before resetting the zoo, we capture a summary of the current run
        so it can be pushed into the leaderboard.

        Fields in summary:
        ------------------
        {
            coins: number,             // coins at prestige time
            maxCoins: number,          // best guess (we use coins if no tracking)
            petsHatched: number,       // number of animals at prestige time
            highestRarity: string,     // highest rarity present
            prestigesBefore: number,   // GS.prestige.count BEFORE this prestige
            prestigesAfter: number,    // GS.prestige.count AFTER (filled later)
            timePlayed: number         // ms (approx, based on runStartTime)
        }

        NOTE:
        -----
        - We don't yet track maxCoins or total pets hatched separately, so we
          approximate using current values.
    */
    function buildRunSummary() {
        ensurePrestigeState();
        ensureLeaderboard();

        const coins = Number(GS.coins) || 0;

        // Approximate maxCoins as current coins (you can improve later)
        const maxCoins = coins;

        // Pets hatched: approximate with current animal count for now
        const petsHatched = Array.isArray(GS.animals) ? GS.animals.length : 0;

        // Highest rarity among current animals
        let highestRank = 0;
        let highestRarity = "Unknown";
        if (Array.isArray(GS.animals)) {
            GS.animals.forEach(animal => {
                const r = rarityRank(animal.rarity);
                if (r > highestRank) {
                    highestRank = r;
                    highestRarity = animal.rarity || "Unknown";
                }
            });
        }

        // Rough timePlayed in ms
        const now = U && typeof U.now === "function" ? U.now() : Date.now();
        const runStart = typeof GS.runStartTime === "number" ? GS.runStartTime : now;
        const timePlayed = Math.max(0, now - runStart);

        const summary = {
            coins,
            maxCoins,
            petsHatched,
            highestRarity,
            prestigesBefore: GS.prestige.count,
            prestigesAfter: GS.prestige.count + 1, // will be true after prestige
            timePlayed
        };

        return summary;
    }

    // =========================================================================
    // INTERNAL: applyPrestigeRewards()
    // =========================================================================
    /*
        Applies permanent bonuses gained from ONE prestige.

        Current design:
        ---------------
        - +1 to GS.prestige.count
        - +1 prestige point to GS.prestige.totalPrestigePoints
        - Increases GS.modifiers.globalPrestigeMultiplier by a fixed amount.

        Example:
            multiplier starts at 1.0
            after 1st prestige: 1.1
            after 2nd prestige: 1.2
            etc.

        NOTE:
        -----
        This multiplier is just stored here. To actually affect income,
        EconomySystem needs to multiply animal income (or total income) by
        this value (you can add that later).
    */
    function applyPrestigeRewards() {
        ensurePrestigeState();

        GS.prestige.count += 1;
        GS.prestige.totalPrestigePoints += 1;
        GS.prestige.lastPrestigeTime = U && typeof U.now === "function" ? U.now() : Date.now();

        // Increase global income multiplier
        const currentMult = Number(GS.modifiers.globalPrestigeMultiplier) || 1.0;
        const newMult = currentMult + PRESTIGE_REWARD_INCOME_BOOST_PER_PRESTIGE;
        GS.modifiers.globalPrestigeMultiplier = newMult;
    }

    // =========================================================================
    // INTERNAL: resetZooForNewRun()
    // =========================================================================
    /*
        Actually wipes the zoo state and prepares a fresh run.

        It resets:
        ---------
        - coins (to STARTING_COINS_AFTER_PRESTIGE)
        - animals
        - eggs
        - bathQueue + currentBath
        - clinicQueue + currentPatient
        - habitats
        - events (active + history)
        - incomePerSecond
        - lastTick
        - runStartTime (set to now)

        It does NOT reset:
        ------------------
        - leaderboard
        - prestige counters
        - globalPrestigeMultiplier
        - EggData / AnimalPools (game config)
    */
    function resetZooForNewRun() {
        // Reset basic economy
        GS.coins = STARTING_COINS_AFTER_PRESTIGE;
        GS.incomePerSecond = 0;

        // Clear animals & eggs
        GS.animals = [];
        GS.eggs = [];

        // Clear bath house
        GS.bathQueue = [];
        GS.currentBath = null;

        // Clear clinic
        GS.clinicQueue = [];
        GS.currentPatient = null;

        // Reset habitats (we keep structure but remove assignments)
        if (GS.habitats && typeof GS.habitats === "object") {
            Object.keys(GS.habitats).forEach(key => {
                const h = GS.habitats[key];
                if (h && Array.isArray(h.animalIds)) {
                    h.animalIds = [];
                }
                // Keep habitat level & capacity as they might be upgraded later
            });
        }

        // Reset events state
        if (!GS.events || typeof GS.events !== "object") {
            GS.events = {};
        }
        GS.events.activeEvents = [];
        GS.events.history = [];
        GS.events.lastEventTime = 0;

        // Reset timing helpers
        const now = U && typeof U.now === "function" ? U.now() : Date.now();
        GS.lastTick = now;
        GS.runStartTime = now;

        console.log("PrestigeSystem: Zoo has been reset for a new run.");
    }

    // =========================================================================
    // PUBLIC: doPrestige()
    // =========================================================================
    /*
        Executes a full prestige if conditions are met.

        STEPS:
        ------
        1. Check canPrestige(). If false → return { success:false, reason:"..." }.
        2. Build run summary for leaderboard.
        3. Apply prestige rewards (increase count, points, multiplier).
        4. Push run summary (with updated prestigesAfter) into leaderboard.
        5. Reset zoo state for new run.
        6. Return { success:true, summary: runSummary }.

        RETURNS:
        --------
        {
            success: boolean,
            reason?: string,
            summary?: {...}
        }
    */
    function doPrestige() {
        if (!GS) {
            return {
                success: false,
                reason: "GameState is missing."
            };
        }

        if (!canPrestige()) {
            return {
                success: false,
                reason: "Prestige requirements not met yet."
            };
        }

        ensurePrestigeState();
        ensureLeaderboard();

        // 2) Build run summary BEFORE we change anything
        const summary = buildRunSummary();

        // 3) Apply prestige rewards (increase count, multiplier, etc.)
        applyPrestigeRewards();

        // Update summary's 'prestigesAfter' to match new count
        summary.prestigesAfter = GS.prestige.count;

        // 4) Add summary to leaderboard
        GS.leaderboard.push(summary);

        // 5) Reset zoo for the next run
        resetZooForNewRun();

        console.log(
            `PrestigeSystem: Prestige completed! Total prestiges = ${GS.prestige.count}, ` +
            `globalPrestigeMultiplier = ${GS.modifiers.globalPrestigeMultiplier}.`
        );

        return {
            success: true,
            summary
        };
    }

    // =========================================================================
    // PUBLIC EXPORT
    // =========================================================================
    /*
        Expose PrestigeSystem globally so UI and other code can use it.

        Available methods:
            - PrestigeSystem.canPrestige()
            - PrestigeSystem.doPrestige()
    */
    window.PrestigeSystem = {
        canPrestige,
        doPrestige
    };
})();
