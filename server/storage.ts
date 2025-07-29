import { type Contractor, type InsertContractor, type Product, type InsertProduct, type HomeAppliance, type InsertHomeAppliance, type MaintenanceLog, type InsertMaintenanceLog, type ContractorAppointment, type InsertContractorAppointment, type Notification, type InsertNotification } from "@shared/schema";
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
  
  // Maintenance log methods
  getMaintenanceLogs(homeownerId?: string): Promise<MaintenanceLog[]>;
  getMaintenanceLog(id: string): Promise<MaintenanceLog | undefined>;
  createMaintenanceLog(log: InsertMaintenanceLog): Promise<MaintenanceLog>;
  updateMaintenanceLog(id: string, log: Partial<InsertMaintenanceLog>): Promise<MaintenanceLog | undefined>;
  deleteMaintenanceLog(id: string): Promise<boolean>;
  
  // Contractor appointment methods
  getContractorAppointments(homeownerId?: string): Promise<ContractorAppointment[]>;
  getContractorAppointment(id: string): Promise<ContractorAppointment | undefined>;
  createContractorAppointment(appointment: InsertContractorAppointment): Promise<ContractorAppointment>;
  updateContractorAppointment(id: string, appointment: Partial<InsertContractorAppointment>): Promise<ContractorAppointment | undefined>;
  deleteContractorAppointment(id: string): Promise<boolean>;
  
  // Notification methods
  getNotifications(homeownerId?: string): Promise<Notification[]>;
  getNotification(id: string): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: string, notification: Partial<InsertNotification>): Promise<Notification | undefined>;
  deleteNotification(id: string): Promise<boolean>;
  getUnreadNotifications(homeownerId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<boolean>;
  
  // Search methods
  searchContractors(query: string, location?: string): Promise<Contractor[]>;
  searchProducts(query: string): Promise<Product[]>;
}

export class MemStorage implements IStorage {
  private contractors: Map<string, Contractor>;
  private products: Map<string, Product>;
  private homeAppliances: Map<string, HomeAppliance>;
  private maintenanceLogs: Map<string, MaintenanceLog>;
  private contractorAppointments: Map<string, ContractorAppointment>;
  private notifications: Map<string, Notification>;

