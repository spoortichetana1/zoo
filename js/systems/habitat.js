/* 
    =============================================================================
    FANTASY ZOO - HABITAT SYSTEM (js/systems/habitat.js)
    =============================================================================
    RESPONSIBILITY:
    ---------------
    This system manages HABITATS and how animals interact with them:

      1. Defines habitat "zones" (Forest, Desert, Ocean, Arctic, Mystic).
      2. Lets animals be assigned to a habitat.
      3. Applies small happiness bonuses/penalties based on how well an
         animal fits its habitat (using fromEggType as a proxy).

    IMPORTANT:
    ----------
    - This is a **supporting system**. It does NOT:
        * Render UI.
        * Attach button listeners.
        * Directly change coin income.
    - Instead, it updates:
        * animal.habitat                (string: "forest", "desert", etc.)
        * animal.habitatBonusMultiplier (number, e.g. 1.2 or 0.8 → for future use)
        * animal.happiness              (small adjustments each tick)
    - EconomySystem currently does not read habitatBonusMultiplier, but that
      can be added later. This file is written so it does NOT break current
      behavior.

    WHERE IT'S USED:
    ----------------
    - main.js:
        → calls HabitatSystem.tick() once per game tick.
    - ui.js:
        → in the future, you can add buttons like "Send to Forest Habitat"
          that call HabitatSystem.assignToHabitat(animalId, habitatKey).

    GAMESTATE FIELDS USED:
    ----------------------
    - GameState.animals[]    : array of animal objects.
    - GameState.habitats     : object containing habitat state (created here if missing).

    ANIMAL FIELDS USED/CREATED:
    ---------------------------
    - animal.habitat                : "forest" | "desert" | "ocean" | "arctic" | "mystic" | null
    - animal.fromEggType            : "common" | "rare" | "mystic" (set in HatchingSystem)
    - animal.happiness              : number (0–100) → small changes here
    - animal.habitatBonusMultiplier : number (default 1.0)
*/


