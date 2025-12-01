/* 
    =============================================================================
    FANTASY ZOO - MAIN GAME ORCHESTRATOR (js/main.js)
    =============================================================================
    RESPONSIBILITY:
    ---------------
    This file is the **central brain** that:

      1. Initializes the game when the page loads.
      2. Sets up the main game loop (tick function).
      3. Calls all systems and render functions each tick.
      4. Exposes a small debug API (start/stop/restart) on window.GameMain.

    WHAT THIS FILE DOES:
    --------------------
    - Waits for DOMContentLoaded so HTML elements exist.
    - Initializes:
        * GameState timing fields (runStartTime, lastTick).
        * Leaderboard storage.
        * UI event handlers.

    - Starts a repeating timer:
        * Every TICK_MS milliseconds, the `gameTick()` function runs.
        * `gameTick()`:
            - Updates time in GameState.
            - Calls all logic systems (hatching, cleaning, disease, etc.).
            - Updates economy (coins).
            - Updates happiness/habitat/events.
            - Renders the full UI.

    WHAT THIS FILE DOES *NOT* DO:
    -----------------------------
    - It does NOT contain game logic itself (that's in js/systems/*.js).
    - It does NOT directly manipulate DOM elements (render.js handles that).
    - It does NOT handle button clicks (ui.js handles that).

    IF THE GAME DOESN'T RUN:
    ------------------------
    - Check the **script load order** in index.html:
        1. js/state.js
        2. js/utils.js
        3. js/eggs.js
        4. js/animals.js
        5. js/systems/* (hatching, feeding, cleaning, economy, etc.)
        6. js/leaderboard.js
        7. js/render.js
        8. js/ui.js
        9. js/main.js   <-- MUST BE LAST

    - Open the browser console:
        ✔ Look for errors like "X is not defined".
        ✔ Those usually mean a file didn't load, or load order is wrong.
*/


