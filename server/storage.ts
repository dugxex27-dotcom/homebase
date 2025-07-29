import { type Contractor, type InsertContractor, type Product, type InsertProduct, type HomeAppliance, type InsertHomeAppliance } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Contractor methods
  getContractors(filters?: {
    services?: string[];
    location?: string;
    minRating?: number;
    hasEmergencyServices?: boolean;
    maxDistance?: number;
  }): Promise<Contractor[]>;
  getContractor(id: string): Promise<Contractor | undefined>;
  createContractor(contractor: InsertContractor): Promise<Contractor>;
  
  // Product methods
  getProducts(filters?: {
    category?: string;
    featured?: boolean;
    search?: string;
  }): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  
  // Appliance methods
  getHomeAppliances(homeownerId?: string): Promise<HomeAppliance[]>;
  getHomeAppliance(id: string): Promise<HomeAppliance | undefined>;
  createHomeAppliance(appliance: InsertHomeAppliance): Promise<HomeAppliance>;
  updateHomeAppliance(id: string, appliance: Partial<InsertHomeAppliance>): Promise<HomeAppliance | undefined>;
  deleteHomeAppliance(id: string): Promise<boolean>;
  
  // Search methods
  searchContractors(query: string, location?: string): Promise<Contractor[]>;
  searchProducts(query: string): Promise<Product[]>;
}

export class MemStorage implements IStorage {
  private contractors: Map<string, Contractor>;
  private products: Map<string, Product>;
  private homeAppliances: Map<string, HomeAppliance>;

  constructor() {
    this.contractors = new Map();
    this.products = new Map();
    this.homeAppliances = new Map();
    this.seedData();
  }

