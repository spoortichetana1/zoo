/* 
    =============================================================================
    FANTASY ZOO - DISEASE SYSTEM (js/systems/disease.js)
    =============================================================================
    RESPONSIBILITY:
    ---------------
    This system controls EVERYTHING related to animals getting sick and recovering:
    
      1. SICKNESS LOGIC (passive, automatic):
         - Watches animals each tick.
         - If an animal is neglected (hungry + dirty) for too long,
           it becomes SICK.
         - Sick animals SHOULD earn 0 coins (EconomySystem already checks
           healthStatus === "sick" to block income).

      2. VIRTUAL CLINIC (active, by player):
         - Provides a function: DiseaseSystem.sendToClinicById(animalId)
         - When called:
             ✔ Checks if animal exists and is sick.
             ✔ Checks if player has enough coins.
             ✔ Deducts clinic cost.
             ✔ Adds the animal to a clinic queue.
         - Each tick:
             ✔ If clinic is free and there is a queue → start treating next animal.
             ✔ After treatment duration → set animal back to "healthy".

    WHAT THIS FILE DOES NOT DO:
    ---------------------------
    - Does NOT render UI.
    - Does NOT attach button listeners.
    - Does NOT modify coins/income except for clinic cost.
    
    OTHER FILES INTERACTING WITH THIS:
    ----------------------------------
    - main.js:
        → calls DiseaseSystem.tick() every tick.
    - ui.js:
        → in the future, will call DiseaseSystem.sendToClinicById(animalId)
          when you add a "Send to Clinic" button for sick animals.
    - economy.js:
        → already checks healthStatus === "sick" to block income.
    - render.js:
        → can read animal.healthStatus to show "SICK" label, if you decide.

    IMPORTANT STATE FIELDS USED:
    ----------------------------
    - GameState.animals[]           : array of animal objects
    - GameState.clinicQueue[]      : (created here if missing) waiting animal IDs
    - GameState.currentPatient     : (created here if missing) { id, start, durationMs }
    - For each animal:
          healthStatus  : "healthy" | "sick"
          neglectTicks  : number (tracked only by this system, no UI)
*/


