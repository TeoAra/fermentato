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
  userActivities,
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
  type UserActivity,
  type InsertUserActivity,
  type Rating,
  type InsertRating,
  userBeerTastings,
  type UserBeerTasting,
  type InsertUserBeerTasting,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, like, ilike, and, or, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserType(userId: string, userType: 'customer' | 'pub_owner'): Promise<User>;

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
  getRandomBreweries(limit?: number): Promise<(Brewery & { beerCount: number })[]>;

  // Beer operations
  getBeers(): Promise<Beer[]>;
  getBeer(id: number): Promise<Beer | undefined>;
  getBeersByBrewery(breweryId: number): Promise<Beer[]>;
  createBeer(beer: InsertBeer): Promise<Beer>;
  searchBeers(query: string): Promise<Beer[]>;
  getBeerWithBrewery(id: number): Promise<(Beer & { brewery?: Brewery }) | undefined>;
  getBeerAvailability(beerId: number): Promise<{
    tapLocations: Array<{
      pub: Pub;
      tapItem: TapList;
    }>;
    bottleLocations: Array<{
      pub: Pub;
      bottleItem: BottleList;
    }>;
  }>;

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

  // Favorites operations (universal system)
  getUserFavorites(userId: string): Promise<Favorite[]>;
  getFavoritesByType(userId: string, itemType: 'pub' | 'brewery' | 'beer'): Promise<Favorite[]>;
  addFavorite(userId: string, itemType: string, itemId: number): Promise<Favorite>;
  removeFavorite(userId: string, itemType: string, itemId: number): Promise<void>;
  isFavorite(userId: string, itemType: 'pub' | 'brewery' | 'beer', itemId: number): Promise<boolean>;

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

  async updateUserType(userId: string, userType: 'customer' | 'pub_owner'): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ userType, updatedAt: new Date() })
      .where(eq(users.id, userId))
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

  async getRandomBreweries(limit: number = 4): Promise<(Brewery & { beerCount: number })[]> {
    // Solo birrifici che hanno almeno una birra
    const results = await db
      .select({
        id: breweries.id,
        name: breweries.name,
        location: breweries.location,
        region: breweries.region,
        description: breweries.description,
        logoUrl: breweries.logoUrl,
        websiteUrl: breweries.websiteUrl,
        latitude: breweries.latitude,
        longitude: breweries.longitude,
        rating: breweries.rating,
        createdAt: breweries.createdAt,
        beerCount: sql<number>`count(${beers.id})::int`,
      })
      .from(breweries)
      .innerJoin(beers, eq(breweries.id, beers.breweryId))
      .groupBy(breweries.id)
      .having(sql`count(${beers.id}) > 0`)
      .orderBy(sql`RANDOM()`)
      .limit(limit);

    return results;
  }

  // Beer operations
  async getBeers(): Promise<(Beer & { brewery: Brewery, breweryName: string })[]> {
    const results = await db
      .select({
        beer: beers,
        brewery: breweries,
      })
      .from(beers)
      .leftJoin(breweries, eq(beers.breweryId, breweries.id))
      .orderBy(asc(beers.name));

    return results.map(result => ({
      ...result.beer,
      brewery: result.brewery!,
      breweryName: result.brewery?.name || 'Birrificio Sconosciuto'
    }));
  }

  async getBeer(id: number): Promise<Beer | undefined> {
    const [beer] = await db.select().from(beers).where(eq(beers.id, id));
    return beer;
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

  async getBeerAvailability(beerId: number): Promise<{
    tapLocations: Array<{
      pub: Pub;
      tapItem: TapList;
    }>;
    bottleLocations: Array<{
      pub: Pub;
      bottleItem: BottleList;
    }>;
  }> {
    // Get tap locations
    const tapResults = await db
      .select()
      .from(tapList)
      .leftJoin(pubs, eq(tapList.pubId, pubs.id))
      .where(
        and(
          eq(tapList.beerId, beerId),
          eq(tapList.isActive, true),
          eq(tapList.isVisible, true)
        )
      );

    // Get bottle locations
    const bottleResults = await db
      .select()
      .from(bottleList)
      .leftJoin(pubs, eq(bottleList.pubId, pubs.id))
      .where(
        and(
          eq(bottleList.beerId, beerId),
          eq(bottleList.isActive, true),
          eq(bottleList.isVisible, true)
        )
      );

    return {
      tapLocations: tapResults
        .filter(result => result.pubs)
        .map(result => ({
          pub: result.pubs!,
          tapItem: result.tap_list,
        })),
      bottleLocations: bottleResults
        .filter(result => result.pubs)
        .map(result => ({
          pub: result.pubs!,
          bottleItem: result.bottle_list,
        })),
    };
  }

  async getBeersByBrewery(breweryId: number): Promise<Beer[]> {
    return await db.select().from(beers).where(eq(beers.breweryId, breweryId)).orderBy(asc(beers.name));
  }

  async createBeer(beerData: InsertBeer): Promise<Beer> {
    const [beer] = await db.insert(beers).values(beerData).returning();
    return beer;
  }

  async searchBeers(query: string): Promise<(Beer & { brewery: Brewery, breweryName: string })[]> {
    const results = await db
      .select({
        beer: beers,
        brewery: breweries,
      })
      .from(beers)
      .leftJoin(breweries, eq(beers.breweryId, breweries.id))
      .where(
        or(
          ilike(beers.name, `%${query}%`),
          ilike(beers.style, `%${query}%`),
          ilike(beers.description, `%${query}%`),
          ilike(breweries.name, `%${query}%`)
        )
      )
      .orderBy(asc(beers.name))
      .limit(50);

    return results.map(result => ({
      ...result.beer,
      brewery: result.brewery!,
      breweryName: result.brewery?.name || 'Birrificio Sconosciuto'
    }));
  }



  // Tap list operations
  async getTapListByPub(pubId: number): Promise<(TapList & { beer: Beer & { brewery: Brewery } })[]> {
    return await db
      .select()
      .from(tapList)
      .leftJoin(beers, eq(tapList.beerId, beers.id))
      .leftJoin(breweries, eq(beers.breweryId, breweries.id))
      .where(and(eq(tapList.pubId, pubId), eq(tapList.isActive, true), eq(tapList.isVisible, true)))
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

  async getTapListByPubForOwner(pubId: number): Promise<(TapList & { beer: Beer & { brewery: Brewery } })[]> {
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

  async addTapListItem(pubId: number, itemData: any): Promise<TapList> {
    console.log('Storage: Adding tap list item:', { pubId, itemData });
    
    // Convert price array to object if provided
    let pricesObj = null;
    if (itemData.prices && Array.isArray(itemData.prices)) {
      pricesObj = itemData.prices.reduce((acc: Record<string, number>, p: any) => {
        acc[p.size] = parseFloat(p.price);
        return acc;
      }, {});
    }
    
    const [item] = await db
      .insert(tapList)
      .values({
        pubId,
        beerId: itemData.beerId,
        priceSmall: itemData.priceSmall ? itemData.priceSmall.toString() : null,
        priceMedium: itemData.priceMedium ? itemData.priceMedium.toString() : null,
        prices: pricesObj,
        isActive: itemData.isActive,
        isVisible: itemData.isVisible,
        tapNumber: itemData.position || 1,
        description: itemData.notes || null
      })
      .returning();
    
    console.log('Storage: Tap list item created:', item);
    return item;
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
    await db.delete(tapList).where(eq(tapList.id, id));
  }

  async updateTapListItem(id: number, data: any): Promise<TapList> {
    console.log('Storage: Updating tap list item:', { id, data });
    
    // Convert price array to object if provided
    let updateData = { ...data };
    if (data.prices && Array.isArray(data.prices)) {
      updateData.prices = data.prices.reduce((acc: Record<string, number>, p: any) => {
        acc[p.size] = parseFloat(p.price);
        return acc;
      }, {});
    }
    
    const [item] = await db
      .update(tapList)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(tapList.id, id))
      .returning();
    
    console.log('Storage: Updated tap list item result:', item);
    return item;
  }

  async removeTapListItem(id: number): Promise<void> {
    console.log('Storage: Removing tap list item:', id);
    
    await db.delete(tapList).where(eq(tapList.id, id));
    
    console.log('Storage: Removed tap list item:', id);
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
    await db.delete(bottleList).where(eq(bottleList.id, id));
  }

  // Menu category CRUD operations
  async createMenuCategory(pubId: number, categoryData: any): Promise<any> {
    const [category] = await db.insert(menuCategories).values({
      pubId,
      name: categoryData.name || 'Nuova Categoria',
      description: categoryData.description || null,
      isVisible: categoryData.isVisible !== false,
      orderIndex: categoryData.orderIndex || 0
    }).returning();
    return category;
  }

  async updateMenuCategory(id: number, categoryData: any): Promise<any> {
    const [category] = await db
      .update(menuCategories)
      .set({
        name: categoryData.name,
        description: categoryData.description,
        isVisible: categoryData.isVisible,
        orderIndex: categoryData.orderIndex
      })
      .where(eq(menuCategories.id, id))
      .returning();
    return category;
  }

  async deleteMenuCategory(id: number): Promise<void> {
    // First delete all items in this category
    await db.delete(menuItems).where(eq(menuItems.categoryId, id));
    // Then delete the category
    await db.delete(menuCategories).where(eq(menuCategories.id, id));
  }

  // Menu item CRUD operations
  async createMenuItem(categoryId: number, itemData: any): Promise<any> {
    const [item] = await db.insert(menuItems).values({
      categoryId,
      name: itemData.name || 'Nuovo Prodotto',
      description: itemData.description || null,
      price: itemData.price || '0.00',
      allergens: itemData.allergens || null,
      isVisible: itemData.isVisible !== false,
      isAvailable: itemData.isAvailable !== false,
      imageUrl: itemData.imageUrl || null,
      orderIndex: itemData.orderIndex || 0
    }).returning();
    return item;
  }

  async updateMenuItem(id: number, itemData: any): Promise<any> {
    const [item] = await db
      .update(menuItems)
      .set({
        name: itemData.name,
        description: itemData.description,
        price: itemData.price,
        allergens: itemData.allergens,
        isVisible: itemData.isVisible,
        isAvailable: itemData.isAvailable,
        imageUrl: itemData.imageUrl,
        orderIndex: itemData.orderIndex
      })
      .where(eq(menuItems.id, id))
      .returning();
    return item;
  }

  async deleteMenuItem(id: number): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  // Favorites operations
  async getUserFavorites(userId: string): Promise<Favorite[]> {
    return await db.select().from(favorites).where(eq(favorites.userId, userId));
  }

  async getFavoritesByType(userId: string, itemType: 'pub' | 'brewery' | 'beer'): Promise<Favorite[]> {
    return await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.itemType, itemType)));
  }

  async addFavorite(userId: string, itemType: string, itemId: number): Promise<Favorite> {
    const [favorite] = await db
      .insert(favorites)
      .values({
        userId,
        itemType,
        itemId,
      })
      .onConflictDoNothing()
      .returning();
    return favorite;
  }

  async removeFavorite(userId: string, itemType: string, itemId: number): Promise<void> {
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

  // Favorites operations (universal system)
  async getFavoritesByUser(userId: string): Promise<any[]> {
    console.log('Getting favorites for user:', userId);
    const userFavorites = await db.select().from(favorites).where(eq(favorites.userId, userId));
    console.log('Raw favorites from DB:', userFavorites);
    
    // Get names for each favorite item
    const favoritesWithNames = await Promise.all(
      userFavorites.map(async (favorite) => {
        let itemName = '';
        try {
          if (favorite.itemType === 'pub') {
            const pub = await this.getPub(parseInt(favorite.itemId));
            itemName = pub?.name || `Pub #${favorite.itemId}`;
          } else if (favorite.itemType === 'brewery') {
            const brewery = await this.getBrewery(parseInt(favorite.itemId));
            itemName = brewery?.name || `Birrificio #${favorite.itemId}`;
          } else if (favorite.itemType === 'beer') {
            const beer = await this.getBeer(parseInt(favorite.itemId));
            if (beer) {
              // Get brewery name for the beer
              const brewery = beer.breweryId ? await this.getBrewery(beer.breweryId) : null;
              itemName = brewery ? `${beer.name} - ${brewery.name}` : beer.name;
            } else {
              itemName = `Birra #${favorite.itemId}`;
            }
          }
        } catch (error) {
          console.error('Error getting item name for favorite:', error);
          // Fallback to ID if item not found
          itemName = `${favorite.itemType} #${favorite.itemId}`;
        }
        
        console.log('Favorite with name:', { ...favorite, itemName });
        return {
          ...favorite,
          itemName
        };
      })
    );
    
    console.log('Final favorites with names:', favoritesWithNames);
    return favoritesWithNames;
  }

  async getFavoritesByType(userId: string, itemType: 'pub' | 'brewery' | 'beer'): Promise<Favorite[]> {
    return await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.itemType, itemType)));
  }

  async addFavorite(favoriteData: InsertFavorite): Promise<Favorite> {
    // Add user activity
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

  // User profile operations
  async updateUserProfile(userId: string, updates: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Admin operations
  async getUserCount(): Promise<number> {
    const result = await db.select({ count: sql`count(*)`.mapWith(Number) }).from(users);
    return result[0].count;
  }

  async getPubCount(): Promise<number> {
    const result = await db.select({ count: sql`count(*)`.mapWith(Number) }).from(pubs);
    return result[0].count;
  }

  async getBreweryCount(): Promise<number> {
    const result = await db.select({ count: sql`count(*)`.mapWith(Number) }).from(breweries);
    return result[0].count;
  }

  async getBeerCount(): Promise<number> {
    const result = await db.select({ count: sql`count(*)`.mapWith(Number) }).from(beers);
    return result[0].count;
  }

  async getBeerCountByBrewery(breweryId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(beers)
      .where(eq(beers.breweryId, breweryId));
    
    return result[0]?.count || 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  // User beer tastings operations
  async getUserBeerTastings(userId: string): Promise<any[]> {
    const tastings = await db
      .select({
        id: userBeerTastings.id,
        beerId: userBeerTastings.beerId,
        rating: userBeerTastings.rating,
        personalNotes: userBeerTastings.personalNotes,
        tastedAt: userBeerTastings.tastedAt,
        pubId: userBeerTastings.pubId,
        beer: {
          id: beers.id,
          name: beers.name,
          style: beers.style,
          abv: beers.abv,
          imageUrl: beers.imageUrl
        },
        brewery: {
          id: breweries.id,
          name: breweries.name
        },
        pub: {
          id: pubs.id,
          name: pubs.name
        }
      })
      .from(userBeerTastings)
      .leftJoin(beers, eq(userBeerTastings.beerId, beers.id))
      .leftJoin(breweries, eq(beers.breweryId, breweries.id))
      .leftJoin(pubs, eq(userBeerTastings.pubId, pubs.id))
      .where(eq(userBeerTastings.userId, userId))
      .orderBy(desc(userBeerTastings.tastedAt));

    return tastings;
  }

  async addBeerTasting(tastingData: InsertUserBeerTasting): Promise<UserBeerTasting> {
    const [tasting] = await db.insert(userBeerTastings).values(tastingData).returning();
    
    // Add user activity
    await this.addUserActivity({
      userId: tastingData.userId,
      activityType: 'beer_tasted',
      itemType: 'beer',
      itemId: tastingData.beerId,
      description: `Assaggiata nuova birra`,
    });

    return tasting;
  }

  async updateBeerTasting(tastingId: number, userId: string, updates: Partial<InsertUserBeerTasting>): Promise<UserBeerTasting> {
    const [tasting] = await db
      .update(userBeerTastings)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(userBeerTastings.id, tastingId), eq(userBeerTastings.userId, userId)))
      .returning();
    return tasting;
  }

  async removeBeerTasting(userId: string, beerId: number): Promise<void> {
    await db
      .delete(userBeerTastings)
      .where(and(eq(userBeerTastings.userId, userId), eq(userBeerTastings.beerId, beerId)));
  }

  async getBeerTasting(userId: string, beerId: number): Promise<UserBeerTasting | undefined> {
    const [tasting] = await db
      .select()
      .from(userBeerTastings)
      .where(and(eq(userBeerTastings.userId, userId), eq(userBeerTastings.beerId, beerId)));
    return tasting;
  }

  async getAllPubs(): Promise<Pub[]> {
    return await db.select().from(pubs).orderBy(desc(pubs.createdAt));
  }

  async getAllBreweries(): Promise<Brewery[]> {
    return await db.select().from(breweries).orderBy(desc(breweries.createdAt));
  }

  async getAllBeers(): Promise<Beer[]> {
    return await db.select().from(beers).orderBy(desc(beers.id)).limit(100);
  }

  async updateBeer(beerId: number, updates: Partial<InsertBeer>): Promise<Beer> {
    const [beer] = await db
      .update(beers)
      .set(updates)
      .where(eq(beers.id, beerId))
      .returning();
    return beer;
  }

  async updateBrewery(breweryId: number, updates: Partial<InsertBrewery>): Promise<Brewery> {
    const [brewery] = await db
      .update(breweries)
      .set(updates)
      .where(eq(breweries.id, breweryId))
      .returning();
    return brewery;
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

    // Get brewery info for beers - usa il metodo aggiornato searchBeers
    const beersWithBrewery = beerResults;

    return {
      pubs: pubResults,
      breweries: breweryResults,
      beers: beersWithBrewery,
    };
  }


}

export const storage = new DatabaseStorage();
