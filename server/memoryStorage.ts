import type {
  User,
  UpsertUser,
  Pub,
  InsertPub,
  Brewery,
  InsertBrewery,
  Beer,
  InsertBeer,
  TapList,
  InsertTapList,
  BottleList,
  InsertBottleList,
  MenuCategory,
  InsertMenuCategory,
  MenuItem,
  InsertMenuItem
} from "@shared/schema";

// In-memory storage per quando il database è disabilitato
export class MemoryStorage {
  private users = new Map<string, User>();
  private pubs = new Map<number, Pub>();
  private breweries = new Map<number, Brewery>();
  private beers = new Map<number, Beer>();
  private tapLists = new Map<number, TapList>();
  private bottleLists = new Map<number, BottleList>();
  private menuCategories = new Map<number, MenuCategory>();
  private menuItems = new Map<number, MenuItem>();
  
  private idCounters = {
    pub: 1,
    brewery: 1,
    beer: 1,
    tapList: 1,
    bottleList: 1,
    menuCategory: 1,
    menuItem: 1
  };

  constructor() {
    // Inizializza con alcuni dati demo
    this.initializeDemoData();
  }

  private initializeDemoData() {
    // Crea brewery demo
    const demoBrewery: Brewery = {
      id: 1,
      name: "Birrificio Demo",
      description: "Birrificio di esempio per testing",
      descriptionHtml: null,
      location: "Milano, Italia",
      region: "Lombardia",
      country: "Italia",
      logoUrl: null,
      coverImageUrl: null,
      websiteUrl: "https://demo.brewery.com",
      email: null,
      vatNumber: null,
      phone: null,
      instagramUrl: null,
      facebookUrl: null,
      tiktokUrl: null,
      latitude: null,
      longitude: null,
      rating: "0",
      isClosed: false,
      closedSource: null,
      closedAt: null,
      createdAt: new Date()
    };
    this.breweries.set(1, demoBrewery);

    // Crea beers demo
    const demoBeer1: Beer = {
      id: 1,
      name: "Demo IPA",
      breweryId: 1,
      style: "IPA",
      abv: "6.5",
      ibu: 45,
      description: "Una IPA demo per testing",
      imageUrl: null,
      logoUrl: null,
      color: null,
      isBottled: null,
      isGlutenFree: false,
      isAlcoholFree: false,
      isCollaboration: false,
      isHidden: false,
      isDiscontinued: false,
      discontinuedSource: null,
      barcode: null,
      awards: null,
      createdAt: new Date()
    };
    
    const demoBeer2: Beer = {
      id: 2,
      name: "Demo Lager",
      breweryId: 1,
      style: "Lager",
      abv: "4.8",
      ibu: 25,
      description: "Una Lager demo per testing",
      imageUrl: null,
      logoUrl: null,
      color: null,
      isBottled: null,
      isGlutenFree: false,
      isAlcoholFree: false,
      isCollaboration: false,
      isHidden: false,
      isDiscontinued: false,
      discontinuedSource: null,
      barcode: null,
      awards: null,
      createdAt: new Date()
    };
    
    this.beers.set(1, demoBeer1);
    this.beers.set(2, demoBeer2);
    this.idCounters.brewery = 2;
    this.idCounters.beer = 3;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    const existingUser = this.users.get(user.id);
    const newUser: User = {
      ...existingUser,
      ...user,
      nickname: user.nickname || `user${Date.now()}`,
      lastNicknameUpdate: existingUser?.lastNicknameUpdate || new Date(),
      bio: user.bio || null,
      email: user.email || null,
      hashedPassword: user.hashedPassword ?? existingUser?.hashedPassword ?? null,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      profileImageUrl: user.profileImageUrl || null,
      favoriteStyles: user.favoriteStyles || null,
      userType: user.userType || existingUser?.userType || "customer",
      roles: user.roles ?? existingUser?.roles ?? null,
      activeRole: user.activeRole ?? existingUser?.activeRole ?? null,
      breweryId: user.breweryId ?? existingUser?.breweryId ?? null,
      isEmailVerified: user.isEmailVerified ?? existingUser?.isEmailVerified ?? null,
      emailVerificationToken: user.emailVerificationToken ?? existingUser?.emailVerificationToken ?? null,
      emailVerificationExpires: user.emailVerificationExpires ?? existingUser?.emailVerificationExpires ?? null,
      needsOnboarding: user.needsOnboarding ?? existingUser?.needsOnboarding ?? null,
      isPublic: user.isPublic ?? existingUser?.isPublic ?? null,
      passwordResetToken: user.passwordResetToken ?? existingUser?.passwordResetToken ?? null,
      passwordResetExpires: user.passwordResetExpires ?? existingUser?.passwordResetExpires ?? null,
      lastProfileImageUpdate: user.lastProfileImageUpdate ?? existingUser?.lastProfileImageUpdate ?? null,
      emailLastUpdated: user.emailLastUpdated || null,
      passwordLastUpdated: user.passwordLastUpdated || null,
      joinedAt: user.joinedAt || null,
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date(),
      suspendedUntil: (user as any).suspendedUntil ?? existingUser?.suspendedUntil ?? null,
    };
    this.users.set(user.id, newUser);
    return newUser;
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error('User not found');
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Pub operations
  async getPubs(): Promise<Pub[]> {
    return Array.from(this.pubs.values());
  }

  async getPub(id: number): Promise<Pub | undefined> {
    return this.pubs.get(id);
  }

  async getPubBySlug(slug: string): Promise<Pub | undefined> {
    return Array.from(this.pubs.values()).find(p => p.slug === slug);
  }

  async createPub(pub: InsertPub): Promise<Pub> {
    const id = this.idCounters.pub++;
    const newPub: Pub = {
      ...pub,
      id,
      email: pub.email || null,
      postalCode: pub.postalCode || null,
      latitude: pub.latitude || null,
      longitude: pub.longitude || null,
      phone: pub.phone || null,
      websiteUrl: pub.websiteUrl || null,
      description: pub.description || null,
      imageUrl: pub.imageUrl || null,
      logoUrl: pub.logoUrl || null,
      coverImageUrl: pub.coverImageUrl || null,
      rating: pub.rating || "0",
      isActive: pub.isActive ?? true,
      openingHours: pub.openingHours || null,
      facebookUrl: pub.facebookUrl || null,
      instagramUrl: pub.instagramUrl || null,
      twitterUrl: pub.twitterUrl || null,
      tiktokUrl: pub.tiktokUrl || null,
      ownerId: pub.ownerId || null,
      vatNumber: pub.vatNumber || null,
      businessName: pub.businessName || null,
      menuInfoBox: pub.menuInfoBox ?? null,
      isVerified: pub.isVerified ?? null,
      subscriptionStatus: pub.subscriptionStatus ?? null,
      subscriptionExpiresAt: pub.subscriptionExpiresAt ?? null,
      trialEndsAt: pub.trialEndsAt ?? null,
      slug: pub.slug ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.pubs.set(id, newPub);
    return newPub;
  }

  async updatePub(id: number, updates: Partial<InsertPub>): Promise<Pub> {
    const pub = this.pubs.get(id);
    if (!pub) throw new Error('Pub not found');
    const updatedPub = { ...pub, ...updates, updatedAt: new Date() };
    this.pubs.set(id, updatedPub);
    return updatedPub;
  }

  async searchPubs(query: string, _city?: string): Promise<Pub[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.pubs.values()).filter(pub => 
      pub.name.toLowerCase().includes(lowerQuery) ||
      pub.address?.toLowerCase().includes(lowerQuery) ||
      pub.city?.toLowerCase().includes(lowerQuery) ||
      pub.description?.toLowerCase().includes(lowerQuery)
    );
  }

  async deletePub(id: number): Promise<void> {
    this.pubs.delete(id);
  }

  async getPubsByOwner(ownerId: string): Promise<Pub[]> {
    return Array.from(this.pubs.values()).filter(pub => pub.ownerId === ownerId);
  }

  // Brewery operations  
  async getBreweries(): Promise<Brewery[]> {
    return Array.from(this.breweries.values());
  }

  async getBrewery(id: number): Promise<Brewery | undefined> {
    return this.breweries.get(id);
  }

  async createBrewery(brewery: InsertBrewery): Promise<Brewery> {
    const id = this.idCounters.brewery++;
    const newBrewery: Brewery = {
      ...brewery,
      id,
      description: brewery.description || null,
      descriptionHtml: brewery.descriptionHtml ?? null,
      country: brewery.country ?? null,
      logoUrl: brewery.logoUrl || null,
      coverImageUrl: brewery.coverImageUrl ?? null,
      websiteUrl: brewery.websiteUrl || null,
      email: brewery.email ?? null,
      vatNumber: brewery.vatNumber ?? null,
      phone: brewery.phone ?? null,
      instagramUrl: brewery.instagramUrl ?? null,
      facebookUrl: brewery.facebookUrl ?? null,
      tiktokUrl: brewery.tiktokUrl ?? null,
      latitude: brewery.latitude || null,
      longitude: brewery.longitude || null,
      rating: brewery.rating || "0",
      isClosed: brewery.isClosed ?? null,
      closedSource: brewery.closedSource ?? null,
      closedAt: brewery.closedAt ?? null,
      createdAt: new Date()
    };
    this.breweries.set(id, newBrewery);
    return newBrewery;
  }

  async updateBrewery(id: number, updates: Partial<InsertBrewery>): Promise<Brewery> {
    const brewery = this.breweries.get(id);
    if (!brewery) throw new Error('Brewery not found');
    const updatedBrewery = { ...brewery, ...updates };
    this.breweries.set(id, updatedBrewery);
    return updatedBrewery;
  }

  async searchBreweries(query: string): Promise<Brewery[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.breweries.values()).filter(brewery => 
      brewery.name.toLowerCase().includes(lowerQuery) ||
      brewery.location?.toLowerCase().includes(lowerQuery) ||
      brewery.description?.toLowerCase().includes(lowerQuery)
    );
  }

