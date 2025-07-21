import {
  users,
  pubs,
  breweries,
  beers,
  tapList,
  bottleList,
  menuCategories,
  menuItems,
  favorites,
  ratings,
  type User,
  type UpsertUser,
  type Pub,
  type InsertPub,
  type Brewery,
  type InsertBrewery,
  type Beer,
  type InsertBeer,
  type TapList,
  type InsertTapList,
  type BottleList,
  type InsertBottleList,
  type MenuCategory,
  type InsertMenuCategory,
  type MenuItem,
  type InsertMenuItem,
  type Favorite,
  type InsertFavorite,
  type Rating,
  type InsertRating,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, like, ilike, and, or, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Pub operations
  getPubs(): Promise<Pub[]>;
  getPub(id: number): Promise<Pub | undefined>;
  getPubsByOwner(ownerId: string): Promise<Pub[]>;
  createPub(pub: InsertPub): Promise<Pub>;
  updatePub(id: number, pub: Partial<InsertPub>): Promise<Pub>;
  searchPubs(query: string): Promise<Pub[]>;

  // Brewery operations
  getBreweries(): Promise<Brewery[]>;
  getBrewery(id: number): Promise<Brewery | undefined>;
  createBrewery(brewery: InsertBrewery): Promise<Brewery>;
  searchBreweries(query: string): Promise<Brewery[]>;

  // Beer operations
  getBeers(): Promise<Beer[]>;
  getBeer(id: number): Promise<Beer | undefined>;
  getBeersByBrewery(breweryId: number): Promise<Beer[]>;
  createBeer(beer: InsertBeer): Promise<Beer>;
  searchBeers(query: string): Promise<Beer[]>;

  // Tap list operations
  getTapListByPub(pubId: number): Promise<(TapList & { beer: Beer & { brewery: Brewery } })[]>;
  addBeerToTap(tapItem: InsertTapList): Promise<TapList>;
  updateTapItem(id: number, tapItem: Partial<InsertTapList>): Promise<TapList>;
  removeBeerFromTap(id: number): Promise<void>;

  // Bottle list operations (cantina)
  getBottleListByPub(pubId: number): Promise<(BottleList & { beer: Beer & { brewery: Brewery } })[]>;
  addBeerToBottles(bottleItem: InsertBottleList): Promise<BottleList>;
  updateBottleItem(id: number, bottleItem: Partial<InsertBottleList>): Promise<BottleList>;
  removeBeerFromBottles(id: number): Promise<void>;

  // Menu operations
  getMenuByPub(pubId: number): Promise<(MenuCategory & { items: MenuItem[] })[]>;
  createMenuCategory(category: InsertMenuCategory): Promise<MenuCategory>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem>;

  // Favorites operations
  getFavoritesByUser(userId: string): Promise<Favorite[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: string, pubId: number): Promise<void>;

  // Rating operations
  addRating(rating: InsertRating): Promise<Rating>;
  getRatingsByPub(pubId: number): Promise<Rating[]>;
  getRatingByUserAndPub(userId: string, pubId: number): Promise<Rating | undefined>;

  // Search operations
  search(query: string): Promise<{
    pubs: Pub[];
    breweries: Brewery[];
    beers: (Beer & { brewery: Brewery })[];
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Pub operations
  async getPubs(): Promise<Pub[]> {
    return await db.select().from(pubs).where(eq(pubs.isActive, true)).orderBy(desc(pubs.rating));
  }

  async getPub(id: number): Promise<Pub | undefined> {
    const [pub] = await db.select().from(pubs).where(eq(pubs.id, id));
    return pub;
  }

  async getPubsByOwner(ownerId: string): Promise<Pub[]> {
    return await db.select().from(pubs).where(eq(pubs.ownerId, ownerId));
  }

  async createPub(pubData: InsertPub): Promise<Pub> {
    const [pub] = await db.insert(pubs).values(pubData).returning();
    return pub;
  }

  async updatePub(id: number, pubData: Partial<InsertPub>): Promise<Pub> {
    const [pub] = await db
      .update(pubs)
      .set({ ...pubData, updatedAt: new Date() })
      .where(eq(pubs.id, id))
      .returning();
    return pub;
  }

  async searchPubs(query: string): Promise<Pub[]> {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    
    if (searchTerms.length === 0) return [];
    
    // Se ci sono più termini, cerca che tutti siano presenti nel nome
    if (searchTerms.length > 1) {
      const conditions = searchTerms.map(term => 
        or(
          ilike(pubs.name, `%${term}%`),
          ilike(pubs.city, `%${term}%`),
          ilike(pubs.address, `%${term}%`),
          ilike(pubs.description, `%${term}%`)
        )
      );
      
      return await db
        .select()
        .from(pubs)
        .where(
          and(
            eq(pubs.isActive, true),
            ...conditions
          )
        )
        .orderBy(desc(pubs.rating))
        .limit(5);
    }
    
    // Ricerca singola
    return await db
      .select()
      .from(pubs)
      .where(
        and(
          eq(pubs.isActive, true),
          or(
            ilike(pubs.name, `%${query}%`),
            ilike(pubs.city, `%${query}%`),
            ilike(pubs.address, `%${query}%`),
            ilike(pubs.description, `%${query}%`)
          )
        )
      )
      .orderBy(desc(pubs.rating))
      .limit(5);
  }

  // Brewery operations
  async getBreweries(): Promise<Brewery[]> {
    return await db.select().from(breweries).orderBy(desc(breweries.rating));
  }

  async getBrewery(id: number): Promise<Brewery | undefined> {
    const [brewery] = await db.select().from(breweries).where(eq(breweries.id, id));
    return brewery;
  }

  async createBrewery(breweryData: InsertBrewery): Promise<Brewery> {
    const [brewery] = await db.insert(breweries).values(breweryData).returning();
    return brewery;
  }

  async searchBreweries(query: string): Promise<Brewery[]> {
    return await db
      .select()
      .from(breweries)
      .where(
        or(
          ilike(breweries.name, `%${query}%`),
          ilike(breweries.location, `%${query}%`),
          ilike(breweries.region, `%${query}%`),
          ilike(breweries.description, `%${query}%`)
        )
      )
      .orderBy(desc(breweries.rating))
      .limit(5);
  }

  // Beer operations
  async getBeers(): Promise<Beer[]> {
    return await db.select().from(beers).orderBy(asc(beers.name));
  }

  async getBeer(id: number): Promise<Beer | undefined> {
    const [beer] = await db.select().from(beers).where(eq(beers.id, id));
    return beer;
  }

  async getBeersByBrewery(breweryId: number): Promise<Beer[]> {
    return await db.select().from(beers).where(eq(beers.breweryId, breweryId)).orderBy(asc(beers.name));
  }

  async createBeer(beerData: InsertBeer): Promise<Beer> {
    const [beer] = await db.insert(beers).values(beerData).returning();
    return beer;
  }

  async searchBeers(query: string): Promise<Beer[]> {
    return await db
      .select()
      .from(beers)
      .where(
        or(
          ilike(beers.name, `%${query}%`),
          ilike(beers.style, `%${query}%`),
          ilike(beers.description, `%${query}%`)
        )
      )
      .orderBy(asc(beers.name))
      .limit(5);
  }

  async getBeerWithBrewery(id: number): Promise<(Beer & { brewery?: Brewery }) | undefined> {
    const [result] = await db
      .select()
      .from(beers)
      .leftJoin(breweries, eq(beers.breweryId, breweries.id))
      .where(eq(beers.id, id));
    
    if (!result) return undefined;
    
    return {
      ...result.beers,
      brewery: result.breweries || undefined,
    };
  }

  async getBeerTapLocations(beerId: number): Promise<Array<{
    pub: { id: number; name: string; city: string; address: string };
    price?: string;
    isActive: boolean;
  }>> {
    const results = await db
      .select({
        pub: {
          id: pubs.id,
          name: pubs.name,
          city: pubs.city,
          address: pubs.address,
        },
        price: tapList.price,
        isActive: tapList.isActive,
      })
      .from(tapList)
      .leftJoin(pubs, eq(tapList.pubId, pubs.id))
      .where(eq(tapList.beerId, beerId));
    
    return results;
  }

  // Tap list operations
  async getTapListByPub(pubId: number): Promise<(TapList & { beer: Beer & { brewery: Brewery } })[]> {
    return await db
      .select()
      .from(tapList)
      .leftJoin(beers, eq(tapList.beerId, beers.id))
      .leftJoin(breweries, eq(beers.breweryId, breweries.id))
      .where(and(eq(tapList.pubId, pubId), eq(tapList.isActive, true)))
      .orderBy(asc(tapList.tapNumber))
      .then(rows => 
        rows.map(row => ({
          ...row.tap_list,
          beer: {
            ...row.beers!,
            brewery: row.breweries!,
          },
        }))
      );
  }

  async addBeerToTap(tapItem: InsertTapList): Promise<TapList> {
    const [tap] = await db.insert(tapList).values(tapItem).returning();
    return tap;
  }

  async updateTapItem(id: number, tapItem: Partial<InsertTapList>): Promise<TapList> {
    const [tap] = await db
      .update(tapList)
      .set({ ...tapItem, updatedAt: new Date() })
      .where(eq(tapList.id, id))
      .returning();
    return tap;
  }

  async removeBeerFromTap(id: number): Promise<void> {
    await db.update(tapList).set({ isActive: false }).where(eq(tapList.id, id));
  }

  // Bottle list operations (cantina)
  async getBottleListByPub(pubId: number): Promise<(BottleList & { beer: Beer & { brewery: Brewery } })[]> {
    return await db
      .select()
      .from(bottleList)
      .leftJoin(beers, eq(bottleList.beerId, beers.id))
      .leftJoin(breweries, eq(beers.breweryId, breweries.id))
      .where(and(eq(bottleList.pubId, pubId), eq(bottleList.isActive, true)))
      .orderBy(asc(beers.name))
      .then(rows => 
        rows.map(row => ({
          ...row.bottle_list,
          beer: {
            ...row.beers!,
            brewery: row.breweries!,
          },
        }))
      );
  }

  async addBeerToBottles(bottleItem: InsertBottleList): Promise<BottleList> {
    const [bottle] = await db.insert(bottleList).values(bottleItem).returning();
    return bottle;
  }

  async updateBottleItem(id: number, bottleItem: Partial<InsertBottleList>): Promise<BottleList> {
    const [bottle] = await db
      .update(bottleList)
      .set({ ...bottleItem, updatedAt: new Date() })
      .where(eq(bottleList.id, id))
      .returning();
    return bottle;
  }

  async removeBeerFromBottles(id: number): Promise<void> {
    await db.update(bottleList).set({ isActive: false }).where(eq(bottleList.id, id));
  }

  // Menu operations
  async getMenuByPub(pubId: number): Promise<(MenuCategory & { items: MenuItem[] })[]> {
    const categories = await db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.pubId, pubId))
      .orderBy(asc(menuCategories.orderIndex));

    const items = await db
      .select()
      .from(menuItems)
      .leftJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
      .where(eq(menuCategories.pubId, pubId))
      .orderBy(asc(menuItems.orderIndex));

    return categories.map(category => ({
      ...category,
      items: items
        .filter(item => item.menu_items.categoryId === category.id)
        .map(item => item.menu_items),
    }));
  }

  async createMenuCategory(categoryData: InsertMenuCategory): Promise<MenuCategory> {
    const [category] = await db.insert(menuCategories).values(categoryData).returning();
    return category;
  }

  async createMenuItem(itemData: InsertMenuItem): Promise<MenuItem> {
    const [item] = await db.insert(menuItems).values(itemData).returning();
    return item;
  }

  async updateMenuItem(id: number, itemData: Partial<InsertMenuItem>): Promise<MenuItem> {
    const [item] = await db
      .update(menuItems)
      .set({ ...itemData, updatedAt: new Date() })
      .where(eq(menuItems.id, id))
      .returning();
    return item;
  }

  // Favorites operations
  async getFavoritesByUser(userId: string): Promise<Favorite[]> {
    return await db.select().from(favorites).where(eq(favorites.userId, userId));
  }

  async addFavorite(favoriteData: InsertFavorite): Promise<Favorite> {
    const [favorite] = await db.insert(favorites).values(favoriteData).returning();
    return favorite;
  }

  async removeFavorite(userId: string, pubId: number): Promise<void> {
    await db.delete(favorites).where(
      and(eq(favorites.userId, userId), eq(favorites.pubId, pubId))
    );
  }

  // Rating operations
  async addRating(ratingData: InsertRating): Promise<Rating> {
    const [rating] = await db
      .insert(ratings)
      .values(ratingData)
      .onConflictDoUpdate({
        target: [ratings.userId, ratings.pubId],
        set: {
          rating: ratingData.rating,
          updatedAt: new Date(),
        },
      })
      .returning();
    return rating;
  }

  async getRatingsByPub(pubId: number): Promise<Rating[]> {
    return await db.select().from(ratings).where(eq(ratings.pubId, pubId));
  }

  async getRatingByUserAndPub(userId: string, pubId: number): Promise<Rating | undefined> {
    const [rating] = await db
      .select()
      .from(ratings)
      .where(and(eq(ratings.userId, userId), eq(ratings.pubId, pubId)));
    return rating;
  }

  // Search operations
  async search(query: string): Promise<{
    pubs: Pub[];
    breweries: Brewery[];
    beers: (Beer & { brewery: Brewery })[];
  }> {
    const [pubResults, breweryResults, beerResults] = await Promise.all([
      this.searchPubs(query),
      this.searchBreweries(query),
      this.searchBeers(query),
    ]);

    // Get brewery info for beers
    const beersWithBrewery = await Promise.all(
      beerResults.map(async (beer) => {
        const brewery = await this.getBrewery(beer.breweryId);
        return { ...beer, brewery: brewery! };
      })
    );

    return {
      pubs: pubResults,
      breweries: breweryResults,
      beers: beersWithBrewery,
    };
  }
}

export const storage = new DatabaseStorage();
