import {
  users,
  pubs,
  breweries,
  beers,
  beerViews,
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
  type PubRecentActivity,
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
  nativePushTokens,
  type NativePushToken,
  pubEvents,
  type PubEvent,
  type InsertPubEvent,
  breweryEvents,
  type BreweryEvent,
  type InsertBreweryEvent,
  pubEventInterests,
  breweryEventInterests,
  drinkItems,
  type DrinkItem,
  type InsertDrinkItem,
  drinkCategories,
  type DrinkCategory,
  type InsertDrinkCategory,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, desc, like, inArray, sql, or, asc, ilike, isNotNull, ne } from "drizzle-orm";
import { breweryActiveSql, beerVisibleSql } from "./visibility";
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
  getBreweriesForMap(): Promise<{ id: number; name: string; latitude: string; longitude: string; logoUrl: string | null; location: string; country: string | null }[]>;
  getBreweriesWithBeerCount(limit?: number, random?: boolean): Promise<any[]>;
  getBrewery(id: number): Promise<Brewery | undefined>;
  getRandomBreweries(limit?: number): Promise<Brewery[]>;
  createBrewery(brewery: InsertBrewery): Promise<Brewery>;
  updateBrewery(id: number, updates: Partial<InsertBrewery>): Promise<Brewery>;
  deleteBrewery(id: number): Promise<void>;
  searchBreweries(query: string): Promise<Brewery[]>;
  exploreBreweries(q: string, country: string, page: number, limit: number, excludeCountry?: string): Promise<{ breweries: any[]; total: number }>;
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
  getBottleListForOwner(pubId: number): Promise<any[]>;
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

  // Drink items operations
  getDrinkItems(pubId: number, includeHidden?: boolean): Promise<DrinkItem[]>;
  createDrinkItem(item: InsertDrinkItem): Promise<DrinkItem>;
  updateDrinkItem(id: number, updates: Partial<InsertDrinkItem>): Promise<DrinkItem>;
  deleteDrinkItem(id: number): Promise<void>;

  // Drink category operations
  getDrinkCategoriesWithItems(pubId: number, includeHidden?: boolean): Promise<any[]>;
  createDrinkCategory(data: InsertDrinkCategory): Promise<DrinkCategory>;
  updateDrinkCategory(id: number, updates: Partial<InsertDrinkCategory>): Promise<DrinkCategory>;
  deleteDrinkCategory(id: number): Promise<void>;
  reorderDrinkCategories(order: { id: number; orderIndex: number }[]): Promise<void>;

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
  getPubRecentActivities(pubId: number, limit?: number): Promise<PubRecentActivity[]>;

  // Beer tastings operations
  getUserBeerTastings(userId: string): Promise<UserBeerTasting[]>;
  addBeerTasting(tasting: InsertUserBeerTasting): Promise<UserBeerTasting>;
  updateBeerTasting(id: number, updates: Partial<InsertUserBeerTasting>, userId?: string): Promise<UserBeerTasting>;
  deleteBeerTasting(id: number): Promise<void>;

  // Notification operations
  getNotifications(userId: string, opts?: { type?: string | null; limit?: number; offset?: number }): Promise<Notification[]>;
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

  // Native push token operations (FCM / APNs)
  saveNativePushToken(userId: string, token: string, platform: string): Promise<void>;
  deleteNativePushToken(token: string): Promise<void>;
  getNativePushTokensByUser(userId: string): Promise<NativePushToken[]>;
  getAllNativePushTokens(): Promise<NativePushToken[]>;

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

  // Beer analytics
  logBeerView(beerId: number, userId?: string): Promise<void>;
  getSimilarBeers(beerId: number, style: string, limit?: number): Promise<any[]>;
  getTrendingBeers(limit?: number, days?: number): Promise<any[]>;
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
    const q = `%${query}%`;
    return await db
      .select()
      .from(pubs)
      .where(or(
        sql`unaccent(lower(${pubs.name})) LIKE unaccent(lower(${q}))`,
        sql`unaccent(lower(${pubs.city})) LIKE unaccent(lower(${q}))`,
        ilike(pubs.address, q),
        ilike(pubs.description, q)
      ))
      .orderBy(asc(pubs.name))
      .limit(10);
  }

  // Brewery operations
  async getBreweries(): Promise<Brewery[]> {
    return await db.select().from(breweries).where(breweryActiveSql).orderBy(asc(breweries.name));
  }

  async getBreweriesForMap(): Promise<{ id: number; name: string; latitude: string; longitude: string; logoUrl: string | null; location: string; country: string | null }[]> {
    return await db
      .select({ id: breweries.id, name: breweries.name, latitude: breweries.latitude, longitude: breweries.longitude, logoUrl: breweries.logoUrl, location: breweries.location, country: breweries.country })
      .from(breweries)
      .where(and(sql`${breweries.latitude} IS NOT NULL AND ${breweries.longitude} IS NOT NULL`, breweryActiveSql))
      .orderBy(asc(breweries.name)) as any;
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
      .leftJoin(beers, and(eq(beers.breweryId, breweries.id), sql`COALESCE(${beers.isDiscontinued}, false) = false`))
      .where(breweryActiveSql)
      .groupBy(breweries.id)
      .orderBy(random ? sql`RANDOM()` : asc(breweries.name));
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  async getRandomBreweries(limit: number = 10): Promise<Brewery[]> {
    return await db.select().from(breweries).where(breweryActiveSql).orderBy(sql`RANDOM()`).limit(limit);
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
    const q = `%${query}%`;
    const words = query.trim().split(/\s+/).filter(w => w.length >= 2);
    // Multi-parola: AND logic per nome (ogni parola deve essere presente).
    // Parola singola: OR tra nome, location, descrizione.
    const searchCondition = words.length > 1
      ? and(...words.map(w => sql`unaccent(lower(${breweries.name}::text)) LIKE unaccent(lower(${'%' + w + '%'}))`))
      : or(
          sql`unaccent(lower(${breweries.name}::text)) LIKE unaccent(lower(${q}))`,
          ilike(breweries.location, q),
          ilike(breweries.description, q)
        );
    const breweriesRanked = await db
      .select({ id: breweries.id, beerCount: sql<number>`COUNT(${beers.id})` })
      .from(breweries)
      .leftJoin(beers, and(eq(breweries.id, beers.breweryId), sql`COALESCE(${beers.isDiscontinued}, false) = false`))
      .where(and(breweryActiveSql, searchCondition))
      .groupBy(breweries.id)
      .orderBy(desc(sql`COUNT(${beers.id})`), asc(breweries.name))
      .limit(10);

    if (breweriesRanked.length === 0) return [];
    const ids = breweriesRanked.map((r) => r.id);
    const idOrder = breweriesRanked.map((r) => r.id);
    const result = await db.select().from(breweries).where(inArray(breweries.id, ids));
    result.sort((a, b) => idOrder.indexOf(a.id) - idOrder.indexOf(b.id));
    return result;
  }

  async exploreBreweries(q: string, country: string, page: number, limit: number, excludeCountry?: string): Promise<{ breweries: any[]; total: number }> {
    const conditions: any[] = [breweryActiveSql];
    if (q && q.length >= 2) conditions.push(ilike(breweries.name, `%${q}%`));
    if (country) {
      const cl = country.toLowerCase();
      if (cl === 'italy' || cl === 'italia') {
        conditions.push(sql`LOWER(${breweries.country}) IN ('italy', 'italia')`);
      } else {
        conditions.push(ilike(breweries.country, country));
      }
    }
    if (excludeCountry) {
      const ecl = excludeCountry.toLowerCase();
      if (ecl === 'italy' || ecl === 'italia') {
        conditions.push(sql`LOWER(${breweries.country}) NOT IN ('italy', 'italia')`);
      } else {
        conditions.push(sql`LOWER(${breweries.country}) != LOWER(${excludeCountry})`);
      }
    }
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
          latitude: breweries.latitude,
          longitude: breweries.longitude,
          beerCount: sql<number>`COUNT(${beers.id})`,
        })
        .from(breweries)
        .leftJoin(beers, and(eq(breweries.id, beers.breweryId), sql`COALESCE(${beers.isDiscontinued}, false) = false`))
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
      .where(and(isNotNull(breweries.country), ne(breweries.country, ""), breweryActiveSql))
      .groupBy(breweries.country)
      .orderBy(desc(sql`COUNT(*)`));
    return rows.map((r) => ({ country: r.country!, count: Number(r.count) }));
  }

  // Beer operations
  async getBeers(): Promise<Beer[]> {
    return await db.select().from(beers).where(beerVisibleSql).orderBy(asc(beers.name));
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
    // Drizzle may silently skip null values in .set(), so we handle nullable
    // image/URL fields with explicit SQL when they're set to null.
    const rest = { ...updates } as Record<string, any>;

    if ('imageUrl' in rest && rest.imageUrl === null) {
      console.log(`[updateBeer] clearing image_url for beer ${id}`);
      await db.execute(sql`UPDATE beers SET image_url = NULL WHERE id = ${id}`);
      delete rest.imageUrl;
    }

    if ('logoUrl' in rest && rest.logoUrl === null) {
      await db.execute(sql`UPDATE beers SET logo_url = NULL WHERE id = ${id}`);
      delete rest.logoUrl;
    }
    if ('coverImageUrl' in rest && rest.coverImageUrl === null) {
      await db.execute(sql`UPDATE beers SET cover_image_url = NULL WHERE id = ${id}`);
      delete rest.coverImageUrl;
    }
    if ('description' in rest && rest.description === null) {
      await db.execute(sql`UPDATE beers SET description = NULL WHERE id = ${id}`);
      delete rest.description;
    }

    if (Object.keys(rest).length > 0) {
      await db.update(beers).set(rest as any).where(eq(beers.id, id));
    }

    const [beer] = await db.select().from(beers).where(eq(beers.id, id)).limit(1);
    return beer;
  }

  async deleteBeer(id: number): Promise<void> {
    await db.delete(beers).where(eq(beers.id, id));
  }

  async getBeersByBrewery(breweryId: number): Promise<Beer[]> {
    return await db.select().from(beers).where(eq(beers.breweryId, breweryId));
  }

  async searchBeers(query: string, filters?: { glutenFree?: boolean; alcoholFree?: boolean; style?: string; minAbv?: number; maxAbv?: number; minIbu?: number; maxIbu?: number }): Promise<any[]> {
    const words = query.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const hasFilters = filters && Object.values(filters).some(v => v !== undefined && v !== false && v !== "");
    if (words.length === 0 && !hasFilters) return [];

    // Strategy: CTE + INTERSECT approach.
    // For each term, build a UNION of sub-queries each using a single GIN index.
    // INTERSECT between terms enforces AND (every term must match).
    // This avoids OR conditions on different columns that force seq scans.
    //
    // Params layout:
    //   For each term i: $[2i+1] = '%term%', $[2i+2] = '%termNospace%'
    //   $[2N+1] = full phrase pattern
    //   Extra filter params start at $[2N+2]
    const queryParams: any[] = [];
    words.forEach(w => {
      queryParams.push(`%${w}%`);
      queryParams.push(`%${w.replace(/\s+/g, '')}%`);
    });
    const fullPhrase = `%${query.trim().toLowerCase()}%`;
    queryParams.push(fullPhrase); // $[2N+1]

    // Build one CTE per term. Each CTE UNIONs indexed sub-queries so the planner
    // picks up idx_beers_name_unaccent_trgm, idx_beers_style_lower_trgm,
    // idx_breweries_name_unaccent_trgm, idx_beers_name_compact_trgm,
    // idx_breweries_name_compact_trgm for each condition independently.
    const termCTEs = words.map((_, i) => {
      const pi = 2 * i + 1; // '%term%'
      const ci = 2 * i + 2; // '%termNospace%'
      // LIMIT 300 in ogni sub-query: forza il planner a usare i GIN trigram index
      // invece di seq scan, riducendo il tempo su query multi-parola da 2-5s a <300ms.
      // Le parentesi sono obbligatorie in PostgreSQL per LIMIT su UNION members.
      return `
        t${i} AS (
          (SELECT b.id FROM beers b WHERE unaccent_immutable(lower(b.name::text)) LIKE $${pi} LIMIT 300)
          UNION
          (SELECT b.id FROM beers b WHERE lower(COALESCE(b.style, '')::text) LIKE $${pi} LIMIT 300)
          UNION
          (SELECT b.id FROM beers b JOIN breweries br ON b.brewery_id = br.id
            WHERE unaccent_immutable(lower(br.name::text)) LIKE $${pi} LIMIT 300)
          UNION
          (SELECT b.id FROM beers b WHERE regexp_replace(lower(b.name::text), '\\s+', '', 'g') LIKE $${ci} LIMIT 300)
          UNION
          (SELECT b.id FROM beers b JOIN breweries br ON b.brewery_id = br.id
            WHERE regexp_replace(lower(br.name::text), '\\s+', '', 'g') LIKE $${ci} LIMIT 300)
        )`;
    });

    // INTERSECT enforces AND: candidate must match every term
    const candidateSQL = words.length > 0
      ? `candidate_ids AS (${words.map((_, i) => `SELECT id FROM t${i}`).join(' INTERSECT ')})`
      : `candidate_ids AS (SELECT id FROM beers LIMIT 5000)`;

    // Score: evaluated only on candidate rows (few), so OR/CASE is fine here
    const termScoreExprs = words.map((_, i) => {
      const pi = 2 * i + 1;
      const ci = 2 * i + 2;
      return `(
        CASE WHEN unaccent_immutable(lower(b.name::text)) LIKE $${pi} THEN 4 ELSE 0 END
        + CASE WHEN unaccent_immutable(lower(br.name::text)) LIKE $${pi}
                  OR regexp_replace(lower(br.name::text), '\\s+', '', 'g') LIKE $${ci} THEN 3 ELSE 0 END
        + CASE WHEN lower(COALESCE(b.style, '')::text) LIKE $${pi} THEN 1 ELSE 0 END
      )`;
    });

    const phraseIdx = 2 * words.length + 1;
    const scoreExpr = words.length > 0
      ? `(${termScoreExprs.join(' + ')} + CASE WHEN unaccent_immutable(lower(b.name::text || ' ' || COALESCE(br.name::text, ''))) LIKE $${phraseIdx} THEN 2 ELSE 0 END)`
      : "1";

    // Extra filter clauses (applied in the final SELECT)
    const extraClauses: string[] = [];
    let paramIdx = 2 * words.length + 2;

    if (filters?.glutenFree)  { extraClauses.push(`b.is_gluten_free = true`); }
    if (filters?.alcoholFree) { extraClauses.push(`b.is_alcohol_free = true`); }
    if (filters?.style) {
      extraClauses.push(`lower(b.style) LIKE $${paramIdx}`);
      queryParams.push(`%${filters.style.toLowerCase()}%`);
      paramIdx++;
    }
    if (filters?.minAbv !== undefined) {
      extraClauses.push(`b.abv::numeric >= $${paramIdx}`);
      queryParams.push(filters.minAbv);
      paramIdx++;
    }
    if (filters?.maxAbv !== undefined) {
      extraClauses.push(`b.abv::numeric <= $${paramIdx}`);
      queryParams.push(filters.maxAbv);
      paramIdx++;
    }
    if (filters?.minIbu !== undefined) {
      extraClauses.push(`b.ibu::numeric >= $${paramIdx}`);
      queryParams.push(filters.minIbu);
      paramIdx++;
    }
    if (filters?.maxIbu !== undefined) {
      extraClauses.push(`b.ibu::numeric <= $${paramIdx}`);
      queryParams.push(filters.maxIbu);
      paramIdx++;
    }

    const extraWhere = extraClauses.length > 0 ? `AND ${extraClauses.join(" AND ")}` : "";

    const cteList = [...termCTEs, candidateSQL].join(',\n');

    const sqlText = `
      WITH ${cteList}
      SELECT
        b.id, b.name, b.style, b.abv, b.ibu, b.description,
        b.image_url       AS "imageUrl",
        b.brewery_id      AS "breweryId",
        b.is_gluten_free  AS "isGlutenFree",
        b.is_alcohol_free AS "isAlcoholFree",
        br.name           AS "breweryName",
        br.logo_url       AS "breweryLogoUrl",
        (${scoreExpr})    AS _score
      FROM candidate_ids ci
      JOIN beers b ON b.id = ci.id
      LEFT JOIN breweries br ON b.brewery_id = br.id
      WHERE 1=1
        AND COALESCE(b.is_discontinued, false) = false
        AND COALESCE(br.is_closed, false) = false
        ${extraWhere}
      ORDER BY (${scoreExpr}) DESC, length(b.name) ASC, b.name ASC
      LIMIT 50
    `;

    const result = await pool.query(sqlText, queryParams);

    return result.rows.map((row: any) => ({
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
      breweryName: row.breweryName,
      brewery: {
        id: row.breweryId,
        name: row.breweryName,
        logoUrl: row.breweryLogoUrl,
      },
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

    return results.map((row) => mapTapDbRowToDto({
      ...row,
      beer_name: row.beerName,
      beer_style: row.beerStyle,
      beer_abv: row.beerAbv,
      beer_ibu: row.beerIbu,
      beer_description: row.beerDescription,
      beer_image_url: row.beerImageUrl,
      beer_logo_url: row.beerLogoUrl,

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
          AND COALESCE(bl.is_active, true) = true
          AND COALESCE(bl.is_visible, true) = true
        ORDER BY bl.id ASC
      `);
      
      return result.rows.map((row: any) => mapBottleDbRowToDto(row));
    } catch (error) {
      console.error('Error in getBottleList:', error);
      return [];
    }
  }

  async getBottleListForOwner(pubId: number): Promise<any[]> {
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
      console.error('Error in getBottleListForOwner:', error);
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

  // Drink items operations
  async getDrinkItems(pubId: number, includeHidden = false): Promise<DrinkItem[]> {
    const where = includeHidden
      ? eq(drinkItems.pubId, pubId)
      : and(eq(drinkItems.pubId, pubId), eq(drinkItems.isVisible, true));
    return await db.select().from(drinkItems).where(where).orderBy(asc(drinkItems.category), asc(drinkItems.orderIndex));
  }

  async createDrinkItem(item: InsertDrinkItem): Promise<DrinkItem> {
    const [created] = await db.insert(drinkItems).values(item).returning();
    return created;
  }

  async updateDrinkItem(id: number, updates: Partial<InsertDrinkItem>): Promise<DrinkItem> {
    const [updated] = await db.update(drinkItems).set({ ...updates, updatedAt: new Date() }).where(eq(drinkItems.id, id)).returning();
    return updated;
  }

  async deleteDrinkItem(id: number): Promise<void> {
    await db.delete(drinkItems).where(eq(drinkItems.id, id));
  }

  // Drink category operations
  async getDrinkCategoriesWithItems(pubId: number, includeHidden = false): Promise<any[]> {
    const catWhere = includeHidden
      ? eq(drinkCategories.pubId, pubId)
      : and(eq(drinkCategories.pubId, pubId), eq(drinkCategories.isVisible, true));
    const cats = await db.select().from(drinkCategories).where(catWhere).orderBy(asc(drinkCategories.orderIndex));
    const allItems = await db.select().from(drinkItems)
      .where(
        includeHidden
          ? eq(drinkItems.pubId, pubId)
          : and(eq(drinkItems.pubId, pubId), eq(drinkItems.isVisible, true))
      )
      .orderBy(asc(drinkItems.orderIndex));
    return cats.map((cat) => ({
      ...cat,
      items: allItems.filter((i) => i.category === String(cat.id)),
    }));
  }

  async createDrinkCategory(data: InsertDrinkCategory): Promise<DrinkCategory> {
    const [created] = await db.insert(drinkCategories).values(data).returning();
    return created;
  }

  async updateDrinkCategory(id: number, updates: Partial<InsertDrinkCategory>): Promise<DrinkCategory> {
    const [updated] = await db.update(drinkCategories).set(updates).where(eq(drinkCategories.id, id)).returning();
    return updated;
  }

  async deleteDrinkCategory(id: number): Promise<void> {
    await db.delete(drinkItems).where(eq(drinkItems.category, String(id)));
    await db.delete(drinkCategories).where(eq(drinkCategories.id, id));
  }

  async reorderDrinkCategories(order: { id: number; orderIndex: number }[]): Promise<void> {
    await Promise.all(
      order.map(({ id, orderIndex }) =>
        db.update(drinkCategories).set({ orderIndex }).where(eq(drinkCategories.id, id))
      )
    );
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

    return categories.map((category) => ({
      ...category,
      items: items
        .filter((item) => item.menu_items?.categoryId === category.id)
        .map((item) => item.menu_items),
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

  async getPubRecentActivities(pubId: number, limit: number = 8): Promise<PubRecentActivity[]> {
    const rows = await db.execute(sql`
      SELECT * FROM (
        SELECT
          'tasting'::text AS type,
          ('t-' || ubt.id) AS id,
          ubt.user_id AS user_id,
          COALESCE(NULLIF(u.nickname, ''), NULLIF(u.first_name, ''), 'Utente') AS user_name,
          u.profile_image_url AS user_image,
          ubt.beer_id AS beer_id,
          b.name AS beer_name,
          ubt.rating::float AS rating,
          COALESCE(ubt.tasted_at, ubt.created_at) AS created_at
        FROM user_beer_tastings ubt
        JOIN users u ON u.id = ubt.user_id
        JOIN beers b ON b.id = ubt.beer_id
        WHERE ubt.pub_id = ${pubId}
        UNION ALL
        SELECT
          'saved_pub'::text AS type,
          ('f-' || f.id) AS id,
          f.user_id AS user_id,
          COALESCE(NULLIF(u.nickname, ''), NULLIF(u.first_name, ''), 'Utente') AS user_name,
          u.profile_image_url AS user_image,
          NULL::integer AS beer_id,
          NULL::text AS beer_name,
          NULL::float AS rating,
          f.created_at AS created_at
        FROM favorites f
        JOIN users u ON u.id = f.user_id
        WHERE f.item_type = 'pub' AND f.item_id = ${pubId}
      ) combined
      WHERE created_at IS NOT NULL
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);
    const data: any[] = (rows as any).rows ?? rows;
    return data.map((r: any) => ({
      id: String(r.id),
      type: r.type as 'tasting' | 'saved_pub',
      userId: r.user_id,
      userName: r.user_name,
      userImage: r.user_image ?? null,
      beerId: r.beer_id ?? null,
      beerName: r.beer_name ?? null,
      rating: r.rating != null ? Number(r.rating) : null,
      createdAt: r.created_at,
    }));
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

    return results.map((row) => ({
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
    const existing = await db.query.userBeerTastings.findFirst({
      where: and(
        eq(userBeerTastings.userId, tastingData.userId),
        eq(userBeerTastings.beerId, tastingData.beerId)
      ),
    });
    if (existing) {
      const [updated] = await db
        .update(userBeerTastings)
        .set({
          rating: tastingData.rating,
          personalNotes: tastingData.personalNotes,
          format: tastingData.format,
          photoUrl: tastingData.photoUrl,
          pubId: tastingData.pubId,
          tastedAt: tastingData.tastedAt || new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userBeerTastings.userId, tastingData.userId),
            eq(userBeerTastings.beerId, tastingData.beerId)
          )
        )
        .returning();
      return updated;
    }
    const [tasting] = await db
      .insert(userBeerTastings)
      .values(tastingData)
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
      tapLocations: tapAvailability.map((tap) => ({
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
      bottleLocations: bottleAvailability.map((bottle) => ({
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

  async addRating(rating: unknown): Promise<unknown> {
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

  async getNotifications(userId: string, opts: { type?: string | null; limit?: number; offset?: number } = {}): Promise<Notification[]> {
    const conditions = [eq(notifications.userId, userId)];
    if (opts.type && opts.type !== 'all') {
      conditions.push(eq(notifications.type, opts.type));
    }
    const limit = Math.min(200, Math.max(1, opts.limit ?? 100));
    const offset = Math.max(0, opts.offset ?? 0);
    return db.select().from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result[0]?.count ?? 0;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    // Task #15: rispetta inAppEnabled + categoria nelle preferenze utente.
    // NB: se la notifica è soppressa dalle preferenze, ritorniamo un oggetto
    // sintetico con id=0 (NON persistito a DB) per mantenere stabile la
    // signature `Promise<Notification>` verso i ~13 call-site esistenti che
    // ignorano comunque il return value (fire-and-forget). I caller che
    // dovessero usare l'id devono controllare `result.id !== 0`.
    // Mapping notification.type → categoria pref (null = sempre consentita,
    // es. richieste admin che non hanno opt-out per categoria).
    const typeToCategory: Record<string, string | null> = {
      // Cambi taplist / disponibilità birra
      tap_change: 'tapChanges',
      new_beer: 'tapChanges',
      beer_removed: 'tapChanges',
      // Eventi e festival
      event: 'events',
      festival: 'events',
      festival_interest: 'events',
      festival_update: 'events',
      // Nuovi locali
      new_pub: 'newPubs',
      // Social: like / commenti / nuovi follower (qualora vengano scritte
      // notifiche in-app per queste interazioni in futuro)
      checkin: 'newFollowers',
      checkin_like: 'checkinLikes',
      checkin_comment: 'checkinComments',
      comment_like: 'checkinLikes',
      follow: 'newFollowers',
      // Risposte birrificio + suggerimenti / addition requests destinati
      // all'utente o all'owner (interazioni con birrifici)
      brewery_verified: 'breweryReplies',
      brewery_request_approved: 'breweryReplies',
      brewery_request_rejected: 'breweryReplies',
      suggestion: 'breweryReplies',
      suggestion_approved: 'breweryReplies',
      suggestion_rejected: 'breweryReplies',
      addition_request: 'breweryReplies',
      addition_approved: 'breweryReplies',
      addition_rejected: 'breweryReplies',
      brewery_reply: 'breweryReplies',
      // Esito moderazione segnalazioni
      moderation: 'reportUpdates',
      // Comunicazioni ufficiali
      admin_broadcast: 'adminBroadcasts',
      system: 'adminBroadcasts',
      // Notifiche operative admin (sempre consentite, no opt-out per categoria)
      new_pub_request: null,
      new_brewery_request: null,
    };
    try {
      const [prefs] = await db.select().from(notificationPreferences)
        .where(eq(notificationPreferences.userId, notification.userId));
      if (prefs) {
        // Master switch in-app: vale per OGNI tipo (anche quelli non mappati a categoria)
        if (prefs.inAppEnabled === false) {
          return { ...(notification as any), id: 0, isRead: false, createdAt: new Date() } as Notification;
        }
        // Category filter: solo per type mappati esplicitamente
        const cat = typeToCategory[notification.type];
        if (cat && (prefs as any)[cat] === false) {
          return { ...(notification as any), id: 0, isRead: false, createdAt: new Date() } as Notification;
        }
      }
    } catch (e) {
      // fail-open: in caso di errore lettura prefs, scrive comunque la notifica
    }
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
    return rows.map((r) => r.userId);
  }

  async getUsersWhoFavoritedBeer(beerId: number): Promise<string[]> {
    const rows = await db.select({ userId: favorites.userId })
      .from(favorites)
      .where(and(eq(favorites.itemType, 'beer'), eq(favorites.itemId, beerId)));
    return rows.map((r) => r.userId);
  }

  async getUsersWhoFavoritedBrewery(breweryId: number): Promise<string[]> {
    const rows = await db.select({ userId: favorites.userId })
      .from(favorites)
      .where(and(eq(favorites.itemType, 'brewery'), eq(favorites.itemId, breweryId)));
    return rows.map((r) => r.userId);
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
    return rows.map((r) => r.id);
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

  // Native push token operations (FCM / APNs)
  async saveNativePushToken(userId: string, token: string, platform: string): Promise<void> {
    await db
      .insert(nativePushTokens)
      .values({ userId, token, platform, updatedAt: new Date() })
      .onConflictDoUpdate({ target: nativePushTokens.token, set: { userId, platform, updatedAt: new Date() } });
  }

  async deleteNativePushToken(token: string): Promise<void> {
    await db.delete(nativePushTokens).where(eq(nativePushTokens.token, token));
  }

  async getNativePushTokensByUser(userId: string): Promise<NativePushToken[]> {
    return db.select().from(nativePushTokens).where(eq(nativePushTokens.userId, userId));
  }

  async getAllNativePushTokens(): Promise<NativePushToken[]> {
    return db.select().from(nativePushTokens);
  }

  // Pub Events operations
  async getPubEvents(pubId: number, publicOnly = false): Promise<PubEvent[]> {
    const conditions = [eq(pubEvents.pubId, pubId)];
    if (publicOnly) {
      // Show event if: GREATEST(eventDate, endDate) + 12 hours > now
      // GREATEST evita che un endDate erroneamente salvato PRIMA di eventDate
      // (bug comune del date picker che usa mezzanotte come default) nasconda
      // l'evento prematuramente — usa sempre il tempo più tardo dei due.
      conditions.push(sql`GREATEST(${pubEvents.eventDate}, COALESCE(${pubEvents.endDate}, ${pubEvents.eventDate})) + INTERVAL '12 hours' > NOW()`);
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
        // Considera "upcoming" anche un evento già iniziato ma non ancora finito.
        // Se end_date manca, lasciamo 12h di tolleranza dopo event_date.
        sql`COALESCE(${pubEvents.endDate}, ${pubEvents.eventDate} + INTERVAL '12 hours') >= ${now}`
      ))
      .orderBy(asc(pubEvents.eventDate))
      .limit(limit);

    return results.map((row) => ({
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

  // Beer analytics
  async logBeerView(beerId: number, userId?: string): Promise<void> {
    await db.insert(beerViews).values({ beerId, userId: userId ?? null });
  }

  async getSimilarBeers(beerId: number, style: string, limit = 6): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT b.id, b.name, b.style, b.abv, b.image_url as "imageUrl",
             br.id as "breweryId", br.name as "breweryName", br.logo_url as "breweryLogoUrl"
      FROM beers b
      JOIN breweries br ON b.brewery_id = br.id
      WHERE b.style = ${style}
        AND b.id != ${beerId}
        AND b.is_hidden = false
        AND COALESCE(b.is_discontinued, false) = false
        AND COALESCE(br.is_closed, false) = false
      ORDER BY RANDOM()
      LIMIT ${limit}
    `);
    return result.rows as any[];
  }

  async getTrendingBeers(limit = 10, days = 7): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT b.id, b.name, b.style, b.abv, b.image_url as "imageUrl",
             br.id as "breweryId", br.name as "breweryName", br.logo_url as "breweryLogoUrl",
             COUNT(bv.id)::int as "viewCount"
      FROM beer_views bv
      JOIN beers b ON bv.beer_id = b.id
      JOIN breweries br ON b.brewery_id = br.id
      WHERE bv.viewed_at > NOW() - (${days} || ' days')::interval
        AND b.is_hidden = false
        AND COALESCE(b.is_discontinued, false) = false
        AND COALESCE(br.is_closed, false) = false
      GROUP BY b.id, b.name, b.style, b.abv, b.image_url, br.id, br.name, br.logo_url
      ORDER BY "viewCount" DESC
      LIMIT ${limit}
    `);
    return result.rows as any[];
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

  async getBreweriesForMap(): Promise<{ id: number; name: string; latitude: string; longitude: string; logoUrl: string | null; location: string; country: string | null }[]> {
    return this.dbCall(
      () => this.databaseStorage.getBreweriesForMap(),
      async () => {
        const all = await memoryStorageInstance.getBreweries();
        return (all as any[])
          .filter((b: any) => b.latitude && b.longitude)
          .map((b: any) => ({ id: b.id, name: b.name, latitude: b.latitude, longitude: b.longitude, logoUrl: b.logoUrl ?? null, location: b.location ?? '', country: b.country ?? null }));
      }
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

  async exploreBreweries(q: string, country: string, page: number, limit: number, excludeCountry?: string): Promise<{ breweries: any[]; total: number }> {
    return this.dbCall(
      () => this.databaseStorage.exploreBreweries(q, country, page, limit, excludeCountry),
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

  async getBottleListForOwner(pubId: number): Promise<any[]> {
    return this.dbCall(
      () => this.databaseStorage.getBottleListForOwner(pubId),
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

  // Drink items operations
  async getDrinkItems(pubId: number, includeHidden?: boolean): Promise<DrinkItem[]> {
    return this.dbCall(() => this.databaseStorage.getDrinkItems(pubId, includeHidden), async () => []);
  }
  async createDrinkItem(item: InsertDrinkItem): Promise<DrinkItem> {
    return this.dbCall(() => this.databaseStorage.createDrinkItem(item), async () => { throw new Error('Not implemented'); });
  }
  async updateDrinkItem(id: number, updates: Partial<InsertDrinkItem>): Promise<DrinkItem> {
    return this.dbCall(() => this.databaseStorage.updateDrinkItem(id, updates), async () => { throw new Error('Not implemented'); });
  }
  async deleteDrinkItem(id: number): Promise<void> {
    return this.dbCall(() => this.databaseStorage.deleteDrinkItem(id), async () => {});
  }
  async getDrinkCategoriesWithItems(pubId: number, includeHidden?: boolean): Promise<any[]> {
    return this.dbCall(() => this.databaseStorage.getDrinkCategoriesWithItems(pubId, includeHidden), async () => []);
  }
  async createDrinkCategory(data: InsertDrinkCategory): Promise<DrinkCategory> {
    return this.dbCall(() => this.databaseStorage.createDrinkCategory(data), async () => { throw new Error('Not implemented'); });
  }
  async updateDrinkCategory(id: number, updates: Partial<InsertDrinkCategory>): Promise<DrinkCategory> {
    return this.dbCall(() => this.databaseStorage.updateDrinkCategory(id, updates), async () => { throw new Error('Not implemented'); });
  }
  async deleteDrinkCategory(id: number): Promise<void> {
    return this.dbCall(() => this.databaseStorage.deleteDrinkCategory(id), async () => {});
  }
  async reorderDrinkCategories(order: { id: number; orderIndex: number }[]): Promise<void> {
    return this.dbCall(() => this.databaseStorage.reorderDrinkCategories(order), async () => {});
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

  async getPubRecentActivities(pubId: number, limit?: number): Promise<PubRecentActivity[]> {
    return this.dbCall(
      () => this.databaseStorage.getPubRecentActivities(pubId, limit),
      async () => { return []; }
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

  async getNotifications(userId: string, opts?: { type?: string | null; limit?: number; offset?: number }): Promise<Notification[]> {
    return this.dbCall(
      () => this.databaseStorage.getNotifications(userId, opts),
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

  // Native push token operations (FCM / APNs)
  async saveNativePushToken(userId: string, token: string, platform: string): Promise<void> {
    return this.dbCall(
      () => this.databaseStorage.saveNativePushToken(userId, token, platform),
      async () => {}
    );
  }

  async deleteNativePushToken(token: string): Promise<void> {
    return this.dbCall(
      () => this.databaseStorage.deleteNativePushToken(token),
      async () => {}
    );
  }

  async getNativePushTokensByUser(userId: string): Promise<NativePushToken[]> {
    return this.dbCall(
      () => this.databaseStorage.getNativePushTokensByUser(userId),
      async () => []
    );
  }

  async getAllNativePushTokens(): Promise<NativePushToken[]> {
    return this.dbCall(
      () => this.databaseStorage.getAllNativePushTokens(),
      async () => []
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

  // Beer analytics
  async logBeerView(beerId: number, userId?: string): Promise<void> {
    return this.dbCall(() => this.databaseStorage.logBeerView(beerId, userId), async () => {});
  }
  async getSimilarBeers(beerId: number, style: string, limit?: number): Promise<any[]> {
    return this.dbCall(() => this.databaseStorage.getSimilarBeers(beerId, style, limit), async () => []);
  }
  async getTrendingBeers(limit?: number, days?: number): Promise<any[]> {
    return this.dbCall(() => this.databaseStorage.getTrendingBeers(limit, days), async () => []);
  }

  // ── Admin / rating / profile delegations ──────────────────────────────────
  // These exist on DatabaseStorage but were never exposed on the wrapper, so
  // `storage.getAllUsers()` & co. resolved to undefined → runtime crash on the
  // admin/rating/profile routes that call them. Delegate like the methods above.
  async getAllUsers(): Promise<User[]> {
    return this.dbCall(() => this.databaseStorage.getAllUsers(), async () => []);
  }
  async getAllPubs(): Promise<Pub[]> {
    return this.dbCall(() => this.databaseStorage.getAllPubs(), async () => []);
  }
  async getAllBreweries(): Promise<Brewery[]> {
    return this.dbCall(() => this.databaseStorage.getAllBreweries(), async () => []);
  }
  async getAllBeers(): Promise<Beer[]> {
    return this.dbCall(() => this.databaseStorage.getAllBeers(), async () => []);
  }
  async addRating(rating: unknown): Promise<unknown> {
    return this.dbCall(
      () => this.databaseStorage.addRating(rating),
      async () => { throw new Error('Database unavailable'); },
    );
  }
  async getRatingsByPub(pubId: number): Promise<any[]> {
    return this.dbCall(() => this.databaseStorage.getRatingsByPub(pubId), async () => []);
  }
  async updateUserNickname(userId: string, nickname: string): Promise<User> {
    return this.dbCall(
      () => this.databaseStorage.updateUserNickname(userId, nickname),
      async () => { throw new Error('Database unavailable'); },
    );
  }
  async getUserBeerTasting(userId: string, beerId: number): Promise<UserBeerTasting | undefined> {
    return this.dbCall(() => this.databaseStorage.getUserBeerTasting(userId, beerId), async () => undefined);
  }
}

export const storage = new StorageWrapper();