(function () {
    "use strict";

    const GS = window.GameState;
    const U  = window.Utils;

    if (!GS) {
        console.warn("DiseaseSystem: GameState is not defined. Check js/state.js load order.");
    }
    if (!U) {
        console.warn("DiseaseSystem: Utils is not defined. Check js/utils.js load order.");
    }

    // =========================================================================
    // CONFIGURATION CONSTANTS
    // =========================================================================

    /*
        NEGLECT_THRESHOLD_HUNGER / CLEANLINESS:
        ---------------------------------------
        If hunger and cleanliness are both below these values, the animal is
        considered "neglected" for this tick.
    */
    const NEGLECT_THRESHOLD_HUNGER       = 30;  // 0–100 scale
    const NEGLECT_THRESHOLD_CLEANLINESS  = 30;  // 0–100 scale

    /*
        NEGLECT_TICKS_BEFORE_SICK:
        --------------------------
        How many consecutive "neglected" ticks must an animal experience before
        it becomes sick.

        Example:
          Value = 20, tick = 1 second → ~20 seconds of bad care => sickness.
    */
    const NEGLECT_TICKS_BEFORE_SICK = 20;

    /*
        CLINIC_COST_MULTIPLIER:
        -----------------------
        Treatment cost is based on animal income.

        Formula:
            clinicCost = animal.income * CLINIC_COST_MULTIPLIER
    */
    const CLINIC_COST_MULTIPLIER = 25;

    /*
        CLINIC_DURATION_MS:
        -------------------
        How long it takes to cure one animal in the clinic (in ms).

        Works similar to bath duration in CleaningSystem.
    */
    const CLINIC_DURATION_MS = 10000; // 10 seconds per treatment


    // =========================================================================
    // INTERNAL HELPERS
    // =========================================================================

    /*
        ensureClinicState():
        --------------------
        Makes sure GameState.clinicQueue and GameState.currentPatient exist
        with safe defaults.

        This is important because GameState was originally defined without
        clinic fields; we are adding them now in a safe way.
    */
    function ensureClinicState() {
        if (!Array.isArray(GS.clinicQueue)) {
            GS.clinicQueue = [];
        }
        if (typeof GS.currentPatient === "undefined") {
            GS.currentPatient = null;
        }
    }

    /*
        getAnimalById(id):
        ------------------
        Convenience function to find an animal in GameState.animals.
        Returns the animal object or null if not found.
    */
    function getAnimalById(animalId) {
        if (!GS || !Array.isArray(GS.animals)) return null;
        const idStr = String(animalId);
        return GS.animals.find(a => String(a.id) === idStr) || null;
    }

    // =========================================================================
    // SICKNESS CHECK (NEGLECT → SICK)
    // =========================================================================
    /*
        checkAndUpdateSickness():
        -------------------------
        This is called every tick as part of DiseaseSystem.tick().

        For each animal:
          - If healthStatus is undefined, assume "healthy".
          - If already "sick", we don't increment neglectTicks.
          - If "healthy":
              * If hunger < threshold AND cleanliness < threshold:
                    → increment neglectTicks (or set to 1 if undefined).
              * Else:
                    → gently reduce neglectTicks (down toward 0).
              * If neglectTicks >= NEGLECT_TICKS_BEFORE_SICK:
                    → set healthStatus = "sick"
                    → optionally log and reduce happiness.

        NOTE:
        -----
        This is purely an internal mechanic. UI can read healthStatus to show SICK,
        and EconomySystem uses this flag to block income.
    */
    function checkAndUpdateSickness() {
        if (!GS || !Array.isArray(GS.animals)) return;

        for (let i = 0; i < GS.animals.length; i++) {
            const animal = GS.animals[i];

            // Default health status is healthy if not set
            if (!animal.healthStatus) {
                animal.healthStatus = "healthy";
            }

            // If already sick, we don't manipulate neglectTicks here
            if (animal.healthStatus === "sick") {
                continue;
            }

            // Read hunger and cleanliness, with safe defaults
            const hunger      = Number(animal.hunger ?? 0);
            const cleanliness = Number(animal.cleanliness ?? 0);

            // Initialize neglectTicks if missing
            if (typeof animal.neglectTicks !== "number") {
                animal.neglectTicks = 0;
            }

            const isNeglected =
                hunger < NEGLECT_THRESHOLD_HUNGER &&
                cleanliness < NEGLECT_THRESHOLD_CLEANLINESS;

            if (isNeglected) {
                // Animal is neglected this tick; increase neglectTicks
                animal.neglectTicks += 1;
            } else {
                // Animal is being cared for; reduce neglectTicks slowly
                if (animal.neglectTicks > 0) {
                    animal.neglectTicks -= 1;
                }
            }

            // Cap neglectTicks to a reasonable range for safety
            if (animal.neglectTicks < 0) {
                animal.neglectTicks = 0;
            }
            if (animal.neglectTicks > NEGLECT_TICKS_BEFORE_SICK * 2) {
                animal.neglectTicks = NEGLECT_TICKS_BEFORE_SICK * 2;
            }

            // Check if this animal should become sick now
            if (animal.neglectTicks >= NEGLECT_TICKS_BEFORE_SICK) {
                animal.healthStatus = "sick";

                // Optional: penalize happiness
                if (typeof animal.happiness === "number") {
                    const newHappiness = animal.happiness - 15;
                    if (U && typeof U.clamp === "function") {
                        animal.happiness = U.clamp(newHappiness, 0, 100);
                    } else {
                        animal.happiness = Math.max(0, newHappiness);
                    }
                }

                console.log(
                    `DiseaseSystem: '${animal.name}' became SICK due to neglect ` +
                    `(neglectTicks = ${animal.neglectTicks}).`
                );
            }
        }
    }

    // =========================================================================
    // CLINIC TREATMENT TICK
    // =========================================================================
    /*
        processClinic():
        ----------------
        Called every tick as part of DiseaseSystem.tick().
        
        Responsible for:
          - Starting treatment for next sick animal in clinicQueue
            if no currentPatient is being treated.
          - Progressing current treatment based on time.
          - Marking animal as "healthy" when treatment is done.

        STATE FIELDS:
        -------------
        - GameState.clinicQueue   : array of animal IDs waiting for treatment
        - GameState.currentPatient: either null OR
                { id, start, durationMs }
    */
    function processClinic() {
        if (!GS) return;

        ensureClinicState();

        const now = U ? U.now() : Date.now();

        // 1. Start treatment if clinic is free and there are animals waiting
        if (!GS.currentPatient && GS.clinicQueue.length > 0) {
            const nextId = GS.clinicQueue.shift(); // FIFO queue
            GS.currentPatient = {
                id: nextId,
                start: now,
                durationMs: CLINIC_DURATION_MS
            };

            const animal = getAnimalById(nextId);
            if (animal) {
                console.log(
                    `DiseaseSystem: '${animal.name}' entered the clinic for treatment.`
                );
            } else {
                console.warn(
                    "DiseaseSystem.processClinic: Started treatment for missing animal ID =",
                    nextId
                );
            }
        }

        // 2. If we have a current patient, check if treatment is complete
        if (GS.currentPatient) {
            const { id, start, durationMs } = GS.currentPatient;

            const duration = (typeof durationMs === "number" && durationMs > 0)
                ? durationMs
                : CLINIC_DURATION_MS;

            const elapsed = now - start;

            if (elapsed >= duration) {
                // Treatment finished
                const animal = getAnimalById(id);

                if (animal) {
                    animal.healthStatus = "healthy";
                    animal.neglectTicks = 0; // reset neglect

                    // Optional: boost happiness for being cured
                    if (typeof animal.happiness === "number") {
                        const newHappiness = animal.happiness + 10;
                        if (U && typeof U.clamp === "function") {
                            animal.happiness = U.clamp(newHappiness, 0, 100);
                        } else {
                            animal.happiness = Math.min(100, newHappiness);
                        }
                    }

                    console.log(
                        `DiseaseSystem: '${animal.name}' has been cured and is now HEALTHY.`
                    );
                } else {
                    console.warn(
                        "DiseaseSystem.processClinic: Treatment finished, but animal not found for ID =",
                        id
                    );
                }

                // Clear current patient so next sick pet can be treated
                GS.currentPatient = null;
            }
        }
    }

    // =========================================================================
    // PUBLIC FUNCTION: sendToClinicById
    // =========================================================================
    /*
        sendToClinicById(animalId):
        ---------------------------
        Called (in the future) from UI when player clicks "Send to Clinic" on a
        sick animal.

        STEPS:
        ------
        1. Ensure clinic state exists.
        2. Find the animal.
        3. Check that animal is actually sick.
        4. Check it's not already in queue or being treated.
        5. Compute clinic cost:
               cost = animal.income * CLINIC_COST_MULTIPLIER
        6. Ensure player has enough coins.
        7. Deduct coins and add animal.id to clinicQueue.
        8. Return true on success, false otherwise.
    */
    function sendToClinicById(animalId) {
        if (!GS) {
            console.warn("DiseaseSystem.sendToClinicById: GameState is missing.");
            return false;
        }

        ensureClinicState();

        const idStr = String(animalId);
        const animal = getAnimalById(idStr);

        if (!animal) {
            console.warn("DiseaseSystem.sendToClinicById: No animal found with id =", animalId);
            return false;
        }

        // Animal must be sick to go to clinic
        if (animal.healthStatus !== "sick") {
            console.warn(
                `DiseaseSystem: '${animal.name}' is not sick (status = ${animal.healthStatus}). ` +
                "Clinic is only for sick animals."
            );
            return false;
        }

        // Should not add duplicates to queue
        if (GS.clinicQueue.some(id => String(id) === idStr)) {
            console.warn("DiseaseSystem: Animal already in clinic queue:", animal.name);
            return false;
        }

        // Also ensure it's not already the current patient
        if (GS.currentPatient && String(GS.currentPatient.id) === idStr) {
            console.warn("DiseaseSystem: Animal is already in treatment:", animal.name);
            return false;
        }

        // Calculate clinic cost
        const income = Number(animal.income) || 0;
        const clinicCost = income * CLINIC_COST_MULTIPLIER;

        if (clinicCost > 0 && GS.coins < clinicCost) {
            console.warn(
                `DiseaseSystem: Not enough coins to treat '${animal.name}'. ` +
                `Needs ${clinicCost}, has ${GS.coins}.`
            );
            return false;
        }

        // Deduct coins
        if (clinicCost > 0) {
            GS.coins -= clinicCost;
        }

        // Add to clinic queue
        GS.clinicQueue.push(animal.id);

        console.log(
            `DiseaseSystem: '${animal.name}' added to clinic queue (cost = ${clinicCost}, ` +
            `coins left = ${GS.coins}).`
        );

        return true;
    }

    // =========================================================================
    // PUBLIC FUNCTION: tick
    // =========================================================================
    /*
        tick():
        -------
        This is the main entry point for DiseaseSystem, called once per game tick
        from main.js.

        It runs two sub-tasks:
            1. checkAndUpdateSickness()   → healthy animals can become sick.
            2. processClinic()            → sick animals in clinic can be cured.
    */
    function tick() {
        if (!GS) return;
        checkAndUpdateSickness();
        processClinic();
    }

    // =========================================================================
    // PUBLIC EXPORT
    // =========================================================================
    /*
        Expose DiseaseSystem globally, with:
            - DiseaseSystem.tick()
            - DiseaseSystem.sendToClinicById(animalId)
    */
    window.DiseaseSystem = {
        tick,
        sendToClinicById
    };
})();
