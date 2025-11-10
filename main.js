window.addEventListener("DOMContentLoaded", () => {

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const W = canvas.width, H = canvas.height;
const CUBE_SIZE = 48;
const CUBE_SPACING = 18;
const CUBE_COUNT = 8;
const TOP_Y = 30;

const moneyDisplay = document.getElementById('moneyDisplay');
const incomeDisplay = document.getElementById('incomeDisplay');
const houseDisplay = document.getElementById('houseDisplay');
const legendContainer = document.getElementById('legendContainer');
const toggleBtn = document.getElementById('toggleBtn');

let upgraded = false;

let currentWeather = null;
let weatherTimer = null;
let weatherMultiplier = 1; // affects income
let speedMultiplier = 1;   // affects movement
let weatherOverlayAlpha = 0;

let weatherParticles = [];


// === WEATHER LIST ===
const weatherEvents = [
  {
    name: "Rain",
    duration: 60_000, // lasts 1 min
    incomeBoost: 1.05,
    speedBoost: 1.0,
    bg: "linear-gradient(#445, #223)",
    overlay: "rgba(100,150,255,0.2)"
  },
  {
    name: "Wind",
    duration: 60_000,
    incomeBoost: 1.0,
    speedBoost: 1.05,
    bg: "linear-gradient(#ccd, #889)",
    overlay: "rgba(200,200,255,0.15)"
  },
  {
    name: "Thunder",
    duration: 60_000,
    incomeBoost: 1.10,
    speedBoost: 1.0,
    bg: "linear-gradient(#222, #000)",
    overlay: "rgba(255,255,150,0.25)"
  }
];

function nvl(value, defaultValue) {
return value == null ? defaultValue : value;
}



/**
Purpose:
Updates the HTML inventory UI (#inventoryList) to show:
Player’s current drops (bones, relics, skins, cubes).
All purchased shop items by category.
Key Behavior:

Builds HTML dynamically with item icons and current counts.
Pulls data from dropCounters, dropLimits, and playerInventory.
 * @returns {void}
 */
function updateInventoryDisplay() {
  //const inv = document.getElementById('inventoryDisplay');
  const inv = document.getElementById("inventoryList");
  if (!inv) return;

  // --- Existing inventory (drops) ---
  let html = `
    <b>Inventory</b><br>
    🦴 Skeleton Bones: ${nvl(dropCounters["🦴 Skeleton Bones"],0)}/${dropLimits.bones}<br>
    📿 Crossbones Relic: ${nvl(dropCounters["📿 Crossbones Relic"],0)}/${dropLimits.relic}<br>
    ⬜💀 Skeleton Skin: ${nvl(dropCounters["⬜💀 Skeleton Skin"],0)}/${dropLimits.skin}<br>
    ⬜☠️ Crossbones Cube: ${nvl(dropCounters["⬜☠️ Crossbones Cube"],0)}/${dropLimits.cube}<br><br>
  `;

  // --- Shop Inventory ---
  html += `<b>Shop Purchases</b><br>`;

  const categories = ["Swords", "Relics", "Eggs", "Skins", "Potions"];

  categories.forEach(cat => {
    if (playerInventory[cat]) {
      html += `<u>${cat}</u><br>`;
      playerInventory[cat].forEach(item => {
        const limit =
          cat === "Eggs" || cat === "Potions" ? 999 : 1;
        html += `${item.icon} ${item.name}: ${item.count}/${limit}<br>`;
      });
      //html += `<br>`;
    }
  });

  inv.innerHTML = html;
}

/**
 * Adds one item of the specified type to the player's inventory.
 * If the item does not already exist in the player's inventory, it will be added with a count of 1.
 * If the item already exists, its count will be incremented by 1.
 * The function will also update the inventory display in the game UI after adding the item.
 * @param {string} itemName - The name of the item to add to the player's inventory.
 * @returns {void}
 */
function addToInventory(itemName) {
  if (!drops[itemName]) drops[itemName] = 0; // ensure item exists
  const limits = {
    "🗡️ Sword I": 999n,
    "🗡️ Sword II": 999n,
    "🗡️ Sword III": 999n,
    "🗡️ Sword IV": 999n,
    "🗡️ Sword V": 999n,
    "📿 Relic I": 1n,
    "📿 Relic II": 1n,
    "📿 Relic III": 1n,
    "📿 Relic IV": 1n,
    "📿 Relic V": 1n,
    "🥚 Egg I": 999n,
    "🥚 Egg II": 999n,
    "🥚 Egg III": 999n,
    "🥚 Egg IV": 999n,
    "🥚 Egg V": 999n,
    "💎 Skin I": 1n,
    "💎 Skin II": 1n,
    "💎 Skin III": 1n,
    "💎 Skin IV": 1n,
    "💎 Skin V": 1n,
    "🧪 Potion I": 999n,
    "🧪 Potion II": 999n,
    "🧪 Potion III": 999n,
    "🧪 Potion IV": 999n,
    "🧪 Potion V": 999n,
  };
  
  const limit = limits[itemName] ?? 999n;
  if (BigInt(drops[itemName]) < limit) {
    drops[itemName] = BigInt(drops[itemName]) + 1n;
    updateInventoryDisplay();
  }
}

function updateShopDisplay() {
  const shopContainer = document.getElementById('shopContainer');
  if (!shopContainer) return;
  shopContainer.innerHTML = "<div class='legend-label'>🏪 SHOP</div>";

  const purchaseLimits = {
    Swords: 1,
    Relics: 1,
    Eggs: 999,
    Skins: 1,
    Potions: 999
  };

  for (const [category, items] of Object.entries(shopItems)) {
    const row = document.createElement('div');
    row.style.display = "flex";
    row.style.gap = "10px";
    row.style.marginTop = "8px";
    row.innerHTML = `<strong style='min-width:70px'>${category}:</strong>`;

    items.forEach((item, i) => {
      const btn = document.createElement('button');
      btn.innerText = `${item.icon} ${item.name}\n💰${shortLabel(item.price)}`;
      btn.style.display = "flex";
      btn.style.flexDirection = "column";
      btn.style.alignItems = "center";
      btn.style.justifyContent = "center";
      btn.style.fontSize = "10px";
      btn.style.padding = "4px 6px";

btn.onclick = () => buyItem(category, i);


      row.appendChild(btn);
    });

    shopContainer.appendChild(row);
  }
}





/**
 * Format a BigInt as a string with commas for readability.
 * @param {BigInt} b - The BigInt to format.
 * @returns {string} The formatted string.
 */

 function formatBigInt2(b) {
  if (typeof b === 'number') b = BigInt(Math.floor(b));
  const s = b.toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}


function formatBigInt(b) {
  if (typeof b === 'number') b = BigInt(Math.floor(b));
  if (typeof b !== 'bigint') return b;

  const isNegative = b < 0n;
  b = isNegative ? -b : b;

  const UNITS = [
  { value: 1_000_000_000_000_000_000_000_000_000_000_000n, symbol: "DC" }, // decilion (10^24)
  { value: 1_000_000_000_000_000_000_000_000_000_000n, symbol: "NO" }, // nonnilion (10^24) 
  { value: 1_000_000_000_000_000_000_000_000_000n, symbol: "OC" }, // octilion (10^24)  
  { value: 1_000_000_000_000_000_000_000_000n, symbol: "SP" }, // septilion (10^24)
    { value: 1_000_000_000_000_000_000_000n, symbol: "SX" }, // sextilion (10^21)
    { value: 1_000_000_000_000_000_000n, symbol: "QI" }, // quintilion (10^18)
    { value: 1_000_000_000_000_000n, symbol: "QA" }, // quadrilion (10^15)
    { value: 1_000_000_000_000n, symbol: "T" }, // trillion (10^12)
    { value: 1_000_000_000n, symbol: "B" }, // billion (10^9)
    { value: 1_000_000n, symbol: "M" }, // million (10^6)
    { value: 1_000n, symbol: "K" } // thousand (10^3)
  ];

  for (const unit of UNITS) {
    if (b >= unit.value) {
      // Compute with BigInt precision safely
      const whole = Number(b / unit.value);
      const frac = Number(b % unit.value) / Number(unit.value);
      const formatted = (whole + frac).toFixed(1).replace(/\.0$/, "");
      return (isNegative ? "-" : "") + formatted + unit.symbol;
    }
  }

  // Fallback for small numbers
  return (isNegative ? "-" : "") + b.toString();
}



/**
 * Format a BigInt as a string with commas for readability and
 * optionally display a unit at the end (e.g. "K" for thousands, "M" for millions, etc.)
 * @param {BigInt} n - The number to format
 * @returns {string} The formatted string
 */
function shortLabel(n) {
  const num = BigInt(n);
  const abs = num < 0n ? -num : num;
  const units = [
                 [1_000_000_000_000_000_000_000n, "SX"], 
                 [1_000_000_000_000_000_000n, "QI"], 
                 [1_000_000_000_000_000n, "QA"], 
                 [1_000_000_000_000n, "T"], 
                 [1_000_000_000n, "B"], 
                 [1_000_000n, "M"], 
                 [1_000n, "K"]
                ];

  for (let [v, l] of units) if (abs >= v) return (num < 0n ? "-" : "") + Number(abs / v) + l;
  return num.toString();
}

const baseCubes = [
  { name: "Green", color: "#3bbf6e", value: 100n },
  { name: "Blue", color: "#3b8ebf", value: 1000n },
  { name: "Black", color: "#222222", value: 10000n },
  { name: "Yellow", color: "#e6d44a", value: 100000n },
  { name: "Orange", color: "#ff8a2b", value: 1000000n },
  { name: "Purple", color: "#8b3bff", value: 10000000n },
  { name: "Red", color: "#c53030", value: 100000000n },
  { name: "White", color: "#e9ecef", value: 1000000000n },
];
const upgradeCubes = [
  { name: "Light Green", color: "#9be6b8", value: 10000000000n },
  { name: "Light Blue", color: "#9bd3e6", value: 100000000000n },
  { name: "Dark Grey", color: "#6b6b6b", value: 1000000000000n },
  { name: "Light Yellow", color: "#fff1a8", value: 10000000000000n },
  { name: "Light Orange", color: "#ffc89b", value: 100000000000000n },
  { name: "Light Purple", color: "#d8b8ff", value: 1000000000000000n },
  { name: "Light Red", color: "#ffb8b8", value: 10000000000000000n },
  { name: "Light Gray", color: "#d0d0d0", value: 100000000000000000n },
];


const incomeRates = {
  "Green": 2n, "Blue": 20n, "Black": 200n, "Yellow": 2000n, "Orange": 20000n, "Purple": 200000n,
  "Red": 2000000n, "White": 20000000n,
  "Light Green": 200000000n, "Light Blue": 2000000000n, "Dark Grey": 20000000000n,
  "Light Yellow": 200000000000n, "Light Orange": 2000000000000n, "Light Purple": 20000000000000n,
  "Light Red": 200000000000000n, "Light Gray": 2000000000000000n,
};

function computeCubePositions() {
  const totalWidth = (CUBE_COUNT * CUBE_SIZE) + ((CUBE_COUNT - 1) * CUBE_SPACING);
  const startX = Math.round((W - totalWidth) / 2);
  const arr = [];
  for (let i = 0; i < CUBE_COUNT; i++) {
    arr.push({ x: startX + i * (CUBE_SIZE + CUBE_SPACING), y: TOP_Y, w: CUBE_SIZE, h: CUBE_SIZE });
  }
  return arr;
}
const cubePositions = computeCubePositions();
function currentCubes() { return upgraded ? upgradeCubes : baseCubes; }
function buildCubes() { return currentCubes().map((c, i) => ({ ...c, pos: cubePositions[i], visible: true })); }

let cubes = buildCubes();

// const character = { x: W / 2 - CUBE_SIZE / 2, y: H / 2 - CUBE_SIZE / 2, w: CUBE_SIZE, h: CUBE_SIZE, color: "#ff2b2b", speed: 250, target: null, assignedName: null, assignedValue: 0n };
const character = {
  x: W / 2 - CUBE_SIZE / 2,
  y: H / 2 - CUBE_SIZE / 2,
  w: CUBE_SIZE,
  h: CUBE_SIZE,
  color: "#ff2b2b",
  speed: 250,
  target: null,
  assignedName: null,
  assignedValue: 0n,
  hasSword: false,       // Q toggles this
  slashing: false,       // true when space pressed
  slashDuration: 200     // ms duration of slash animation
};

const house = { w: 140, h: 140, x: W - 160, y: H - 160, border: "#ff3b3b" };

let bossDrops = [];

const inventory = {
  "🦴 Skeleton Bones": 0,
  "📿 Crossbones Relic": 0,
  "⬜💀 Skeleton Skin": 0,
  "⬜☠️ Crossbones Cube": 0
};

// 💰 Track how many total drops of each type (separate counters)
const dropCounters = {
  "🦴 Skeleton Bones": 0,
  "📿 Crossbones Relic": 0,
  "⬜💀 Skeleton Skin": 0,
  "⬜☠️ Crossbones Cube": 0
  //,
  //"bones": 0,
  //"relic": 0,
  //"skin": 0,
  //"cube": 0
};



let money = 1000n, incomePerSec = 0n, houseValue = 0n;

let bossSpawnInterval = 10 * 60 * 1000; // 10 minutes in ms
let nextBossSpawn = Date.now() + bossSpawnInterval;

const legendCounts = {};
[...baseCubes, ...upgradeCubes].forEach(c => legendCounts[c.name] = 0n);
let insideHouse = false;

// === 🛒 SHOP CONFIGURATION ===
const shopItems = {
  Swords: [
    { icon: "⚔️", price: 100_000_000n, name: "Iron Sword", limit: 1 },
    { icon: "🗡️", price: 100_000_000_000n, name: "Steel Sword", limit: 1 },
    { icon: "💎", price: 10_000_000_000_000n, name: "Crystal Sword", limit: 1 },
    { icon: "🔥", price: 100_000_000_000_000_000n, name: "Flame Blade", limit: 1 },
    { icon: "⚡", price: 100_000_000_000_000_000_000n, name: "Thunder Edge", limit: 1 },
  ],
  Relics: [
    { icon: "📿", price: 100_000_000n, name: "Relic of Light", limit: 1 },
    { icon: "🪶", price: 100_000_000_000n, name: "Relic of Wind", limit: 1 },
    { icon: "💀", price: 100_000_000_000_000n, name: "Relic of Death", limit: 1 },
    { icon: "🌙", price: 1_000_000_000_000_000_000n, name: "Relic of Night", limit: 1 },
    { icon: "☀️", price: 100_000_000_000_000_000_000n, name: "Relic of Sun", limit: 1 },
  ],
  Eggs: [
    { icon: "🥚", price: 100_000_000n, name: "Basic Egg", limit: 999 },
    { icon: "🐣", price: 100_000_000_000n, name: "Rare Egg", limit: 999 },
    { icon: "🐉", price: 100_000_000_000_000n, name: "Dragon Egg", limit: 999 },
    { icon: "✨", price: 1_000_000_000_000_000_000n, name: "Mythic Egg", limit: 999 },
    { icon: "🪺", price: 10_000_000_000_000_000_000_000n, name: "Celestial Egg", limit: 999 },
  ],
  Skins: [
    { icon: "🟥", price: 1_000_000_000n, name: "Red Skin", limit: 1 },
    { icon: "🟦", price: 1_000_000_000_000n, name: "Blue Skin", limit: 1 },
    { icon: "🟪", price: 1_000_000_000_000_000n, name: "Purple Skin", limit: 1 },
    { icon: "🟨", price: 10_000_000_000_000_000n, name: "Gold Skin", limit: 1 },
    { icon: "⬜", price: 1_000_000_000_000_000_000_000n, name: "Diamond Skin", limit: 1 },
  ],
  Potions: [
    { icon: "🧪", price: 1_000_000n, name: "Health Potion", limit: 999 },
    { icon: "💊", price: 10_000_000_000n, name: "Energy Potion", limit: 999 },
    { icon: "⚗️", price: 100_000_000_000_000n, name: "Alchemy Potion", limit: 999 },
    { icon: "🧉", price: 1_000_000_000_000_000_000n, name: "Mystic Potion", limit: 999 },
    { icon: "🥤", price: 10_000_000_000_000_000_000_000n, name: "Divine Potion", limit: 999 },
  ]
};

const playerInventory = {
  Swords: [],
  Relics: [],
  Eggs: [],
  Skins: [],
  Potions: []
};

// === 🦴 DROP LIMITS ===
const dropLimits = {
  bones: 999,
  relic: 1,
  skin: 1,
  cube: 1
};



function buyItem(category, index) {
  const item = shopItems[category][index];

  // --- Determine item limit by category ---
  const limit = (category === "Eggs" || category === "Potions") ? 999n : 1n;

  // --- Check current amount owned ---
  const owned = BigInt(inventory[item.name] || 0n);

  // --- Check purchase limit ---
  if (owned >= limit) {
    alert(`You already own the maximum number of ${item.name}s!`);
    return;
  }

  // --- Check money ---
  if (money < item.price) {
    alert(`Not enough money to buy ${item.name}!`);
    return;
  }

  // --- Process purchase ---
  money -= item.price;
  inventory[item.name] = owned + 1n;

  // --- Update player inventory by category ---
  const existing = playerInventory[category].find(i => i.name === item.name);
  if (existing) {
    existing.count++;
  } else {
    playerInventory[category].push({
      icon: item.icon,
      name: item.name,
      count: 1
    });
  }

  // --- Update all UI displays ---
  updateDisplays();
  updateInventoryDisplay();
}



// --- RENDER LEGEND UI ---
function renderLegendUI() {
  legendContainer.innerHTML = "";

  const itemsToShow = insideHouse ? shopItems : currentCubes();

  itemsToShow.forEach(c => {
    const row = document.createElement("div");
    row.className = "legend-row";
    row.innerHTML = `
      <div class="swatch" style="background:${c.color}"></div>
      <div class="legend-label">${insideHouse ? "SHOP: " : ""}${c.name} (${shortLabel(c.value)})</div>
      <div class="counter" id="cnt-${c.name.replace(/\s+/g, "_")}">${insideHouse ? "" : (legendCounts[c.name] || 0n)}</div>
    `;
    legendContainer.appendChild(row);

    // Click handler for shop
    if (insideHouse) {
      row.style.cursor = "pointer";
      row.addEventListener("click", () => {
        if (money >= c.value) {
          money -= c.value;
          alert(`✅ Purchased ${c.name} for ${formatBigInt(c.value)} money!`);
          updateDisplays();
        } else {
          alert("❌ Not enough money for ${c.name}");
        }
      });
    }
  });

  // Hide inventory when in shop
  document.getElementById("inventoryList").style.display = insideHouse ? "none" : "block";
}



// --- UPDATE HOUSE DEPOSIT & SHOP SWITCH ---
function checkHouseDeposit() {
  const nowInside = rectsOverlap(character, house);

  if (nowInside && !insideHouse) {
    insideHouse = true;
    document.getElementById("shopContainer").style.display = "block";
    updateShopDisplay();

    //renderLegendUI(); // switch to shop

    // Optional: perform deposit logic if desired
    if (character.assignedValue && money >= character.assignedValue) {
      money -= character.assignedValue;
      houseValue += character.assignedValue;
      legendCounts[character.assignedName] = (legendCounts[character.assignedName] || 0n) + 1n;
      recomputeIncome();
      updateDisplays();
      character.assignedValue = 0n;
      character.assignedName = null;
    }
  } else   if (nowInside && !insideHouse) {
    insideHouse = true;
    renderLegendUI();
  } else if (!nowInside && insideHouse) {
    insideHouse = false;
    document.getElementById("shopContainer").style.display = "none";
    renderLegendUI();
  }

}


function recomputeIncome() {
  incomePerSec = 0n;
  for (let n in legendCounts) 
    incomePerSec += legendCounts[n] * (incomeRates[n] || 0n);

  const adjustedIncome = BigInt(Math.floor(Number(incomePerSec) * weatherMultiplier));

  // Short version for display
  const shortText = formatBigInt(adjustedIncome);
  // Full version with commas for tooltip
  const fullText = formatBigInt2(adjustedIncome);


  incomeDisplay.textContent = "Income/sec: " + shortText;
  incomeDisplay.title = fullText; // ← hover tooltip

}


/**
 * Triggers a random weather event which affects income and speed.
 * Prevents overlap of weather events by checking if there is a current event.
 * Logs the name of the weather event to the console.
 * Sets the background color of the document body to the weather event's background color.
 * Sets the alpha value of the weather overlay to 0.3.
 * Ends the weather event after its specified duration using setTimeout.
 * @returns {undefined}
 */
function triggerWeatherEvent() {
  if (currentWeather) return; // prevent overlap
  const w = weatherEvents[Math.floor(Math.random() * weatherEvents.length)];
  currentWeather = w.name;
  weatherMultiplier = w.incomeBoost;
  speedMultiplier = w.speedBoost;
  document.body.style.background = w.bg;
  weatherOverlayAlpha = 0.3;
  console.log(`🌦 Weather started: ${w.name}`);

  // End after duration
  weatherTimer = setTimeout(endWeatherEvent, w.duration);

  startWeatherAnimation(currentWeather);

}

/**
 * Ends the current weather event by resetting its associated multipliers and
 * background style, and logging a message to the console.
 * This function is called automatically after the duration of the weather event.
 * @returns {undefined}
 */
function endWeatherEvent() {
  console.log(`🌤 Weather ended: ${currentWeather}`);
  currentWeather = null;
  weatherMultiplier = 1;
  speedMultiplier = 1;
  document.body.style.background = "linear-gradient(#111,#07101a)";
  weatherOverlayAlpha = 0;

  stopWeatherAnimation();

}


/**
 * Starts a weather animation based on the given type.
 * The type can be one of "Rain", "Wind", or "Thunder".
 * For "Rain", generates 150 particles with random positions and lengths/speeds.
 * For "Wind", generates 80 particles with random positions and lengths/speeds.
 * For "Thunder", generates a single particle with a flashing effect.
 * @param {string} type - The type of the weather animation to start.
 * @returns {undefined}
 */
function startWeatherAnimation(type) {
  weatherParticles = [];

  if (type === "Rain") {
    for (let i = 0; i < 150; i++) {
      weatherParticles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        len: 10 + Math.random() * 10,
        speed: 300 + Math.random() * 200
      });
    }
  }

  if (type === "Wind") {
    for (let i = 0; i < 80; i++) {
      weatherParticles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        len: 20 + Math.random() * 10,
        speed: 100 + Math.random() * 150
      });
    }
  }

  if (type === "Thunder") {
    weatherParticles.push({ flash: true, alpha: 0 });
  }
}

