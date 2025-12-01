/* 
    =============================================================================
    FANTASY ZOO - LEADERBOARD (js/leaderboard.js)
    =============================================================================
    RESPONSIBILITY:
    ---------------
    This module manages the **local leaderboard** for Fantasy Zoo:

      1. Saves finished runs (from PrestigeSystem) into GameState + localStorage.
      2. Loads existing leaderboard entries from localStorage when the game starts.
      3. Ranks runs based on a scoring formula (coins, pets, rarity, time).
      4. Provides helper functions to get ranked runs ready for display.

    HIGH-LEVEL DESIGN:
    ------------------
    - Raw leaderboard data is stored in:
          GameState.leaderboard (array of run objects)

    - Persistent storage uses:
          localStorage["fantasy-zoo-leaderboard"]

    - When a run completes:
          PrestigeSystem.doPrestige() builds a summary object and pushes it
          to GameState.leaderboard.
          → Leaderboard.recordRun(summary) should then be called to:
                * normalize that data
                * save updated leaderboard to localStorage

    - Render.js can call:
          Leaderboard.getRankedRuns(limit)
          Leaderboard.formatRunForDisplay(run, rankIndex)

    WHAT THIS FILE DOES **NOT** DO:
    --------------------------------
    - Does NOT render HTML.
    - Does NOT manage prestige logic (PrestigeSystem does that).
    - Does NOT change current run’s GameState (except leaderboard storage).

    DEBUGGING TIPS:
    ---------------
    - If leaderboard is always empty:
        ✔ Check that Leaderboard.init() is called once on startup (main.js).
        ✔ Check localStorage in your browser DevTools for the correct key.
        ✔ Check console logs for JSON parse errors.

    - If runs don't appear sorted:
        ✔ Confirm you're using Leaderboard.getRankedRuns() in render.js,
          NOT GameState.leaderboard directly.
*/


