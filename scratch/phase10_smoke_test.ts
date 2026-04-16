import { generateDailyBriefDrafts } from "../src/lib/daily-brief-orchestrator";

// This is a dummy test to see if the imports and logic are still valid
console.log("Starting smoke test for DailySparks Phase 10...");

// Since we can't actually run AI here without API keys, we'll just check if the functions are exported correctly.
if (typeof generateDailyBriefDrafts === 'function') {
  console.log("SUCCESS: generateDailyBriefDrafts is available.");
} else {
  console.log("FAILED: generateDailyBriefDrafts is not a function.");
}
