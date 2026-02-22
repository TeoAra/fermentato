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
      console.log("Rate limited, waiting...");
      await new Promise(r => setTimeout(r, 2000));
      return geocodeAddress(address);
    }
    return null;
  } catch {
    return null;
  }
}

function buildAddress(location: string, region: string | null, country: string | null): string {
  const parts = [location];
  if (region && region !== country && region !== "Italia") parts.push(region);
  if (country) parts.push(country);
  return parts.join(", ");
}

async function main() {
  if (!GOOGLE_API_KEY) {
    console.error("VITE_GOOGLE_MAPS_API_KEY not set");
    process.exit(1);
  }

  const toGeocode = await db
    .select({ id: breweries.id, name: breweries.name, location: breweries.location, region: breweries.region, country: breweries.country })
    .from(breweries)
    .where(isNull(breweries.latitude));

  console.log(`Found ${toGeocode.length} breweries without coordinates`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < toGeocode.length; i += BATCH_SIZE) {
    const batch = toGeocode.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(toGeocode.length / BATCH_SIZE)} (${i + 1}-${Math.min(i + BATCH_SIZE, toGeocode.length)})`);

    for (const brewery of batch) {
      if (!brewery.location) {
        failed++;
        continue;
      }

      const address = buildAddress(brewery.location, brewery.region, brewery.country);
      const coords = await geocodeAddress(address);

      if (coords) {
        await db.update(breweries)
          .set({ latitude: coords.lat.toString(), longitude: coords.lng.toString() })
          .where(sql`id = ${brewery.id}`);
        updated++;
        if (updated % 50 === 0) console.log(`  Updated ${updated} so far...`);
      } else {
        failed++;
      }

      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\nDone! Updated: ${updated}, Failed: ${failed}`);
  process.exit(0);
}

main();
