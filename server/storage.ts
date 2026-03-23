import {
  users,
  pubs,
  breweries,
  beers,
  tapList,
  bottleList,
  pubSizes,
  menuCategories,
  menuItems,
  allergens,
  favorites,
  festivals,
  userActivities,
  userBeerTastings,
  notifications,
  notificationPreferences,
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
  type Allergen,
  type InsertAllergen,
  type Favorite,
  type InsertFavorite,
  type UserActivity,
  type InsertUserActivity,
  type UserBeerTasting,
  type InsertUserBeerTasting,
  type PubSize,
  type InsertPubSize,
  type Notification,
  type InsertNotification,
  type NotificationPreference,
  type InsertNotificationPreference,
  pushSubscriptions,
  type PushSubscription,
  type InsertPushSubscription,
  pubEvents,
  type PubEvent,
  type InsertPubEvent,
  breweryEvents,
  type BreweryEvent,
  type InsertBreweryEvent,
  pubEventInterests,
  breweryEventInterests,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, like, inArray, sql, or, asc, ilike, isNotNull, ne } from "drizzle-orm";
import { memoryStorageInstance } from "./memoryStorage";

// Mapping utilities for field conversion
function safeParseDecimal(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = parseFloat(value);
  return isNaN(parsed) || parsed <= 0 ? undefined : parsed;
}

function mapTapDbRowToDto(row: any): any {
  const priceSmall = safeParseDecimal(row.price_small || row.priceSmall);
  const priceMedium = safeParseDecimal(row.price_medium || row.priceMedium);
  const priceLarge = safeParseDecimal(row.price_large || row.priceLarge);
  
  // Convert prices from object to array format
  let prices: any[] = [];
  if (row.prices && typeof row.prices === 'object') {
    // If prices is an object (Record<string, number>), convert to array
    if (Array.isArray(row.prices)) {
      prices = row.prices;
    } else {
      prices = Object.entries(row.prices).map(([size, price]) => ({
        size,
        price: String(price)
      }));
    }
  }
  
  // If no prices array exists but legacy fields exist, build from legacy fields
  if (prices.length === 0 && (priceSmall || priceMedium || priceLarge)) {
    if (priceSmall) prices.push({ size: '20cl', price: priceSmall });
    if (priceMedium) prices.push({ size: '40cl', price: priceMedium });
    if (priceLarge) prices.push({ size: '50cl', price: priceLarge });
  }
  
  return {
    id: row.id,
    pubId: row.pub_id || row.pubId,
    beerId: row.beer_id || row.beerId,
    isActive: row.is_active !== undefined ? row.is_active : row.isActive,
    isVisible: row.is_visible !== undefined ? row.is_visible : row.isVisible,
    prices: prices,
    priceSmall: priceSmall,
    priceMedium: priceMedium,
    priceLarge: priceLarge,
    description: row.description,
    tapNumber: row.tap_number || row.tapNumber,
    tapType: row.tap_type || row.tapType || null,
    addedAt: row.added_at || row.addedAt,
    updatedAt: row.updated_at || row.updatedAt,
    beer: {
      id: row.beer_id || row.beerId,
      name: row.beer_name || row.beerName,
      style: row.beer_style || row.beerStyle,
      abv: row.beer_abv || row.beerAbv,
      ibu: row.beer_ibu || row.beerIbu,
      description: row.beer_description || row.beerDescription,
      imageUrl: row.beer_image_url || row.beerImageUrl,
      logoUrl: row.beer_logo_url || row.beerLogoUrl,
      isGlutenFree: row.beer_is_gluten_free ?? row.beerIsGlutenFree ?? false,
      isAlcoholFree: row.beer_is_alcohol_free ?? row.beerIsAlcoholFree ?? false,
      brewery: {
        id: row.brewery_id || row.breweryId,
        name: row.brewery_name || row.breweryName,
        logoUrl: row.brewery_logo_url || row.breweryLogoUrl,
      }
    }
  };
}

