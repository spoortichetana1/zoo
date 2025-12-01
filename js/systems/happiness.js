/* 
    =============================================================================
    FANTASY ZOO - HAPPINESS SYSTEM (js/systems/happiness.js)
    =============================================================================
    RESPONSIBILITY:
    ---------------
    This system manages EACH ANIMAL'S HAPPINESS and translates it into
    INCOME BONUSES or PENALTIES.

    It does two main things:
      1. Every tick:
         - Updates animal.happiness based on how well the pet is cared for
           (hunger, cleanliness, sickness).
      2. Every tick:
         - Computes a happiness-based income multiplier and stores it on the
           animal so other systems (like EconomySystem) can use it.

    IMPORTANT DESIGN NOTE:
    ----------------------
    - To avoid breaking existing logic, this system DOES NOT directly change
      the base animal.income.
    - Instead, it calculates:
          animal.happinessIncomeMultiplier   (e.g. 1.25, 1.0, 0.5)
          animal.effectiveIncome             (income * multiplier)
      and stores these on each animal.
    - The current EconomySystem implementation uses animal.income directly.
      To make happiness affect REAL coins, you can later modify EconomySystem
      to use animal.effectiveIncome instead of animal.income.

    WHAT THIS SYSTEM DOES NOT DO:
    -----------------------------
    - Does NOT render UI.
    - Does NOT attach button listeners.
    - Does NOT directly add or remove coins.
    - Does NOT manage habitats or disease (those systems may ALSO adjust happiness).

    INTERACTION WITH OTHER SYSTEMS:
    -------------------------------
    - FeedingSystem:
        * Increases hunger → this system uses hunger to adjust happiness.
    - CleaningSystem:
        * Increases cleanliness → this system uses cleanliness to adjust happiness.
    - DiseaseSystem:
        * Sets healthStatus = "sick" → this system penalizes happiness if sick.
    - HabitatSystem:
        * May also slightly adjust happiness. Both systems can run safely
          as long as their changes are small per tick.

    GAMESTATE FIELDS USED:
    ----------------------
    - GameState.animals[]  : array of animal objects.

    ANIMAL FIELDS USED / CREATED:
    -----------------------------
    - animal.happiness                   : number (0–100)
    - animal.hunger                      : number (0–100)
    - animal.cleanliness                 : number (0–100)
    - animal.healthStatus                : "healthy" | "sick" (from DiseaseSystem)
    - animal.income                      : base income (from AnimalPools)
    - animal.happinessIncomeMultiplier   : number (e.g. 1.0, 1.25)
    - animal.effectiveIncome             : computed income after happiness bonus
*/


