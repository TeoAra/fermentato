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
      location: "Milano, Italia",
      logoUrl: null,
      founded: 2020,
      website: "https://demo.brewery.com",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.breweries.set(1, demoBrewery);

    // Crea beers demo
    const demoBeer1: Beer = {
      id: 1,
      name: "Demo IPA",
      breweryId: 1,
      style: "IPA",
      abv: 6.5,
      ibu: 45,
      description: "Una IPA demo per testing",
      imageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const demoBeer2: Beer = {
      id: 2,
      name: "Demo Lager",
      breweryId: 1,
      style: "Lager",
      abv: 4.8,
      ibu: 25,
      description: "Una Lager demo per testing",
      imageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date()
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
      nicknameLastChanged: existingUser?.nicknameLastChanged || new Date(),
      bio: user.bio || null,
      location: user.location || null,
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date()
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

  async createPub(pub: InsertPub): Promise<Pub> {
    const id = this.idCounters.pub++;
    const newPub: Pub = {
      ...pub,
      id,
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

  async searchPubs(query: string): Promise<Pub[]> {
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
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.breweries.set(id, newBrewery);
    return newBrewery;
  }

  async updateBrewery(id: number, updates: Partial<InsertBrewery>): Promise<Brewery> {
    const brewery = this.breweries.get(id);
    if (!brewery) throw new Error('Brewery not found');
    const updatedBrewery = { ...brewery, ...updates, updatedAt: new Date() };
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
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.beers.set(id, newBeer);
    return newBeer;
  }

  async updateBeer(id: number, updates: Partial<InsertBeer>): Promise<Beer> {
    const beer = this.beers.get(id);
    if (!beer) throw new Error('Beer not found');
    const updatedBeer = { ...beer, ...updates, updatedAt: new Date() };
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
      createdAt: new Date(),
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
      createdAt: new Date(),
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
}

export const memoryStorageInstance = new MemoryStorage();