/**
 * Stops the current weather animation by resetting the weatherParticles array.
 * This function is called automatically after the duration of the weather event.
 * @returns {undefined}
 */
function stopWeatherAnimation() {
  weatherParticles = [];
}

/**
 * Updates the weather animation by moving and/or flashing the weather particles.
 * This function is called continuously by the requestAnimationFrame loop.
 * @param {number} dt - The time elapsed since the last frame in milliseconds.
 * @returns {undefined}
 */
function updateWeatherAnimation(dt) {
  if (!currentWeather) return;

  if (currentWeather === "Rain") {
    for (const p of weatherParticles) {
      p.y += p.speed * dt;
      if (p.y > H) {
        p.y = -p.len;
        p.x = Math.random() * W;
      }
    }
  }

  if (currentWeather === "Wind") {
    for (const p of weatherParticles) {
      p.x += p.speed * dt;
      if (p.x > W) {
        p.x = -p.len;
        p.y = Math.random() * H;
      }
    }
  }

  if (currentWeather === "Thunder") {
    // Random flash effect
    if (Math.random() < 0.005) {
      weatherParticles[0].alpha = 1;
    }
    if (weatherParticles[0].alpha > 0) {
      weatherParticles[0].alpha -= dt * 2;
    }
  }
}

/**
 * Draws the weather animation based on the current weather type.
 * This function is called continuously by the requestAnimationFrame loop.
 * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on.
 * @returns {undefined}
 */