  async deleteBrewery(id: number): Promise<void> {
    this.breweries.delete(id);
  }

  // Beer operations
  async getBeers(): Promise<Beer[]> {
    return Array.from(this.beers.values());
  }

  async getBeer(id: number): Promise<Beer | undefined> {
    return this.beers.get(id);
  }

  async createBeer(beer: InsertBeer): Promise<Beer> {
    const id = this.idCounters.beer++;
    const newBeer: Beer = {
      ...beer,
      id,
      abv: beer.abv || null,
      ibu: beer.ibu || null,
      description: beer.description || null,
      logoUrl: beer.logoUrl || null,
      imageUrl: beer.imageUrl || null,
      color: beer.color || null,
      isBottled: beer.isBottled || null,
      isGlutenFree: beer.isGlutenFree ?? false,
      isAlcoholFree: beer.isAlcoholFree ?? false,
      isCollaboration: beer.isCollaboration ?? false,
      isHidden: beer.isHidden ?? false,
      isDiscontinued: beer.isDiscontinued ?? false,
      discontinuedSource: beer.discontinuedSource ?? null,
      barcode: beer.barcode || null,
      awards: beer.awards || null,
      createdAt: new Date()
    };
    this.beers.set(id, newBeer);
    return newBeer;
  }

  async updateBeer(id: number, updates: Partial<InsertBeer>): Promise<Beer> {
    const beer = this.beers.get(id);
    if (!beer) throw new Error('Beer not found');
    const updatedBeer = { ...beer, ...updates };
    this.beers.set(id, updatedBeer);
    return updatedBeer;
  }