(function () {
    "use strict";

    const GS = window.GameState;
    const U  = window.Utils;

    if (!GS) {
        console.warn("HappinessSystem: GameState is not defined. Check js/state.js load order.");
    }
    if (!U) {
        console.warn("HappinessSystem: Utils is not defined. Check js/utils.js load order.");
    }

    // =========================================================================
    // CONFIGURATION CONSTANTS
    // =========================================================================

    /*
        BASE_HAPPINESS:
        ----------------
        Default happiness for new animals if not set.
        Range is 0–100. 70 is a comfortable "slightly happy" default.
    */
    const BASE_HAPPINESS = 70;

    /*
        HAPPINESS CHANGE RATES:
        -----------------------
        These values control how quickly happiness goes up or down each tick.

        All rates are PER TICK. If your tick is once per second:
          - -1 per tick → -60 per minute (very fast)
          - -0.2 per tick → -12 per minute (slow)

        Make these values small so happiness feels "smooth".
    */
    const PENALTY_PER_TICK_HUNGRY      = -0.7;   // if hunger < HUNGER_OK_THRESHOLD
    const PENALTY_PER_TICK_DIRTY       = -0.7;   // if cleanliness < CLEANLINESS_OK_THRESHOLD
    const PENALTY_PER_TICK_SICK        = -1.0;   // if healthStatus === "sick"
    const BONUS_PER_TICK_WELL_CARED    = +0.5;   // if hunger & cleanliness high and not sick
    const NATURAL_DRIFT_PER_TICK       = -0.05;  // slight natural drift downward

    /*
        THRESHOLDS FOR "OK" CARE:
        -------------------------
        - If hunger >= HUNGER_OK_THRESHOLD → considered well-fed.
        - If cleanliness >= CLEANLINESS_OK_THRESHOLD → considered clean.
    */
    const HUNGER_OK_THRESHOLD       = 70;
    const CLEANLINESS_OK_THRESHOLD  = 70;

    /*
        HAPPINESS BOUNDARIES:
        ---------------------
        Happiness always stays between 0 and 100.
    */
    const HAPPINESS_MIN = 0;
    const HAPPINESS_MAX = 100;

    /*
        Care decay:
        Hunger drifts downward over time so players must feed pets.
    */
    const HUNGER_DECAY_PER_TICK = 0.5; // ~50 seconds to go from 100 to 75

    // =========================================================================
    // HAPPINESS → INCOME MULTIPLIER MAPPING
    // =========================================================================
    /*
        This mapping converts the happiness value into a multiplier:

        happiness >= 90  → 1.3x income  (very happy)
        80–89            → 1.2x
        60–79            → 1.1x
        40–59            → 1.0x        (neutral)
        20–39            → 0.75x       (unhappy)
        < 20             → 0.5x        (very unhappy)

        IMPORTANT:
        ----------
        - These multipliers are stored in:
              animal.happinessIncomeMultiplier
              animal.effectiveIncome
        - EconomySystem currently uses animal.income directly, so the actual
          coin effect will kick in only once you update EconomySystem to use
          animal.effectiveIncome instead.
    */
    function computeHappinessMultiplier(happiness) {
        if (happiness >= 90) return 1.3;
        if (happiness >= 80) return 1.2;
        if (happiness >= 60) return 1.1;
        if (happiness >= 40) return 1.0;
        if (happiness >= 20) return 0.75;
        return 0.5;
    }

    // =========================================================================
    // INTERNAL: updateSingleAnimalHappiness(animal)
    // =========================================================================
    /*
        Applies happiness changes for ONE animal for THIS TICK.

        STEPS:
        ------
        1. Initialize happiness if missing.
        2. Read hunger, cleanliness, sickness flags.
        3. Start with natural drift.
        4. Apply negative penalties if:
             - hunger < HUNGER_OK_THRESHOLD
             - cleanliness < CLEANLINESS_OK_THRESHOLD
             - healthStatus === "sick"
        5. If hunger and cleanliness are both "good" and not sick:
             - apply a small positive bonus (well-cared).
        6. Clamp happiness between 0 and 100.
        7. Compute happinessIncomeMultiplier and effectiveIncome.
        8. Store both on the animal object.
    */
    function updateSingleAnimalHappiness(animal) {
        // 1) Make sure happiness exists
        if (typeof animal.happiness !== "number") {
            animal.happiness = BASE_HAPPINESS;
        }
        if (typeof animal.hunger !== "number") {
            animal.hunger = 100;
        }

        let happiness = animal.happiness;

        // Default to "healthy" if undefined (other systems can set it explicitly)
        const healthStatus = animal.healthStatus || "healthy";

        // Use fallback values if hunger/cleanliness are missing
        let hunger        = Number(animal.hunger ?? 0);
        const cleanliness = Number(animal.cleanliness ?? 0);

        // Hunger naturally decreases over time
        hunger = (U && typeof U.clamp === "function")
            ? U.clamp(hunger - HUNGER_DECAY_PER_TICK, 0, 100)
            : Math.max(0, hunger - HUNGER_DECAY_PER_TICK);
        animal.hunger = hunger;

        // 2) Start with natural drift (slight downward pressure over time)
        happiness += NATURAL_DRIFT_PER_TICK;

        // 3) Penalties for poor care
        if (hunger < HUNGER_OK_THRESHOLD) {
            happiness += PENALTY_PER_TICK_HUNGRY;
        }

        if (cleanliness < CLEANLINESS_OK_THRESHOLD) {
            happiness += PENALTY_PER_TICK_DIRTY;
        }

        if (healthStatus === "sick") {
            happiness += PENALTY_PER_TICK_SICK;
        }

        // 4) Bonus if the animal is in good condition (well-fed, clean, healthy)
        const wellFed    = hunger >= HUNGER_OK_THRESHOLD;
        const wellClean  = cleanliness >= CLEANLINESS_OK_THRESHOLD;
        const isHealthy  = healthStatus !== "sick";

        if (wellFed && wellClean && isHealthy) {
            happiness += BONUS_PER_TICK_WELL_CARED;
        }

        // 5) Clamp happiness into [0, 100]
        if (U && typeof U.clamp === "function") {
            happiness = U.clamp(happiness, HAPPINESS_MIN, HAPPINESS_MAX);
        } else {
            if (happiness < HAPPINESS_MIN) happiness = HAPPINESS_MIN;
            if (happiness > HAPPINESS_MAX) happiness = HAPPINESS_MAX;
        }

        animal.happiness = happiness;

        // 6) Compute the income multiplier and effective income
        const baseIncome = Number(animal.income) || 0;
        const multiplier = computeHappinessMultiplier(happiness);
        const effective = baseIncome * multiplier;

        animal.happinessIncomeMultiplier = multiplier;
        animal.effectiveIncome = effective;
    }

    // =========================================================================
    // PUBLIC FUNCTION: tick()
    // =========================================================================
    /*
        This is the main entry point for HappinessSystem.

        Called once per game tick from main.js.

        For each animal:
          - Update its happiness based on care and health.
          - Compute income multiplier and effective income.

        This function DOES NOT:
          - Render anything.
          - Change any other global fields.
          - Directly add coins.
    */
    function tick() {
        if (!GS || !Array.isArray(GS.animals)) return;

        for (let i = 0; i < GS.animals.length; i++) {
            const animal = GS.animals[i];
            updateSingleAnimalHappiness(animal);
        }
    }

    // =========================================================================
    // PUBLIC EXPORT
    // =========================================================================
    /*
        Expose HappinessSystem globally with:

            HappinessSystem.tick()

        So main.js can call it every tick.
    */
    window.HappinessSystem = {
        tick
    };
})();
