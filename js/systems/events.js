/* 
    =============================================================================
    FANTASY ZOO - EVENTS SYSTEM (js/systems/events.js)
    =============================================================================
    RESPONSIBILITY:
    ---------------
    This system handles RANDOM GAME EVENTS that:
      - Occasionally trigger on their own.
      - Temporarily or instantly affect:
          * Coins
          * Pet stats (happiness, cleanliness, hunger)
          * Overall game conditions (for future use).

    IMPORTANT DESIGN CHOICES:
    -------------------------
    - Events are meant to make the game feel more alive and less predictable.
    - For now, events:
        ✔ Mostly apply INSTANT changes (coins, happiness, cleanliness).
        ✔ Some can have a short DURATION (status text + minor effect).
    - We **do NOT** rely on other systems reading event flags (to avoid tight
      coupling). All effects are applied directly to GameState (coins / stats).

    FILE DOES:
    ----------
      - Expose EventsSystem.tick() to be called once per game tick.
      - Sometimes create a random event.
      - Apply its effect to GameState.
      - Track currently active events (for UI or later features).

    FILE DOES NOT:
    --------------
      - Render any UI directly (no DOM).
      - Attach button listeners (no input here).
      - Change timers for eggs/baths/clinic.

    EXPECTED STATE:
    ---------------
    - GameState.events:
        {
          activeEvents: [ ... ],
          history:      [ ... ],
          lastEventTime: <timestamp>
        }

      (If missing, this file will safely create it.)

    HOW TO INTEGRATE LATER:
    -----------------------
    - Render.js can read GameState.events.activeEvents to show messages to player.
    - You can add "Event log" panel and list GameState.events.history.
*/


