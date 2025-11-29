/* 
    ============================================================================
    FANTASY ZOO - UTILITY FUNCTIONS (js/utils.js)
    ============================================================================
    This file provides small helper functions that are used across the game.
    These functions DO NOT contain game logic — they only provide reusable tools.

    WHY THIS FILE IS IMPORTANT:
    ---------------------------
    - Prevents duplicate code in multiple systems.
    - Makes debugging easier because common functions live in one place.
    - If you find yourself repeating the same logic (random select, ID creation,
      clamping values, formatting time, etc.), put it here.

    COMMON BUG SOURCE:
    ------------------
    If something like "IDs are repeating", "timers break", or "random animals
    always pick the same one", the issue is likely inside these utilities.
*/


// Create a global Utils object accessible from all components
window.Utils = {

    /* 
        =========================================================================
        RANDOM CHOICE
        =========================================================================
        Picks a random element from an array.

        Example:
            Utils.randomChoice(["Cat", "Dog", "Fox"])
            → might return "Fox"

        Common issues:
        - Passing an empty array → this will return undefined.
        - Passing something not an array → JS error.
    */
    randomChoice(list) {
        if (!Array.isArray(list) || list.length === 0) {
            console.warn("Utils.randomChoice called with empty or invalid list:", list);
            return null;
        }
        const index = Math.floor(Math.random() * list.length);
        return list[index];
    },


    /* 
        =========================================================================
        CURRENT TIME (TIMESTAMP)
        =========================================================================
        Returns the current time in milliseconds.

        Use this instead of Date.now() everywhere for consistency.

        Example:
            const now = Utils.now();
    */
    now() {
        return Date.now();
    },


    /* 
        =========================================================================
        UNIQUE ID GENERATOR
        =========================================================================
        Generates a reasonably unique ID for eggs, animals, bath events, etc.

        Structure:
            timestamp + random + prefix (optional)

        Example:
            Utils.id("egg") → "egg-1703858881-491"
            Utils.id() → "id-1703858881-123"
    */
    id(prefix = "id") {
        const time = Date.now().toString(36);   // Base36 time (shorter)
        const rand = Math.floor(Math.random() * 9999).toString(36);
        return `${prefix}-${time}-${rand}`;
    },


    /* 
        =========================================================================
        CLAMP FUNCTION
        =========================================================================
        Makes sure a number stays inside a min/max range.

        Example:
            Utils.clamp(120, 0, 100) → 100
            Utils.clamp(-10, 0, 100) → 0

        This is extremely useful for:
        - hunger
        - cleanliness
        - happiness
        - health
        - percentage bars
    */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },


    /* 
        =========================================================================
        PERCENT HELPER
        =========================================================================
        Converts a numerator/denominator into a percentage 0–100.

        Example:
            Utils.percent(3, 10) → 30
            Utils.percent(0, 5) → 0
            Utils.percent(5, 5) → 100

        Useful for:
        - Progress bars
        - Hatch timers
        - Bath progress
    */
    percent(part, total) {
        if (total <= 0) return 0;
        return (part / total) * 100;
    },


    /* 
        =========================================================================
        TIME REMAINING FORMATTER
        =========================================================================
        Converts milliseconds → “Xm Ys” or “Xs”.

        Example:
            Utils.formatTime(9500) → "9.5s"
            Utils.formatTime(65000) → "1m 5s"

        This makes incubator timers easy to read.
    */
    formatTime(ms) {
        if (ms < 1000) return "0s";

        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }

        return `${seconds}s`;
    },


    /* 
        =========================================================================
        SAFE GET FROM ARRAY (OPTIONAL)
        =========================================================================
        Prevents errors when accessing unknown indices.

        Example:
            Utils.safeGet(list, 2)

        If list[2] doesn't exist → returns null instead of causing an error.
    */
    safeGet(list, index) {
        return Array.isArray(list) && list[index] !== undefined
            ? list[index]
            : null;
    }
};
