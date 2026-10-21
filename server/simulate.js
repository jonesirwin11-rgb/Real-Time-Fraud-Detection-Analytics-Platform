require('dotenv').config();
const axios = require('axios');

const BASE_URL = `http://localhost:${process.env.PORT || 3000}/api`;

// 20 distinct cards with fixed home locations
const CARD_PROFILES = [
  { cardId: "CARD_01", home: "NY" },
  { cardId: "CARD_02", home: "CA" },
  { cardId: "CARD_03", home: "TX" },
  { cardId: "CARD_04", home: "FL" },
  { cardId: "CARD_05", home: "IL" },
  { cardId: "CARD_06", home: "PA" },
  { cardId: "CARD_07", home: "OH" },
  { cardId: "CARD_08", home: "GA" },
  { cardId: "CARD_09", home: "NC" },
  { cardId: "CARD_10", home: "MI" },
  { cardId: "CARD_11", home: "NJ" },
  { cardId: "CARD_12", home: "VA" },
  { cardId: "CARD_13", home: "WA" },
  { cardId: "CARD_14", home: "AZ" },
  { cardId: "CARD_15", home: "MA" },
  { cardId: "CARD_16", home: "CO" },
  { cardId: "CARD_17", home: "TN" },
  { cardId: "CARD_18", home: "MO" },
  { cardId: "CARD_19", home: "MD" },
  { cardId: "CARD_20", home: "WI" }
];

const FOREIGN_LOCATIONS = ["UK", "JP", "FR", "DE", "SG", "AU"];

// Parse --duration argument (in seconds), default to null (continuous)
const args = process.argv.slice(2);
let durationSec = null;
const durationIdx = args.indexOf('--duration');
if (durationIdx !== -1 && args[durationIdx + 1]) {
  durationSec = parseInt(args[durationIdx + 1], 10);
}

const simulate = async () => {
  try {
    console.log("Setting up simulator user...");
    const simUser = { username: "simulator", password: "password123" };
    try {
      await axios.post(`${BASE_URL}/auth/register`, simUser);
    } catch (e) {
      // Ignore if user already exists
    }

    const { data } = await axios.post(`${BASE_URL}/auth/login`, simUser);
    const token = data.token;
    const config = { headers: { Authorization: `Bearer ${token}` } };
    
    console.log(`Starting simulator with ${CARD_PROFILES.length} cards...`);
    if (durationSec) {
      console.log(`Simulation will run for exactly ${durationSec} seconds (${(durationSec / 60).toFixed(1)} minutes)...`);
    } else {
      console.log("Running continuously (Ctrl+C to stop)...");
    }

    // Initialize state
    CARD_PROFILES.forEach(c => {
      c.currentLocation = c.home;
      c.lastUsed = 0;
    });

    let totalCount = 0;
    let flaggedCount = 0;
    const ruleCounts = {};
    const startTime = Date.now();

    // Round-robin least-recently-used card picker
    const getNextCard = () => {
      const sorted = [...CARD_PROFILES].sort((a, b) => a.lastUsed - b.lastUsed);
      const chosen = sorted[0];
      chosen.lastUsed = Date.now();
      return chosen;
    };

    const interval = setInterval(async () => {
      const elapsedSec = (Date.now() - startTime) / 1000;
      if (durationSec && elapsedSec >= durationSec) {
        clearInterval(interval);
        printSummary(totalCount, flaggedCount, ruleCounts, elapsedSec);
        process.exit(0);
        return;
      }

      totalCount++;
      const profile = getNextCard();
      let location = profile.currentLocation;
      let amount = parseFloat((Math.random() * 100 + 10).toFixed(2));
      let isDeliberateAnomaly = false;

      // Deliberate anomaly schedule every ~12-15 ticks to target ~7-10% fraud rate
      // Velocity Anomaly at ticks 14, 38, 62, 86...
      if (totalCount % 24 === 14) {
        isDeliberateAnomaly = true;
        console.log(`\n>>> [DELIBERATE ANOMALY] Injecting Velocity Burst for ${profile.cardId} <<<`);
        // Send 3 rapid setup transactions in CA or home location within 300ms
        for (let i = 0; i < 3; i++) {
          try {
            const burstTx = await axios.post(`${BASE_URL}/transactions`, {
              cardId: profile.cardId,
              amount: parseFloat((Math.random() * 20 + 5).toFixed(2)),
              location: profile.currentLocation
            }, config);
            totalCount++;
            if (burstTx.data.flagged) flaggedCount++;
          } catch (e) {}
        }
        // The 4th transaction will now trigger the velocity threshold!
      } 
      // Location Jump Anomaly at ticks 24, 48, 72, 96...
      else if (totalCount % 24 === 0) {
        isDeliberateAnomaly = true;
        const foreign = FOREIGN_LOCATIONS[Math.floor(Math.random() * FOREIGN_LOCATIONS.length)];
        console.log(`\n>>> [DELIBERATE ANOMALY] Injecting Location Jump for ${profile.cardId} (${profile.currentLocation} -> ${foreign}) <<<`);
        location = foreign;
        profile.currentLocation = foreign; // Card now resides at the new location
      }

      try {
        const res = await axios.post(`${BASE_URL}/transactions`, {
          cardId: profile.cardId,
          amount,
          location
        }, config);

        const tx = res.data;
        if (tx.flagged) {
          flaggedCount++;
          (tx.rulesTriggered || []).forEach(r => {
            ruleCounts[r] = (ruleCounts[r] || 0) + 1;
          });
        }

        const rate = ((flaggedCount / totalCount) * 100).toFixed(1);
        const rulesStr = tx.rulesTriggered && tx.rulesTriggered.length > 0
          ? `[${tx.rulesTriggered.join(', ')}]`
          : 'None';
        const tag = tx.flagged ? `FLAGGED (${rulesStr})` : 'Clean';

        console.log(`[${Math.floor(elapsedSec)}s] Tx #${totalCount}: ${profile.cardId} | $${amount.toFixed(2)} | ${location} | ${tag} | Rate: ${rate}% (${flaggedCount}/${totalCount})`);
      } catch (err) {
        console.error("Simulation error:", err.response?.data || err.message);
      }
    }, 2000);

    const printSummary = (total, flagged, rules, elapsed) => {
      console.log("\n=======================================================");
      console.log("            SIMULATION BENCHMARK REPORT                ");
      console.log("=======================================================");
      console.log(`Duration Elapsed:     ${elapsed.toFixed(1)} seconds (${(elapsed / 60).toFixed(2)} min)`);
      console.log(`Total Transactions:   ${total}`);
      console.log(`Normal Transactions:  ${total - flagged}`);
      console.log(`Flagged Transactions: ${flagged}`);
      const rate = total > 0 ? ((flagged / total) * 100).toFixed(2) : 0;
      console.log(`Fraud Rate:           ${rate}%`);
      console.log("-------------------------------------------------------");
      console.log("Triggered Rules Breakdown:");
      Object.entries(rules).forEach(([r, count]) => {
        console.log(`  - ${r}: ${count}`);
      });
      console.log("=======================================================\n");
    };

    // Print summary on manual Ctrl+C
    process.on('SIGINT', () => {
      const elapsedSec = (Date.now() - startTime) / 1000;
      printSummary(totalCount, flaggedCount, ruleCounts, elapsedSec);
      process.exit(0);
    });

  } catch (err) {
    console.error("Simulator setup failed:", err.response?.data || err.message);
  }
};

simulate();
