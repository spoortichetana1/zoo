// Fantasy Zoo Game logic
// Animals generate coins every second, and each egg has many possible creatures.

document.addEventListener("DOMContentLoaded", () => {
    // === GAME STATE ===

    // Starting coins
    let coins = 100; // You should see 100 at the start

    // Egg types and possible animals for each type
    // Rarity affects income:
    // Common ~1, Uncommon ~2, Rare ~3, Epic ~5, Legendary ~8
    const eggTypes = {
        common: {
            name: "Common Egg",
            price: 20,
            hatchTime: 8000, // milliseconds
            icon: "🥚",
            animals: [
                { name: "Cloudy Chick", emoji: "🐤", rarity: "Common", income: 1 },
                { name: "Leafy Bun", emoji: "🐰", rarity: "Common", income: 1 },
                { name: "Pebble Turtle", emoji: "🐢", rarity: "Common", income: 1 },
                { name: "Stripe Pup", emoji: "🐶", rarity: "Uncommon", income: 2 },
                { name: "Berry Mouse", emoji: "🐭", rarity: "Uncommon", income: 2 },
                { name: "Sunspot Calf", emoji: "🐮", rarity: "Uncommon", income: 2 }
            ]
        },
        rare: {
            name: "Rare Egg",
            price: 40,
            hatchTime: 12000,
            icon: "🐣",
            animals: [
                { name: "Spark Fox", emoji: "🦊", rarity: "Rare", income: 3 },
                { name: "Crystal Cat", emoji: "🐱", rarity: "Rare", income: 3 },
                { name: "Stormy Owl", emoji: "🦉", rarity: "Rare", income: 3 },
                { name: "Glacier Wolf", emoji: "🐺", rarity: "Epic", income: 5 },
                { name: "Ember Crow", emoji: "🐦", rarity: "Epic", income: 5 },
                { name: "Thunder Serpent", emoji: "🐍", rarity: "Epic", income: 5 }
            ]
        },
        mystic: {
            name: "Mystic Egg",
            price: 80,
            hatchTime: 16000,
            icon: "🐉",
            animals: [
                { name: "Nebula Dragon", emoji: "🐲", rarity: "Epic", income: 5 },
                { name: "Galaxy Unicorn", emoji: "🦄", rarity: "Epic", income: 5 },
                { name: "Phantom Phoenix", emoji: "🐦‍🔥", rarity: "Epic", income: 5 },
                { name: "Void Tiger", emoji: "🐯", rarity: "Legendary", income: 8 },
                { name: "Aurora Lion", emoji: "🦁", rarity: "Legendary", income: 8 },
                { name: "Starwhale Guardian", emoji: "🐋", rarity: "Legendary", income: 8 }
            ]
        }
    };

    // List of eggs that are currently incubating
    // Each egg: { id, typeKey, startTime, hatchTime }
    let eggs = [];

    // List of animals that are in the zoo
    // Each animal: { name, emoji, rarity, fromEggType, income }
    let zooAnimals = [];

    // === DOM ELEMENTS ===
    const coinCountEl = document.getElementById("coin-count");
    const incomeRateEl = document.getElementById("income-rate");
    const incubatorEl = document.getElementById("incubator");
    const zooEl = document.getElementById("zoo");
    const eggButtons = document.querySelectorAll(".egg-button");

    // === INITIAL RENDER ===
    if (coinCountEl) {
        coinCountEl.textContent = coins.toString();
    }
    if (incomeRateEl) {
        incomeRateEl.textContent = "0";
    }

    // === EVENT LISTENERS ===

    // When you click an egg button, try to buy that egg type
    eggButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const typeKey = btn.getAttribute("data-type");
            buyEgg(typeKey);
        });
    });

    // === GAME FUNCTIONS ===

    /**
     * Try to buy an egg of a given type.
     * If not enough coins, show an alert.
     */
    function buyEgg(typeKey) {
        const eggType = eggTypes[typeKey];
        if (!eggType) return;

        if (coins < eggType.price) {
            alert("Not enough coins for this egg!");
            return;
        }

        // Pay the price
        coins -= eggType.price;
        if (coinCountEl) {
            coinCountEl.textContent = coins.toString();
        }

        // Create a new egg object
        const newEgg = {
            id: Date.now() + Math.random(), // simple unique id
            typeKey: typeKey,
            startTime: Date.now(),
            hatchTime: eggType.hatchTime
        };

        eggs.push(newEgg);
        renderIncubator();
    }

    /**
     * Calculate the total coins per second from all animals.
     */
    function getTotalIncomePerSecond() {
        return zooAnimals.reduce((sum, animal) => {
            return sum + (animal.income || 0);
        }, 0);
    }

    /**
     * This function is called regularly and:
     * - updates egg timers and hatches ready eggs
     * - adds coins from all animals every second
     */
    function tick() {
        const now = Date.now();

        // 1) Handle egg hatching
        eggs.forEach((egg) => {
            const timePassed = now - egg.startTime;
            if (timePassed >= egg.hatchTime) {
                // Hatch the egg into an animal
                hatchEgg(egg);
            }
        });

        // Remove any eggs that have already hatched from the incubator
        eggs = eggs.filter((egg) => {
            const timePassed = now - egg.startTime;
            return timePassed < egg.hatchTime;
        });

        // 2) Add coins from zoo animals (once per tick = once per second)
        const incomePerSecond = getTotalIncomePerSecond();
        if (incomePerSecond > 0) {
            coins += incomePerSecond;
            if (coinCountEl) {
                coinCountEl.textContent = coins.toString();
            }
        }

        // Update income display
        if (incomeRateEl) {
            incomeRateEl.textContent = incomePerSecond.toString();
        }

        // Re-render the incubator and zoo
        renderIncubator();
        renderZoo();
    }

    /**
     * Turn an egg into a random animal and add it to the zoo.
     */
    function hatchEgg(egg) {
        const eggType = eggTypes[egg.typeKey];
        if (!eggType) return;

        const list = eggType.animals;
        const randomIndex = Math.floor(Math.random() * list.length);
        const chosen = list[randomIndex];

        const animal = {
            name: chosen.name,
            emoji: chosen.emoji,
            rarity: chosen.rarity,
            fromEggType: eggType.name,
            income: chosen.income
        };

        zooAnimals.push(animal);

        console.log(
            `An egg hatched into: ${animal.name}! (${animal.rarity}, +${animal.income} coins/sec)`
        );
    }

    /**
     * Draw all eggs that are currently incubating.
     */
    function renderIncubator() {
        if (!incubatorEl) return;

        incubatorEl.innerHTML = "";

        if (eggs.length === 0) {
            incubatorEl.innerHTML = "<p>No eggs incubating. Buy one from the shop!</p>";
            return;
        }

        const now = Date.now();

        eggs.forEach((egg) => {
            const eggType = eggTypes[egg.typeKey];
            const timePassed = now - egg.startTime;
            const timeLeft = Math.max(0, egg.hatchTime - timePassed);

            const secondsLeft = Math.ceil(timeLeft / 1000);

            // Calculate progress percentage for progress bar
            const progress =
                Math.min(1, timePassed / egg.hatchTime) * 100;

            const card = document.createElement("div");
            card.className = "card";

            card.innerHTML = `
                <div class="icon">${eggType.icon}</div>
                <div><strong>${eggType.name}</strong></div>
                <div>Hatching in: ${secondsLeft}s</div>
                <div class="progress-bar">
                    <div class="progress-inner" style="width: ${progress}%;"></div>
                </div>
            `;

            incubatorEl.appendChild(card);
        });
    }

    /**
     * Draw all animals that are in the zoo.
     */
    function renderZoo() {
        if (!zooEl) return;

        zooEl.innerHTML = "";

        if (zooAnimals.length === 0) {
            zooEl.innerHTML = "<p>No animals yet. Hatch some eggs!</p>";
            return;
        }

        zooAnimals.forEach((animal) => {
            const card = document.createElement("div");
            card.className = "card";

            card.innerHTML = `
                <div class="icon">${animal.emoji}</div>
                <div><strong>${animal.name}</strong></div>
                <div class="tag">${animal.rarity}</div>
                <div class="income-text">💰 ${animal.income} coins/sec</div>
                <div style="margin-top:4px; font-size: 0.75rem;">
                    From: ${animal.fromEggType}
                </div>
            `;

            zooEl.appendChild(card);
        });
    }

    // === START GAME LOOP ===

    // Call tick() every 1000 milliseconds (1 second)
    setInterval(tick, 1000);

    // Render once at the start
    renderIncubator();
    renderZoo();
});