  private seedData() {
    // Seed contractors
    const contractorData: InsertContractor[] = [
      {
        name: "Mike Thompson",
        company: "Thompson Construction LLC",
        bio: "Specializing in kitchen and bathroom renovations with a focus on quality craftsmanship and customer satisfaction. Licensed general contractor with extensive experience in residential projects.",
        location: "Seattle, WA",
        distance: "2.3",
        rating: "4.9",
        reviewCount: 127,
        experience: 15,
        services: ["Kitchen Remodeling", "Bathroom Renovation", "Flooring", "Custom Cabinetry"],
        phone: "(206) 555-0123",
        email: "mike@thompsonllc.com",
        licenseNumber: "THOMC*123AB",
        insuranceProvider: "Liberty Mutual",
        isLicensed: true,
        isInsured: true,
        hasEmergencyServices: false,
        profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=150&h=150"
      },
      {
        name: "Sarah Martinez",
        company: "Martinez Electrical Services",
        bio: "Master electrician providing residential and commercial electrical services. Emergency repairs, panel upgrades, and new installations with guaranteed workmanship.",
        location: "Seattle, WA",
        distance: "4.1",
        rating: "5.0",
        reviewCount: 89,
        experience: 12,
        services: ["Electrical", "Panel Upgrades", "Emergency Repairs", "Smart Home Installation"],
        phone: "(206) 555-0456",
        email: "sarah@martinezelectric.com",
        licenseNumber: "MARTI*456CD",
        insuranceProvider: "State Farm",
        isLicensed: true,
        isInsured: true,
        hasEmergencyServices: true,
        profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=150&h=150"
      },
      {
        name: "David Chen",
        company: "Chen Plumbing & Heating",
        bio: "Full-service plumbing and heating contractor. Water heater installations, drain cleaning, bathroom remodels, and HVAC services. Available for emergency calls 24/7.",
        location: "Seattle, WA",
        distance: "1.8",
        rating: "4.8",
        reviewCount: 203,
        experience: 20,
        services: ["Plumbing", "Water Heaters", "HVAC", "Drain Cleaning"],
        phone: "(206) 555-0789",
        email: "david@chenplumbing.com",
        licenseNumber: "CHEND*789EF",
        insuranceProvider: "Allstate",
        isLicensed: true,
        isInsured: true,
        hasEmergencyServices: true,
        profileImage: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=150&h=150"
      },
      {
        name: "Emily Rodriguez",
        company: "Rodriguez Roofing Solutions",
        bio: "Residential and commercial roofing specialist. New roof installations, repairs, gutters, and storm damage restoration. Free estimates and financing available.",
        location: "Seattle, WA",
        distance: "3.2",
        rating: "4.7",
        reviewCount: 156,
        experience: 18,
        services: ["Roofing", "Gutters", "Storm Damage", "Gutter Guards"],
        phone: "(206) 555-0321",
        email: "emily@rodriguezroofing.com",
        licenseNumber: "RODRI*321GH",
        insuranceProvider: "Farmers Insurance",
        isLicensed: true,
        isInsured: true,
        hasEmergencyServices: false,
        profileImage: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=150&h=150"
      },
      {
        name: "Marcus Johnson",
        company: "Perfect Drywall Solutions",
        bio: "Specialized drywall contractor offering seamless installations, repairs, and finishing work. Expert in texture matching and custom finishes for residential and commercial properties.",
        location: "Seattle, WA",
        distance: "2.7",
        rating: "4.6",
        reviewCount: 98,
        experience: 14,
        services: ["Drywall Installation", "Drywall Repair", "Texture Matching", "Finishing Work"],
        phone: "(206) 555-0987",
        email: "marcus@perfectdrywall.com",
        licenseNumber: "JOHNS*987IJ",
        insuranceProvider: "Progressive",
        isLicensed: true,
        isInsured: true,
        hasEmergencyServices: false,
        profileImage: "https://images.unsplash.com/photo-1558618739-ace2d1e8de4c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=150&h=150"
      },
      {
        name: "Rachel Green",
        company: "Gutter Pro Seattle",  
        bio: "Professional gutter installation and maintenance specialist. Complete gutter systems, cleaning, repairs, and leaf protection solutions for Pacific Northwest homes.",
        location: "Seattle, WA",
        distance: "1.9",
        rating: "4.8",
        reviewCount: 142,
        experience: 11,
        services: ["Gutter Installation", "Gutter Cleaning", "Gutter Repair", "Leaf Protection"],
        phone: "(206) 555-0654",
        email: "rachel@gutterpro.com",
        licenseNumber: "GREEN*654KL",
        insuranceProvider: "GEICO",
        isLicensed: true,
        isInsured: true,
        hasEmergencyServices: true,
        profileImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=150&h=150"
      }
    ];

    contractorData.forEach(contractor => {
      const id = randomUUID();
      const contractorWithId: Contractor = { 
        ...contractor, 
        id,
        distance: contractor.distance || null,
        profileImage: contractor.profileImage || null,
        reviewCount: contractor.reviewCount || 0,
        isLicensed: contractor.isLicensed ?? true,
        isInsured: contractor.isInsured ?? true,
        hasEmergencyServices: contractor.hasEmergencyServices ?? false
      };
      this.contractors.set(id, contractorWithId);
    });

    // Seed products
    const productData: InsertProduct[] = [
      {
        name: "DeWalt 20V Max Cordless Drill",
        description: "Professional-grade cordless drill with LED light and 2-speed transmission",
        price: "129.99",
        category: "Power Tools",
        rating: "4.8",
        reviewCount: 324,
        image: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=300",
        isFeatured: true,
        inStock: true
      },
      {
        name: "Brushed Nickel Cabinet Handles",
        description: "Set of 10 modern cabinet pulls, 5-inch centers, premium finish",
        price: "34.99",
        category: "Hardware",
        rating: "4.5",
        reviewCount: 89,
        image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=300",
        isFeatured: true,
        inStock: true
      },
      {
        name: "Professional Paint Roller Set",
        description: "Complete painting kit with rollers, brushes, and tray for interior walls",
        price: "24.99",
        category: "Paint Supplies",
        rating: "4.7",
        reviewCount: 156,
        image: "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=300",
        isFeatured: true,
        inStock: true
      },
      {
        name: "Modern LED Ceiling Light",
        description: "Energy-efficient LED fixture with dimmer compatibility and easy installation",
        price: "79.99",
        category: "Lighting",
        rating: "4.4",
        reviewCount: 267,
        image: "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=300",
        isFeatured: true,
        inStock: true
      }
    ];

    productData.forEach(product => {
      const id = randomUUID();
      const productWithId: Product = { 
        ...product, 
        id,
        reviewCount: product.reviewCount || 0,
        isFeatured: product.isFeatured || false,
        inStock: product.inStock !== false
      };
      this.products.set(id, productWithId);
    });
  }

  async getContractors(filters?: {
    services?: string[];
    location?: string;
    minRating?: number;
    hasEmergencyServices?: boolean;
    maxDistance?: number;
  }): Promise<Contractor[]> {
    let contractors = Array.from(this.contractors.values());

    if (filters) {
      if (filters.services && filters.services.length > 0) {
        contractors = contractors.filter(contractor =>
          filters.services!.some(service =>
            contractor.services.some(contractorService =>
              contractorService.toLowerCase().includes(service.toLowerCase())
            )
          )
        );
      }

      if (filters.minRating) {
        contractors = contractors.filter(contractor =>
          parseFloat(contractor.rating) >= filters.minRating!
        );
      }



      if (filters.hasEmergencyServices !== undefined) {
        contractors = contractors.filter(contractor =>
          contractor.hasEmergencyServices === filters.hasEmergencyServices
        );
      }

      if (filters.maxDistance) {
        contractors = contractors.filter(contractor =>
          contractor.distance ? parseFloat(contractor.distance) <= filters.maxDistance! : true
        );
      }
    }

    return contractors;
  }

