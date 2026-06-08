import type { FoodMenu, MenuCategory } from "./types";

export const MOCK_AMENITIES = [
  "Wi-Fi gratuito",
  "Pet Friendly",
  "Carte accettate",
  "Dehor estivo",
];

export const MOCK_SERVICES_INFO_CARDS = [
  { key: "beer_shop", label: "Beer shop", available: false },
  { key: "events", label: "Eventi", available: true },
  { key: "private_events", label: "Feste private", available: true },
  { key: "gift_card", label: "Gift card", available: false },
  { key: "accessibility", label: "Accessibilità", available: true },
];

const ph = (seed: string) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=320&q=70`;

export const MOCK_FOOD_MENU: FoodMenu = {
  categories: [
    {
      id: "panini",
      name: "Panini",
      items: [
        {
          id: "p1",
          name: "Burger Craft",
          description:
            "Hamburger di manzo 200g, cheddar, bacon croccante, cipolla caramellata, lattuga, pomodoro e salsa Luppolino.",
          price: 12,
          imageUrl: ph("1568901346375-23c9450c58cd"),
          allergens: [
            { emoji: "🌾", label: "Glutine" },
            { emoji: "🥛", label: "Latte" },
            { emoji: "🥚", label: "Uova" },
          ],
          pairingBeer: { name: "Hop Fiction IPA" },
        },
        {
          id: "p2",
          name: "Veggie Brioche",
          description:
            "Hamburger di legumi, hummus di ceci, rucola e pomodori secchi su pane brioche.",
          price: 11,
          imageUrl: ph("1565299624946-b28f40a0ae38"),
          allergens: [
            { emoji: "🌾", label: "Glutine" },
            { emoji: "🌰", label: "Frutta a guscio" },
          ],
          isVegetarian: true,
          pairingBeer: { name: "Pils Unfiltered" },
        },
        {
          id: "p3",
          name: "Pulled Pork Bun",
          description:
            "Maialino sfilacciato, coleslaw fresco, pickles e BBQ artigianale.",
          price: 13,
          imageUrl: ph("1606755962773-d324e0a13086"),
          allergens: [{ emoji: "🌾", label: "Glutine" }, { emoji: "🌭", label: "Senape" }],
          pairingBeer: { name: "DDH Pale Ale" },
        },
      ],
    },
    {
      id: "piatti",
      name: "Piatti",
      items: [
        {
          id: "pi1",
          name: "Tagliere Salumi",
          description:
            "Selezione di salumi e formaggi artigianali con grissini, olive e confetture.",
          price: 14,
          imageUrl: ph("1599488615731-7e5c2823ff28"),
          allergens: [
            { emoji: "🥛", label: "Latte" },
            { emoji: "🌾", label: "Glutine" },
          ],
          pairingBeer: { name: "La Débauche Sour" },
        },
        {
          id: "pi2",
          name: "Patatine Nachos",
          description: "Con doppio cheddar fondente e jalapeños.",
          price: 8,
          imageUrl: ph("1541592106381-b31e9677c0e5"),
          allergens: [{ emoji: "🥛", label: "Latte" }],
          isVegetarian: true,
          pairingBeer: { name: "Pils Unfiltered" },
        },
        {
          id: "pi3",
          name: "Wings BBQ",
          description: "10 ali di pollo glassate con salsa BBQ affumicata.",
          price: 12,
          imageUrl: ph("1567620832903-9fc6debc209f"),
          allergens: [{ emoji: "🌭", label: "Senape" }],
        },
      ],
    },
    {
      id: "taglieri",
      name: "Taglieri",
      items: [
        {
          id: "t1",
          name: "Tagliere Italia",
          description:
            "Selezione di tre formaggi DOP, tre salumi italiani, miele e marmellate.",
          price: 18,
          imageUrl: ph("1452195100486-9cc805987862"),
          allergens: [{ emoji: "🥛", label: "Latte" }],
        },
        {
          id: "t2",
          name: "Tagliere Veggie",
          description: "Formaggi vegani, verdure grigliate, hummus e pane integrale.",
          price: 15,
          imageUrl: ph("1505253758473-96b7015fcd40"),
          isVegetarian: true,
          allergens: [{ emoji: "🌾", label: "Glutine" }, { emoji: "🌰", label: "Frutta a guscio" }],
        },
      ],
    },
    {
      id: "snack",
      name: "Snack",
      items: [
        {
          id: "s1",
          name: "Olive ascolane",
          description: "5 pezzi, fritte al momento.",
          price: 6,
          imageUrl: ph("1604908176997-125f25cc6f3d"),
          allergens: [{ emoji: "🌾", label: "Glutine" }, { emoji: "🥚", label: "Uova" }],
        },
        {
          id: "s2",
          name: "Pretzel caldo",
          description: "Pretzel bavarese con senape dolce.",
          price: 5,
          imageUrl: ph("1568051243851-f9b136146e97"),
          isVegetarian: true,
          allergens: [{ emoji: "🌾", label: "Glutine" }, { emoji: "🌭", label: "Senape" }],
        },
        {
          id: "s3",
          name: "Mix fritto",
          description: "Mozzarelline, anelli di cipolla e crocchette di patate.",
          price: 7,
          imageUrl: ph("1606756790138-261d2b21cd75"),
          isVegetarian: true,
          allergens: [{ emoji: "🥛", label: "Latte" }, { emoji: "🌾", label: "Glutine" }],
        },
      ],
    },
    {
      id: "dolci",
      name: "Dolci",
      items: [
        {
          id: "d1",
          name: "Brownie al cioccolato",
          description: "Brownie tiepido con gelato alla vaniglia.",
          price: 7,
          imageUrl: ph("1606313564200-e75d5e30476c"),
          isVegetarian: true,
          allergens: [
            { emoji: "🥛", label: "Latte" },
            { emoji: "🥚", label: "Uova" },
            { emoji: "🌾", label: "Glutine" },
          ],
        },
        {
          id: "d2",
          name: "Cheesecake ai frutti rossi",
          description: "Cheesecake con base biscotto e coulis di lamponi.",
          price: 6,
          imageUrl: ph("1567306226416-28f0efdc88ce"),
          isVegetarian: true,
          allergens: [{ emoji: "🥛", label: "Latte" }, { emoji: "🌾", label: "Glutine" }],
        },
      ],
    },
  ] as MenuCategory[],
};

export const ALLERGEN_LEGEND = [
  { emoji: "🌾", label: "Glutine" },
  { emoji: "🥛", label: "Latte" },
  { emoji: "🥚", label: "Uova" },
  { emoji: "🌰", label: "Frutta a guscio" },
  { emoji: "🥜", label: "Arachidi" },
  { emoji: "🐟", label: "Pesce" },
  { emoji: "🦐", label: "Crostacei" },
  { emoji: "🦑", label: "Molluschi" },
  { emoji: "🌭", label: "Senape" },
  { emoji: "🫘", label: "Soia" },
  { emoji: "🟤", label: "Sesamo" },
  { emoji: "🌱", label: "Lupini" },
  { emoji: "🥬", label: "Sedano" },
  { emoji: "🧪", label: "Solfiti" },
];
