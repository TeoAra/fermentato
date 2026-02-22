import { db } from "../server/db";
import { breweries } from "../shared/schema";
import { isNull, sql } from "drizzle-orm";

const GOOGLE_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;
const DELAY_MS = 300;

async function findBreweryLocation(name: string, country: string | null, region: string | null): Promise<{ lat: number; lng: number; address: string } | null> {
  const query = `${name} birrificio ${region || ""} ${country || "Italia"}`.trim();
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=geometry,formatted_address&key=${GOOGLE_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === "OK" && data.candidates && data.candidates.length > 0) {
      const place = data.candidates[0];
      return {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        address: place.formatted_address || "",
      };
    }

    if (data.status === "OVER_QUERY_LIMIT") {
      console.log("  Rate limited, waiting 3s...");
      await new Promise(r => setTimeout(r, 3000));
      return findBreweryLocation(name, country, region);
    }

    if (data.status === "REQUEST_DENIED") {
      console.error("API Error:", data.error_message);
      console.error("\n>>> Enable the Places API in Google Cloud Console <<<");
      console.error(">>> https://console.cloud.google.com/apis/library/places-backend.googleapis.com <<<\n");
      process.exit(1);
    }

    return null;
  } catch (err) {
    console.error("  Fetch error:", err);
    return null;
  }
}

async function main() {
  if (!GOOGLE_API_KEY) {
    console.error("VITE_GOOGLE_MAPS_API_KEY not set");
    process.exit(1);
  }

  console.log("Testing API key...");
  const testResult = await findBreweryLocation("Baladin", "Italia", "Piemonte");
  if (!testResult) {
    console.error("Test failed - could not find Baladin brewery. Check API key.");
    process.exit(1);
  }
  console.log(`API OK! Test: Baladin -> ${testResult.lat}, ${testResult.lng} (${testResult.address})\n`);

  const toFind = await db
    .select({ id: breweries.id, name: breweries.name, location: breweries.location, region: breweries.region, country: breweries.country })
    .from(breweries)
    .where(isNull(breweries.latitude));

  console.log(`Found ${toFind.length} breweries without coordinates\n`);

  let updated = 0;
  let failed = 0;
  const total = toFind.length;

  for (let i = 0; i < toFind.length; i++) {
    const brewery = toFind[i];
    const result = await findBreweryLocation(brewery.name, brewery.country, brewery.region);

    if (result) {
      await db.update(breweries)
        .set({
          latitude: result.lat.toString(),
          longitude: result.lng.toString(),
        })
        .where(sql`id = ${brewery.id}`);
      updated++;
    } else {
      failed++;
    }

    if ((i + 1) % 100 === 0 || i === toFind.length - 1) {
      console.log(`Progress: ${i + 1}/${total} | Updated: ${updated} | Failed: ${failed}`);
    }

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\n=============================`);
  console.log(`Done! Updated: ${updated}, Failed: ${failed}, Total: ${total}`);
  process.exit(0);
}

main();