(function () {
    "use strict";

    // Short aliases (these will be valid once state.js and others are loaded)
    const GS = window.GameState || (window.GameState = {});
    const U  = window.Utils;

    // =========================================================================
    // CONFIGURATION
    // =========================================================================

    /*
        TICK_MS:
        --------
        How often the main game loop runs, in milliseconds.

        - 1000 ms = 1 second per tick.
        - All systems (Economy, Hatching, Cleaning, etc.) assume roughly
          one "step" per second, so 1000ms is a safe default.

        You can speed the game up by lowering this value, but then you may
        need to adjust hatch times, bath times, etc.
    */
    const TICK_MS = 1000;

    /*
        gameLoopHandle:
        ---------------
        Stores the ID returned by setInterval so we can stop/restart the loop.
    */
    let gameLoopHandle = null;

    // =========================================================================
    // INITIALIZATION HELPERS
    // =========================================================================

    /*
        initGameStateTiming():
        ----------------------
        Ensures GameState has basic timing fields set up.

        Fields:
        -------
        - GameState.runStartTime : when this run began (ms timestamp)
        - GameState.lastTick     : last time gameTick() successfully ran

        These timestamps are useful for:
          - Prestige system (run duration).
          - Debugging weird time issues.
    */
    function initGameStateTiming() {
        const now = (U && typeof U.now === "function") ? U.now() : Date.now();

        if (typeof GS.runStartTime !== "number") {
            GS.runStartTime = now;
        }
        GS.lastTick = now;
    }

    /*
        safeCall(name, fn):
        -------------------
        Utility for calling optional systems safely.

        If a system is missing or its function throws an error,
        we log a warning to the console but don't crash the whole game.

        PARAMS:
        -------
        name : string      → label for console logs
        fn   : function    → function to call
    */
    function safeCall(name, fn) {
        if (typeof fn !== "function") {
            // This will happen if that system file isn't loaded yet.
            console.warn(`Main: Skipping '${name}' – not a function (maybe missing script?).`);
            return;
        }
        try {
            fn();
        } catch (err) {
            console.error(`Main: Error in '${name}':`, err);
        }
    }

    /*
        initModules():
        --------------
        Runs one-time initialization for modules that need it.

        Currently:
          - Leaderboard.init()
          - UI.init()  (wires up event listeners)
    */
    function initModules() {
        // Leaderboard (load past runs from localStorage)
        if (window.Leaderboard && typeof window.Leaderboard.init === "function") {
            window.Leaderboard.init();
        } else {
            console.warn("Main: Leaderboard.init() not found. Leaderboard may not work.");
        }

        // UI event wiring
        if (window.UI && typeof window.UI.init === "function") {
            window.UI.init();
        } else {
            console.warn("Main: UI.init() not found. Buttons may not work.");
        }
    }

    // =========================================================================
    // MAIN GAME TICK
    // =========================================================================

    /*
        gameTick():
        -----------
        This is the HEARTBEAT of the game.

        It is called every TICK_MS milliseconds by setInterval.

        ORDER OF OPERATIONS:
        --------------------
        1. Compute time elapsed since last tick.
        2. Call systems that update internal state:
             - HatchingSystem.tick()
             - CleaningSystem.tick()
             - DiseaseSystem.tick()
             - HabitatSystem.tick()
             - HappinessSystem.tick()
             - EventsSystem.tick()
             - EconomySystem.tick()
        3. Update lastTick in GameState.
        4. Finally, render everything via Render.all().

        NOTE:
        -----
        - Right now, most systems treat each tick as "1 unit of time".
        - We still compute `dt` for future use and debugging.
    */
    function gameTick() {
        const now = (U && typeof U.now === "function") ? U.now() : Date.now();
        const previous = typeof GS.lastTick === "number" ? GS.lastTick : now;
        const dt = now - previous; // delta time in ms (currently not used inside systems)

        // --- 1. Logic systems -------------------------------------------------

        // Eggs → Animals
        if (window.HatchingSystem && typeof window.HatchingSystem.tick === "function") {
            safeCall("HatchingSystem.tick", window.HatchingSystem.tick);
        }

        // Bath House logic (cleaning queue)
        if (window.CleaningSystem && typeof window.CleaningSystem.tick === "function") {
            safeCall("CleaningSystem.tick", window.CleaningSystem.tick);
        }

        // Disease and clinic system
        if (window.DiseaseSystem && typeof window.DiseaseSystem.tick === "function") {
            safeCall("DiseaseSystem.tick", window.DiseaseSystem.tick);
        }

        // Habitat-based effects
        if (window.HabitatSystem && typeof window.HabitatSystem.tick === "function") {
            safeCall("HabitatSystem.tick", window.HabitatSystem.tick);
        }

        // Happiness → effective income multipliers
        if (window.HappinessSystem && typeof window.HappinessSystem.tick === "function") {
            safeCall("HappinessSystem.tick", window.HappinessSystem.tick);
        }

        // Random events
        if (window.EventsSystem && typeof window.EventsSystem.tick === "function") {
            safeCall("EventsSystem.tick", window.EventsSystem.tick);
        }

        // Economy (coins per second from animals, etc.)
        if (window.EconomySystem && typeof window.EconomySystem.tick === "function") {
            safeCall("EconomySystem.tick", window.EconomySystem.tick);
        }

        // --- 2. Update timing -------------------------------------------------
        GS.lastTick = now;
        GS.lastDeltaTime = dt; // stored for debugging if you want to inspect it

        // --- 3. Render everything --------------------------------------------
        if (window.Render && typeof window.Render.all === "function") {
            safeCall("Render.all", window.Render.all);
        } else {
            console.warn(
                "Main: Render.all() not found. UI will not update. " +
                "Check js/render.js and script order."
            );
        }
    }

    // =========================================================================
    // GAME LOOP CONTROL
    // =========================================================================

    /*
        startGameLoop():
        ----------------
        Starts the main game loop if it's not already running.

        - Uses setInterval with TICK_MS.
        - Stores handle so we can stop it later.
    */
    function startGameLoop() {
        if (gameLoopHandle !== null) {
            console.warn("Main: Game loop already running; startGameLoop() ignored.");
            return;
        }

        gameLoopHandle = window.setInterval(gameTick, TICK_MS);
        console.log(`Main: Game loop started (interval = ${TICK_MS}ms).`);
    }

    /*
        stopGameLoop():
        ---------------
        Stops the main game loop if it is running.
    */
    function stopGameLoop() {
        if (gameLoopHandle === null) {
            console.warn("Main: Game loop is not running; stopGameLoop() ignored.");
            return;
        }

        window.clearInterval(gameLoopHandle);
        gameLoopHandle = null;
        console.log("Main: Game loop stopped.");
    }

    /*
        restartGameLoop():
        ------------------
        Convenience helper:
          - Stops the loop if running.
          - Immediately starts it again.
    */
    function restartGameLoop() {
        stopGameLoop();
        startGameLoop();
    }

    // =========================================================================
    // DOMCONTENTLOADED ENTRY POINT
    // =========================================================================

    /*
        onDomReady():
        -------------
        Called once when the DOM is ready and all HTML elements exist.

        STEPS:
        ------
        1. Initialize GameState timing.
        2. Initialize modules (Leaderboard, UI).
        3. Make an initial render so the screen isn't empty.
        4. Start the main game loop.
    */
    function onDomReady() {
        console.log("Main: DOM ready. Initializing Fantasy Zoo...");

        initGameStateTiming();
        initModules();

        // First draw before any ticks, so the player sees something immediately.
        if (window.Render && typeof window.Render.all === "function") {
            safeCall("Render.all (initial)", window.Render.all);
        }

        // Start the main loop
        startGameLoop();
    }

    // Attach DOMContentLoaded listener
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", onDomReady);
    } else {
        // If DOM is already ready (e.g., scripts at end of body), call immediately
        onDomReady();
    }

    // =========================================================================
    // DEBUG / GLOBAL CONTROL HANDLE
    // =========================================================================
    /*
        Expose a small debug object on window so you can call these from
        the browser console while testing:

            GameMain.start()
            GameMain.stop()
            GameMain.restart()

        Example:
            > GameMain.stop()
            > GameMain.start()
    */
    window.GameMain = {
        start: startGameLoop,
        stop: stopGameLoop,
        restart: restartGameLoop,
        tickOnce: gameTick // For debugging: run a single tick by hand
    };
})();