(function () {
    "use strict";

    const GS = window.GameState;
    const U  = window.Utils;

    if (!GS) {
        console.warn("Leaderboard: GameState is not defined. Check js/state.js load order.");
    }

    // =========================================================================
    // CONSTANTS
    // =========================================================================

    /*
        STORAGE_KEY:
        ------------
        The key used in browser localStorage to persist the leaderboard.

        Note:
        - localStorage is domain-specific (per site).
        - Clearing browser storage will wipe the leaderboard.
    */
    const STORAGE_KEY = "fantasy-zoo-leaderboard";

    /*
        MAX_STORED_RUNS:
        ----------------
        Hard limit for how many runs we keep in the leaderboard.

        Older entries (lowest ranked) will be dropped when this limit is crossed.
    */
    const MAX_STORED_RUNS = 50;

    // =========================================================================
    // INTERNAL HELPERS
    // =========================================================================

    /*
        ensureLeaderboardArray():
        -------------------------
        Makes sure GameState.leaderboard exists and is an array.
        If it doesn't exist, it creates an empty array.

        Why this is important:
        - Other files (PrestigeSystem, Render) rely on this array existing.
        - This function keeps us from throwing errors if it was never initialised.
    */
    function ensureLeaderboardArray() {
        if (!GS) return;
        if (!Array.isArray(GS.leaderboard)) {
            GS.leaderboard = [];
        }
    }

    /*
        rarityRank(rarityString):
        -------------------------
        Converts a rarity string into a numeric rank so we can compare them
        and use them in a scoring formula.

        Order (low → high):
            Common (1)
            Uncommon (2)
            Rare (3)
            Epic (4)
            Legendary (5)

        If string is unknown or missing, returns 0.
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

    /*
        normalizeRun(raw):
        ------------------
        Takes a "run summary" object (usually from PrestigeSystem.buildRunSummary)
        and ensures it has all fields with safe defaults.

        This step is important to:
          - Prevent "undefined" values being saved.
          - Avoid breaking future code if fields are missing.

        Returns a new normalized object.
    */
    function normalizeRun(raw) {
        const now = (U && typeof U.now === "function") ? U.now() : Date.now();

        const coins          = Number(raw?.coins ?? 0);
        const maxCoins       = Number(raw?.maxCoins ?? coins);
        const petsHatched    = Number(raw?.petsHatched ?? 0);
        const highestRarity  = raw?.highestRarity || "Unknown";
        const prestigesBefore = Number(raw?.prestigesBefore ?? 0);
        const prestigesAfter  = Number(raw?.prestigesAfter ?? prestigesBefore);
        const timePlayed     = Number(raw?.timePlayed ?? 0);

        return {
            coins,
            maxCoins,
            petsHatched,
            highestRarity,
            prestigesBefore,
            prestigesAfter,
            timePlayed,
            // For sorting and display
            createdAt: typeof raw?.createdAt === "number" ? raw.createdAt : now
        };
    }

    /*
        computeScore(run):
        ------------------
        Creates a single numeric "score" used to rank runs in the leaderboard.

        Current scoring formula (simple but effective for now):
            score =
                (coins * 1)
              + (petsHatched * 20)
              + (rarityRank(highestRarity) * 1000)
              - (timePlayed / 60000)   // -1 point per minute

        Interpretation:
          - More coins → higher score.
          - More pets → higher score.
          - Higher rarity → big bonus.
          - Shorter time → slightly better.

        You can tweak multipliers anytime to change how runs are ranked.
    */
    function computeScore(run) {
        const coins       = Number(run.coins) || 0;
        const pets        = Number(run.petsHatched) || 0;
        const rarityScore = rarityRank(run.highestRarity) * 1000;
        const timeMs      = Number(run.timePlayed) || 0;

        // Convert time to minutes and penalise slower runs slightly
        const timePenalty = timeMs / 60000; // 1 point per minute

        return (coins * 1) + (pets * 20) + rarityScore - timePenalty;
    }

    /*
        sortRuns(runs):
        ----------------
        Returns a NEW array of runs sorted in descending order by:
          1. score (from computeScore)
          2. coins (tie-breaker)
          3. createdAt (newer first as final tie-breaker)

        We never mutate the original array here; we sort a shallow copy.
    */
    function sortRuns(runs) {
        if (!Array.isArray(runs)) return [];

        const withScore = runs.map(run => ({
            ...run,
            _score: computeScore(run)
        }));

        withScore.sort((a, b) => {
            // Primary: score (desc)
            if (b._score !== a._score) {
                return b._score - a._score;
            }
            // Secondary: coins (desc)
            if (b.coins !== a.coins) {
                return b.coins - a.coins;
            }
            // Tertiary: createdAt (desc → newer runs first)
            const aTime = Number(a.createdAt) || 0;
            const bTime = Number(b.createdAt) || 0;
            return bTime - aTime;
        });

        // Strip internal _score before returning
        return withScore.map(({ _score, ...rest }) => rest);
    }

    // =========================================================================
    // STORAGE: LOAD / SAVE
    // =========================================================================

    /*
        loadFromStorage():
        ------------------
        Reads leaderboard data from localStorage and stores it into
        GameState.leaderboard. If anything goes wrong, it falls back to an
        empty array.

        This SHOULD be called once early in main.js (via Leaderboard.init()).
    */
    function loadFromStorage() {
        if (!GS || typeof window === "undefined" || !window.localStorage) return;

        ensureLeaderboardArray();

        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                // No data saved yet
                return;
            }

            const parsed = JSON.parse(raw);

            if (!Array.isArray(parsed)) {
                console.warn("Leaderboard.loadFromStorage: stored data is not an array.");
                return;
            }

            // Normalise each run before storing
            const normalizedRuns = parsed.map(normalizeRun);
            GS.leaderboard = normalizedRuns;

            console.log(`Leaderboard: Loaded ${normalizedRuns.length} runs from storage.`);
        } catch (err) {
            console.warn("Leaderboard.loadFromStorage: Error parsing saved data:", err);
        }
    }

    /*
        saveToStorage():
        ----------------
        Writes GameState.leaderboard into localStorage as a JSON string.

        Always call this AFTER modifying GS.leaderboard to persist changes.
    */
    function saveToStorage() {
        if (!GS || typeof window === "undefined" || !window.localStorage) return;

        ensureLeaderboardArray();

        try {
            const safeArray = GS.leaderboard.map(normalizeRun);
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeArray));
        } catch (err) {
            console.warn("Leaderboard.saveToStorage: Error saving data:", err);
        }
    }

    // =========================================================================
    // PUBLIC API: CORE OPERATIONS
    // =========================================================================

    /*
        init():
        -------
        To be called once when the game starts (main.js).

        It:
          - Ensures GameState.leaderboard exists.
          - Loads stored data from localStorage, if present.
    */
    function init() {
        ensureLeaderboardArray();
        loadFromStorage();
    }

    /*
        recordRun(runSummary):
        ----------------------
        Adds a new run to the leaderboard and persists it.

        This is expected to be called by PrestigeSystem AFTER it completes
        a prestige and has a run summary (the same kind of object that
        PrestigeSystem.doPrestige() returns in .summary).

        STEPS:
        ------
        1. Ensure leaderboard array exists.
        2. Normalize the incoming summary.
        3. Push it into GameState.leaderboard.
        4. Trim the array to MAX_STORED_RUNS (keep best runs only).
        5. Save updated array to localStorage.
        6. Return the normalized run entry.

        NOTE:
        -----
        - We keep all runs in GameState.leaderboard but if the array grows
          too large, we keep only top MAX_STORED_RUNS by score.
    */
    function recordRun(runSummary) {
        if (!GS) {
            console.warn("Leaderboard.recordRun: GameState is missing.");
            return null;
        }

        ensureLeaderboardArray();

        const normalized = normalizeRun(runSummary);
        GS.leaderboard.push(normalized);

        // If we exceed maximum stored runs, keep only the top ones
        if (GS.leaderboard.length > MAX_STORED_RUNS) {
            const ranked = sortRuns(GS.leaderboard);
            GS.leaderboard = ranked.slice(0, MAX_STORED_RUNS);
        }

        saveToStorage();

        console.log(
            `Leaderboard: Recorded new run (coins=${normalized.coins}, ` +
            `pets=${normalized.petsHatched}, rarity=${normalized.highestRarity}).`
        );

        return normalized;
    }

    /*
        getRankedRuns(limit):
        ---------------------
        Returns a NEW array of leaderboard runs sorted from best to worst.

        PARAMS:
        -------
        limit (optional number):
            - If provided, only the top `limit` runs are returned.
            - If omitted or invalid, all runs are returned.

        Returns:
        --------
        Array of normalized run objects.
    */
    function getRankedRuns(limit) {
        ensureLeaderboardArray();

        const ranked = sortRuns(GS.leaderboard);
        if (typeof limit === "number" && limit > 0) {
            return ranked.slice(0, limit);
        }
        return ranked;
    }

    /*
        formatRunForDisplay(run, index):
        --------------------------------
        Converts a run object into a simpler "display-friendly" object
        that Render.js or UI code can easily map to text/HTML.

        PARAMS:
        -------
        run   : a single run entry (from getRankedRuns or GameState.leaderboard)
        index : rank index (0-based; optional)

        Returns:
        --------
        {
          rank: number,          // 1-based rank if index given, else null
          coins: number,
          petsHatched: number,
          highestRarity: string,
          timeMinutes: number,   // rounded
          prestigesBefore: number,
          prestigesAfter: number,
          createdAt: number
        }
    */
    function formatRunForDisplay(run, index) {
        if (!run) return null;

        const rank = (typeof index === "number") ? (index + 1) : null;

        const timeMs   = Number(run.timePlayed) || 0;
        const minutes  = timeMs / 60000;
        const roundedMinutes = Math.round(minutes);

        return {
            rank,
            coins: Number(run.coins) || 0,
            petsHatched: Number(run.petsHatched) || 0,
            highestRarity: run.highestRarity || "Unknown",
            timeMinutes: roundedMinutes,
            prestigesBefore: Number(run.prestigesBefore) || 0,
            prestigesAfter: Number(run.prestigesAfter) || 0,
            createdAt: Number(run.createdAt) || 0
        };
    }

    /*
        clearAll():
        -----------
        Utility function for debugging or "reset game" feature.

        It:
          - Clears GameState.leaderboard.
          - Clears leaderboard data from localStorage.

        You probably won't expose this to players, but it's handy in dev.
    */
    function clearAll() {
        ensureLeaderboardArray();
        GS.leaderboard = [];
        if (typeof window !== "undefined" && window.localStorage) {
            window.localStorage.removeItem(STORAGE_KEY);
        }
        console.log("Leaderboard: All leaderboard data cleared.");
    }

    // =========================================================================
    // PUBLIC EXPORT
    // =========================================================================
    /*
        Expose Leaderboard as a global object:

            Leaderboard.init()
            Leaderboard.recordRun(runSummary)
            Leaderboard.getRankedRuns(limit)
            Leaderboard.formatRunForDisplay(run, index)
            Leaderboard.clearAll()

        Typical usage in main.js:
            Leaderboard.init();

        Typical usage when a prestige happens:
            const result = PrestigeSystem.doPrestige();
            if (result.success && result.summary) {
                Leaderboard.recordRun(result.summary);
            }
    */
    window.Leaderboard = {
        init,
        recordRun,
        getRankedRuns,
        formatRunForDisplay,
        clearAll
    };
})();