function drawWeatherAnimation(ctx) {
  if (!currentWeather) return;

  ctx.save();
  if (currentWeather === "Rain") {
    ctx.strokeStyle = "rgba(150,200,255,0.5)";
    ctx.lineWidth = 1.5;
    for (const p of weatherParticles) {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y + p.len);
      ctx.stroke();
    }
  }

  if (currentWeather === "Wind") {
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 2;
    for (const p of weatherParticles) {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.len, p.y);
      ctx.stroke();
    }
  }

  if (currentWeather === "Thunder") {
    const a = weatherParticles[0].alpha;
    if (a > 0) {
      ctx.fillStyle = `rgba(255,255,200,${a})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
  ctx.restore();
}

// Auto every 5 minutes
setInterval(() => {
  if (!currentWeather) triggerWeatherEvent();
}, 300_000);

// Manual trigger with ']'
document.addEventListener("keydown", e => {
  if (e.key === "]") triggerWeatherEvent();
});

setInterval(() => { money += incomePerSec; updateDisplays(); }, 1000);

function updateDisplays() {
  moneyDisplay.textContent = "Money: " + formatBigInt(money);  
  moneyDisplay.title = formatBigInt2(money);

  incomeDisplay.textContent = "Income/sec: " + formatBigInt(incomePerSec);
  incomeDisplay.title = formatBigInt2(incomePerSec);

  houseDisplay.textContent = "House value: " + formatBigInt(houseValue);
  houseDisplay.title = formatBigInt2(houseValue);

  if (!insideHouse) { // only update legend counts if NOT inside house
    for (let c of currentCubes()) {
      const el = document.getElementById("cnt-" + c.name.replace(/\s+/g, "_"));
      if (el) el.textContent = legendCounts[c.name].toString();
    }
  }
}

function rectsOverlap(a, b) { return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y); }

function checkCubeCollisions() {
  for (let c of cubes) {
    if (rectsOverlap(character, c.pos)) {
      character.assignedName = c.name;
      character.assignedValue = BigInt(c.value);
      resolveSolidCollision(character, c.pos);
    }
  }
}

function resolveSolidCollision(a, b) {
  const overlapX = Math.min(a.x + a.w - b.x, b.x + b.w - a.x);
  const overlapY = Math.min(a.y + a.h - b.y, b.y + b.h - a.y);
  if (overlapX < overlapY) a.x += (a.x < b.x) ? -overlapX : overlapX;
  else a.y += (a.y < b.y) ? -overlapY : overlapY;
}

function handleSlash() {
  specials.forEach(s => {
    if (s.visible && rectsOverlap({x: character.x-10, y: character.y-10, w: character.w+20, h: character.h+20}, s)) {
      s.visible = false;
      // maybe apply some effect
    }
  });
}


const keys = {};
//window.addEventListener("keydown", e => { if ("wasd".includes(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true; });
window.addEventListener("keydown", e => {
  const key = e.key.toLowerCase();
  if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(key)) {
    keys[key] = true;
  }

  // Existing code
  if (key === "q") character.hasSword = !character.hasSword;
  if (key === "z" && character.hasSword && !character.slashing) {
  character.slashing = true;
  setTimeout(() => { character.slashing = false; }, character.slashDuration);
}

  if (e.key === "'") spawnBoss();
});

window.addEventListener("keyup", e => {
  const key = e.key.toLowerCase();
  if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(key)) {
    keys[key] = false;
  }
});

window.addEventListener("keyup", e => {
  const key = e.key.toLowerCase();
  if ("wasd".includes(key)) keys[key] = false;
});

window.addEventListener("keyup", e => { if ("wasd".includes(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false; });
canvas.addEventListener("mousedown", e => {
  const r = canvas.getBoundingClientRect();
  character.target = { x: e.clientX - r.left - character.w / 2, y: e.clientY - r.top - character.h / 2 };
});
toggleBtn.addEventListener("click", () => { upgraded = !upgraded; toggleBtn.textContent = upgraded ? "Downgrade Cubes" : "Upgrade Cubes"; cubes = buildCubes(); renderLegendUI(); updateDisplays(); });

// --- SAVE & LOAD PROGRESS ---
const saveBtn = document.getElementById("saveBtn");
const loadBtn = document.getElementById("loadBtn");

saveBtn.addEventListener("click", () => {
  const data = {
    money: money.toString(),
    incomePerSec: incomePerSec.toString(),
    houseValue: houseValue.toString(),
    legendCounts: Object.fromEntries(
      Object.entries(legendCounts).map(([k, v]) => [k, v.toString()])
    ),
    dropCounters,
    playerInventory,
    upgraded,
    bossDrops // 🧠 added here
  };
  localStorage.setItem("cubeGameSave", JSON.stringify(data));
  alert("✅ Progress Saved!");
});



loadBtn.addEventListener("click", () => {
  const raw = localStorage.getItem("cubeGameSave");
  if (!raw) return alert("⚠️ No saved game found.");

  if (!confirm("⚠️ Are you sure you want to load your previous save? All unsaved progress will be lost.")) {
    return;
  }

  try {
    const data = JSON.parse(raw);
    money = BigInt(data.money);
    incomePerSec = BigInt(data.incomePerSec);
    houseValue = BigInt(data.houseValue);
    for (let k in data.legendCounts) legendCounts[k] = BigInt(data.legendCounts[k]);
    upgraded = data.upgraded;

    // 🧺 Restore drop counters and player inventory
    if (data.dropCounters) Object.assign(dropCounters, data.dropCounters);
    if (data.playerInventory) {
      for (let cat in data.playerInventory) {
        playerInventory[cat] = data.playerInventory[cat];
      }
    }
    if (data.bossDrops) bossDrops = data.bossDrops;

    toggleBtn.textContent = upgraded ? "Downgrade Cubes" : "Upgrade Cubes";
    cubes = buildCubes();
    renderLegendUI();
    updateDisplays();
    updateInventoryDisplay(); // refresh inventory UI

    alert("✅ Progress Loaded!");
  } catch (err) {
    console.error(err);
    alert("❌ Failed to load save data!");
  }
});



// ---- Special Cubes ----
const specials = [
  { name: "teal", color: "teal", emoji: "💎", duration: 2000, respawn: 15000, effect: c => money += money / 10n },
  { name: "brown", color: "brown", emoji: "💀", duration: 5000, respawn: 60000, chase: true, speed: 120, effect: c => money -= money / 10n },
  { name: "yellow", color: "yellow", emoji: "⭐", duration: 1000, respawn: 300000, effect: c => money += money * 30n / 100n },
  { name: "scarlet", color: "crimson", emoji: "🔥", duration: 15000, respawn: 300000, chase: true, speed: 180, effect: c => money -= money * 30n / 100n },
  { name: "pink", color: "pink", emoji: "💖", duration: 1000, respawn: 390000, effect: c => money += money * 50n / 100n },
  { name: "magenta", color: "magenta", emoji: "💔", duration: 30000, respawn: 420000, chase: true, speed: 240, effect: c => money -= money * 50n / 100n },
];

const boss = {
  x: 0, y: 0, w: character.w * 1.5, h: character.h * 1.5,
  color: "#3b1f00",
  emoji: "☠️",
  visible: false,
  hitsToDie: 10,
  hitsRemaining: 10,
  playerHits: 0,
  speed: character.speed * 1.3,
  aoeRadius: 80,
  spawnX: 0,
  spawnY: 0,
};

// ⚡ Slash effects list
const slashes = [];

function spawnSlash(x, y, angle) {
  slashes.push({
    x, y,
    angle,
    life: 0,          // starts fresh
    maxLife: 15,      // frames before fade out
  });
}

// helper: generate random spawn interval (1× to 1.3× respawn)
function randomSpawnInterval(respawn) {
  return respawn + Math.random() * respawn * 0.3;
}

// spawn special cube at random position avoiding character and cubes
function spawnSpecial(s) {
  // position randomly, avoiding character and cubes
  do {
    s.x = Math.random() * (W - CUBE_SIZE);
    s.y = Math.random() * (H - CUBE_SIZE);
  } while (cubes.some(c => rectsOverlap({ x: s.x, y: s.y, w: CUBE_SIZE, h: CUBE_SIZE }, c.pos)) ||
           rectsOverlap({ x: s.x, y: s.y, w: CUBE_SIZE, h: CUBE_SIZE }, character));

  s.visible = true;

  // hide after duration
  setTimeout(() => {
    s.visible = false;
    // schedule next spawn strictly based on respawn timer
    setTimeout(() => spawnSpecial(s), randomSpawnInterval(s.respawn));
  }, s.duration);
}

// initialize special cubes with first spawn delayed by respawn time
//specials.forEach(s => setTimeout(() => spawnSpecial(s), randomSpawnInterval(s.respawn)));

function spawnBoss() {
  boss.x = Math.random() * (W - boss.w);
  boss.y = Math.random() * (H - boss.h);
  boss.spawnX = boss.x; // save spawn position
  boss.spawnY = boss.y;
  boss.visible = true;
  boss.hitsRemaining = 10;
  boss.playerHits = 0;

  nextBossSpawn = Date.now() + bossSpawnInterval; // reset timer

  // hide boss if not defeated in 30 seconds
  setTimeout(() => {
    if (boss.visible) boss.visible = false;
  }, 60000);
}


// initial spawn timer (10 min after game starts)
//setTimeout(spawnBoss, 600000);


// ---- Update loop handling specials ----
function update(dt) {
  let mx = 0, my = 0;
if (keys.w || keys.arrowup) my -= 1;
if (keys.s || keys.arrowdown) my += 1;
if (keys.a || keys.arrowleft) mx -= 1;
if (keys.d || keys.arrowright) mx += 1;

  if (mx || my) {
    const len = Math.hypot(mx, my);
    character.x += (mx / len) * character.speed * dt * speedMultiplier;
    character.y += (my / len) * character.speed * dt * speedMultiplier;
  } else if (character.target) {
    const dx = character.target.x - character.x, dy = character.target.y - character.y, dist = Math.hypot(dx, dy);
    if (dist > 2) { 
      character.x += (dx / dist) * character.speed * dt * speedMultiplier; 
      character.y += (dy / dist) * character.speed * dt * speedMultiplier; }
    else character.target = null;
  }

  character.x = Math.max(0, Math.min(W - character.w, character.x));
  character.y = Math.max(0, Math.min(H - character.h, character.y));

  specials.forEach(s => {
    if (s.visible && s.chase) {
      const dx = character.x - s.x, dy = character.y - s.y, dist = Math.hypot(dx, dy);
      if (dist > 1) { s.x += (dx / dist) * (s.speed * dt); s.y += (dy / dist) * (s.speed * dt); 
          if (boss.pauseUntil && Date.now() < boss.pauseUntil) return;        
      }
    }
    if (s.visible && rectsOverlap(s, character)) {
      s.visible = false;
      s.effect();
      updateDisplays();
      // next spawn is already scheduled independently, no need to trigger here
    }
  });

// 🧩 Boss movement and attack logic
if (boss.visible) {
  const dx = character.x - boss.x;
  const dy = character.y - boss.y;
  const distance = Math.hypot(dx, dy);

  if (boss.retreating) {
    // Move back to original spawn
    const rx = boss.spawnX - boss.x;
    const ry = boss.spawnY - boss.y;
    const rDist = Math.hypot(rx, ry);
    if (rDist > 2) {
      boss.x += (rx / rDist) * boss.speed * dt * 0.5;
      boss.y += (ry / rDist) * boss.speed * dt * 0.5;
    } else {
      boss.retreating = false; // stop retreating
      boss.pauseUntil = Date.now() + 800; // pause 0.8s before resuming chase

    }
  } else {
    // Normal chasing behavior
    if (distance > 2) {
      boss.x += (dx / distance) * boss.speed * dt * 0.5;
      boss.y += (dy / distance) * boss.speed * dt * 0.5;
    }

    // Attack range check
    if (distance < boss.w * 1.2 && !boss.attackCooldown) {
      boss.attackCooldown = true;
      boss.playerHits++;

      if (boss.playerHits < 3) {
        // First two hits — retreat
        boss.retreating = true;
      } else {
        // 3rd hit — money penalty and reset
        money = money / 2n;
        boss.visible = false;
        boss.playerHits = 0;
        nextBossSpawn = Date.now() + bossSpawnInterval; // reset timer
      }

      // small cooldown between attacks
      setTimeout(() => (boss.attackCooldown = false), 2000);
    }
  }
}
// 🗡️ Sword vs Boss collision check
if (boss.visible && character.slashing && !boss.retreating) {
if (boss.hitsRemaining <= 0) {
  boss.visible = false;
  boss.hitsRemaining = boss.hitsToDie;
  boss.playerHits = 0;
  nextBossSpawn = Date.now() + bossSpawnInterval;

  const drops = [];
  if (Math.random() <= 1.0) drops.push("🦴 Skeleton Bones");
  if (Math.random() <= 0.30) drops.push("📿 Crossbones Relic");
  if (Math.random() <= 0.05) drops.push("⬜💀 Skeleton Skin");
  if (Math.random() <= 0.01) drops.push("⬜☠️ Crossbones Cube");

  // Store drops visually
  bossDrops.push({ x: boss.x + boss.w/2, y: boss.y, items: drops, timer: 3000, opacity: 1 });

  // Update inventory and drop counters
  drops.forEach(item => {
    if (inventory[item] !== undefined) inventory[item]++;
    if (dropCounters[item] !== undefined) dropCounters[item]++;
    if (!playerInventory["Drops"]) playerInventory["Drops"] = [];
    const existing = playerInventory["Drops"].find(i => i.name === item);
    if (existing) existing.count++;
    else playerInventory["Drops"].push({ icon: "📦", name: item, count: 1 });
  });

  updateInventoryDisplay();
}


  // Define sword attack range in front of the player based on direction of movement
  const swordRange = 40;
  let swordBox = { x: character.x, y: character.y, w: character.w, h: character.h };

  // Check movement keys to infer facing direction
  if (keys.w) swordBox.y -= swordRange;
  else if (keys.s) swordBox.y += swordRange;
  else if (keys.a) swordBox.x -= swordRange;
  else swordBox.x += swordRange;

  swordBox.w += swordRange / 2;
  swordBox.h += swordRange / 2;

  // For debugging (optional)
  // ctx.strokeStyle = "yellow";
  // ctx.strokeRect(swordBox.x, swordBox.y, swordBox.w, swordBox.h);

  if (rectsOverlap(swordBox, boss) && !boss.hitCooldown && !boss.retreating) {
  boss.hitsRemaining--;
  boss.flash = true;
  spawnSlash(boss.x + boss.w / 2, boss.y + boss.h / 2, Math.random() * Math.PI * 2);

  // Boss retreats randomly around 30–50px away
  boss.retreating = true;
  boss.invulnerable = true; // can’t hurt player during retreat

  const angle = Math.random() * 2 * Math.PI;
  const distance = 30 + Math.random() * 20; // 30–50px random distance
  const newX = boss.x + Math.cos(angle) * distance;
  const newY = boss.y + Math.sin(angle) * distance;

  const startX = boss.x;
  const startY = boss.y;
  const startTime = performance.now();
  const retreatDuration = 400; // 0.4s retreat

  function retreatAnimation(now) {
    const progress = Math.min((now - startTime) / retreatDuration, 1);
    boss.x = startX + (newX - startX) * progress;
    boss.y = startY + (newY - startY) * progress;

    if (progress < 1) {
      requestAnimationFrame(retreatAnimation);
    } else {
      boss.retreating = false;
      boss.invulnerable = false;
    }
  }
  requestAnimationFrame(retreatAnimation);

  setTimeout(() => (boss.flash = false), 150);
  boss.hitCooldown = true;
  setTimeout(() => (boss.hitCooldown = false), 300);

 if (boss.hitsRemaining <= 0) {
  boss.visible = false;
  boss.hitsRemaining = boss.hitsToDie;
  boss.playerHits = 0;
  nextBossSpawn = Date.now() + bossSpawnInterval;

  // 🧩 Loot drop logic
  const drops = [];

  // Each roll uses Math.random()
  // 100% drop
  if (Math.random() <= 1.0) drops.push("🦴 Skeleton Bones");
  // 30% drop
  if (Math.random() <= 0.30) drops.push("📿 Crossbones Relic");
  // 5% drop
  if (Math.random() <= 0.05) drops.push("⬜💀 Skeleton Skin");
  // 1% drop
  if (Math.random() <= 0.01) drops.push("⬜☠️ Crossbones Cube");

  // Store drops to display them visually
  bossDrops.push({
    x: boss.x + boss.w / 2,
    y: boss.y,
    items: drops,
    timer: 3000, // display for 3 seconds
    opacity: 1
  });

// 🧾 Update inventory + drop counters
drops.forEach(item => {
  if (inventory[item] !== undefined) {
    inventory[item]++;
    dropCounters[item]++; // track total count per item type
  }
});
updateInventoryDisplay();

} 
}
}


// 🔁 Update slash effects
for (let i = slashes.length - 1; i >= 0; i--) {
  const s = slashes[i];
  s.life++;
  if (s.life > s.maxLife) slashes.splice(i, 1);
}
// 🔄 Update boss loot fade timers
for (let i = bossDrops.length - 1; i >= 0; i--) {
  const drop = bossDrops[i];
  drop.timer -= dt * 1000; // convert dt seconds → ms
  drop.opacity = Math.max(0, drop.timer / 3000); // fade out over 3s
  if (drop.timer <= 0) bossDrops.splice(i, 1);
}

  checkCubeCollisions();
  checkHouseDeposit();
}


function render() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  ctx.fillRect(12, 8, W - 24, 110);


// 🕒 Boss Timer Display
const now = Date.now();
ctx.fillStyle = 'white';
ctx.font = '16px Arial';
ctx.textAlign = 'left';
ctx.textBaseline = 'top';

if (!boss.visible) {
  const timeLeft = Math.max(0, nextBossSpawn - now);
  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  ctx.fillText(`Boss in: ${minutes}:${seconds.toString().padStart(2, '0')}`, 20, 20);
} else {
  ctx.fillText(`Boss HP: ${boss.hitsRemaining}/${boss.hitsToDie}`, 20, 20);
  ctx.fillText(`Your HP: ${3 - boss.playerHits}/3`, 20, 40);
}



  cubes.forEach(c => {
    const p = c.pos;
    ctx.fillStyle = c.color;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
    ctx.fillStyle = (c.color === '#e9ecef' || c.color === '#fff1a8' || c.color === '#ffc89b') ? '#111' : '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(shortLabel(c.value), p.x + p.w / 2, p.y + p.h / 2);


  if (character.hasSword) {
  const swordEmoji = '🗡️';
  const centerX = character.x + character.w + 12; // sword center x
  const centerY = character.y + character.h / 2;  // sword center y
  ctx.save();              // save current canvas state
  ctx.translate(centerX, centerY);   // move origin to sword center
  ctx.rotate(Math.PI);     // rotate 180 degrees (π radians)
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(swordEmoji, 0, 0);    // draw at new origin
  
        // if slashing, move it slightly forward or up for effect
      if (character.slashing) {
        //ctx.fillText(swordEmoji, character.x + character.w + 24, character.y + character.h/2 - 6);
            ctx.fillText(swordEmoji, -6, 7); // adjust these numbers as needed

      }
      ctx.restore();           // restore canvas state

  }

  });

  ctx.lineWidth = 3;
  ctx.strokeStyle = house.border;
  ctx.setLineDash([6, 6]);
  ctx.strokeRect(house.x + 1, house.y + 1, house.w - 2, house.h - 2);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('HOUSE', house.x + house.w - 8, house.y - 6);

  ctx.fillStyle = character.color;
  ctx.fillRect(character.x, character.y, character.w, character.h);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeRect(character.x + 0.5, character.y + 0.5, character.w - 1, character.h - 1);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(character.assignedValue ? shortLabel(character.assignedValue) : '—', character.x + character.w / 2, character.y + character.h / 2);


  // ⚡ Draw slash effects
slashes.forEach(s => {
  const alpha = 1 - s.life / s.maxLife;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.angle);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI / 2);
  ctx.stroke();
  ctx.restore();
});
ctx.globalAlpha = 1;


  if (character.assignedName) {
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(character.assignedName, character.x + character.w / 2, character.y - 10);
  }


if (boss.visible) {
  // draw boss
  //ctx.fillStyle = boss.color;
  ctx.fillStyle = boss.flash ? "#a00" : boss.color;
  ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeRect(boss.x + 0.5, boss.y + 0.5, boss.w - 1, boss.h - 1);
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(boss.emoji, boss.x + boss.w / 2, boss.y + boss.h / 2);

  // draw HP bars
  const barWidth = 200;
  ctx.fillStyle = '#222';
  ctx.fillRect(W/2 - barWidth/2, 20, barWidth, 10);
  ctx.fillStyle = '#f33';
  ctx.fillRect(W/2 - barWidth/2, 20, barWidth * (boss.hitsRemaining / boss.hitsToDie), 10);

  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Boss HP: ${boss.hitsRemaining}/${boss.hitsToDie}`, W/2, 15);

  // player HP bar
  ctx.fillStyle = '#222';
  ctx.fillRect(W/2 - barWidth/2, H - 30, barWidth, 10);
  ctx.fillStyle = '#0f0';
  ctx.fillRect(W/2 - barWidth/2, H - 30, barWidth * ((3 - boss.playerHits)/3), 10);
  ctx.fillStyle = '#fff';
  ctx.fillText(`Player HP: ${3 - boss.playerHits}/3`, W/2, H - 35);
}



  specials.forEach(s => {
    if (!s.visible) return;
    ctx.fillStyle = s.color;
    ctx.fillRect(s.x, s.y, CUBE_SIZE, CUBE_SIZE);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeRect(s.x + 0.5, s.y + 0.5, CUBE_SIZE - 1, CUBE_SIZE - 1);
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.emoji, s.x + CUBE_SIZE / 2, s.y + CUBE_SIZE / 2);
  });
  
  // 💰 Draw Boss Loot Drops