function mapBottleDbRowToDto(row: any): any {
  const priceBottle = safeParseDecimal(row.price_bottle || row.priceBottle);
  const bottleSize = row.bottle_size || row.bottleSize;
  
  // Build prices array from priceBottle and bottleSize if prices is empty
  let prices = row.prices || [];
  if ((!prices || prices.length === 0) && priceBottle && bottleSize) {
    prices = [{
      size: bottleSize,
      price: priceBottle,
      format: "Bottiglia"
    }];
  }
  
  return {
    id: row.id,
    pubId: row.pub_id || row.pubId,
    beerId: row.beer_id || row.beerId,
    isActive: row.is_active !== undefined ? row.is_active : row.isActive,
    isVisible: row.is_visible !== undefined ? row.is_visible : row.isVisible,
    prices: prices,
    priceBottle: priceBottle,
    price: priceBottle, // Alternative field name
    bottleSize: bottleSize,
    size: bottleSize, // Alternative field name
    vintage: row.vintage,
    quantity: row.quantity,
    description: row.description,
    addedAt: row.added_at || row.addedAt,
    updatedAt: row.updated_at || row.updatedAt,
    beer: {
      id: row.beer_id || row.beerId,
      name: row.beer_name || row.beerName,
      style: row.beer_style || row.beerStyle,
      abv: row.beer_abv || row.beerAbv,
      description: row.beer_description || row.beerDescription,
      imageUrl: row.beer_image_url || row.beerImageUrl,
      logoUrl: row.beer_logo_url || row.beerLogoUrl,
      isGlutenFree: row.beer_is_gluten_free ?? row.beerIsGlutenFree ?? false,
      isAlcoholFree: row.beer_is_alcohol_free ?? row.beerIsAlcoholFree ?? false,
      brewery: {
        id: row.brewery_id || row.breweryId,
        name: row.brewery_name || row.breweryName,
        logoUrl: row.brewery_logo_url || row.breweryLogoUrl,
      }
    }
  };
}

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User>;
  updateUserType(userId: string, userType: string): Promise<User>;
  getUserRoles(userId: string): Promise<{ roles: string[]; activeRole: string }>;
  switchUserRole(userId: string, newRole: string): Promise<User>;

  // Pub operations
  getPubs(): Promise<Pub[]>;
  getPub(id: number): Promise<Pub | undefined>;
  getPubBySlug(slug: string): Promise<Pub | undefined>;
  createPub(pub: InsertPub): Promise<Pub>;
  updatePub(id: number, updates: Partial<InsertPub>): Promise<Pub>;
  deletePub(id: number): Promise<void>;
  getPubsByOwner(ownerId: string): Promise<Pub[]>;
  searchPubs(query: string): Promise<Pub[]>;

  // Brewery operations
  getBreweries(): Promise<Brewery[]>;
  getBreweriesWithBeerCount(limit?: number, random?: boolean): Promise<any[]>;
  getBrewery(id: number): Promise<Brewery | undefined>;
  getRandomBreweries(limit?: number): Promise<Brewery[]>;
  createBrewery(brewery: InsertBrewery): Promise<Brewery>;
  updateBrewery(id: number, updates: Partial<InsertBrewery>): Promise<Brewery>;
  deleteBrewery(id: number): Promise<void>;
  searchBreweries(query: string): Promise<Brewery[]>;
  exploreBreweries(q: string, country: string, page: number, limit: number): Promise<{ breweries: any[]; total: number }>;
  getBreweryCountries(): Promise<{ country: string; count: number }[]>;

  // Beer operations
  getBeers(): Promise<Beer[]>;
  getBeer(id: number): Promise<Beer | undefined>;
  getBeerWithBrewery(id: number): Promise<any>;
  getBeerAvailability(beerId: number): Promise<any>;
  createBeer(beer: InsertBeer): Promise<Beer>;
  updateBeer(id: number, updates: Partial<InsertBeer>): Promise<Beer>;
  deleteBeer(id: number): Promise<void>;
  getBeersByBrewery(breweryId: number): Promise<Beer[]>;
  searchBeers(query: string, filters?: { glutenFree?: boolean; alcoholFree?: boolean; style?: string; minAbv?: number; maxAbv?: number; minIbu?: number; maxIbu?: number }): Promise<Beer[]>;

  // Tap list operations
  getTapList(pubId: number): Promise<TapList[]>;
  getTapListByPubForOwner(pubId: number): Promise<any[]>;
  addToTapList(item: InsertTapList): Promise<TapList>;
  updateTapListItem(id: number, updates: Partial<InsertTapList>): Promise<TapList>;
  removeFromTapList(id: number): Promise<void>;

  // Bottle list operations
  getBottleList(pubId: number): Promise<BottleList[]>;
  addToBottleList(item: InsertBottleList): Promise<BottleList>;
  addBeerToBottles(item: InsertBottleList): Promise<BottleList>;
  updateBottleListItem(id: number, updates: Partial<InsertBottleList>): Promise<BottleList>;
  updateBottleItem(id: number, updates: Partial<InsertBottleList>): Promise<BottleList>;
  removeFromBottleList(id: number): Promise<void>;
  removeBottleItem(id: number): Promise<void>;
  removeBeerFromBottles(id: number): Promise<void>;

  // Menu operations
  getMenuCategories(pubId: number): Promise<MenuCategory[]>;
  getMenuByPub(pubId: number, includeHidden?: boolean): Promise<any[]>;
  createMenuCategory(category: InsertMenuCategory): Promise<MenuCategory>;
  updateMenuCategory(id: number, updates: Partial<InsertMenuCategory>): Promise<MenuCategory>;
  deleteMenuCategory(id: number): Promise<void>;
  getMenuItems(categoryId: number): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | null>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, updates: Partial<InsertMenuItem>): Promise<MenuItem>;
  deleteMenuItem(id: number): Promise<void>;

  // Allergen operations
  getAllergens(): Promise<Allergen[]>;

  // Pub sizes operations
  getPubSizes(pubId: number): Promise<PubSize[]>;
  createPubSize(size: InsertPubSize): Promise<PubSize>;
  updatePubSize(id: number, updates: Partial<InsertPubSize>): Promise<PubSize>;
  deletePubSize(id: number): Promise<void>;

  // Favorites operations
  getUserFavorites(userId: string): Promise<any[]>;
  getFavoritesByType(userId: string, itemType: 'pub' | 'brewery' | 'beer' | 'festival'): Promise<Favorite[]>;
  getFavoritesCount(itemType: 'pub' | 'brewery' | 'beer' | 'festival', itemId: number): Promise<number>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: string, itemType: 'pub' | 'brewery' | 'beer' | 'festival', itemId: number): Promise<void>;
  removeFavoriteById(userId: string, favoriteId: number): Promise<void>;
  isFavorite(userId: string, itemType: 'pub' | 'brewery' | 'beer' | 'festival', itemId: number): Promise<boolean>;

  // User activities operations
  getUserActivities(userId: string, limit?: number): Promise<UserActivity[]>;
  addUserActivity(activity: InsertUserActivity): Promise<UserActivity>;

  // Beer tastings operations
  getUserBeerTastings(userId: string): Promise<UserBeerTasting[]>;
  addBeerTasting(tasting: InsertUserBeerTasting): Promise<UserBeerTasting>;
  updateBeerTasting(id: number, updates: Partial<InsertUserBeerTasting>, userId?: string): Promise<UserBeerTasting>;
  deleteBeerTasting(id: number): Promise<void>;

  // Notification operations
  getNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number, userId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  deleteNotification(id: number, userId: string): Promise<void>;

  // Notification preferences
  getNotificationPreferences(userId: string): Promise<NotificationPreference | null>;
  upsertNotificationPreferences(userId: string, prefs: Partial<InsertNotificationPreference>): Promise<NotificationPreference>;

  // Helper: get users who favorited a pub (for sending notifications)
  getUsersWhoFavoritedPub(pubId: number): Promise<string[]>;
  getUsersWhoFavoritedBeer(beerId: number): Promise<string[]>;
  getUsersWhoFavoritedBrewery(breweryId: number): Promise<string[]>;

  // Helper: get admin user IDs
  getAdminUserIds(): Promise<string[]>;

  // Push subscription operations
  createPushSubscription(sub: InsertPushSubscription): Promise<PushSubscription>;
  getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]>;
  deletePushSubscription(endpoint: string): Promise<void>;
  deletePushSubscriptionsByUser(userId: string): Promise<void>;

  // Pub Events operations
  getPubEvents(pubId: number, publicOnly?: boolean): Promise<PubEvent[]>;
  getPubEvent(id: number): Promise<PubEvent | undefined>;
  createPubEvent(event: InsertPubEvent): Promise<PubEvent>;
  updatePubEvent(id: number, updates: Partial<InsertPubEvent>): Promise<PubEvent>;
  deletePubEvent(id: number): Promise<void>;
  getUpcomingEvents(limit?: number): Promise<any[]>;
  markPubEventStartSent(id: number): Promise<void>;
  markBreweryEventStartSent(id: number): Promise<void>;
  getPendingStartNotifications(): Promise<{ pubEvents: any[]; breweryEvents: any[] }>;

  // Event interests
  togglePubEventInterest(userId: string, eventId: number): Promise<boolean>;
  getPubEventInterestCount(eventId: number): Promise<number>;
  getPubEventUserInterest(userId: string, eventId: number): Promise<boolean>;
  toggleBreweryEventInterest(userId: string, eventId: number): Promise<boolean>;
  getBreweryEventInterestCount(eventId: number): Promise<number>;
  getBreweryEventUserInterest(userId: string, eventId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
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

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserType(userId: string, userType: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ userType, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserRoles(userId: string): Promise<{ roles: string[]; activeRole: string }> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    return {
      roles: user.roles || ["customer"],
      activeRole: user.activeRole || user.userType || "customer",
    };
  }

  async switchUserRole(userId: string, newRole: string): Promise<User> {
    const { roles } = await this.getUserRoles(userId);
    if (!roles.includes(newRole)) {
      throw new Error("User does not have permission for this role");
    }
    const [user] = await db
      .update(users)
      .set({ activeRole: newRole, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Pub operations
  async getPubs(): Promise<Pub[]> {
    return await db.select().from(pubs).orderBy(asc(pubs.name));
  }

  async getPub(id: number): Promise<Pub | undefined> {
    const [pub] = await db.select().from(pubs).where(eq(pubs.id, id));
    return pub;
  }

  async getPubBySlug(slug: string): Promise<Pub | undefined> {
    const [pub] = await db.select().from(pubs).where(eq(pubs.slug, slug));
    return pub;
  }

  async createPub(pubData: InsertPub): Promise<Pub> {
    const [pub] = await db.insert(pubs).values(pubData).returning();
    return pub;
  }

  async updatePub(id: number, updates: Partial<InsertPub>): Promise<Pub> {
    const [pub] = await db
      .update(pubs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pubs.id, id))
      .returning();
    return pub;
  }

  async deletePub(id: number): Promise<void> {
    await db.delete(pubs).where(eq(pubs.id, id));
  }

  async getPubsByOwner(ownerId: string): Promise<Pub[]> {
    return await db.select().from(pubs).where(eq(pubs.ownerId, ownerId));
  }

  async searchPubs(query: string): Promise<Pub[]> {
    return await db
      .select()
      .from(pubs)
      .where(or(
        ilike(pubs.name, `%${query}%`),
        ilike(pubs.address, `%${query}%`),
        ilike(pubs.city, `%${query}%`),
        ilike(pubs.description, `%${query}%`)
      ))
      .orderBy(asc(pubs.name))
      .limit(10);
  }

  // Brewery operations
  async getBreweries(): Promise<Brewery[]> {
    return await db.select().from(breweries).orderBy(asc(breweries.name));
  }

  async getBreweriesWithBeerCount(limit?: number, random?: boolean): Promise<any[]> {
    const query = db
      .select({
        id: breweries.id,
        name: breweries.name,
        location: breweries.location,
        region: breweries.region,
        country: breweries.country,
        description: breweries.description,
        logoUrl: breweries.logoUrl,
        coverImageUrl: breweries.coverImageUrl,
        websiteUrl: breweries.websiteUrl,
        latitude: breweries.latitude,
        longitude: breweries.longitude,
        createdAt: breweries.createdAt,
        beerCount: sql<number>`count(${beers.id})::int`,
      })
      .from(breweries)
      .leftJoin(beers, eq(beers.breweryId, breweries.id))
      .groupBy(breweries.id)
      .orderBy(random ? sql`RANDOM()` : asc(breweries.name));
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  async getRandomBreweries(limit: number = 10): Promise<Brewery[]> {
    return await db.select().from(breweries).orderBy(sql`RANDOM()`).limit(limit);
  }

  async getBeerCountByBrewery(breweryId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(beers).where(eq(beers.breweryId, breweryId));
    return result[0]?.count || 0;
  }

  async getBrewery(id: number): Promise<Brewery | undefined> {
    const [brewery] = await db.select().from(breweries).where(eq(breweries.id, id));
    return brewery;
  }

  async createBrewery(breweryData: InsertBrewery): Promise<Brewery> {
    const [brewery] = await db.insert(breweries).values(breweryData).returning();
    return brewery;
  }

  async updateBrewery(id: number, updates: Partial<InsertBrewery>): Promise<Brewery> {
    const [brewery] = await db
      .update(breweries)
      .set(updates)
      .where(eq(breweries.id, id))
      .returning();
    return brewery;
  }

  async deleteBrewery(id: number): Promise<void> {
    await db.delete(breweries).where(eq(breweries.id, id));
  }

  async searchBreweries(query: string): Promise<Brewery[]> {
    const breweriesRanked = await db
      .select({ id: breweries.id, beerCount: sql<number>`COUNT(${beers.id})` })
      .from(breweries)
      .leftJoin(beers, eq(breweries.id, beers.breweryId))
      .where(or(
        ilike(breweries.name, `%${query}%`),
        ilike(breweries.location, `%${query}%`),
        ilike(breweries.description, `%${query}%`)
      ))
      .groupBy(breweries.id)
      .orderBy(desc(sql`COUNT(${beers.id})`), asc(breweries.name))
      .limit(10);

    if (breweriesRanked.length === 0) return [];
    const ids = breweriesRanked.map(r => r.id);
    const idOrder = breweriesRanked.map(r => r.id);
    const result = await db.select().from(breweries).where(inArray(breweries.id, ids));
    result.sort((a, b) => idOrder.indexOf(a.id) - idOrder.indexOf(b.id));
    return result;
  }

  async exploreBreweries(q: string, country: string, page: number, limit: number): Promise<{ breweries: any[]; total: number }> {
    const conditions: any[] = [];
    if (q && q.length >= 2) conditions.push(ilike(breweries.name, `%${q}%`));
    if (country) conditions.push(ilike(breweries.country, country));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (page - 1) * limit;

    const [countResult, rows] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)::int` }).from(breweries).where(whereClause),
      db
        .select({
          id: breweries.id,
          name: breweries.name,
          location: breweries.location,
          region: breweries.region,
          country: breweries.country,
          logoUrl: breweries.logoUrl,
          description: breweries.description,
          websiteUrl: breweries.websiteUrl,
          beerCount: sql<number>`COUNT(${beers.id})`,
        })
        .from(breweries)
        .leftJoin(beers, eq(breweries.id, beers.breweryId))
        .where(whereClause)
        .groupBy(breweries.id)
        .orderBy(desc(sql`COUNT(${beers.id})`), asc(breweries.name))
        .limit(limit)
        .offset(offset),
    ]);

    return { breweries: rows, total: Number(countResult[0]?.count || 0) };
  }

  async getBreweryCountries(): Promise<{ country: string; count: number }[]> {
    const rows = await db
      .select({ country: breweries.country, count: sql<number>`COUNT(*)::int` })
      .from(breweries)
      .where(and(isNotNull(breweries.country), ne(breweries.country, "")))
      .groupBy(breweries.country)
      .orderBy(desc(sql`COUNT(*)`));
    return rows.map(r => ({ country: r.country!, count: Number(r.count) }));
  }

  // Beer operations
  async getBeers(): Promise<Beer[]> {
    return await db.select().from(beers).orderBy(asc(beers.name));
  }

  async getBeer(id: number): Promise<Beer | undefined> {
    const [beer] = await db.select().from(beers).where(eq(beers.id, id));
    return beer;
  }

  async createBeer(beerData: InsertBeer): Promise<Beer> {
    const [beer] = await db.insert(beers).values(beerData).returning();
    return beer;
  }

  async updateBeer(id: number, updates: Partial<InsertBeer>): Promise<Beer> {
    const [beer] = await db
      .update(beers)
      .set(updates)
      .where(eq(beers.id, id))
      .returning();
    return beer;
  }

  async deleteBeer(id: number): Promise<void> {
    await db.delete(beers).where(eq(beers.id, id));
  }

  async getBeersByBrewery(breweryId: number): Promise<Beer[]> {
    return await db.select().from(beers).where(eq(beers.breweryId, breweryId));
  }

  async searchBeers(query: string, filters?: { glutenFree?: boolean; alcoholFree?: boolean; style?: string; minAbv?: number; maxAbv?: number; minIbu?: number; maxIbu?: number }): Promise<any[]> {
    const words = query.trim().split(/\s+/).filter(w => w.length > 0);
    const hasFilters = filters && Object.values(filters).some(v => v !== undefined && v !== false && v !== "");
    if (words.length === 0 && !hasFilters) return [];
    const wordConditions = words.map(word => 
      or(
        ilike(beers.name, `%${word}%`),
        ilike(breweries.name, `%${word}%`),
        ilike(beers.style, `%${word}%`)
      )
    );
    const conditions = [...wordConditions];
    if (filters?.glutenFree) conditions.push(eq(beers.isGlutenFree, true));
    if (filters?.alcoholFree) conditions.push(eq(beers.isAlcoholFree, true));
    if (filters?.style) conditions.push(ilike(beers.style, `%${filters.style}%`));
    if (filters?.minAbv !== undefined) conditions.push(sql`${beers.abv}::numeric >= ${filters.minAbv}`);
    if (filters?.maxAbv !== undefined) conditions.push(sql`${beers.abv}::numeric <= ${filters.maxAbv}`);
    if (filters?.minIbu !== undefined) conditions.push(sql`${beers.ibu}::numeric >= ${filters.minIbu}`);
    if (filters?.maxIbu !== undefined) conditions.push(sql`${beers.ibu}::numeric <= ${filters.maxIbu}`);

    const results = await db
      .select({
        id: beers.id,
        name: beers.name,
        style: beers.style,
        abv: beers.abv,
        ibu: beers.ibu,
        description: beers.description,
        imageUrl: beers.imageUrl,
        breweryId: beers.breweryId,
        breweryName: breweries.name,
        breweryLogoUrl: breweries.logoUrl,
        isGlutenFree: beers.isGlutenFree,
        isAlcoholFree: beers.isAlcoholFree,
      })
      .from(beers)
      .leftJoin(breweries, eq(beers.breweryId, breweries.id))
      .where(and(...conditions))
      .limit(50);
    
    return results.map(row => ({
      id: row.id,
      name: row.name,
      style: row.style,
      abv: row.abv,
      ibu: row.ibu,
      description: row.description,
      imageUrl: row.imageUrl,
      breweryId: row.breweryId,
      isGlutenFree: row.isGlutenFree,
      isAlcoholFree: row.isAlcoholFree,
      brewery: {
        id: row.breweryId,
        name: row.breweryName,
        logoUrl: row.breweryLogoUrl
      }
    }));
  }

  // Tap list operations
  async getTapList(pubId: number): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          tl.id, tl.pub_id, tl.beer_id, tl.is_active, tl.prices, tl.price_small, tl.price_medium, tl.price_large,
          tl.description, tl.tap_number, tl.tap_type, tl.added_at, tl.updated_at,
          b.name as beer_name, b.style as beer_style, b.abv as beer_abv, b.image_url as beer_image_url, b.logo_url as beer_logo_url,
          b.is_gluten_free as beer_is_gluten_free, b.is_alcohol_free as beer_is_alcohol_free,
          br.id as brewery_id, br.name as brewery_name, br.logo_url as brewery_logo_url
        FROM tap_list tl
        INNER JOIN beers b ON tl.beer_id = b.id  
        LEFT JOIN breweries br ON b.brewery_id = br.id
        WHERE tl.pub_id = ${pubId}
          AND COALESCE(tl.is_active, true) = true
          AND COALESCE(tl.is_visible, true) = true
        ORDER BY tl.tap_number ASC
      `);
      
      return result.rows.map((row: any) => mapTapDbRowToDto(row));
    } catch (error) {
      console.error('Error in getTapList:', error);
      return [];
    }
  }

  async getTapListByPubForOwner(pubId: number): Promise<any[]> {
    const results = await db
      .select({
        id: tapList.id,
        pubId: tapList.pubId,
        beerId: tapList.beerId,
        isActive: tapList.isActive,
        isVisible: tapList.isVisible,
        prices: tapList.prices,
        priceSmall: tapList.priceSmall,
        priceMedium: tapList.priceMedium,
        priceLarge: tapList.priceLarge,
        description: tapList.description,
        tapNumber: tapList.tapNumber,
        tapType: tapList.tapType,
        addedAt: tapList.addedAt,
        updatedAt: tapList.updatedAt,
        beerName: beers.name,
        beerStyle: beers.style,
        beerAbv: beers.abv,
        beerIbu: beers.ibu,
        beerDescription: beers.description,
        beerImageUrl: beers.imageUrl,
        beerLogoUrl: beers.logoUrl,
        beerBottleImageUrl: beers.bottleImageUrl,
        beerIsGlutenFree: beers.isGlutenFree,
        beerIsAlcoholFree: beers.isAlcoholFree,
        breweryId: breweries.id,
        breweryName: breweries.name,
        breweryLogoUrl: breweries.logoUrl,
      })
      .from(tapList)
      .leftJoin(beers, eq(tapList.beerId, beers.id))
      .leftJoin(breweries, eq(beers.breweryId, breweries.id))
      .where(eq(tapList.pubId, pubId))
      .orderBy(asc(tapList.tapNumber));

    return results.map(row => mapTapDbRowToDto({
      ...row,
      beer_name: row.beerName,
      beer_style: row.beerStyle,
      beer_abv: row.beerAbv,
      beer_ibu: row.beerIbu,
      beer_description: row.beerDescription,
      beer_image_url: row.beerImageUrl,
      beer_logo_url: row.beerLogoUrl,
      beer_bottle_image_url: row.beerBottleImageUrl,
      beerIsGlutenFree: row.beerIsGlutenFree,
      beerIsAlcoholFree: row.beerIsAlcoholFree,
      brewery_id: row.breweryId,
      brewery_name: row.breweryName,
      brewery_logo_url: row.breweryLogoUrl,
    }));
  }

  async addToTapList(item: InsertTapList): Promise<TapList> {
    const [tapItem] = await db.insert(tapList).values(item).returning();
    return tapItem;
  }

  async addBeerToTap(item: InsertTapList): Promise<TapList> {
    const [tapItem] = await db.insert(tapList).values(item).returning();
    return tapItem;
  }

  async addTapListItem(item: InsertTapList): Promise<TapList> {
    const [tapItem] = await db.insert(tapList).values(item).returning();
    return tapItem;
  }

  async updateTapListItem(id: number, updates: Partial<InsertTapList>): Promise<TapList> {
    const [tapItem] = await db
      .update(tapList)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tapList.id, id))
      .returning();
    return tapItem;
  }

  async updateTapItem(id: number, updates: Partial<InsertTapList>): Promise<TapList> {
    const [tapItem] = await db
      .update(tapList)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tapList.id, id))
      .returning();
    return tapItem;
  }

  async removeFromTapList(id: number): Promise<void> {
    await db.delete(tapList).where(eq(tapList.id, id));
  }

  async removeTapListItem(id: number): Promise<void> {
    await db.delete(tapList).where(eq(tapList.id, id));
  }

  async removeBeerFromTap(id: number): Promise<void> {
    await db.delete(tapList).where(eq(tapList.id, id));
  }

  // Bottle list operations
  async getBottleList(pubId: number): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          bl.id, bl.pub_id, bl.beer_id, bl.is_active, bl.is_visible, bl.price_bottle, bl.bottle_size, bl.quantity,
          bl.description, bl.added_at, bl.updated_at, bl.prices,
          b.name as beer_name, b.style as beer_style, b.abv as beer_abv, b.image_url as beer_image_url, b.logo_url as beer_logo_url,
          b.is_gluten_free as beer_is_gluten_free, b.is_alcohol_free as beer_is_alcohol_free,
          br.id as brewery_id, br.name as brewery_name, br.logo_url as brewery_logo_url
        FROM bottle_list bl
        INNER JOIN beers b ON bl.beer_id = b.id  
        LEFT JOIN breweries br ON b.brewery_id = br.id
        WHERE bl.pub_id = ${pubId}
        ORDER BY bl.id ASC
      `);
      
      return result.rows.map((row: any) => mapBottleDbRowToDto(row));
    } catch (error) {
      console.error('Error in getBottleList:', error);
      return [];
    }
  }

  async addToBottleList(item: InsertBottleList): Promise<BottleList> {
    const [bottleItem] = await db.insert(bottleList).values(item).returning();
    return bottleItem;
  }

  async addBeerToBottles(item: InsertBottleList): Promise<BottleList> {
    const [bottleItem] = await db.insert(bottleList).values(item).returning();
    return bottleItem;
  }

  async updateBottleListItem(id: number, updates: Partial<InsertBottleList>): Promise<BottleList> {
    const [bottleItem] = await db
      .update(bottleList)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bottleList.id, id))
      .returning();
    return bottleItem;
  }

  async updateBottleItem(id: number, updates: Partial<InsertBottleList>): Promise<BottleList> {
    const [bottleItem] = await db
      .update(bottleList)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bottleList.id, id))
      .returning();
    return bottleItem;
  }

  async removeFromBottleList(id: number): Promise<void> {
    await db.delete(bottleList).where(eq(bottleList.id, id));
  }

  async removeBeerFromBottles(id: number): Promise<void> {
    await db.delete(bottleList).where(eq(bottleList.id, id));
  }

  async removeBottleItem(id: number): Promise<void> {
    await db.delete(bottleList).where(eq(bottleList.id, id));
  }

  // Menu operations
  async getMenuCategories(pubId: number): Promise<MenuCategory[]> {
    return await db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.pubId, pubId))
      .orderBy(asc(menuCategories.orderIndex));
  }

  async getMenuByPub(pubId: number, includeHidden = false): Promise<any[]> {
    const categoryWhere = includeHidden
      ? eq(menuCategories.pubId, pubId)
      : and(eq(menuCategories.pubId, pubId), eq(menuCategories.isVisible, true));

    const categories = await db
      .select()
      .from(menuCategories)
      .where(categoryWhere)
      .orderBy(asc(menuCategories.orderIndex), asc(menuCategories.id));

    const itemWhere = includeHidden
      ? eq(menuCategories.pubId, pubId)
      : and(eq(menuCategories.pubId, pubId), eq(menuItems.isVisible, true));

    const items = await db
      .select()
      .from(menuItems)
      .leftJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
      .where(itemWhere)
      .orderBy(asc(menuItems.orderIndex), asc(menuItems.id));

    return categories.map(category => ({
      ...category,
      items: items
        .filter(item => item.menu_items?.categoryId === category.id)
        .map(item => item.menu_items),
    }));
  }

  async createMenuCategory(categoryData: InsertMenuCategory): Promise<MenuCategory> {
    const [category] = await db.insert(menuCategories).values(categoryData).returning();
    return category;
  }

  async updateMenuCategory(id: number, updates: Partial<InsertMenuCategory>): Promise<MenuCategory> {
    const [category] = await db
      .update(menuCategories)
      .set(updates)
      .where(eq(menuCategories.id, id))
      .returning();
    return category;
  }

  async deleteMenuCategory(id: number): Promise<void> {
    // First delete all menu items in this category
    await db.delete(menuItems).where(eq(menuItems.categoryId, id));
    // Then delete the category itself
    await db.delete(menuCategories).where(eq(menuCategories.id, id));
  }

  async getMenuItems(categoryId: number): Promise<MenuItem[]> {
    return await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.categoryId, categoryId))
      .orderBy(asc(menuItems.orderIndex));
  }

  async getMenuItem(id: number): Promise<MenuItem | null> {
    const [item] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, id))
      .limit(1);
    return item || null;
  }

  async createMenuItem(itemData: InsertMenuItem): Promise<MenuItem> {
    const [item] = await db.insert(menuItems).values(itemData).returning();
    return item;
  }

  async updateMenuItem(id: number, updates: Partial<InsertMenuItem>): Promise<MenuItem> {
    const [item] = await db
      .update(menuItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(menuItems.id, id))
      .returning();
    return item;
  }

  async deleteMenuItem(id: number): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  // Allergen operations
  async getAllergens(): Promise<Allergen[]> {
    return await db
      .select()
      .from(allergens)
      .orderBy(asc(allergens.orderIndex));
  }

  // Pub sizes operations
  async getPubSizes(pubId: number): Promise<PubSize[]> {
    return await db
      .select()
      .from(pubSizes)
      .where(eq(pubSizes.pubId, pubId))
      .orderBy(asc(pubSizes.orderIndex));
  }

  async createPubSize(sizeData: InsertPubSize): Promise<PubSize> {
    const [size] = await db.insert(pubSizes).values(sizeData).returning();
    return size;
  }

  async updatePubSize(id: number, updates: Partial<InsertPubSize>): Promise<PubSize> {
    const [size] = await db
      .update(pubSizes)
      .set(updates)
      .where(eq(pubSizes.id, id))
      .returning();
    return size;
  }

  async deletePubSize(id: number): Promise<void> {
    await db.delete(pubSizes).where(eq(pubSizes.id, id));
  }

  // Favorites operations
  async getUserFavorites(userId: string): Promise<any[]> {
    const userFavorites = await db
      .select()
      .from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));

    const enrichedFavorites = [];
    
    for (const favorite of userFavorites) {
      let itemName = `${favorite.itemType} #${favorite.itemId}`;
      let itemImageUrl: string | null = null;
      
      if (favorite.itemType === 'pub') {
        const [pub] = await db.select({ name: pubs.name, logoUrl: pubs.logoUrl }).from(pubs).where(eq(pubs.id, favorite.itemId));
        if (pub) {
          itemName = pub.name;
          itemImageUrl = pub.logoUrl;
        }
      } else if (favorite.itemType === 'brewery') {
        const [brewery] = await db.select({ name: breweries.name, logoUrl: breweries.logoUrl }).from(breweries).where(eq(breweries.id, favorite.itemId));
        if (brewery) {
          itemName = brewery.name;
          itemImageUrl = brewery.logoUrl;
        }
      } else if (favorite.itemType === 'beer') {
        const [beer] = await db.select({ name: beers.name, imageUrl: beers.imageUrl, logoUrl: beers.logoUrl }).from(beers).where(eq(beers.id, favorite.itemId));
        if (beer) {
          itemName = beer.name;
          itemImageUrl = beer.imageUrl || beer.logoUrl;
        }
      } else if (favorite.itemType === 'festival') {
        const [fest] = await db.select({ name: festivals.name, logoUrl: festivals.logoUrl, slug: festivals.slug }).from(festivals).where(eq(festivals.id, favorite.itemId));
        if (fest) {
          itemName = fest.name;
          itemImageUrl = fest.logoUrl;
        } else {
          // Festival deleted — skip orphaned favorite
          continue;
        }
      }

      // Skip orphaned pub/brewery/beer favorites (item was deleted)
      if (['pub', 'brewery', 'beer'].includes(favorite.itemType) && itemName === `${favorite.itemType} #${favorite.itemId}`) {
        // itemName was never updated → item not found in DB, skip
        continue;
      }
      
      enrichedFavorites.push({
        ...favorite,
        itemName,
        itemImageUrl
      });
    }
    
    return enrichedFavorites;
  }

  async getFavoritesByType(userId: string, itemType: 'pub' | 'brewery' | 'beer' | 'festival'): Promise<Favorite[]> {
    return await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.itemType, itemType)))
      .orderBy(desc(favorites.createdAt));
  }

  async addFavorite(favoriteData: InsertFavorite): Promise<Favorite> {
    const [inserted] = await db
      .insert(favorites)
      .values(favoriteData)
      .onConflictDoNothing()
      .returning();

    if (inserted) {
      await this.addUserActivity({
        userId: favoriteData.userId,
        activityType: 'favorite_added',
        itemType: favoriteData.itemType,
        itemId: favoriteData.itemId,
        description: `Aggiunto ${favoriteData.itemType} ai preferiti`,
      });
      return inserted;
    }

    const [existing] = await db
      .select()
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, favoriteData.userId),
          eq(favorites.itemType, favoriteData.itemType),
          eq(favorites.itemId, favoriteData.itemId)
        )
      );
    return existing;
  }

  async removeFavorite(userId: string, itemType: 'pub' | 'brewery' | 'beer' | 'festival', itemId: number): Promise<void> {
    await db
      .delete(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.itemType, itemType),
          eq(favorites.itemId, itemId)
        )
      );
  }

  async isFavorite(userId: string, itemType: 'pub' | 'brewery' | 'beer' | 'festival', itemId: number): Promise<boolean> {
    const [favorite] = await db
      .select()
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.itemType, itemType),
          eq(favorites.itemId, itemId)
        )
      );
    return !!favorite;
  }

  async removeFavoriteById(userId: string, favoriteId: number): Promise<void> {
    await db.delete(favorites).where(
      and(
        eq(favorites.userId, userId),
        eq(favorites.id, favoriteId)
      )
    );
  }

  async getFavoritesCount(itemType: 'pub' | 'brewery' | 'beer' | 'festival', itemId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(favorites)
      .where(
        and(
          eq(favorites.itemType, itemType),
          eq(favorites.itemId, itemId)
        )
      );
    return result[0]?.count || 0;
  }

  // User activities operations
  async getUserActivities(userId: string, limit: number = 20): Promise<UserActivity[]> {
    return await db
      .select()
      .from(userActivities)
      .where(eq(userActivities.userId, userId))
      .orderBy(desc(userActivities.createdAt))
      .limit(limit);
  }

  async addUserActivity(activityData: InsertUserActivity): Promise<UserActivity> {
    const [activity] = await db.insert(userActivities).values(activityData).returning();
    return activity;
  }

  // Beer tastings operations
  async getUserBeerTastings(userId: string): Promise<any[]> {
    const results = await db
      .select({
        id: userBeerTastings.id,
        userId: userBeerTastings.userId,
        beerId: userBeerTastings.beerId,
        rating: userBeerTastings.rating,
        personalNotes: userBeerTastings.personalNotes,
        format: userBeerTastings.format,
        tastedAt: userBeerTastings.tastedAt,
        createdAt: userBeerTastings.createdAt,
        updatedAt: userBeerTastings.updatedAt,
        pubId: userBeerTastings.pubId,
        beerName: beers.name,
        beerStyle: beers.style,
        beerAbv: beers.abv,
        beerImageUrl: beers.imageUrl,
        breweryId: breweries.id,
        breweryName: breweries.name,
        pubName: pubs.name,
      })
      .from(userBeerTastings)
      .innerJoin(beers, eq(userBeerTastings.beerId, beers.id))
      .leftJoin(breweries, eq(beers.breweryId, breweries.id))
      .leftJoin(pubs, eq(userBeerTastings.pubId, pubs.id))
      .where(eq(userBeerTastings.userId, userId))
      .orderBy(desc(userBeerTastings.tastedAt));

    return results.map((row: any) => ({
      id: row.id,
      userId: row.userId,
      beerId: row.beerId,
      rating: row.rating,
      personalNotes: row.personalNotes,
      format: row.format,
      tastedAt: row.tastedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      pubId: row.pubId,
      pubName: row.pubName,
      beer: {
        id: row.beerId,
        name: row.beerName,
        style: row.beerStyle,
        abv: row.beerAbv,
        imageUrl: row.beerImageUrl,
        brewery: {
          id: row.breweryId,
          name: row.breweryName,
        }
      }
    }));
  }

  async addBeerTasting(tastingData: InsertUserBeerTasting): Promise<UserBeerTasting> {
    const [tasting] = await db
      .insert(userBeerTastings)
      .values(tastingData)
      .onConflictDoUpdate({
        target: [userBeerTastings.userId, userBeerTastings.beerId],
        set: {
          rating: tastingData.rating,
          personalNotes: tastingData.personalNotes,
          tastedAt: tastingData.tastedAt || new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();
    return tasting;
  }

  async updateBeerTasting(id: number, updates: Partial<InsertUserBeerTasting>, userId?: string): Promise<UserBeerTasting> {
    const conditions = [eq(userBeerTastings.id, id)];
    if (userId) {
      conditions.push(eq(userBeerTastings.userId, userId));
    }
    const [tasting] = await db
      .update(userBeerTastings)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();
    if (!tasting) {
      throw new Error("Tasting not found or unauthorized");
    }
    return tasting;
  }

  async deleteBeerTasting(id: number): Promise<void> {
    await db.delete(userBeerTastings).where(eq(userBeerTastings.id, id));
  }

  // Additional admin and utility methods
  async getUserCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users);
    return result[0]?.count || 0;
  }

  async getPubCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(pubs);
    return result[0]?.count || 0;
  }

  async getBreweryCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(breweries);
    return result[0]?.count || 0;
  }

  async getBeerCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(beers);
    return result[0]?.count || 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getAllPubs(): Promise<Pub[]> {
    return await db.select().from(pubs).orderBy(desc(pubs.createdAt));
  }

  async getAllBreweries(): Promise<Brewery[]> {
    return await db.select().from(breweries).orderBy(asc(breweries.name));
  }

  async getAllBeers(): Promise<Beer[]> {
    return await db.select().from(beers).orderBy(asc(beers.name));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getBeerWithBrewery(id: number): Promise<any> {
    const beer = await this.getBeer(id);
    
    if (!beer) return undefined;
    
    if (!beer.breweryId) {
      return {
        ...beer,
        brewery: null
      };
    }
    
    const brewery = await this.getBrewery(beer.breweryId);
    
    return {
      ...beer,
      brewery: brewery || null
    };
  }

  async getBeerAvailability(beerId: number): Promise<any> {
    // Get tap locations
    const tapAvailability = await db
      .select({
        tapId: tapList.id,
        pubId: tapList.pubId,
        pubName: pubs.name,
        pubAddress: pubs.address,
        pubCity: pubs.city,
        isActive: tapList.isActive,
        prices: tapList.prices,
        priceSmall: tapList.priceSmall,
        priceMedium: tapList.priceMedium,
        priceLarge: tapList.priceLarge,
      })
      .from(tapList)
      .leftJoin(pubs, eq(tapList.pubId, pubs.id))
      .where(eq(tapList.beerId, beerId));

    // Get bottle locations  
    const bottleAvailability = await db
      .select({
        bottleId: bottleList.id,
        pubId: bottleList.pubId,
        pubName: pubs.name,
        pubAddress: pubs.address,
        pubCity: pubs.city,
        isActive: bottleList.isActive,
        prices: bottleList.prices,
        priceBottle: bottleList.priceBottle,
        bottleSize: bottleList.bottleSize,
      })
      .from(bottleList)
      .leftJoin(pubs, eq(bottleList.pubId, pubs.id))
      .where(eq(bottleList.beerId, beerId));

    // Format response for frontend
    return {
      tapLocations: tapAvailability.map(tap => ({
        pub: {
          id: tap.pubId,
          name: tap.pubName,
          address: tap.pubAddress,
          city: tap.pubCity,
        },
        tapItem: {
          id: tap.tapId,
          price: tap.priceSmall || tap.priceMedium, // Use first available price
          prices: tap.prices,
          isActive: tap.isActive,
        }
      })),
      bottleLocations: bottleAvailability.map(bottle => ({
        pub: {
          id: bottle.pubId,
          name: bottle.pubName,
          address: bottle.pubAddress,
          city: bottle.pubCity,
        },
        bottleItem: {
          id: bottle.bottleId,
          price: bottle.priceBottle,
          prices: bottle.prices,
          size: bottle.bottleSize,
          isActive: bottle.isActive,
        }
      }))
    };
  }

  async addRating(rating: any): Promise<any> {
    // Placeholder - implement based on ratings schema
    return rating;
  }

  async getRatingsByPub(pubId: number): Promise<any[]> {
    // Placeholder - implement based on ratings schema
    return [];
  }

  async removeBeerTasting(userId: string, beerId: number): Promise<void> {
    await db.delete(userBeerTastings).where(
      and(eq(userBeerTastings.userId, userId), eq(userBeerTastings.beerId, beerId))
    );
  }

  async updateUserProfile(userId: string, updates: any): Promise<User> {
    return this.updateUser(userId, updates);
  }

  async updateUserNickname(userId: string, nickname: string): Promise<User> {
    return this.updateUser(userId, { nickname });
  }

  async getUserBeerTasting(userId: string, beerId: number): Promise<UserBeerTasting | undefined> {
    const [tasting] = await db
      .select()
      .from(userBeerTastings)
      .where(
        and(
          eq(userBeerTastings.userId, userId),
          eq(userBeerTastings.beerId, beerId)
        )
      );
    return tasting;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result[0]?.count ?? 0;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async markNotificationRead(id: number, userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: number, userId: string): Promise<void> {
    await db.delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreference | null> {
    const [prefs] = await db.select().from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
    return prefs ?? null;
  }

  async upsertNotificationPreferences(userId: string, prefs: Partial<InsertNotificationPreference>): Promise<NotificationPreference> {
    const existing = await this.getNotificationPreferences(userId);
    if (existing) {
      const [updated] = await db.update(notificationPreferences)
        .set({ ...prefs, updatedAt: new Date() })
        .where(eq(notificationPreferences.userId, userId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(notificationPreferences)
      .values({ userId, tapChanges: true, events: true, newPubs: false, ...prefs })
      .returning();
    return created;
  }

  async getUsersWhoFavoritedPub(pubId: number): Promise<string[]> {
    const rows = await db.select({ userId: favorites.userId })
      .from(favorites)
      .where(and(eq(favorites.itemType, 'pub'), eq(favorites.itemId, pubId)));
    return rows.map(r => r.userId);
  }

  async getUsersWhoFavoritedBeer(beerId: number): Promise<string[]> {
    const rows = await db.select({ userId: favorites.userId })
      .from(favorites)
      .where(and(eq(favorites.itemType, 'beer'), eq(favorites.itemId, beerId)));
    return rows.map(r => r.userId);
  }

  async getUsersWhoFavoritedBrewery(breweryId: number): Promise<string[]> {
    const rows = await db.select({ userId: favorites.userId })
      .from(favorites)
      .where(and(eq(favorites.itemType, 'brewery'), eq(favorites.itemId, breweryId)));
    return rows.map(r => r.userId);
  }

  async getAdminUserIds(): Promise<string[]> {
    const rows = await db.select({ id: users.id })
      .from(users)
      .where(
        or(
          eq(users.userType, 'admin'),
          eq(users.activeRole, 'admin')
        )
      );
    return rows.map(r => r.id);
  }

  // Push subscription operations
  async createPushSubscription(sub: InsertPushSubscription): Promise<PushSubscription> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
    const [result] = await db.insert(pushSubscriptions).values(sub).returning();
    return result;
  }

  async getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async deletePushSubscriptionsByUser(userId: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  // Pub Events operations
  async getPubEvents(pubId: number, publicOnly = false): Promise<PubEvent[]> {
    const conditions = [eq(pubEvents.pubId, pubId)];
    if (publicOnly) {
      // Show event if: COALESCE(endDate, eventDate) + 12 hours > now
      conditions.push(sql`COALESCE(${pubEvents.endDate}, ${pubEvents.eventDate}) + INTERVAL '12 hours' > NOW()`);
    }
    return db.select().from(pubEvents)
      .where(and(...conditions))
      .orderBy(asc(pubEvents.eventDate));
  }

  async getPubEvent(id: number): Promise<PubEvent | undefined> {
    const [event] = await db.select().from(pubEvents).where(eq(pubEvents.id, id));
    return event;
  }

  async createPubEvent(event: InsertPubEvent): Promise<PubEvent> {
    const [created] = await db.insert(pubEvents).values(event).returning();
    return created;
  }

  async updatePubEvent(id: number, updates: Partial<InsertPubEvent>): Promise<PubEvent> {
    const [updated] = await db.update(pubEvents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pubEvents.id, id))
      .returning();
    return updated;
  }

  async deletePubEvent(id: number): Promise<void> {
    await db.delete(pubEvents).where(eq(pubEvents.id, id));
  }

  async getUpcomingEvents(limit: number = 20): Promise<any[]> {
    const now = new Date();
    const results = await db.select({
      id: pubEvents.id,
      pubId: pubEvents.pubId,
      title: pubEvents.title,
      description: pubEvents.description,
      category: pubEvents.category,
      eventDate: pubEvents.eventDate,
      endDate: pubEvents.endDate,
      imageUrl: pubEvents.imageUrl,
      isPublished: pubEvents.isPublished,
      createdAt: pubEvents.createdAt,
      updatedAt: pubEvents.updatedAt,
      pubName: pubs.name,
      pubCity: pubs.city,
      pubLatitude: pubs.latitude,
      pubLongitude: pubs.longitude,
    })
      .from(pubEvents)
      .innerJoin(pubs, eq(pubEvents.pubId, pubs.id))
      .where(and(
        eq(pubEvents.isPublished, true),
        sql`${pubEvents.eventDate} >= ${now}`
      ))
      .orderBy(asc(pubEvents.eventDate))
      .limit(limit);

    return results.map(row => ({
      id: row.id,
      pubId: row.pubId,
      title: row.title,
      description: row.description,
      category: row.category,
      eventDate: row.eventDate,
      endDate: row.endDate,
      imageUrl: row.imageUrl,
      isPublished: row.isPublished,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      pub: {
        name: row.pubName,
        city: row.pubCity,
        latitude: row.pubLatitude,
        longitude: row.pubLongitude,
      },
    }));
  }

  async markPubEventStartSent(id: number): Promise<void> {
    await db.update(pubEvents).set({ startNotificationSent: true }).where(eq(pubEvents.id, id));
  }

  async markBreweryEventStartSent(id: number): Promise<void> {
    await db.update(breweryEvents).set({ startNotificationSent: true }).where(eq(breweryEvents.id, id));
  }

  async getPendingStartNotifications(): Promise<{ pubEvents: any[]; breweryEvents: any[] }> {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const pendingPubEvents = await db.select({
      id: pubEvents.id,
      pubId: pubEvents.pubId,
      title: pubEvents.title,
      eventDate: pubEvents.eventDate,
      pubName: pubs.name,
      pubLogoUrl: pubs.logoUrl,
    })
      .from(pubEvents)
      .innerJoin(pubs, eq(pubEvents.pubId, pubs.id))
      .where(and(
        eq(pubEvents.isPublished, true),
        eq(pubEvents.startNotificationSent, false),
        sql`${pubEvents.eventDate} <= ${now}`,
        sql`${pubEvents.eventDate} >= ${fiveMinAgo}`,
      ));

    const pendingBreweryEvents = await db.select({
      id: breweryEvents.id,
      breweryId: breweryEvents.breweryId,
      title: breweryEvents.title,
      eventDate: breweryEvents.eventDate,
      breweryName: breweries.name,
      breweryLogoUrl: breweries.logoUrl,
    })
      .from(breweryEvents)
      .innerJoin(breweries, eq(breweryEvents.breweryId, breweries.id))
      .where(and(
        eq(breweryEvents.isPublished, true),
        eq(breweryEvents.startNotificationSent, false),
        sql`${breweryEvents.eventDate} <= ${now}`,
        sql`${breweryEvents.eventDate} >= ${fiveMinAgo}`,
      ));

    return { pubEvents: pendingPubEvents, breweryEvents: pendingBreweryEvents };
  }

  // --- Event Interests ---
  async togglePubEventInterest(userId: string, eventId: number): Promise<boolean> {
    const existing = await db.select().from(pubEventInterests)
      .where(and(eq(pubEventInterests.userId, userId), eq(pubEventInterests.eventId, eventId)));
    if (existing.length > 0) {
      await db.delete(pubEventInterests)
        .where(and(eq(pubEventInterests.userId, userId), eq(pubEventInterests.eventId, eventId)));
      return false;
    }
    await db.insert(pubEventInterests).values({ userId, eventId });
    return true;
  }

  async getPubEventInterestCount(eventId: number): Promise<number> {
    const [row] = await db.select({ count: sql<number>`COUNT(*)` }).from(pubEventInterests)
      .where(eq(pubEventInterests.eventId, eventId));
    return Number(row?.count ?? 0);
  }

  async getPubEventUserInterest(userId: string, eventId: number): Promise<boolean> {
    const rows = await db.select({ id: pubEventInterests.id }).from(pubEventInterests)
      .where(and(eq(pubEventInterests.userId, userId), eq(pubEventInterests.eventId, eventId)));
    return rows.length > 0;
  }

  async toggleBreweryEventInterest(userId: string, eventId: number): Promise<boolean> {
    const existing = await db.select().from(breweryEventInterests)
      .where(and(eq(breweryEventInterests.userId, userId), eq(breweryEventInterests.eventId, eventId)));
    if (existing.length > 0) {
      await db.delete(breweryEventInterests)
        .where(and(eq(breweryEventInterests.userId, userId), eq(breweryEventInterests.eventId, eventId)));
      return false;
    }
    await db.insert(breweryEventInterests).values({ userId, eventId });
    return true;
  }

  async getBreweryEventInterestCount(eventId: number): Promise<number> {
    const [row] = await db.select({ count: sql<number>`COUNT(*)` }).from(breweryEventInterests)
      .where(eq(breweryEventInterests.eventId, eventId));
    return Number(row?.count ?? 0);
  }

  async getBreweryEventUserInterest(userId: string, eventId: number): Promise<boolean> {
    const rows = await db.select({ id: breweryEventInterests.id }).from(breweryEventInterests)
      .where(and(eq(breweryEventInterests.userId, userId), eq(breweryEventInterests.eventId, eventId)));
    return rows.length > 0;
  }
}

// Storage wrapper with fallback to in-memory when database is disabled
class StorageWrapper implements IStorage {
  private databaseStorage = new DatabaseStorage();
  private useMemoryFallback = false;

  // Helper to detect database connection issues
  private async isDBDisabled(error: any): Promise<boolean> {
    const errorMessage = error?.message || error?.toString() || '';
    return errorMessage.includes('endpoint has been disabled') || 
           errorMessage.includes('database connection') ||
           errorMessage.includes('connection to server');
  }

  // Wrapper method that automatically falls back to memory storage
  private async dbCall<T>(
    dbOperation: () => Promise<T>,
    memoryOperation: () => Promise<T>
  ): Promise<T> {
    if (this.useMemoryFallback) {
      console.log('Using memory storage (database disabled)');
      return memoryOperation();
    }

    try {
      return await dbOperation();
    } catch (error: any) {
      if (await this.isDBDisabled(error)) {
        console.warn('Database disabled, switching to memory storage:', error?.message || error);
        this.useMemoryFallback = true;
        return memoryOperation();
      }
      throw error;
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.dbCall(
      () => this.databaseStorage.getUser(id),
      () => memoryStorageInstance.getUser(id)
    );
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    return this.dbCall(
      () => this.databaseStorage.upsertUser(userData),
      () => memoryStorageInstance.upsertUser(userData)
    );
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User> {
    return this.dbCall(
      () => this.databaseStorage.updateUser(id, updates),
      () => memoryStorageInstance.updateUser(id, updates)
    );
  }

  // Pub operations
  async getPubs(): Promise<Pub[]> {
    return this.dbCall(
      () => this.databaseStorage.getPubs(),
      () => memoryStorageInstance.getPubs()
    );
  }

  async getPub(id: number): Promise<Pub | undefined> {
    return this.dbCall(
      () => this.databaseStorage.getPub(id),
      () => memoryStorageInstance.getPub(id)
    );
  }

  async getPubBySlug(slug: string): Promise<Pub | undefined> {
    return this.dbCall(
      () => this.databaseStorage.getPubBySlug(slug),
      () => memoryStorageInstance.getPubBySlug(slug)
    );
  }

  async createPub(pubData: InsertPub): Promise<Pub> {
    return this.dbCall(
      () => this.databaseStorage.createPub(pubData),
      () => memoryStorageInstance.createPub(pubData)
    );
  }

  async updatePub(id: number, updates: Partial<InsertPub>): Promise<Pub> {
    return this.dbCall(
      () => this.databaseStorage.updatePub(id, updates),
      () => memoryStorageInstance.updatePub(id, updates)
    );
  }

  async deletePub(id: number): Promise<void> {
    return this.dbCall(
      () => this.databaseStorage.deletePub(id),
      () => memoryStorageInstance.deletePub(id)
    );
  }

  async getPubsByOwner(ownerId: string): Promise<Pub[]> {
    return this.dbCall(
      () => this.databaseStorage.getPubsByOwner(ownerId),
      () => memoryStorageInstance.getPubsByOwner(ownerId)
    );
  }

  async searchPubs(query: string): Promise<Pub[]> {
    return this.dbCall(
      () => this.databaseStorage.searchPubs(query),
      () => memoryStorageInstance.searchPubs(query)
    );
  }

  // Brewery operations
  async getBreweries(): Promise<Brewery[]> {
    return this.dbCall(
      () => this.databaseStorage.getBreweries(),
      () => memoryStorageInstance.getBreweries()
    );
  }

  async getBreweriesWithBeerCount(limit?: number, random?: boolean): Promise<any[]> {
    return this.dbCall(
      () => this.databaseStorage.getBreweriesWithBeerCount(limit, random),
      async () => {
        const allBreweries = await memoryStorageInstance.getBreweries();
        return allBreweries.map((b: any) => ({ ...b, beerCount: 0 }));
      }
    );
  }

  async getBrewery(id: number): Promise<Brewery | undefined> {
    return this.dbCall(
      () => this.databaseStorage.getBrewery(id),
      () => memoryStorageInstance.getBrewery(id)
    );
  }

  async createBrewery(breweryData: InsertBrewery): Promise<Brewery> {
    return this.dbCall(
      () => this.databaseStorage.createBrewery(breweryData),
      () => memoryStorageInstance.createBrewery(breweryData)
    );
  }

  async updateBrewery(id: number, updates: Partial<InsertBrewery>): Promise<Brewery> {
    return this.dbCall(
      () => this.databaseStorage.updateBrewery(id, updates),
      () => memoryStorageInstance.updateBrewery(id, updates)
    );
  }

  async deleteBrewery(id: number): Promise<void> {
    return this.dbCall(
      () => this.databaseStorage.deleteBrewery(id),
      () => memoryStorageInstance.deleteBrewery(id)
    );
  }

  async searchBreweries(query: string): Promise<Brewery[]> {
    return this.dbCall(
      () => this.databaseStorage.searchBreweries(query),
      () => memoryStorageInstance.searchBreweries(query)
    );
  }

  async exploreBreweries(q: string, country: string, page: number, limit: number): Promise<{ breweries: any[]; total: number }> {
    return this.dbCall(
      () => this.databaseStorage.exploreBreweries(q, country, page, limit),
      async () => ({ breweries: [], total: 0 })
    );
  }

  async getBreweryCountries(): Promise<{ country: string; count: number }[]> {
    return this.dbCall(
      () => this.databaseStorage.getBreweryCountries(),
      async () => []
    );
  }

  async getRandomBreweries(limit?: number): Promise<Brewery[]> {
    return this.dbCall(
      () => this.databaseStorage.getRandomBreweries(limit),
      () => memoryStorageInstance.getRandomBreweries()
    );
  }

  // Beer operations
  async getBeers(): Promise<Beer[]> {
    return this.dbCall(
      () => this.databaseStorage.getBeers(),
      () => memoryStorageInstance.getBeers()
    );
  }

  async getBeer(id: number): Promise<Beer | undefined> {
    return this.dbCall(
      () => this.databaseStorage.getBeer(id),
      () => memoryStorageInstance.getBeer(id)
    );
  }

  async createBeer(beerData: InsertBeer): Promise<Beer> {
    return this.dbCall(
      () => this.databaseStorage.createBeer(beerData),
      () => memoryStorageInstance.createBeer(beerData)
    );
  }

  async updateBeer(id: number, updates: Partial<InsertBeer>): Promise<Beer> {
    return this.dbCall(
      () => this.databaseStorage.updateBeer(id, updates),
      () => memoryStorageInstance.updateBeer(id, updates)
    );
  }

  async deleteBeer(id: number): Promise<void> {
    return this.dbCall(
      () => this.databaseStorage.deleteBeer(id),
      () => memoryStorageInstance.deleteBeer(id)
    );
  }

  async getBeersByBrewery(breweryId: number): Promise<Beer[]> {
    return this.dbCall(
      () => this.databaseStorage.getBeersByBrewery(breweryId),
      () => memoryStorageInstance.getBeersByBrewery(breweryId)
    );
  }

  async searchBeers(query: string, filters?: { glutenFree?: boolean; alcoholFree?: boolean; style?: string; minAbv?: number; maxAbv?: number; minIbu?: number; maxIbu?: number }): Promise<Beer[]> {
    return this.dbCall(
      () => this.databaseStorage.searchBeers(query, filters),
      () => memoryStorageInstance.searchBeers(query)
    );
  }

  // Delegated methods for operations with basic fallback
  async getTapList(pubId: number): Promise<TapList[]> {
    return this.dbCall(
      () => this.databaseStorage.getTapList(pubId),
      () => memoryStorageInstance.getTapList(pubId)
    );
  }

  async getTapListByPubForOwner(pubId: number): Promise<any[]> {
    return this.dbCall(
      () => this.databaseStorage.getTapListByPubForOwner(pubId),
      () => memoryStorageInstance.getTapListByPubForOwner(pubId)
    );
  }

  async addToTapList(item: InsertTapList): Promise<TapList> {
    return this.dbCall(
      () => this.databaseStorage.addToTapList(item),
      () => memoryStorageInstance.addToTapList(item)
    );
  }

  async updateTapListItem(id: number, updates: Partial<InsertTapList>): Promise<TapList> {
    return this.dbCall(
      () => this.databaseStorage.updateTapListItem(id, updates),
      () => memoryStorageInstance.updateTapListItem(id, updates)
    );
  }

  async removeFromTapList(id: number): Promise<void> {
    return this.dbCall(
      () => this.databaseStorage.removeFromTapList(id),
      () => memoryStorageInstance.removeFromTapList(id)
    );
  }

  // Simple delegations for other methods (stub implementations)
  async getBottleList(pubId: number): Promise<BottleList[]> {
    return this.dbCall(
      () => this.databaseStorage.getBottleList(pubId),
      () => memoryStorageInstance.getBottleList(pubId)
    );
  }

  async addToBottleList(item: InsertBottleList): Promise<BottleList> {
    return this.dbCall(
      () => this.databaseStorage.addToBottleList(item),
      () => memoryStorageInstance.addToBottleList(item)
    );
  }

  async removeFromBottleList(id: number): Promise<void> {
    return this.dbCall(
      () => this.databaseStorage.removeFromBottleList(id),
      () => memoryStorageInstance.removeFromBottleList(id)
    );
  }

  // Placeholder implementations for all other required interface methods
  async updateBottleListItem(id: number, updates: Partial<InsertBottleList>): Promise<BottleList> {
    return this.dbCall(
      () => this.databaseStorage.updateBottleListItem(id, updates),
      async () => { throw new Error('Not implemented in memory storage'); }
    );
  }

  async updateBottleItem(id: number, updates: Partial<InsertBottleList>): Promise<BottleList> {
    return this.dbCall(
      () => this.databaseStorage.updateBottleItem(id, updates),
      async () => { throw new Error('Not implemented in memory storage'); }
    );
  }

  async removeBottleItem(id: number): Promise<void> {
    return this.dbCall(
      () => this.databaseStorage.removeBottleItem(id),
      async () => { }
    );
  }

  async addBeerToBottles(item: InsertBottleList): Promise<BottleList> {
    return this.dbCall(
      () => this.databaseStorage.addBeerToBottles(item),
      async () => { throw new Error('Not implemented in memory storage'); }
    );
  }

  async removeBeerFromBottles(id: number): Promise<void> {
    return this.dbCall(
      () => this.databaseStorage.removeBeerFromBottles(id),
      async () => { }
    );
  }

  async getBeerAvailability(beerId: number): Promise<any> {
    return this.dbCall(
      () => this.databaseStorage.getBeerAvailability(beerId),
      async () => { return { tapLocations: [], bottleLocations: [] }; }
    );
  }

  async getBeerWithBrewery(id: number): Promise<any> {
    return this.dbCall(
      () => this.databaseStorage.getBeerWithBrewery(id),
      async () => { return null; }
    );
  }

  async getMenuCategories(pubId: number): Promise<MenuCategory[]> {
    return this.dbCall(
      () => this.databaseStorage.getMenuCategories(pubId),
      async () => { return []; }
    );
  }

  async createMenuCategory(category: InsertMenuCategory): Promise<MenuCategory> {
    return this.dbCall(
      () => this.databaseStorage.createMenuCategory(category),
      async () => { throw new Error('Not implemented in memory storage'); }
    );
  }

  async updateMenuCategory(id: number, updates: Partial<InsertMenuCategory>): Promise<MenuCategory> {
    return this.dbCall(
      () => this.databaseStorage.updateMenuCategory(id, updates),
      async () => { throw new Error('Not implemented in memory storage'); }
    );
  }

  async deleteMenuCategory(id: number): Promise<void> {
    return this.dbCall(
      () => this.databaseStorage.deleteMenuCategory(id),
      async () => { }
    );
  }

  async getMenuItems(categoryId: number): Promise<MenuItem[]> {
    return this.dbCall(
      () => this.databaseStorage.getMenuItems(categoryId),
      async () => { return []; }
    );
  }

  async getMenuItem(id: number): Promise<MenuItem | null> {
    return this.dbCall(
      () => this.databaseStorage.getMenuItem(id),
      async () => { return null; }
    );
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    return this.dbCall(
      () => this.databaseStorage.createMenuItem(item),
      async () => { throw new Error('Not implemented in memory storage'); }
    );
  }

  async updateMenuItem(id: number, updates: Partial<InsertMenuItem>): Promise<MenuItem> {
    return this.dbCall(
      () => this.databaseStorage.updateMenuItem(id, updates),
      async () => { throw new Error('Not implemented in memory storage'); }
    );
  }

  async deleteMenuItem(id: number): Promise<void> {
    return this.dbCall(
      () => this.databaseStorage.deleteMenuItem(id),
      async () => { }
    );
  }

  // Allergen operations
  async getAllergens(): Promise<Allergen[]> {
    return this.dbCall(
      () => this.databaseStorage.getAllergens(),
      async () => { return []; }
    );
  }

  async getFavorites(userId: string): Promise<Favorite[]> {
    return this.dbCall(
      () => this.databaseStorage.getUserFavorites(userId),
      async () => { return []; }
    );
  }

  async getUserFavorites(userId: string): Promise<Favorite[]> {
    return this.dbCall(
      () => this.databaseStorage.getUserFavorites(userId),
      async () => { return []; }
    );
  }

  async getMenuByPub(pubId: number, includeHidden = false): Promise<any> {
    return this.dbCall(
      () => this.databaseStorage.getMenuByPub(pubId, includeHidden),
      async () => { return []; }
    );
  }

  async addFavorite(favorite: InsertFavorite): Promise<Favorite> {
    return this.dbCall(
      () => this.databaseStorage.addFavorite(favorite),
      async () => { throw new Error('Not implemented in memory storage'); }
    );
  }

  async removeFavorite(userId: string, itemType: 'pub' | 'brewery' | 'beer' | 'festival', itemId: number): Promise<void> {
    return this.dbCall(
      () => this.databaseStorage.removeFavorite(userId, itemType, itemId),
      async () => { }
    );
  }

  async removeFavoriteById(userId: string, favoriteId: number): Promise<void> {
    return this.dbCall(
      () => this.databaseStorage.removeFavoriteById(userId, favoriteId),
      async () => { }
    );
  }

  async isFavorite(userId: string, itemType: 'pub' | 'brewery' | 'beer' | 'festival', itemId: number): Promise<boolean> {
    return this.dbCall(
      () => this.databaseStorage.isFavorite(userId, itemType, itemId),
      async () => { return false; }
    );
  }

  async getFavoritesCount(itemType: 'pub' | 'brewery' | 'beer' | 'festival', itemId: number): Promise<number> {
    return this.dbCall(
      () => this.databaseStorage.getFavoritesCount(itemType, itemId),
      async () => { return 0; }
    );
  }

  async getUserActivities(userId: string, limit?: number): Promise<UserActivity[]> {
    return this.dbCall(
      () => this.databaseStorage.getUserActivities(userId, limit),
      async () => { return []; }
    );
  }

  async addUserActivity(activity: InsertUserActivity): Promise<UserActivity> {
    return this.dbCall(
      () => this.databaseStorage.addUserActivity(activity),
      async () => { throw new Error('Not implemented in memory storage'); }
    );
  }

  async getUserBeerTastings(userId: string): Promise<UserBeerTasting[]> {
    return this.dbCall(
      () => this.databaseStorage.getUserBeerTastings(userId),
      async () => { return []; }
    );
  }

  async addBeerTasting(tasting: InsertUserBeerTasting): Promise<UserBeerTasting> {
    return this.dbCall(
      () => this.databaseStorage.addBeerTasting(tasting),
      async () => { throw new Error('Not implemented in memory storage'); }
    );
  }

  async updateBeerTasting(id: number, updates: Partial<InsertUserBeerTasting>, userId?: string): Promise<UserBeerTasting> {
    return this.dbCall(
      () => this.databaseStorage.updateBeerTasting(id, updates, userId),
      async () => { throw new Error('Not implemented in memory storage'); }
    );
  }

  async deleteBeerTasting(id: number): Promise<void> {
    return this.dbCall(
      () => this.databaseStorage.deleteBeerTasting(id),
      async () => { }
    );
  }

  async removeBeerTasting(userId: string, beerId: number): Promise<void> {
    return this.dbCall(
      () => this.databaseStorage.removeBeerTasting(userId, beerId),
      async () => { }
    );
  }

  async updateUserType(userId: string, userType: string): Promise<User> {
    return this.dbCall(
      () => this.databaseStorage.updateUserType(userId, userType),
      async () => { throw new Error('Not implemented in memory storage'); }
    );
  }

  async getUserRoles(userId: string): Promise<{ roles: string[]; activeRole: string }> {
    return this.dbCall(
      () => this.databaseStorage.getUserRoles(userId),
      async () => { return { roles: ['customer'], activeRole: 'customer' }; }
    );
  }

  async switchUserRole(userId: string, newRole: string): Promise<User> {
    return this.dbCall(
      () => this.databaseStorage.switchUserRole(userId, newRole),
      async () => { throw new Error('Not implemented in memory storage'); }
    );
  }

  async getPubSizes(pubId: number): Promise<PubSize[]> {
    return this.dbCall(
      () => this.databaseStorage.getPubSizes(pubId),
      async () => { return []; }
    );
  }

  async createPubSize(size: InsertPubSize): Promise<PubSize> {
    return this.dbCall(
      () => this.databaseStorage.createPubSize(size),
      async () => { throw new Error('Not implemented in memory storage'); }
    );
  }

  async updatePubSize(id: number, updates: Partial<InsertPubSize>): Promise<PubSize> {
    return this.dbCall(
      () => this.databaseStorage.updatePubSize(id, updates),
      async () => { throw new Error('Not implemented in memory storage'); }
    );
  }

  async deletePubSize(id: number): Promise<void> {
    return this.dbCall(
      () => this.databaseStorage.deletePubSize(id),
      async () => { }
    );
  }

  async getFavoritesByType(userId: string, itemType: 'pub' | 'brewery' | 'beer' | 'festival'): Promise<Favorite[]> {
    return this.dbCall(
      () => this.databaseStorage.getFavoritesByType(userId, itemType),
      async () => { return []; }
    );
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return this.dbCall(
      () => this.databaseStorage.getNotifications(userId),
      async () => []
    );
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    return this.dbCall(
      () => this.databaseStorage.getUnreadNotificationCount(userId),
      async () => 0
    );
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    return this.dbCall(
      () => this.databaseStorage.createNotification(notification),
      async () => { throw new Error('Not implemented in memory storage'); }
    );
  }

  async markNotificationRead(id: number, userId: string): Promise<void> {
    return this.dbCall(
      () => this.databaseStorage.markNotificationRead(id, userId),
      async () => {}
    );
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    return this.dbCall(
      () => this.databaseStorage.markAllNotificationsRead(userId),
      async () => {}
    );
  }

  async deleteNotification(id: number, userId: string): Promise<void> {
    return this.dbCall(
      () => this.databaseStorage.deleteNotification(id, userId),
      async () => {}
    );
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreference | null> {
    return this.dbCall(
      () => this.databaseStorage.getNotificationPreferences(userId),
      async () => null
    );
  }

  async upsertNotificationPreferences(userId: string, prefs: Partial<InsertNotificationPreference>): Promise<NotificationPreference> {
    return this.dbCall(
      () => this.databaseStorage.upsertNotificationPreferences(userId, prefs),
      async () => { throw new Error('Not implemented in memory storage'); }
    );
  }

  async getUsersWhoFavoritedPub(pubId: number): Promise<string[]> {
    return this.dbCall(
      () => this.databaseStorage.getUsersWhoFavoritedPub(pubId),
      async () => []
    );
  }

  async getUsersWhoFavoritedBeer(beerId: number): Promise<string[]> {
    return this.dbCall(
      () => this.databaseStorage.getUsersWhoFavoritedBeer(beerId),
      async () => []
    );
  }

  async getUsersWhoFavoritedBrewery(breweryId: number): Promise<string[]> {
    return this.dbCall(
      () => this.databaseStorage.getUsersWhoFavoritedBrewery(breweryId),
      async () => []
    );
  }

  async getAdminUserIds(): Promise<string[]> {
    return this.dbCall(
      () => this.databaseStorage.getAdminUserIds(),
      async () => []
    );
  }

  async createPushSubscription(sub: InsertPushSubscription): Promise<PushSubscription> {
    return this.dbCall(
      () => this.databaseStorage.createPushSubscription(sub),
      async () => { throw new Error('Not implemented in memory storage'); }
    );
  }

  async getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]> {
    return this.dbCall(
      () => this.databaseStorage.getPushSubscriptionsByUser(userId),
      async () => []
    );
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    return this.dbCall(
      () => this.databaseStorage.deletePushSubscription(endpoint),
      async () => {}
    );
  }

  async deletePushSubscriptionsByUser(userId: string): Promise<void> {
    return this.dbCall(
      () => this.databaseStorage.deletePushSubscriptionsByUser(userId),
      async () => {}
    );
  }

  // Pub Events operations
  async getPubEvents(pubId: number, publicOnly?: boolean): Promise<PubEvent[]> {
    return this.dbCall(
      () => this.databaseStorage.getPubEvents(pubId, publicOnly),
      async () => []
    );
  }

  async getPubEvent(id: number): Promise<PubEvent | undefined> {
    return this.dbCall(
      () => this.databaseStorage.getPubEvent(id),
      async () => undefined
    );
  }

  async createPubEvent(event: InsertPubEvent): Promise<PubEvent> {
    return this.dbCall(
      () => this.databaseStorage.createPubEvent(event),
      async () => { throw new Error('Not implemented in memory storage'); }
    );
  }

  async updatePubEvent(id: number, updates: Partial<InsertPubEvent>): Promise<PubEvent> {
    return this.dbCall(
      () => this.databaseStorage.updatePubEvent(id, updates),
      async () => { throw new Error('Not implemented in memory storage'); }
    );
  }

  async deletePubEvent(id: number): Promise<void> {
    return this.dbCall(
      () => this.databaseStorage.deletePubEvent(id),
      async () => {}
    );
  }

  async getUpcomingEvents(limit?: number): Promise<any[]> {
    return this.dbCall(
      () => this.databaseStorage.getUpcomingEvents(limit),
      async () => []
    );
  }

  async markPubEventStartSent(id: number): Promise<void> {
    return this.dbCall(
      () => this.databaseStorage.markPubEventStartSent(id),
      async () => {}
    );
  }

  async markBreweryEventStartSent(id: number): Promise<void> {
    return this.dbCall(
      () => this.databaseStorage.markBreweryEventStartSent(id),
      async () => {}
    );
  }

  async getPendingStartNotifications(): Promise<{ pubEvents: any[]; breweryEvents: any[] }> {
    return this.dbCall(
      () => this.databaseStorage.getPendingStartNotifications(),
      async () => ({ pubEvents: [], breweryEvents: [] })
    );
  }

  async togglePubEventInterest(userId: string, eventId: number): Promise<boolean> {
    return this.dbCall(() => this.databaseStorage.togglePubEventInterest(userId, eventId), async () => false);
  }
  async getPubEventInterestCount(eventId: number): Promise<number> {
    return this.dbCall(() => this.databaseStorage.getPubEventInterestCount(eventId), async () => 0);
  }
  async getPubEventUserInterest(userId: string, eventId: number): Promise<boolean> {
    return this.dbCall(() => this.databaseStorage.getPubEventUserInterest(userId, eventId), async () => false);
  }
  async toggleBreweryEventInterest(userId: string, eventId: number): Promise<boolean> {
    return this.dbCall(() => this.databaseStorage.toggleBreweryEventInterest(userId, eventId), async () => false);
  }
  async getBreweryEventInterestCount(eventId: number): Promise<number> {
    return this.dbCall(() => this.databaseStorage.getBreweryEventInterestCount(eventId), async () => 0);
  }
  async getBreweryEventUserInterest(userId: string, eventId: number): Promise<boolean> {
    return this.dbCall(() => this.databaseStorage.getBreweryEventUserInterest(userId, eventId), async () => false);
  }
}

export const storage = new StorageWrapper();