(function () {
    "use strict";

    const GS = window.GameState;
    const U  = window.Utils;

    if (!GS) {
        console.warn("EventsSystem: GameState is not defined. Check js/state.js load order.");
    }
    if (!U) {
        console.warn("EventsSystem: Utils is not defined. Check js/utils.js load order.");
    }

    // =========================================================================
    // CONFIGURATION CONSTANTS
    // =========================================================================

    /*
        EVENT_CHANCE_PER_TICK:
        ----------------------
        Probability (0–1) that an event will try to trigger on any given tick.
        Example:
            0.05 → 5% chance per second → about once every ~20 seconds on average.
    */
    const EVENT_CHANCE_PER_TICK = 0.05;

    /*
        MIN_TIME_BETWEEN_EVENTS_MS:
        ---------------------------
        Minimum time delay between TWO new events (in milliseconds).
        Even if the random chance says "yes", we skip if this time hasn't passed.
    */
    const MIN_TIME_BETWEEN_EVENTS_MS = 15000; // 15 seconds

    /*
        BASIC SAFE GUARDS:
        ------------------
        We will NEVER trigger an event if:
          - There is no GameState.
          - There are no animals (for some event types).
    */


    // =========================================================================
    // EVENT DEFINITIONS
    // =========================================================================
    /*
        We use simple "templates" that describe possible events.

        Each template has:
            id          : machine-readable identifier
            name        : short display name
            description : human-friendly summary
            type        : "instant" | "timed"
            durationMs  : for "timed" events, how long it lasts (optional for instant)
            effect      : function which applies the effect to GameState
            revert      : function which reverts the effect (optional; used for timed)

        NOTE:
        -----
        - We store the template definitions here, NOT in GameState.
        - When an event triggers, we create a new object with:
              { id, name, start, durationMs, ... }
          and also add a simple copy into GameState.events.activeEvents/history.
    */

    const EventTemplates = [
        {
            id: "visitor_donation",
            name: "Generous Visitor",
            type: "instant",
            description: "A generous visitor donates some coins to your zoo.",
            effect() {
                // Add a fixed or random small bonus
                const bonus = 20 + Math.floor(Math.random() * 30); // 20–49
                GS.coins += bonus;
                console.log(`EventsSystem: Generous Visitor event → +${bonus} coins.`);
                return { coinsDelta: bonus };
            }
        },
        {
            id: "lost_tickets",
            name: "Lost Tickets",
            type: "instant",
            description: "Some tickets went missing. You lose a few coins.",
            effect() {
                const loss = 10 + Math.floor(Math.random() * 20); // 10–29
                const actualLoss = Math.min(GS.coins, loss);
                GS.coins -= actualLoss;
                console.log(`EventsSystem: Lost Tickets event → -${actualLoss} coins.`);
                return { coinsDelta: -actualLoss };
            }
        },
        {
            id: "happy_parade",
            name: "Happy Parade",
            type: "instant",
            description: "Your animals put on a surprise parade! Everyone is a bit happier.",
            effect() {
                if (!Array.isArray(GS.animals) || GS.animals.length === 0) {
                    return { affected: 0 };
                }
                let count = 0;
                GS.animals.forEach(animal => {
                    if (typeof animal.happiness === "number") {
                        const newHappiness = animal.happiness + 10;
                        if (U && typeof U.clamp === "function") {
                            animal.happiness = U.clamp(newHappiness, 0, 100);
                        } else {
                            animal.happiness = Math.min(newHappiness, 100);
                        }
                        count += 1;
                    }
                });
                console.log(`EventsSystem: Happy Parade → boosted happiness for ${count} animals.`);
                return { affected: count };
            }
        },
        {
            id: "muddy_rain",
            name: "Muddy Rain",
            type: "instant",
            description: "A muddy rain falls and makes all animals a bit dirtier.",
            effect() {
                if (!Array.isArray(GS.animals) || GS.animals.length === 0) {
                    return { affected: 0 };
                }
                let count = 0;
                GS.animals.forEach(animal => {
                    if (typeof animal.cleanliness === "number") {
                        const newClean = animal.cleanliness - 15;
                        if (U && typeof U.clamp === "function") {
                            animal.cleanliness = U.clamp(newClean, 0, 100);
                        } else {
                            animal.cleanliness = Math.max(0, newClean);
                        }
                        count += 1;
                    }
                });
                console.log(`EventsSystem: Muddy Rain → reduced cleanliness for ${count} animals.`);
                return { affected: count };
            }
        },
        {
            id: "double_tips",
            name: "Double Tips Hour",
            type: "timed",
            durationMs: 20000, // 20 seconds
            description: "Visitors are very generous. Animals earn extra coins for a short time.",
            effect() {
                // For now, we simulate this by giving an immediate coin bonus
                // AND recording a flag that could be used later by other systems.
                const bonus = 30 + Math.floor(Math.random() * 50); // 30–79
                GS.coins += bonus;

                // Store a simple multiplier flag in GameState; EconomySystem could
                // be updated in the future to consider this flag.
                if (!GS.modifiers) GS.modifiers = {};
                if (typeof GS.modifiers.incomeBoostMultiplier !== "number") {
                    GS.modifiers.incomeBoostMultiplier = 1;
                }
                GS.modifiers.incomeBoostMultiplier *= 2; // Double income in future

                console.log(
                    `EventsSystem: Double Tips Hour started (+${bonus} coins now, ` +
                    `incomeBoostMultiplier doubled).`
                );
                return { coinsDelta: bonus };
            },
            revert() {
                // Try to revert the incomeBoostMultiplier by dividing by 2.
                // This assumes only this event modifies that field.
                if (GS.modifiers && typeof GS.modifiers.incomeBoostMultiplier === "number") {
                    GS.modifiers.incomeBoostMultiplier /= 2;
                    console.log("EventsSystem: Double Tips Hour ended. Multiplier reverted.");
                }
            }
        }
    ];

    // =========================================================================
    // ENSURE EVENT STATE ON GAMESTATE
    // =========================================================================
    /*
        ensureEventsState():
        --------------------
        Safely ensures GameState.events is present and has correct shape:
            {
              activeEvents: [],
              history: [],
              lastEventTime: <number>
            }
    */
    function ensureEventsState() {
        if (!GS.events || typeof GS.events !== "object") {
            GS.events = {};
        }
        if (!Array.isArray(GS.events.activeEvents)) {
            GS.events.activeEvents = [];
        }
        if (!Array.isArray(GS.events.history)) {
            GS.events.history = [];
        }
        if (typeof GS.events.lastEventTime !== "number") {
            // Initialize to "long ago" so events can fire quickly at start
            GS.events.lastEventTime = 0;
        }
    }

    // =========================================================================
    // INTERNAL: triggerRandomEventIfNeeded()
    // =========================================================================
    /*
        This function:
          - Decides randomly whether to trigger a new event.
          - Checks cooldown (MIN_TIME_BETWEEN_EVENTS_MS).
          - Picks a random template and applies it.
          - Adds the triggered event to:
                - GameState.events.history
                - GameState.events.activeEvents (if type === "timed")

        It is called every tick from EventsSystem.tick(), but will often do nothing.
    */
    function triggerRandomEventIfNeeded(now) {
        ensureEventsState();

        // 1. Cooldown check
        const timeSinceLast = now - GS.events.lastEventTime;
        if (timeSinceLast < MIN_TIME_BETWEEN_EVENTS_MS) {
            return; // Too soon for another event
        }

        // 2. Random chance roll
        const roll = Math.random();
        if (roll > EVENT_CHANCE_PER_TICK) {
            return; // No event this tick
        }

        // 3. If there are no animals, some events are meaningless, but we can
        //    still allow coin-only events. We'll just pick any template.
        if (!EventTemplates || EventTemplates.length === 0) {
            console.warn("EventsSystem: No EventTemplates defined.");
            return;
        }

        // 4. Pick a random event template
        const template = U && typeof U.randomChoice === "function"
            ? U.randomChoice(EventTemplates)
            : EventTemplates[Math.floor(Math.random() * EventTemplates.length)];

        if (!template) {
            return;
        }

        // 5. Apply event effect
        let payload = {};
        if (typeof template.effect === "function") {
            payload = template.effect() || {};
        }

        // 6. Create a record of this event
        const eventRecord = {
            id: template.id,
            name: template.name,
            description: template.description,
            type: template.type,
            startedAt: now,
            durationMs: template.durationMs || 0,
            payload
        };

        // Add to history
        GS.events.history.push(eventRecord);

        // Add to active events if it's timed
        if (template.type === "timed" && template.durationMs && template.durationMs > 0) {
            GS.events.activeEvents.push(eventRecord);
        }

        // 7. Update lastEventTime
        GS.events.lastEventTime = now;

        console.log(
            `EventsSystem: Event triggered → ${template.name} (${template.id}).`
        );
    }

    // =========================================================================
    // INTERNAL: processActiveEvents()
    // =========================================================================
    /*
        For timed events only.

        This:
          - Loops through GameState.events.activeEvents.
          - For each active event:
              * If its duration has expired:
                    → calls its revert() (if defined on template)
                    → removes it from activeEvents.
              * If not expired: leave it alone.

        NOTE:
        -----
        - Because the "effect" was applied when the event triggered, we only
          need to handle reversal here (if there's something to revert).
        - This function will NOT apply repeated effects. That would need a
          more complex design.
    */
    function processActiveEvents(now) {
        ensureEventsState();

        if (!GS.events.activeEvents.length) return;

        const stillActive = [];

        GS.events.activeEvents.forEach((ev) => {
            const elapsed = now - ev.startedAt;
            const duration = ev.durationMs || 0;

            if (duration > 0 && elapsed >= duration) {
                // Event duration is over → find template to revert
                const template = EventTemplates.find(t => t.id === ev.id);
                if (template && typeof template.revert === "function") {
                    template.revert();
                }
                console.log(`EventsSystem: Timed event ended → ${ev.name} (${ev.id}).`);
            } else {
                // Not finished yet
                stillActive.push(ev);
            }
        });

        GS.events.activeEvents = stillActive;
    }

    // =========================================================================
    // PUBLIC FUNCTION: tick()
    // =========================================================================
    /*
        Main entry point.

        Called once per game tick (e.g., once per second) from main.js.

        It does two things:
          1. Try to trigger a new random event (rarely).
          2. Process any currently active timed events (ending them on time).
    */
    function tick() {
        if (!GS) return;

        const now = U && typeof U.now === "function" ? U.now() : Date.now();

        // Timed events might expire this tick
        processActiveEvents(now);

        // Randomly attempt to start a new event
        triggerRandomEventIfNeeded(now);
    }

    // =========================================================================
    // PUBLIC EXPORT
    // =========================================================================
    /*
        We expose a simple global object:

            EventsSystem.tick()

        You can later add more public helpers if you want UI buttons to
        manually trigger certain events (e.g., for debugging or admin mode).
    */
    window.EventsSystem = {
        tick
    };
})();
