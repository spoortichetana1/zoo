/* 
    =============================================================================
    FANTASY ZOO - HATCHING SYSTEM (js/systems/hatching.js)
    =============================================================================
    RESPONSIBILITY:
    ---------------
    This system:

      1. Watches all eggs in GameState.eggs.
      2. Checks if their hatch timer is complete.
      3. When ready, converts an egg into a NEW ANIMAL INSTANCE and pushes it
         into GameState.animals with all the default fields set.

    IMPORTANT:
    ----------
    - It does NOT render anything.
    - It does NOT handle buying eggs (EconomySystem.buyEgg does that).
    - It does NOT control coins.

    DATA IT USES:
    -------------
    - GameState.eggs[]:
          [
            {
              id: "egg-...",
              type: "common" | "rare" | "mystic",
              start: <timestamp ms>,
              hatchTime: <ms duration>
            },
            ...
          ]

    - EggData (from eggs.js):
          EggData[typeKey] = { name, type, price, hatchTime, ... }

    - AnimalPools (from animals.js):
          AnimalPools[typeKey] = [
            { name, emoji, rarity, income },
            ...
          ]

    PER-ANIMAL DEFAULTS (IMPORTANT):
    --------------------------------
    When we create an "animal instance", we MUST set:

      - id: unique ID (string)
      - name: from pool template
      - emoji: from pool template
      - rarity: from pool template
      - income: base income per second from template

      - hunger: 100
      - cleanliness: 100
      - happiness: 70
      - healthStatus: "healthy"
      - neglectTicks: 0

      - habitat: null
      - habitatBonusMultiplier: 1

      - happinessIncomeMultiplier: 1
      - effectiveIncome: baseIncome * 1

      - fromEggType: "common" | "rare" | "mystic"

      - createdAt: timestamp ms
*/


(function () {
    "use strict";

    const GS = window.GameState;
    const U  = window.Utils;

    if (!GS) {
        console.warn("HatchingSystem: GameState is not defined. Check js/state.js load order.");
    }
    if (!U) {
        console.warn("HatchingSystem: Utils is not defined. Check js/utils.js load order.");
    }
    if (!window.EggData) {
        console.warn("HatchingSystem: EggData is not defined. Check js/eggs.js load order.");
    }
    if (!window.AnimalPools) {
        console.warn("HatchingSystem: AnimalPools is not defined. Check js/animals.js load order.");
    }

    // =========================================================================
    // INTERNAL HELPERS
    // =========================================================================

    /*
        getAnimalPoolForEggType(typeKey):
        ---------------------------------
        Maps egg type to a pool of animal templates.

        - typeKey is usually "common", "rare", "mystic".
        - AnimalPools[typeKey] should be an array of templates.

        If something is missing, returns an empty array so we fail safely.
    */
    function getAnimalPoolForEggType(typeKey) {
        const pools = window.AnimalPools || {};
        const pool = pools[typeKey];

        if (Array.isArray(pool) && pool.length > 0) {
            return pool;
        }

        console.warn(
            `HatchingSystem: No animal pool found for egg type '${typeKey}'. ` +
            "Check animals.js."
        );
        return [];
    }

    /*
        createAnimalFromEgg(egg):
        --------------------------
        Converts ONE egg instance into ONE animal instance.

        STEPS:
        ------
        1. Look up pool → AnimalPools[egg.type].
        2. Pick a random template from that pool.
        3. Build a NEW object that copies template fields and adds:
             - id
             - fromEggType
             - per-animal default stats (hunger, cleanliness, etc.)
        4. Push into GameState.animals.
    */
    function createAnimalFromEgg(egg) {
        if (!GS || !Array.isArray(GS.animals)) {
            console.warn("HatchingSystem.createAnimalFromEgg: GameState.animals not ready.");
            return;
        }

        const typeKey = egg.type || "common";
        const pool = getAnimalPoolForEggType(typeKey);

        if (pool.length === 0) {
            // If we have no animals for this egg, we simply skip hatching.
            return;
        }

        // Pick a random template from pool
        const template = (U && typeof U.randomChoice === "function")
            ? U.randomChoice(pool)
            : pool[Math.floor(Math.random() * pool.length)];

        if (!template) {
            console.warn("HatchingSystem.createAnimalFromEgg: No template selected from pool.");
            return;
        }

        const now = (U && typeof U.now === "function") ? U.now() : Date.now();

        // Base income from template (coins per second)
        const baseIncome = Number(template.income) || 0;

        // ---------------------------------------------------------------------
        // BUILD THE NEW ANIMAL INSTANCE
        // ---------------------------------------------------------------------
        const animalInstance = {
            // Identity
            id: (U && typeof U.id === "function") ? U.id("animal") : `animal-${now}-${Math.random()}`,
            name: template.name || "Unknown Creature",
            emoji: template.emoji || "🐾",
            rarity: template.rarity || "Common",

            // Base economy
            income: baseIncome,

            // CARE STATS (defaults requested by you)
            hunger: 100,        // fully fed
            cleanliness: 100,   // sparkling clean
            happiness: 70,      // comfortably happy
            healthStatus: "healthy",
            neglectTicks: 0,

            // HABITAT
            habitat: null,                 // not assigned yet
            habitatBonusMultiplier: 1,     // neutral until HabitatSystem adjusts

            // HAPPINESS → INCOME MULTIPLIERS
            happinessIncomeMultiplier: 1,  // neutral bonus
            effectiveIncome: baseIncome,   // base * 1 (other systems may override)

            // META
            fromEggType: typeKey,          // "common" | "rare" | "mystic"
            createdAt: now
        };

        GS.animals.push(animalInstance);

        console.log(
            `HatchingSystem: Egg '${egg.id}' hatched into '${animalInstance.name}' ` +
            `(${animalInstance.rarity}), income=${animalInstance.income}.`
        );
    }

    // =========================================================================
    // PUBLIC FUNCTION: tick()
    // =========================================================================

    /*
        tick():
        -------
        Called once per game tick from main.js.

        It loops over all eggs and checks if they are ready to hatch.

        Egg shape:
            {
              id: "egg-...",
              type: "common" | "rare" | "mystic",
              start: <timestamp ms when incubation started>,
              hatchTime: <ms duration>
            }

        For each egg:
          - If now - start >= hatchTime:
                → createAnimalFromEgg(egg)
                → remove egg from GameState.eggs
    */
    function tick() {
        if (!GS || !Array.isArray(GS.eggs)) {
            return; // No eggs yet – nothing to do.
        }

        const now = (U && typeof U.now === "function") ? U.now() : Date.now();

        // We will build a NEW array of eggs that should remain after hatching.
        const remainingEggs = [];

        for (let i = 0; i < GS.eggs.length; i++) {
            const egg = GS.eggs[i];

            const start = Number(egg.start) || now;
            const hatchTime = Number(egg.hatchTime) || 0;
            const elapsed = now - start;

            if (elapsed >= hatchTime && hatchTime > 0) {
                // Egg is ready to hatch
                createAnimalFromEgg(egg);
                // Do NOT push this egg into remainingEggs (it is consumed).
            } else {
                // Egg not ready yet → keep it in the incubator
                remainingEggs.push(egg);
            }
        }

        // Replace eggs array with the remaining ones
        GS.eggs = remainingEggs;
    }

    // =========================================================================
    // PUBLIC EXPORT
    // =========================================================================

    /*
        Expose HatchingSystem globally so main.js can call:

            HatchingSystem.tick()
    */
    window.HatchingSystem = {
        tick
    };
})();
