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
  favorites,
  userActivities,
  userBeerTastings,
  type User,
  type UpsertUser,
  type Pub,
  type InsertPub,
  type Brewery,
  type InsertBrewery,
  type Beer,
  type InsertBeer,
  type TapListItem,
  type InsertTapListItem,
  type BottleListItem,
  type InsertBottleListItem,
  type PubSize,
  type InsertPubSize,
  type MenuCategory,
  type InsertMenuCategory,
  type MenuItem,
  type InsertMenuItem,
  type Favorite,
  type InsertFavorite,
  type UserActivity,
  type InsertUserActivity,
  type UserBeerTasting,
  type InsertUserBeerTasting,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, like, inArray, sql, or, asc, ilike } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User>;

  // Pub operations
  getPubs(): Promise<Pub[]>;
  getPub(id: number): Promise<Pub | undefined>;
  createPub(pub: InsertPub): Promise<Pub>;
  updatePub(id: number, updates: Partial<InsertPub>): Promise<Pub>;
  deletePub(id: number): Promise<void>;
  getPubsByOwner(ownerId: string): Promise<Pub[]>;

  // Brewery operations
  getBreweries(): Promise<Brewery[]>;
  getBrewery(id: number): Promise<Brewery | undefined>;
  createBrewery(brewery: InsertBrewery): Promise<Brewery>;
  updateBrewery(id: number, updates: Partial<InsertBrewery>): Promise<Brewery>;
  deleteBrewery(id: number): Promise<void>;

  // Beer operations
  getBeers(): Promise<Beer[]>;
  getBeer(id: number): Promise<Beer | undefined>;
  createBeer(beer: InsertBeer): Promise<Beer>;
  updateBeer(id: number, updates: Partial<InsertBeer>): Promise<Beer>;
  deleteBeer(id: number): Promise<void>;
  getBeersByBrewery(breweryId: number): Promise<Beer[]>;
  searchBeers(query: string): Promise<Beer[]>;

  // Tap list operations
  getTapList(pubId: number): Promise<TapListItem[]>;
  getTapListByPubForOwner(pubId: number): Promise<TapListItem[]>;
  addToTapList(item: InsertTapListItem): Promise<TapListItem>;
  updateTapListItem(id: number, updates: Partial<InsertTapListItem>): Promise<TapListItem>;
  removeFromTapList(id: number): Promise<void>;

  // Bottle list operations
  getBottleList(pubId: number): Promise<BottleListItem[]>;
  addToBottleList(item: InsertBottleListItem): Promise<BottleListItem>;
  updateBottleListItem(id: number, updates: Partial<InsertBottleListItem>): Promise<BottleListItem>;
  removeFromBottleList(id: number): Promise<void>;

  // Menu operations
  getMenuCategories(pubId: number): Promise<MenuCategory[]>;
  getMenuByPub(pubId: number): Promise<any[]>;
  createMenuCategory(category: InsertMenuCategory): Promise<MenuCategory>;
  updateMenuCategory(id: number, updates: Partial<InsertMenuCategory>): Promise<MenuCategory>;
  deleteMenuCategory(id: number): Promise<void>;
  getMenuItems(categoryId: number): Promise<MenuItem[]>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, updates: Partial<InsertMenuItem>): Promise<MenuItem>;
  deleteMenuItem(id: number): Promise<void>;

  // Pub sizes operations
  getPubSizes(pubId: number): Promise<PubSize[]>;
  createPubSize(size: InsertPubSize): Promise<PubSize>;
  updatePubSize(id: number, updates: Partial<InsertPubSize>): Promise<PubSize>;
  deletePubSize(id: number): Promise<void>;

  // Favorites operations
  getUserFavorites(userId: string): Promise<any[]>;
  getFavoritesByType(userId: string, itemType: 'pub' | 'brewery' | 'beer'): Promise<Favorite[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: string, itemType: 'pub' | 'brewery' | 'beer', itemId: number): Promise<void>;
  removeFavoriteById(userId: string, favoriteId: number): Promise<void>;
  isFavorite(userId: string, itemType: 'pub' | 'brewery' | 'beer', itemId: number): Promise<boolean>;

  // User activities operations
  getUserActivities(userId: string, limit?: number): Promise<UserActivity[]>;
  addUserActivity(activity: InsertUserActivity): Promise<UserActivity>;

  // Beer tastings operations
  getUserBeerTastings(userId: string): Promise<UserBeerTasting[]>;
  addBeerTasting(tasting: InsertUserBeerTasting): Promise<UserBeerTasting>;
  updateBeerTasting(id: number, updates: Partial<InsertUserBeerTasting>): Promise<UserBeerTasting>;
  deleteBeerTasting(id: number): Promise<void>;
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

  // Pub operations
  async getPubs(): Promise<Pub[]> {
    return await db.select().from(pubs).orderBy(asc(pubs.name));
  }

  async getPub(id: number): Promise<Pub | undefined> {
    const [pub] = await db.select().from(pubs).where(eq(pubs.id, id));
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

  // Brewery operations
  async getBreweries(): Promise<Brewery[]> {
    return await db.select().from(breweries).orderBy(asc(breweries.name));
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
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(breweries.id, id))
      .returning();
    return brewery;
  }

  async deleteBrewery(id: number): Promise<void> {
    await db.delete(breweries).where(eq(breweries.id, id));
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
      .set({ ...updates, updatedAt: new Date() })
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

  async searchBeers(query: string): Promise<Beer[]> {
    return await db
      .select()
      .from(beers)
      .where(ilike(beers.name, `%${query}%`))
      .orderBy(asc(beers.name));
  }

  // Tap list operations
  async getTapList(pubId: number): Promise<TapListItem[]> {
    return await db
      .select({
        id: tapList.id,
        pubId: tapList.pubId,
        beerId: tapList.beerId,
        isAvailable: tapList.isAvailable,
        priceSmall: tapList.priceSmall,
        priceMedium: tapList.priceMedium,
        priceLarge: tapList.priceLarge,
        notes: tapList.notes,
        tapNumber: tapList.tapNumber,
        createdAt: tapList.createdAt,
        updatedAt: tapList.updatedAt,
        beer: beers,
      })
      .from(tapList)
      .innerJoin(beers, eq(tapList.beerId, beers.id))
      .where(eq(tapList.pubId, pubId))
      .orderBy(asc(tapList.tapNumber));
  }

  async getTapListByPubForOwner(pubId: number): Promise<any[]> {
    return await db
      .select({
        id: tapList.id,
        pubId: tapList.pubId,
        beerId: tapList.beerId,
        isAvailable: tapList.isAvailable,
        isVisible: tapList.isVisible,
        prices: tapList.prices,
        notes: tapList.notes,
        tapNumber: tapList.tapNumber,
        position: tapList.position,
        createdAt: tapList.createdAt,
        updatedAt: tapList.updatedAt,
        beer: {
          id: beers.id,
          name: beers.name,
          style: beers.style,
          abv: beers.abv,
          ibu: beers.ibu,
          description: beers.description,
          imageUrl: beers.imageUrl,
          bottleImageUrl: beers.bottleImageUrl,
          brewery: {
            id: breweries.id,
            name: breweries.name,
            logoUrl: breweries.logoUrl,
            country: breweries.country,
            region: breweries.region,
          }
        }
      })
      .from(tapList)
      .innerJoin(beers, eq(tapList.beerId, beers.id))
      .innerJoin(breweries, eq(beers.breweryId, breweries.id))
      .where(eq(tapList.pubId, pubId))
      .orderBy(asc(tapList.position));
  }

  async addToTapList(item: InsertTapListItem): Promise<TapListItem> {
    const [tapItem] = await db.insert(tapList).values(item).returning();
    return tapItem;
  }

  async updateTapListItem(id: number, updates: Partial<InsertTapListItem>): Promise<TapListItem> {
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

  // Bottle list operations
  async getBottleList(pubId: number): Promise<BottleListItem[]> {
    return await db
      .select({
        id: bottleList.id,
        pubId: bottleList.pubId,
        beerId: bottleList.beerId,
        isAvailable: bottleList.isAvailable,
        price330ml: bottleList.price330ml,
        price500ml: bottleList.price500ml,
        price750ml: bottleList.price750ml,
        notes: bottleList.notes,
        createdAt: bottleList.createdAt,
        updatedAt: bottleList.updatedAt,
        beer: beers,
      })
      .from(bottleList)
      .innerJoin(beers, eq(bottleList.beerId, beers.id))
      .where(eq(bottleList.pubId, pubId))
      .orderBy(asc(beers.name));
  }

  async addToBottleList(item: InsertBottleListItem): Promise<BottleListItem> {
    const [bottleItem] = await db.insert(bottleList).values(item).returning();
    return bottleItem;
  }

  async updateBottleListItem(id: number, updates: Partial<InsertBottleListItem>): Promise<BottleListItem> {
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

  // Menu operations
  async getMenuCategories(pubId: number): Promise<MenuCategory[]> {
    return await db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.pubId, pubId))
      .orderBy(asc(menuCategories.displayOrder));
  }

  async getMenuByPub(pubId: number): Promise<any[]> {
    const categories = await db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.pubId, pubId))
      .orderBy(asc(menuCategories.displayOrder));

    const items = await db
      .select()
      .from(menuItems)
      .leftJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
      .where(eq(menuCategories.pubId, pubId))
      .orderBy(asc(menuItems.displayOrder));

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
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(menuCategories.id, id))
      .returning();
    return category;
  }

  async deleteMenuCategory(id: number): Promise<void> {
    await db.delete(menuCategories).where(eq(menuCategories.id, id));
  }

  async getMenuItems(categoryId: number): Promise<MenuItem[]> {
    return await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.categoryId, categoryId))
      .orderBy(asc(menuItems.displayOrder));
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

  // Pub sizes operations
  async getPubSizes(pubId: number): Promise<PubSize[]> {
    return await db
      .select()
      .from(pubSizes)
      .where(eq(pubSizes.pubId, pubId))
      .orderBy(asc(pubSizes.volume));
  }

  async createPubSize(sizeData: InsertPubSize): Promise<PubSize> {
    const [size] = await db.insert(pubSizes).values(sizeData).returning();
    return size;
  }

  async updatePubSize(id: number, updates: Partial<InsertPubSize>): Promise<PubSize> {
    const [size] = await db
      .update(pubSizes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pubSizes.id, id))
      .returning();
    return size;
  }

  async deletePubSize(id: number): Promise<void> {
    await db.delete(pubSizes).where(eq(pubSizes.id, id));
  }

  // Favorites operations
  async getUserFavorites(userId: string): Promise<any[]> {
    console.log("Raw favorites from DB:", await db.select().from(favorites).where(eq(favorites.userId, userId)));
    
    const userFavorites = await db
      .select()
      .from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));

    const enrichedFavorites = [];
    
    for (const favorite of userFavorites) {
      let itemName = `${favorite.itemType} #${favorite.itemId}`;
      
      if (favorite.itemType === 'pub') {
        const [pub] = await db.select({ name: pubs.name }).from(pubs).where(eq(pubs.id, favorite.itemId));
        if (pub) itemName = pub.name;
      } else if (favorite.itemType === 'brewery') {
        const [brewery] = await db.select({ name: breweries.name }).from(breweries).where(eq(breweries.id, favorite.itemId));
        if (brewery) itemName = brewery.name;
      } else if (favorite.itemType === 'beer') {
        const [beer] = await db.select({ name: beers.name }).from(beers).where(eq(beers.id, favorite.itemId));
        if (beer) itemName = beer.name;
      }
      
      enrichedFavorites.push({
        ...favorite,
        itemName
      });
    }
    
    console.log("Enriched favorites:", enrichedFavorites);
    return enrichedFavorites;
  }

  async getFavoritesByType(userId: string, itemType: 'pub' | 'brewery' | 'beer'): Promise<Favorite[]> {
    return await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.itemType, itemType)))
      .orderBy(desc(favorites.createdAt));
  }

  async addFavorite(favoriteData: InsertFavorite): Promise<Favorite> {
    await this.addUserActivity({
      userId: favoriteData.userId,
      activityType: 'favorite_added',
      itemType: favoriteData.itemType,
      itemId: favoriteData.itemId,
      description: `Aggiunto ${favoriteData.itemType} ai preferiti`,
    });

    const [favorite] = await db.insert(favorites).values(favoriteData).returning();
    return favorite;
  }

  async removeFavorite(userId: string, itemType: 'pub' | 'brewery' | 'beer', itemId: number): Promise<void> {
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

  async isFavorite(userId: string, itemType: 'pub' | 'brewery' | 'beer', itemId: number): Promise<boolean> {
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
  async getUserBeerTastings(userId: string): Promise<UserBeerTasting[]> {
    return await db
      .select({
        id: userBeerTastings.id,
        userId: userBeerTastings.userId,
        beerId: userBeerTastings.beerId,
        rating: userBeerTastings.rating,
        notes: userBeerTastings.notes,
        tastedAt: userBeerTastings.tastedAt,
        createdAt: userBeerTastings.createdAt,
        updatedAt: userBeerTastings.updatedAt,
        beer: beers,
      })
      .from(userBeerTastings)
      .innerJoin(beers, eq(userBeerTastings.beerId, beers.id))
      .where(eq(userBeerTastings.userId, userId))
      .orderBy(desc(userBeerTastings.tastedAt));
  }

  async addBeerTasting(tastingData: InsertUserBeerTasting): Promise<UserBeerTasting> {
    const [tasting] = await db.insert(userBeerTastings).values(tastingData).returning();
    return tasting;
  }

  async updateBeerTasting(id: number, updates: Partial<InsertUserBeerTasting>): Promise<UserBeerTasting> {
    const [tasting] = await db
      .update(userBeerTastings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userBeerTastings.id, id))
      .returning();
    return tasting;
  }

  async deleteBeerTasting(id: number): Promise<void> {
    await db.delete(userBeerTastings).where(eq(userBeerTastings.id, id));
  }

  // Search methods
  async searchPubs(query: string): Promise<Pub[]> {
    const allPubs = await this.getPubs();
    return allPubs.filter(pub => 
      pub.name.toLowerCase().includes(query.toLowerCase()) ||
      pub.address?.toLowerCase().includes(query.toLowerCase()) ||
      pub.city?.toLowerCase().includes(query.toLowerCase())
    );
  }

  async searchBreweries(query: string): Promise<Brewery[]> {
    const allBreweries = await this.getBreweries();
    return allBreweries.filter(brewery => 
      brewery.name.toLowerCase().includes(query.toLowerCase()) ||
      brewery.location?.toLowerCase().includes(query.toLowerCase())
    );
  }

  async searchBeers(query: string): Promise<Beer[]> {
    const allBeers = await this.getBeers();
    return allBeers.filter(beer => 
      beer.name.toLowerCase().includes(query.toLowerCase()) ||
      beer.style?.toLowerCase().includes(query.toLowerCase())
    );
  }
}

export const storage = new DatabaseStorage();