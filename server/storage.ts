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
  getTapList(pubId: number): Promise<TapList[]>;
  getTapListByPubForOwner(pubId: number): Promise<any[]>;
  addToTapList(item: InsertTapList): Promise<TapList>;
  updateTapListItem(id: number, updates: Partial<InsertTapList>): Promise<TapList>;
  removeFromTapList(id: number): Promise<void>;

  // Bottle list operations
  getBottleList(pubId: number): Promise<BottleList[]>;
  addToBottleList(item: InsertBottleList): Promise<BottleList>;
  updateBottleListItem(id: number, updates: Partial<InsertBottleList>): Promise<BottleList>;
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
  async getTapList(pubId: number): Promise<any[]> {
    const results = await db
      .select({
        id: tapList.id,
        pubId: tapList.pubId,
        beerId: tapList.beerId,
        isActive: tapList.isActive,
        priceSmall: tapList.priceSmall,
        priceMedium: tapList.priceMedium,
        priceLarge: tapList.priceLarge,
        description: tapList.description,
        tapNumber: tapList.tapNumber,
        addedAt: tapList.addedAt,
        updatedAt: tapList.updatedAt,
        beerName: beers.name,
        beerStyle: beers.style,
        beerAbv: beers.abv,
        beerIbu: beers.ibu,
        beerDescription: beers.description,
        beerImageUrl: beers.imageUrl,
        beerBottleImageUrl: beers.bottleImageUrl,
        breweryId: breweries.id,
        breweryName: breweries.name,
        breweryLogoUrl: breweries.logoUrl,
        breweryCountry: breweries.country,
        breweryRegion: breweries.region,
      })
      .from(tapList)
      .innerJoin(beers, eq(tapList.beerId, beers.id))
      .leftJoin(breweries, eq(beers.breweryId, breweries.id))
      .where(eq(tapList.pubId, pubId))
      .orderBy(asc(tapList.tapNumber));

    return results.map(row => ({
      id: row.id,
      pubId: row.pubId,
      beerId: row.beerId,
      isActive: row.isActive,
      priceSmall: row.priceSmall,
      priceMedium: row.priceMedium,
      priceLarge: row.priceLarge,
      description: row.description,
      tapNumber: row.tapNumber,
      addedAt: row.addedAt,
      updatedAt: row.updatedAt,
      beer: {
        id: row.beerId,
        name: row.beerName,
        style: row.beerStyle,
        abv: row.beerAbv,
        ibu: row.beerIbu,
        description: row.beerDescription,
        imageUrl: row.beerImageUrl,
        bottleImageUrl: row.beerBottleImageUrl,
        brewery: {
          id: row.breweryId,
          name: row.breweryName,
          logoUrl: row.breweryLogoUrl,
          country: row.breweryCountry,
          region: row.breweryRegion,
        }
      }
    }));
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
        addedAt: tapList.addedAt,
        updatedAt: tapList.updatedAt,
        beerName: beers.name,
        beerStyle: beers.style,
        beerAbv: beers.abv,
        beerIbu: beers.ibu,
        beerDescription: beers.description,
        beerImageUrl: beers.imageUrl,
        beerBottleImageUrl: beers.bottleImageUrl,
        breweryId: breweries.id,
        breweryName: breweries.name,
        breweryLogoUrl: breweries.logoUrl,
        breweryCountry: breweries.country,
        breweryRegion: breweries.region,
      })
      .from(tapList)
      .leftJoin(beers, eq(tapList.beerId, beers.id))
      .leftJoin(breweries, eq(beers.breweryId, breweries.id))
      .where(eq(tapList.pubId, pubId))
      .orderBy(asc(tapList.tapNumber));

    return results.map(row => ({
      id: row.id,
      pubId: row.pubId,
      beerId: row.beerId,
      isActive: row.isActive,
      isVisible: row.isVisible,
      prices: row.prices,
      priceSmall: row.priceSmall,
      priceMedium: row.priceMedium,
      priceLarge: row.priceLarge,
      notes: row.description,
      tapNumber: row.tapNumber,
      addedAt: row.addedAt,
      updatedAt: row.updatedAt,
      beer: {
        id: row.beerId,
        name: row.beerName,
        style: row.beerStyle,
        abv: row.beerAbv,
        ibu: row.beerIbu,
        description: row.beerDescription,
        imageUrl: row.beerImageUrl,
        bottleImageUrl: row.beerBottleImageUrl,
        brewery: {
          id: row.breweryId,
          name: row.breweryName,
          logoUrl: row.breweryLogoUrl,
          country: row.breweryCountry,
          region: row.breweryRegion,
        }
      }
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
  async getBottleList(pubId: number): Promise<BottleList[]> {
    const results = await db
      .select()
      .from(bottleList)
      .where(eq(bottleList.pubId, pubId))
      .orderBy(asc(bottleList.id));

    return results;
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

  async removeBeerFromBottles(id: number): Promise<void> {
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

  async getMenuByPub(pubId: number): Promise<any[]> {
    const categories = await db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.pubId, pubId));

    const items = await db
      .select()
      .from(menuItems)
      .leftJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
      .where(eq(menuCategories.pubId, pubId));

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
    await db.delete(menuCategories).where(eq(menuCategories.id, id));
  }

  async getMenuItems(categoryId: number): Promise<MenuItem[]> {
    return await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.categoryId, categoryId))
      .orderBy(asc(menuItems.orderIndex));
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
      .orderBy(asc(pubSizes.orderIndex));
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
  async getUserBeerTastings(userId: string): Promise<any[]> {
    const results = await db
      .select({
        id: userBeerTastings.id,
        userId: userBeerTastings.userId,
        beerId: userBeerTastings.beerId,
        rating: userBeerTastings.rating,
        personalNotes: userBeerTastings.personalNotes,
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
      })
      .from(userBeerTastings)
      .innerJoin(beers, eq(userBeerTastings.beerId, beers.id))
      .leftJoin(breweries, eq(beers.breweryId, breweries.id))
      .where(eq(userBeerTastings.userId, userId))
      .orderBy(desc(userBeerTastings.tastedAt));

    return results.map(row => ({
      id: row.id,
      userId: row.userId,
      beerId: row.beerId,
      rating: row.rating,
      personalNotes: row.personalNotes,
      tastedAt: row.tastedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      pubId: row.pubId,
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

  async updateUserType(userId: string, userType: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ userType, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getBeerWithBrewery(id: number): Promise<any> {
    const [result] = await db
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
        breweryCountry: breweries.country,
      })
      .from(beers)
      .leftJoin(breweries, eq(beers.breweryId, breweries.id))
      .where(eq(beers.id, id));
    return result;
  }

  async getBeerAvailability(beerId: number): Promise<any[]> {
    const tapAvailability = await db
      .select({
        type: sql<string>`'tap'`,
        pubId: tapList.pubId,
        pubName: pubs.name,
        isActive: tapList.isActive,
      })
      .from(tapList)
      .leftJoin(pubs, eq(tapList.pubId, pubs.id))
      .where(eq(tapList.beerId, beerId));

    const bottleAvailability = await db
      .select({
        type: sql<string>`'bottle'`,
        pubId: bottleList.pubId,
        pubName: pubs.name,
        isActive: bottleList.isActive,
      })
      .from(bottleList)
      .leftJoin(pubs, eq(bottleList.pubId, pubs.id))
      .where(eq(bottleList.beerId, beerId));

    return [...tapAvailability, ...bottleAvailability];
  }

  async addRating(rating: any): Promise<any> {
    // Placeholder - implement based on ratings schema
    return rating;
  }

  async getRatingsByPub(pubId: number): Promise<any[]> {
    // Placeholder - implement based on ratings schema
    return [];
  }

  async removeBeerTasting(id: number): Promise<void> {
    await db.delete(userBeerTastings).where(eq(userBeerTastings.id, id));
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
}

export const storage = new DatabaseStorage();