import { db } from "../server/db";
import { breweries } from "../shared/schema";
import { isNull, sql } from "drizzle-orm";

const GOOGLE_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;
const BATCH_SIZE = 50;
const DELAY_MS = 200;

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "OK" && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }
    if (data.status === "OVER_QUERY_LIMIT") {
      console.log("  Rate limited, waiting 3s...");
      await new Promise(r => setTimeout(r, 3000));
      return geocodeAddress(address);
    }
    return null;
  } catch (err) {
    console.error("  Fetch error:", err);
    return null;
  }
}

function buildAddress(location: string, region: string | null, country: string | null): string {
  const parts = [location];
  if (region && region !== country && region !== "Italia" && region.length > 2) parts.push(region);
  if (country) parts.push(country);
  return parts.join(", ");
}

async function main() {
  if (!GOOGLE_API_KEY) {
    console.error("VITE_GOOGLE_MAPS_API_KEY not set");
    process.exit(1);
  }

  // Test the API key first with a known address
  console.log("Testing API key with a known address...");
  const testUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent("Roma, Italia")}&key=${GOOGLE_API_KEY}`;
  const testRes = await fetch(testUrl);
  const testData = await testRes.json();
  console.log("Test result status:", testData.status);
  if (testData.error_message) {
    console.error("API Error:", testData.error_message);
    console.error("\n>>> You need to enable the Geocoding API in Google Cloud Console <<<");
    console.error(">>> Go to: https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com <<<\n");
    process.exit(1);
  }
  if (testData.status !== "OK") {
    console.error("Unexpected status:", testData.status);
    console.error("Full response:", JSON.stringify(testData, null, 2));
    process.exit(1);
  }
  console.log("API key works! Roma coords:", testData.results[0].geometry.location);

  const toGeocode = await db
    .select({ id: breweries.id, name: breweries.name, location: breweries.location, region: breweries.region, country: breweries.country })
    .from(breweries)
    .where(isNull(breweries.latitude));

  console.log(`\nFound ${toGeocode.length} breweries without coordinates\n`);

  let updated = 0;
  let failed = 0;
  const failedNames: string[] = [];

  for (let i = 0; i < toGeocode.length; i += BATCH_SIZE) {
    const batch = toGeocode.slice(i, i + BATCH_SIZE);
    console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(toGeocode.length / BATCH_SIZE)} (${i + 1}-${Math.min(i + BATCH_SIZE, toGeocode.length)})`);

    for (const brewery of batch) {
      if (!brewery.location) {
        failed++;
        failedNames.push(`${brewery.name} (no address)`);
        continue;
      }

      const address = buildAddress(brewery.location, brewery.region, brewery.country);
      const coords = await geocodeAddress(address);

      if (coords) {
        await db.update(breweries)
          .set({ latitude: coords.lat.toString(), longitude: coords.lng.toString() })
          .where(sql`id = ${brewery.id}`);
        updated++;
        if (updated % 100 === 0) console.log(`  => Updated ${updated} so far...`);
      } else {
        failed++;
        if (failedNames.length < 30) failedNames.push(`${brewery.name} -> "${address}"`);
      }

      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n=============================`);
  console.log(`Done! Updated: ${updated}, Failed: ${failed}`);
  if (failedNames.length > 0) {
    console.log(`\nSample failures:`);
    failedNames.forEach(n => console.log(`  - ${n}`));
  }
  process.exit(0);
}

main();