  constructor() {
    this.contractors = new Map();
    this.products = new Map();
    this.homeAppliances = new Map();
    this.maintenanceLogs = new Map();
    this.contractorAppointments = new Map();
    this.notifications = new Map();
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

    // Add sample appointment for testing notifications
    const sampleAppointment: ContractorAppointment = {
      id: "demo-appointment-1",
      homeownerId: "demo-homeowner-123",
      contractorId: null,
      contractorName: "Mike Thompson",
      contractorCompany: "Thompson Construction LLC",
      contractorPhone: "(206) 555-0123",
      serviceType: "maintenance",
      serviceDescription: "Annual HVAC system inspection and filter replacement",
      homeArea: "hvac",
      scheduledDateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      estimatedDuration: 120,
      status: "scheduled",
      notes: "Please ensure clear access to basement HVAC unit",
      createdAt: new Date(),
    };
    this.contractorAppointments.set(sampleAppointment.id, sampleAppointment);

    // Create notifications for the sample appointment
    this.createAppointmentNotifications(sampleAppointment);
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

  // Maintenance log methods
  async getMaintenanceLogs(homeownerId?: string): Promise<MaintenanceLog[]> {
    const logs = Array.from(this.maintenanceLogs.values());
    
    if (homeownerId) {
      return logs.filter(log => log.homeownerId === homeownerId);
    }
    
    return logs.sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
  }

  async getMaintenanceLog(id: string): Promise<MaintenanceLog | undefined> {
    return this.maintenanceLogs.get(id);
  }

  async createMaintenanceLog(log: InsertMaintenanceLog): Promise<MaintenanceLog> {
    const id = randomUUID();
    const newLog: MaintenanceLog = {
      ...log,
      id,
      cost: log.cost ?? null,
      contractorName: log.contractorName ?? null,
      contractorCompany: log.contractorCompany ?? null,
      contractorId: log.contractorId ?? null,
      notes: log.notes ?? null,
      warrantyPeriod: log.warrantyPeriod ?? null,
      nextServiceDue: log.nextServiceDue ?? null,
      createdAt: new Date()
    };
    this.maintenanceLogs.set(id, newLog);
    return newLog;
  }

  async updateMaintenanceLog(id: string, log: Partial<InsertMaintenanceLog>): Promise<MaintenanceLog | undefined> {
    const existing = this.maintenanceLogs.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: MaintenanceLog = {
      ...existing,
      ...log
    };
    this.maintenanceLogs.set(id, updated);
    return updated;
  }

  async deleteMaintenanceLog(id: string): Promise<boolean> {
    return this.maintenanceLogs.delete(id);
  }

  // Contractor appointment methods
  async getContractorAppointments(homeownerId?: string): Promise<ContractorAppointment[]> {
    const appointments = Array.from(this.contractorAppointments.values());
    
    if (homeownerId) {
      return appointments.filter(appointment => appointment.homeownerId === homeownerId);
    }
    
    return appointments.sort((a, b) => new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime());
  }

  async getContractorAppointment(id: string): Promise<ContractorAppointment | undefined> {
    return this.contractorAppointments.get(id);
  }

  async createContractorAppointment(appointment: InsertContractorAppointment): Promise<ContractorAppointment> {
    const id = randomUUID();
    const newAppointment: ContractorAppointment = {
      ...appointment,
      id,
      contractorCompany: appointment.contractorCompany ?? null,
      contractorPhone: appointment.contractorPhone ?? null,
      estimatedDuration: appointment.estimatedDuration ?? null,
      notes: appointment.notes ?? null,
      status: appointment.status ?? "scheduled",
      createdAt: new Date()
    };
    this.contractorAppointments.set(id, newAppointment);
    
    // Create notifications for this appointment
    await this.createAppointmentNotifications(newAppointment);
    
    return newAppointment;
  }

  async updateContractorAppointment(id: string, appointment: Partial<InsertContractorAppointment>): Promise<ContractorAppointment | undefined> {
    const existing = this.contractorAppointments.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: ContractorAppointment = {
      ...existing,
      ...appointment
    };
    this.contractorAppointments.set(id, updated);
    
    // If the scheduled date/time changed, update notifications
    if (appointment.scheduledDateTime && appointment.scheduledDateTime !== existing.scheduledDateTime) {
      await this.updateAppointmentNotifications(updated);
    }
    
    return updated;
  }

  async deleteContractorAppointment(id: string): Promise<boolean> {
    const deleted = this.contractorAppointments.delete(id);
    
    if (deleted) {
      // Delete associated notifications
      const notifications = Array.from(this.notifications.values()).filter(n => n.appointmentId === id);
      notifications.forEach(notification => this.notifications.delete(notification.id));
    }
    
    return deleted;
  }

  // Notification methods
  async getNotifications(homeownerId?: string): Promise<Notification[]> {
    const notifications = Array.from(this.notifications.values());
    
    if (homeownerId) {
      return notifications.filter(notification => notification.homeownerId === homeownerId);
    }
    
    return notifications.sort((a, b) => new Date(b.createdAt || new Date()).getTime() - new Date(a.createdAt || new Date()).getTime());
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const newNotification: Notification = {
      ...notification,
      id,
      sentAt: notification.sentAt ?? null,
      isRead: notification.isRead ?? false,
      createdAt: new Date()
    };
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  async updateNotification(id: string, notification: Partial<InsertNotification>): Promise<Notification | undefined> {
    const existing = this.notifications.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: Notification = {
      ...existing,
      ...notification
    };
    this.notifications.set(id, updated);
    return updated;
  }

  async deleteNotification(id: string): Promise<boolean> {
    return this.notifications.delete(id);
  }

  async getUnreadNotifications(homeownerId: string): Promise<Notification[]> {
    const notifications = Array.from(this.notifications.values());
    return notifications.filter(notification => 
      notification.homeownerId === homeownerId && !notification.isRead
    ).sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) {
      return false;
    }

    const updated: Notification = {
      ...notification,
      isRead: true
    };
    this.notifications.set(id, updated);
    return true;
  }

  // Helper method to create notifications for an appointment
  private async createAppointmentNotifications(appointment: ContractorAppointment): Promise<void> {
    const appointmentDateTime = new Date(appointment.scheduledDateTime);
    const now = new Date();
    
    // Create 24-hour notification
    const twentyFourHourNotification = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000);
    if (twentyFourHourNotification > now) {
      await this.createNotification({
        homeownerId: appointment.homeownerId,
        appointmentId: appointment.id,
        type: "24_hour",
        title: "Contractor Visit Tomorrow",
        message: `${appointment.contractorName} is scheduled to visit tomorrow at ${appointmentDateTime.toLocaleTimeString()} for ${appointment.serviceDescription}.`,
        scheduledFor: twentyFourHourNotification.toISOString(),
        isRead: false,
        sentAt: null,
      });
    }
    
    // Create 4-hour notification
    const fourHourNotification = new Date(appointmentDateTime.getTime() - 4 * 60 * 60 * 1000);
    if (fourHourNotification > now) {
      await this.createNotification({
        homeownerId: appointment.homeownerId,
        appointmentId: appointment.id,
        type: "4_hour",
        title: "Contractor Visit in 4 Hours",
        message: `${appointment.contractorName} will arrive in 4 hours at ${appointmentDateTime.toLocaleTimeString()} for ${appointment.serviceDescription}.`,
        scheduledFor: fourHourNotification.toISOString(),
        isRead: false,
        sentAt: null,
      });
    }
    
    // Create 1-hour notification
    const oneHourNotification = new Date(appointmentDateTime.getTime() - 60 * 60 * 1000);
    if (oneHourNotification > now) {
      await this.createNotification({
        homeownerId: appointment.homeownerId,
        appointmentId: appointment.id,
        type: "1_hour",
        title: "Contractor Arriving Soon",
        message: `${appointment.contractorName} will arrive in 1 hour at ${appointmentDateTime.toLocaleTimeString()}. Please ensure someone is home to let them in.`,
        scheduledFor: oneHourNotification.toISOString(),
        isRead: false,
        sentAt: null,
      });
    }
  }

  // Helper method to update notifications when appointment time changes
  private async updateAppointmentNotifications(appointment: ContractorAppointment): Promise<void> {
    // Delete existing notifications for this appointment
    const existingNotifications = Array.from(this.notifications.values()).filter(n => n.appointmentId === appointment.id);
    existingNotifications.forEach(notification => this.notifications.delete(notification.id));
    
    // Create new notifications with updated times
    await this.createAppointmentNotifications(appointment);
  }
}

export const storage = new MemStorage();