(function () {
    "use strict";

    const GS = window.GameState;
    const U  = window.Utils;

    if (!GS) {
        console.warn("HabitatSystem: GameState is not defined. Check js/state.js load order.");
    }
    if (!U) {
        console.warn("HabitatSystem: Utils is not defined. Check js/utils.js load order.");
    }

    // =========================================================================
    // HABITAT CONFIGURATION
    // =========================================================================
    /*
        This describes all habitats available in the game.

        For each habitat:
          key               : used in code (e.g. "forest")
          name              : human-readable name
          baseCapacity      : how many animals can live here at level 1
          capacityPerLevel  : extra capacity per level (for future upgrades)
          supportedEggTypes : which egg types are a "good fit" here
          bonusMultiplier   : recommended income bonus for good fit (future)
          penaltyMultiplier : recommended income penalty for bad fit (future)
    */

    const HabitatConfig = [
        {
            key: "forest",
            name: "Forest Habitat",
            baseCapacity: 6,
            capacityPerLevel: 2,
            supportedEggTypes: ["common", "rare"],
            bonusMultiplier: 1.2,
            penaltyMultiplier: 0.9
        },
        {
            key: "desert",
            name: "Desert Habitat",
            baseCapacity: 4,
            capacityPerLevel: 1,
            supportedEggTypes: ["rare"],
            bonusMultiplier: 1.2,
            penaltyMultiplier: 0.9
        },
        {
            key: "ocean",
            name: "Ocean Habitat",
            baseCapacity: 5,
            capacityPerLevel: 2,
            supportedEggTypes: ["common", "rare"],
            bonusMultiplier: 1.2,
            penaltyMultiplier: 0.9
        },
        {
            key: "arctic",
            name: "Arctic Habitat",
            baseCapacity: 4,
            capacityPerLevel: 1,
            supportedEggTypes: ["rare"],
            bonusMultiplier: 1.2,
            penaltyMultiplier: 0.9
        },
        {
            key: "mystic",
            name: "Mystic Sanctuary",
            baseCapacity: 3,
            capacityPerLevel: 1,
            supportedEggTypes: ["mystic"],
            bonusMultiplier: 1.3,
            penaltyMultiplier: 0.85
        }
    ];

    // Expose config globally if you ever want to use it elsewhere.
    window.HabitatConfig = HabitatConfig;

    // =========================================================================
    // INTERNAL HELPER: ensureHabitatState()
    // =========================================================================
    /*
        Ensures GameState.habitats has the correct structure.

        After this runs, GS.habitats will look like:
            {
              forest: { key, level, capacity, animalIds: [] },
              desert: { ... },
              ...
            }

        - level     : habitat level (start at 1; upgrade system can change later)
        - capacity  : how many animals can be assigned at current level
        - animalIds : array of animal IDs currently assigned to this habitat
    */
    function ensureHabitatState() {
        if (!GS.habitats || typeof GS.habitats !== "object") {
            GS.habitats = {};
        }

        HabitatConfig.forEach(cfg => {
            if (!GS.habitats[cfg.key]) {
                GS.habitats[cfg.key] = {
                    key: cfg.key,
                    level: 1,
                    capacity: cfg.baseCapacity,
                    animalIds: []
                };
            } else {
                // Ensure important fields exist and are valid
                const h = GS.habitats[cfg.key];
                if (typeof h.level !== "number" || h.level < 1) {
                    h.level = 1;
                }
                if (!Array.isArray(h.animalIds)) {
                    h.animalIds = [];
                }
                // Recalculate capacity in case level changed somehow
                h.capacity = cfg.baseCapacity + (h.level - 1) * cfg.capacityPerLevel;
            }
        });
    }

    // =========================================================================
    // INTERNAL HELPER: getHabitatByKey(key)
    // =========================================================================
    function getHabitatByKey(key) {
        ensureHabitatState();
        return GS.habitats[key] || null;
    }

    // =========================================================================
    // INTERNAL HELPER: getHabitatConfig(key)
    // =========================================================================
    function getHabitatConfig(key) {
        return HabitatConfig.find(cfg => cfg.key === key) || null;
    }

    // =========================================================================
    // PUBLIC FUNCTION: assignToHabitat(animalId, habitatKey)
    // =========================================================================
    /*
        Assigns an animal to a specific habitat.

        This is intended to be called from UI.js when you add habitat buttons,
        e.g. "Move to Forest Habitat".

        STEPS:
        ------
        1. Ensure habitat state is initialized.
        2. Find animal by ID.
        3. Find habitat by key.
        4. Check capacity (number of animals in habitat < capacity).
        5. Remove animal from any previous habitat (if assigned).
        6. Add its ID to the new habitat's animalIds.
        7. Set animal.habitat = habitatKey.
        8. Set animal.habitatBonusMultiplier default (1.0 for now).
        9. Return true on success, false on failure.
    */
    function assignToHabitat(animalId, habitatKey) {
        if (!GS || !Array.isArray(GS.animals)) {
            console.warn("HabitatSystem.assignToHabitat: GameState.animals missing or invalid.");
            return false;
        }

        ensureHabitatState();

        const idStr = String(animalId);
        const animal = GS.animals.find(a => String(a.id) === idStr);

        if (!animal) {
            console.warn("HabitatSystem.assignToHabitat: No animal found with id =", animalId);
            return false;
        }

        const habitat = getHabitatByKey(habitatKey);
        const cfg = getHabitatConfig(habitatKey);

        if (!habitat || !cfg) {
            console.warn(`HabitatSystem.assignToHabitat: Unknown habitat key '${habitatKey}'.`);
            return false;
        }

        // Ensure capacity calculation is up-to-date
        habitat.capacity = cfg.baseCapacity + (habitat.level - 1) * cfg.capacityPerLevel;

        // Check capacity: how many animals are currently in this habitat?
        // We only count animals that still exist.
        const existingIds = habitat.animalIds.filter(id =>
            GS.animals.some(a => String(a.id) === String(id))
        );
        habitat.animalIds = existingIds;

        if (existingIds.length >= habitat.capacity) {
            console.warn(
                `HabitatSystem.assignToHabitat: '${cfg.name}' is full ` +
                `(capacity ${habitat.capacity}).`
            );
            return false;
        }

        // Remove animal from any previous habitat
        if (animal.habitat) {
            const oldHabitat = getHabitatByKey(animal.habitat);
            if (oldHabitat && Array.isArray(oldHabitat.animalIds)) {
                oldHabitat.animalIds = oldHabitat.animalIds.filter(id => String(id) !== idStr);
            }
        }

        // Add animal to new habitat
        habitat.animalIds.push(animal.id);
        animal.habitat = habitatKey;

        // Start with neutral bonus multiplier (1.0).
        // tick() will adjust this based on fit.
        if (typeof animal.habitatBonusMultiplier !== "number") {
            animal.habitatBonusMultiplier = 1.0;
        }

        console.log(
            `HabitatSystem: Assigned '${animal.name}' to ${cfg.name} (${habitatKey}).`
        );

        return true;
    }

    // =========================================================================
    // INTERNAL: cleanUpHabitatAssignments()
    // =========================================================================
    /*
        Ensures habitat.animalIds do not contain animals that no longer exist
        in GameState.animals.

        This is helpful when animals are sold or removed; we don't want
        stale IDs sitting in habitats.
    */
    function cleanUpHabitatAssignments() {
        if (!GS || !Array.isArray(GS.animals)) return;
        ensureHabitatState();

        // Build a set of existing IDs for quick lookup
        const existingIds = new Set(GS.animals.map(a => String(a.id)));

        HabitatConfig.forEach(cfg => {
            const habitat = GS.habitats[cfg.key];
            if (!habitat || !Array.isArray(habitat.animalIds)) return;

            habitat.animalIds = habitat.animalIds.filter(id =>
                existingIds.has(String(id))
            );
        });
    }

    // =========================================================================
    // INTERNAL: applyHabitatEffects()
    // =========================================================================
    /*
        Applies small happiness changes and sets habitatBonusMultiplier for
        each animal based on how well the habitat fits.

        RULES:
        ------
        - If animal.habitat is null/undefined:
             * habitatBonusMultiplier = 1.0
             * small happiness penalty over time (they prefer a habitat).
        - If animal.habitat exists:
             * Find HabitatConfig for that key.
             * If animal.fromEggType is in cfg.supportedEggTypes:
                   → GOOD FIT:
                       - habitatBonusMultiplier = cfg.bonusMultiplier
                       - small happiness boost (+1)
             * Else:
                   → BAD FIT:
                       - habitatBonusMultiplier = cfg.penaltyMultiplier
                       - small happiness penalty (-1)

        NOTE:
        -----
        - Happiness adjustments are clamped between 0 and 100 using Utils.clamp
          when available.
        - Right now, EconomySystem does NOT use habitatBonusMultiplier; this
          is future-ready but harmless.
    */
    function applyHabitatEffects() {
        if (!GS || !Array.isArray(GS.animals)) return;

        GS.animals.forEach(animal => {
            // Ensure habitatBonusMultiplier exists
            if (typeof animal.habitatBonusMultiplier !== "number") {
                animal.habitatBonusMultiplier = 1.0;
            }

            // If the animal has no habitat
            if (!animal.habitat) {
                // Neutral multiplier
                animal.habitatBonusMultiplier = 1.0;

                // Small happiness penalty for not having a home (optional)
                if (typeof animal.happiness === "number") {
                    const newH = animal.happiness - 0.5; // very small change
                    if (U && typeof U.clamp === "function") {
                        animal.happiness = U.clamp(newH, 0, 100);
                    } else {
                        animal.happiness = Math.max(0, newH);
                    }
                }

                return; // Nothing more to do
            }

            const cfg = getHabitatConfig(animal.habitat);
            if (!cfg) {
                // Unknown habitat key; treat as no habitat
                animal.habitatBonusMultiplier = 1.0;
                return;
            }

            // Determine egg type for compatibility check
            const eggType = animal.fromEggType || "common";

            const isGoodFit = cfg.supportedEggTypes.includes(eggType);

            if (isGoodFit) {
                // Good fit → bonus multiplier & small happiness boost
                animal.habitatBonusMultiplier = cfg.bonusMultiplier;

                if (typeof animal.happiness === "number") {
                    const newH = animal.happiness + 1;
                    if (U && typeof U.clamp === "function") {
                        animal.happiness = U.clamp(newH, 0, 100);
                    } else {
                        animal.happiness = Math.min(100, newH);
                    }
                }
            } else {
                // Bad fit → penalty multiplier & small happiness loss
                animal.habitatBonusMultiplier = cfg.penaltyMultiplier;

                if (typeof animal.happiness === "number") {
                    const newH = animal.happiness - 1;
                    if (U && typeof U.clamp === "function") {
                        animal.happiness = U.clamp(newH, 0, 100);
                    } else {
                        animal.happiness = Math.max(0, newH);
                    }
                }
            }
        });
    }

    // =========================================================================
    // PUBLIC FUNCTION: tick()
    // =========================================================================
    /*
        Called once per game tick from main.js.

        This function:
          1. Ensures habitat state is valid.
          2. Cleans up assignments to remove stale IDs.
          3. Applies habitat-based bonuses/penalties.

        It does NOT:
          - Render anything.
          - Move animals automatically between habitats.
    */
    function tick() {
        if (!GS) return;

        ensureHabitatState();
        cleanUpHabitatAssignments();
        applyHabitatEffects();
    }

    // =========================================================================
    // PUBLIC EXPORT
    // =========================================================================
    /*
        Expose HabitatSystem globally with:

            HabitatSystem.tick()
            HabitatSystem.assignToHabitat(animalId, habitatKey)

        UI.js can later call assignToHabitat to support manual placement.
    */
    window.HabitatSystem = {
        tick,
        assignToHabitat
    };
})();
