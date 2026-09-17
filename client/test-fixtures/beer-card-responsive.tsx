import { createRoot } from "react-dom/client";
import "../src/index.css";
import TaplistSection from "../src/components/pub/TaplistSection";
import BottlesSection from "../src/components/pub/BottlesSection";
import type { BottleItem, PubBeer, TapItem } from "../src/components/pub/types";

const beer: PubBeer = {
  id: 991,
  name: "Imperial Pastry Stout Affinata in Botti di Bourbon SenzaInterruzioniEstremamenteLunghe",
  brewery: {
    id: 81,
    name: "Birrificio Artigianale delle Valli e delle Montagne SenzaInterruzioniEstremamenteLunghe",
  },
  style: "Barrel Aged Imperial Double Chocolate Coffee Pastry Stout con Vaniglia del Madagascar",
  abv: "12.8",
  country: "Italia",
  isGlutenFree: true,
  isAlcoholFree: true,
};

const tap: TapItem = {
  id: 71,
  beer,
  tapNumber: 1,
  prices: [
    { size: "0,20L", price: "4.50" },
    { size: "0,40L", price: "7.50" },
    { size: "1,00L", price: "15.00" },
  ],
};

const bottle: BottleItem = {
  id: 72,
  beer,
  format: "Bottiglia",
  size: "75 cl",
  price: "18.50",
  updatedAt: "2026-09-17T10:00:00.000Z",
};

function Fixture() {
  const actionProps = {
    currentUserCanCheckin: true,
    onCheckin: () => undefined,
    onToggleFavorite: () => undefined,
    favoriteBeerIds: new Set<number>([beer.id]),
  };

  return (
    <main className="mx-auto w-full overflow-x-hidden px-4 pb-8" data-testid="fixture-root">
      <TaplistSection taps={[tap]} {...actionProps} />
      <BottlesSection bottles={[bottle]} {...actionProps} />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);