  async deleteBeer(id: number): Promise<void> {
    this.beers.delete(id);
  }

  async getBeersByBrewery(breweryId: number): Promise<Beer[]> {
    return Array.from(this.beers.values()).filter(beer => beer.breweryId === breweryId);
  }

  async searchBeers(query: string): Promise<Beer[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.beers.values()).filter(beer => 
      beer.name.toLowerCase().includes(lowerQuery) ||
      beer.style?.toLowerCase().includes(lowerQuery) ||
      beer.description?.toLowerCase().includes(lowerQuery)
    );
  }

  // Metodi semplificati per altre operazioni necessarie
  async getTapList(pubId: number): Promise<TapList[]> {
    return Array.from(this.tapLists.values()).filter(item => item.pubId === pubId);
  }

  async addToTapList(item: InsertTapList): Promise<TapList> {
    const id = this.idCounters.tapList++;
    const newItem: TapList = {
      ...item,
      id,
      description: item.description || null,
      isActive: item.isActive ?? null,
      isVisible: item.isVisible ?? null,
      prices: item.prices || null,
      priceSmall: item.priceSmall || null,
      priceMedium: item.priceMedium || null,
      priceLarge: item.priceLarge || null,
      tapNumber: item.tapNumber || null,
      tapType: item.tapType ?? null,
      addedAt: new Date(),
      updatedAt: new Date()
    };
    this.tapLists.set(id, newItem);
    return newItem;
  }

  async getBottleList(pubId: number): Promise<BottleList[]> {
    return Array.from(this.bottleLists.values()).filter(item => item.pubId === pubId);
  }

  async addToBottleList(item: InsertBottleList): Promise<BottleList> {
    const id = this.idCounters.bottleList++;
    const newItem: BottleList = {
      ...item,
      id,
      description: item.description || null,
      isActive: item.isActive ?? null,
      isVisible: item.isVisible ?? null,
      prices: item.prices || null,
      priceBottle: item.priceBottle || null,
      bottleSize: item.bottleSize || "0.33L",
      format: item.format ?? null,
      quantity: item.quantity || null,
      addedAt: new Date(),
      updatedAt: new Date()
    };
    this.bottleLists.set(id, newItem);
    return newItem;
  }

  // Metodi stub per le altre operazioni richieste dall'interfaccia
  async getRandomBreweries(): Promise<Brewery[]> {
    const all = Array.from(this.breweries.values());
    return all.slice(0, 10); // Return max 10 random breweries
  }

  async getTapListByPubForOwner(pubId: number): Promise<any[]> {
    return this.getTapList(pubId);
  }

  async updateTapListItem(id: number, updates: Partial<InsertTapList>): Promise<TapList> {
    const item = this.tapLists.get(id);
    if (!item) throw new Error('Tap list item not found');
    const updatedItem = { ...item, ...updates, updatedAt: new Date() };
    this.tapLists.set(id, updatedItem);
    return updatedItem;
  }

  async removeFromTapList(id: number): Promise<void> {
    this.tapLists.delete(id);
  }

  async removeFromBottleList(id: number): Promise<void> {
    this.bottleLists.delete(id);
  }

  // Menu category operations
  async getMenuCategories(pubId: number): Promise<MenuCategory[]> {
    return Array.from(this.menuCategories.values()).filter(category => category.pubId === pubId);
  }

  async getMenuByPub(pubId: number): Promise<any[]> {
    const categories = await this.getMenuCategories(pubId);
    const categoriesWithItems = await Promise.all(
      categories.map(async (category) => {
        const items = await this.getMenuItems(category.id);
        return { ...category, items };
      })
    );
    return categoriesWithItems;
  }

  async createMenuCategory(category: InsertMenuCategory): Promise<MenuCategory> {
    const id = this.idCounters.menuCategory++;
    const newCategory: MenuCategory = {
      ...category,
      id,
      description: category.description || null,
      infoBox: category.infoBox ?? null,
      isVisible: category.isVisible ?? null,
      orderIndex: category.orderIndex ?? null,
      createdAt: new Date()
    };
    this.menuCategories.set(id, newCategory);
    return newCategory;
  }

  async updateMenuCategory(id: number, updates: Partial<InsertMenuCategory>): Promise<MenuCategory> {
    const category = this.menuCategories.get(id);
    if (!category) throw new Error('Menu category not found');
    const updatedCategory = { ...category, ...updates };
    this.menuCategories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteMenuCategory(id: number): Promise<void> {
    // Also delete all menu items in this category
    const itemsToDelete = Array.from(this.menuItems.values()).filter(item => item.categoryId === id);
    itemsToDelete.forEach(item => this.menuItems.delete(item.id));
    
    this.menuCategories.delete(id);
  }

  // Menu item operations
  async getMenuItems(categoryId: number): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values()).filter(item => item.categoryId === categoryId);
  }

  async getMenuItem(id: number): Promise<MenuItem | null> {
    const item = this.menuItems.get(id);
    return item || null;
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const id = this.idCounters.menuItem++;
    const newItem: MenuItem = {
      ...item,
      id,
      description: item.description || null,
      imageUrl: item.imageUrl || null,
      isVisible: item.isVisible ?? null,
      isAvailable: item.isAvailable ?? null,
      isInfoBox: item.isInfoBox ?? null,
      isVegetarian: item.isVegetarian ?? null,
      isSpicy: item.isSpicy ?? null,
      pairingBeerName: item.pairingBeerName ?? null,
      allergens: item.allergens || null,
      orderIndex: item.orderIndex ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.menuItems.set(id, newItem);
    return newItem;
  }

  async updateMenuItem(id: number, updates: Partial<InsertMenuItem>): Promise<MenuItem> {
    const item = this.menuItems.get(id);
    if (!item) throw new Error('Menu item not found');
    const updatedItem = { ...item, ...updates, updatedAt: new Date() };
    this.menuItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteMenuItem(id: number): Promise<void> {
    this.menuItems.delete(id);
  }

  // Additional required methods for compatibility
  async updateUserType(userId: string, userType: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    const updatedUser = { ...user, userType, updatedAt: new Date() };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getBeerWithBrewery(id: number): Promise<any> {
    const beer = this.beers.get(id);
    if (!beer) return null;
    
    const brewery = this.breweries.get(beer.breweryId);
    return { ...beer, brewery };
  }

  async getBeerAvailability(beerId: number): Promise<any> {
    const onTap = Array.from(this.tapLists.values()).filter(item => item.beerId === beerId && item.isActive);
    const inBottles = Array.from(this.bottleLists.values()).filter(item => item.beerId === beerId && item.isActive);
    
    return {
      onTap: onTap.map(item => ({ ...item, pub: this.pubs.get(item.pubId) })),
      inBottles: inBottles.map(item => ({ ...item, pub: this.pubs.get(item.pubId) }))
    };
  }
}

export const memoryStorageInstance = new MemoryStorage();