bossDrops.forEach(drop => {
  ctx.save();
  ctx.globalAlpha = drop.opacity;
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#fff';
  drop.items.forEach((item, i) => {
    ctx.fillText(item, drop.x, drop.y - i * 22);
  });
  ctx.restore();
});

}

let lastTime = performance.now();

function initializeGame() {
  // Build cubes, legend, and UI
  cubes = buildCubes();
  renderLegendUI();
  updateInventoryDisplay();
  updateDisplays();

  // Schedule boss spawn
  setTimeout(spawnBoss, 600000);

  // Initialize slash list & specials
  specials.forEach(s => setTimeout(() => spawnSpecial(s), randomSpawnInterval(s.respawn)));
}

// Call it once after defining everything
initializeGame();

/**
 * The main game loop. Called repeatedly by requestAnimationFrame.
 * Updates the game state (e.g. character movement, animations) and renders the game.
 * @param {number} t - The current time in milliseconds.
 */
function loop(t) {
  const dt = (t - lastTime) / 1000;
  lastTime = t;
  update(dt);
  updateWeatherAnimation(dt);
  render();
  drawWeatherAnimation(ctx);
  requestAnimationFrame(loop);
}

function init() {
  cubes = buildCubes();
  renderLegendUI();
  recomputeIncome();
  updateDisplays();
  requestAnimationFrame(loop);
}
init();

}