  async getContractor(id: string): Promise<Contractor | undefined> {
    return this.contractors.get(id);
  }

  async createContractor(contractor: InsertContractor): Promise<Contractor> {
    const id = randomUUID();
    const newContractor: Contractor = { 
      ...contractor, 
      id,
      distance: contractor.distance || null,
      profileImage: contractor.profileImage || null,
      reviewCount: contractor.reviewCount || 0,
      isLicensed: contractor.isLicensed ?? true,
      isInsured: contractor.isInsured ?? true,
      hasEmergencyServices: contractor.hasEmergencyServices ?? false
    };
    this.contractors.set(id, newContractor);
    return newContractor;
  }

  async getProducts(filters?: {
    category?: string;
    featured?: boolean;
    search?: string;
  }): Promise<Product[]> {
    let products = Array.from(this.products.values());

    if (filters) {
      if (filters.category) {
        products = products.filter(product =>
          product.category.toLowerCase().includes(filters.category!.toLowerCase())
        );
      }

      if (filters.featured !== undefined) {
        products = products.filter(product =>
          product.isFeatured === filters.featured
        );
      }

      if (filters.search) {
        products = products.filter(product =>
          product.name.toLowerCase().includes(filters.search!.toLowerCase()) ||
          product.description.toLowerCase().includes(filters.search!.toLowerCase())
        );
      }
    }

    return products;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const newProduct: Product = { 
      ...product, 
      id,
      reviewCount: product.reviewCount || 0,
      isFeatured: product.isFeatured ?? false,
      inStock: product.inStock ?? true
    };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async searchContractors(query: string, location?: string): Promise<Contractor[]> {
    const contractors = Array.from(this.contractors.values());
    
    return contractors.filter(contractor => {
      const matchesQuery = query === "" || 
        contractor.name.toLowerCase().includes(query.toLowerCase()) ||
        contractor.company.toLowerCase().includes(query.toLowerCase()) ||
        contractor.bio.toLowerCase().includes(query.toLowerCase()) ||
        contractor.services.some(service => service.toLowerCase().includes(query.toLowerCase()));
      
      const matchesLocation = !location || 
        contractor.location.toLowerCase().includes(location.toLowerCase());
      
      return matchesQuery && matchesLocation;
    });
  }

  async searchProducts(query: string): Promise<Product[]> {
    const products = Array.from(this.products.values());
    
    return products.filter(product =>
      query === "" ||
      product.name.toLowerCase().includes(query.toLowerCase()) ||
      product.description.toLowerCase().includes(query.toLowerCase()) ||
      product.category.toLowerCase().includes(query.toLowerCase())
    );
  }

  async getHomeAppliances(homeownerId?: string): Promise<HomeAppliance[]> {
    const appliances = Array.from(this.homeAppliances.values());
    
    if (homeownerId) {
      return appliances.filter(appliance => appliance.homeownerId === homeownerId);
    }
    
    return appliances;
  }

  async getHomeAppliance(id: string): Promise<HomeAppliance | undefined> {
    return this.homeAppliances.get(id);
  }

  async createHomeAppliance(appliance: InsertHomeAppliance): Promise<HomeAppliance> {
    const id = randomUUID();
    const newAppliance: HomeAppliance = {
      ...appliance,
      id,
      yearInstalled: appliance.yearInstalled ?? null,
      serialNumber: appliance.serialNumber ?? null,
      notes: appliance.notes ?? null,
      location: appliance.location ?? null,
      warrantyExpiration: appliance.warrantyExpiration ?? null,
      lastServiceDate: appliance.lastServiceDate ?? null,
      createdAt: new Date()
    };
    this.homeAppliances.set(id, newAppliance);
    return newAppliance;
  }

  async updateHomeAppliance(id: string, appliance: Partial<InsertHomeAppliance>): Promise<HomeAppliance | undefined> {
    const existing = this.homeAppliances.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: HomeAppliance = {
      ...existing,
      ...appliance
    };
    this.homeAppliances.set(id, updated);
    return updated;
  }

  async deleteHomeAppliance(id: string): Promise<boolean> {
    return this.homeAppliances.delete(id);
  }
}

export const storage = new MemStorage();
