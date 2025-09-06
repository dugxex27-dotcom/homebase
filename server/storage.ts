import { type Contractor, type InsertContractor, type Product, type InsertProduct, type HomeAppliance, type InsertHomeAppliance, type MaintenanceLog, type InsertMaintenanceLog, type ContractorAppointment, type InsertContractorAppointment, type House, type InsertHouse, type Notification, type InsertNotification, type User, type UpsertUser, type ServiceRecord, type InsertServiceRecord, type Conversation, type InsertConversation, type Message, type InsertMessage, type ContractorReview, type InsertContractorReview, type CustomMaintenanceTask, type InsertCustomMaintenanceTask, type Proposal, type InsertProposal, type HomeSystem, type InsertHomeSystem, type PushSubscription, type InsertPushSubscription } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Contractor methods
  getContractors(filters?: {
    services?: string[];
    location?: string;
    minRating?: number;
    hasEmergencyServices?: boolean;
    maxDistance?: number;
    serviceRadius?: number;
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
  
  // Custom maintenance task methods
  getCustomMaintenanceTasks(homeownerId?: string, houseId?: string): Promise<CustomMaintenanceTask[]>;
  getCustomMaintenanceTask(id: string): Promise<CustomMaintenanceTask | undefined>;
  createCustomMaintenanceTask(task: InsertCustomMaintenanceTask): Promise<CustomMaintenanceTask>;
  updateCustomMaintenanceTask(id: string, task: Partial<InsertCustomMaintenanceTask>): Promise<CustomMaintenanceTask | undefined>;
  deleteCustomMaintenanceTask(id: string): Promise<boolean>;
  
  // House methods
  getHouses(homeownerId?: string): Promise<House[]>;
  getHouse(id: string): Promise<House | undefined>;
  createHouse(house: InsertHouse): Promise<House>;
  updateHouse(id: string, house: Partial<InsertHouse>): Promise<House | undefined>;
  deleteHouse(id: string): Promise<boolean>;
  getDefaultHouse(homeownerId: string): Promise<House | undefined>;

  // Contractor appointment methods
  getContractorAppointments(homeownerId?: string, houseId?: string): Promise<ContractorAppointment[]>;
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
  
  // Contractor profile operations
  getContractorProfile(contractorId: string): Promise<Contractor | undefined>;
  updateContractorProfile(contractorId: string, profileData: Partial<InsertContractor>): Promise<Contractor>;

  // Service record operations
  getServiceRecords(contractorId?: string, homeownerId?: string): Promise<ServiceRecord[]>;
  getServiceRecord(id: string): Promise<ServiceRecord | undefined>;
  createServiceRecord(record: InsertServiceRecord): Promise<ServiceRecord>;
  updateServiceRecord(id: string, record: Partial<InsertServiceRecord>): Promise<ServiceRecord | undefined>;
  deleteServiceRecord(id: string): Promise<boolean>;
  getHomeownerServiceRecords(homeownerId: string): Promise<ServiceRecord[]>;
  
  // Customer service record operations  
  getCustomerServiceRecords(customerId?: string, customerEmail?: string, customerAddress?: string): Promise<ServiceRecord[]>;

  // Messaging operations
  getConversations(userId: string, userType: 'homeowner' | 'contractor'): Promise<(Conversation & { otherPartyName: string; unreadCount: number })[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(conversationId: string, userId: string): Promise<void>;
  getUnreadMessageCount(userId: string): Promise<number>;

  // Review operations
  getContractorReviews(contractorId: string): Promise<ContractorReview[]>;
  getReviewsByHomeowner(homeownerId: string): Promise<ContractorReview[]>;
  createContractorReview(review: InsertContractorReview): Promise<ContractorReview>;
  updateContractorReview(id: string, review: Partial<InsertContractorReview>): Promise<ContractorReview | undefined>;
  deleteContractorReview(id: string): Promise<boolean>;
  getContractorAverageRating(contractorId: string): Promise<{ averageRating: number; totalReviews: number }>;

  // Proposal operations
  getProposals(contractorId?: string, homeownerId?: string): Promise<Proposal[]>;
  getProposal(id: string): Promise<Proposal | undefined>;
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  updateProposal(id: string, proposal: Partial<InsertProposal>): Promise<Proposal | undefined>;
  deleteProposal(id: string): Promise<boolean>;

  // Home system operations
  getHomeSystems(homeownerId?: string, houseId?: string): Promise<HomeSystem[]>;
  getHomeSystem(id: string): Promise<HomeSystem | undefined>;
  createHomeSystem(system: InsertHomeSystem): Promise<HomeSystem>;
  updateHomeSystem(id: string, system: Partial<InsertHomeSystem>): Promise<HomeSystem | undefined>;
  deleteHomeSystem(id: string): Promise<boolean>;

  // Push subscription operations
  getPushSubscriptions(userId?: string): Promise<PushSubscription[]>;
  getPushSubscription(id: string): Promise<PushSubscription | undefined>;
  createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  updatePushSubscription(id: string, subscription: Partial<InsertPushSubscription>): Promise<PushSubscription | undefined>;
  deletePushSubscription(id: string): Promise<boolean>;
  deletePushSubscriptionByEndpoint(endpoint: string): Promise<boolean>;

  // AI Maintenance helper methods
  getHousesByHomeowner(homeownerId: string): Promise<House[]>;
  getHomeSystemsByHomeowner(homeownerId: string): Promise<HomeSystem[]>;
  getMaintenanceLogsByHomeowner(homeownerId: string): Promise<MaintenanceLog[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private contractors: Map<string, Contractor>;
  private products: Map<string, Product>;
  private homeAppliances: Map<string, HomeAppliance>;
  private maintenanceLogs: Map<string, MaintenanceLog>;
  private customMaintenanceTasks: Map<string, CustomMaintenanceTask>;
  private houses: Map<string, House>;
  private contractorAppointments: Map<string, ContractorAppointment>;
  private notifications: Map<string, Notification>;
  private contractorProfiles: Map<string, any>;
  private serviceRecords: ServiceRecord[];
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;
  private contractorReviews: Map<string, ContractorReview>;
  private proposals: Map<string, Proposal>;
  private homeSystems: Map<string, HomeSystem>;
  private pushSubscriptions: Map<string, PushSubscription>;

  constructor() {
    this.users = new Map();
    this.contractors = new Map();
    this.products = new Map();
    this.homeAppliances = new Map();
    this.maintenanceLogs = new Map();
    this.customMaintenanceTasks = new Map();
    this.houses = new Map();
    this.contractorAppointments = new Map();
    this.notifications = new Map();
    this.contractorProfiles = new Map();
    this.serviceRecords = [];
    this.conversations = new Map();
    this.messages = new Map();
    this.contractorReviews = new Map();
    this.proposals = new Map();
    this.homeSystems = new Map();
    this.pushSubscriptions = new Map();
    this.seedData();
    this.seedServiceRecords();
    this.seedReviews();
    
    // Add sample maintenance logs with contractor information after other data is seeded
    this.initializeMaintenanceLogsData();
  }

  private initializeMaintenanceLogsData() {
    // Add sample maintenance logs with contractor information for demo
    const sampleLogs: MaintenanceLog[] = [
      {
        id: "maint-log-1",
        homeownerId: "demo-homeowner-123",
        serviceDate: "2024-08-15",
        serviceType: "HVAC Maintenance",
        homeArea: "HVAC",
        serviceDescription: "Annual HVAC system maintenance including filter replacement, duct cleaning, and system inspection",
        cost: "285.00",
        contractorName: "Mike Thompson",
        contractorCompany: "Thompson Construction LLC",
        contractorId: "contractor-1",
        notes: "System running efficiently. Recommended next service in 6 months.",
        warrantyPeriod: "90 days",
        nextServiceDue: "2025-02-15",
        createdAt: new Date("2024-08-15")
      },
      {
        id: "maint-log-2",
        homeownerId: "demo-homeowner-123",
        serviceDate: "2024-06-20",
        serviceType: "Gutter Cleaning",
        homeArea: "Exterior",
        serviceDescription: "Professional gutter cleaning and minor gutter repair",
        cost: "150.00",
        contractorName: "Sarah Chen",
        contractorCompany: "Premier Home Services",
        contractorId: "contractor-2",
        notes: "Removed leaves and debris. Fixed small leak in downspout.",
        warrantyPeriod: "30 days",
        nextServiceDue: "2024-12-20",
        createdAt: new Date("2024-06-20")
      },
      {
        id: "maint-log-3",
        homeownerId: "demo-homeowner-123",
        serviceDate: "2024-05-10",
        serviceType: "Plumbing Repair",
        homeArea: "Plumbing",
        serviceDescription: "Fixed leaky faucet in kitchen and replaced worn washers",
        cost: "125.00",
        contractorName: "Carlos Rodriguez",
        contractorCompany: "Rodriguez Plumbing Solutions",
        contractorId: "contractor-3",
        notes: "Replaced faucet washers and tightened connections. No leaks detected.",
        warrantyPeriod: "1 year",
        nextServiceDue: null,
        createdAt: new Date("2024-05-10")
      },
      {
        id: "maint-log-4",
        homeownerId: "demo-homeowner-123",
        serviceDate: "2024-03-25",
        serviceType: "Pressure Washing",
        homeArea: "Exterior",
        serviceDescription: "Pressure washed driveway, sidewalks, and exterior siding",
        cost: "200.00",
        contractorName: "David Kim",
        contractorCompany: "Clean Sweep Exterior Services",
        contractorId: "contractor-4",
        notes: "Removed all dirt and mildew. Siding looks brand new.",
        warrantyPeriod: null,
        nextServiceDue: "2025-03-25",
        createdAt: new Date("2024-03-25")
      },
      {
        id: "maint-log-5",
        homeownerId: "demo-homeowner-123",
        serviceDate: "2024-01-15",
        serviceType: "Electrical Inspection",
        homeArea: "Electrical",
        serviceDescription: "Annual electrical system safety inspection and minor outlet repairs",
        cost: "175.00",
        contractorName: "Jennifer Wilson",
        contractorCompany: "Wilson Electric Co.",
        contractorId: "contractor-5",
        notes: "All systems pass inspection. Replaced two GFCI outlets in bathroom.",
        warrantyPeriod: "2 years",
        nextServiceDue: "2025-01-15",
        createdAt: new Date("2024-01-15")
      }
    ];

    // Add all sample logs to the map
    sampleLogs.forEach(log => {
      this.maintenanceLogs.set(log.id, log);
    });
  }

  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = this.users.get(userData.id!);
    const user: User = {
      id: userData.id!,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      role: userData.role || 'homeowner',
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
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
        services: ["Kitchen Remodeling", "Bathroom Remodeling", "Flooring", "Carpentry"],
        phone: "(206) 555-0123",
        email: "mike@thompsonllc.com",
        licenseNumber: "THOMC*123AB",
        licenseMunicipality: "Seattle",
        isLicensed: true,
        hasEmergencyServices: false,
        serviceRadius: 30,
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
        services: ["Electrical", "General Contracting", "Assembly Services"],
        phone: "(206) 555-0456",
        email: "sarah@martinezelectric.com",
        licenseNumber: "MARTI*456CD",
        licenseMunicipality: "Bellevue",
        isLicensed: true,
        hasEmergencyServices: true,
        serviceRadius: 50,
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
        services: ["Plumbing", "HVAC", "General Contracting"],
        phone: "(206) 555-0789",
        email: "david@chenplumbing.com",
        licenseNumber: "CHEND*789EF",
        licenseMunicipality: "Tacoma",
        isLicensed: true,
        hasEmergencyServices: true,
        serviceRadius: 75,
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
        services: ["Roofing", "Gutters", "Siding"],
        phone: "(206) 555-0321",
        email: "emily@rodriguezroofing.com",
        licenseNumber: "RODRI*321GH",
        licenseMunicipality: "Spokane",
        isLicensed: true,
        hasEmergencyServices: false,
        serviceRadius: 60,
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
        services: ["Drywall / Spackling", "Painting", "General Contracting"],
        phone: "(206) 555-0987",
        email: "marcus@perfectdrywall.com",
        licenseNumber: "JOHNS*987IJ",
        licenseMunicipality: "Redmond",
        isLicensed: true,
        hasEmergencyServices: false,
        serviceRadius: 35,
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
        services: ["Gutters", "Gutter Cleaning", "Pressure Washing"],
        phone: "(206) 555-0654",
        email: "rachel@gutterpro.com",
        licenseNumber: "GREEN*654KL",
        licenseMunicipality: "Everett",
        isLicensed: true,
        hasEmergencyServices: true,
        serviceRadius: 45,
        profileImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=150&h=150"
      },
      {
        name: "Alex Thompson",
        company: "SecureHome Solutions",
        bio: "Professional security system installer specializing in alarm systems, surveillance cameras, smart home integration, and access control. Licensed security contractor with 24/7 monitoring services.",
        location: "Seattle, WA", 
        distance: "2.3",
        rating: "4.9",
        reviewCount: 87,
        experience: 8,
        services: ["Alarm / Camera installation", "Electrical", "Smart Home Integration"],
        phone: "(206) 555-0789",
        email: "alex@securehomesolutions.com",
        licenseNumber: "THOMP*159MN",
        licenseMunicipality: "Seattle",
        isLicensed: true,
        hasEmergencyServices: true,
        serviceRadius: 50,
        profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=150&h=150"
      },
      {
        name: "Maria Rodriguez",
        company: "GreenScape Irrigation Systems",
        bio: "Expert in residential and commercial irrigation systems with 12 years of experience. Specializing in water-efficient sprinkler installations, repairs, and seasonal maintenance services.",
        location: "Seattle, WA",
        distance: "3.1", 
        rating: "4.8",
        reviewCount: 94,
        experience: 12,
        services: ["Sprinklers/Irrigation", "Landscaping", "Pressure Washing", "General Contracting"],
        phone: "(206) 555-0456",
        email: "maria@greenscapesystems.com",
        licenseNumber: "GRNSC*287WA",
        licenseMunicipality: "Seattle",
        isLicensed: true,
        hasEmergencyServices: true,
        serviceRadius: 40,
        profileImage: "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=150&h=150"
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
        hasEmergencyServices: contractor.hasEmergencyServices ?? false,
        serviceRadius: (contractor as any).serviceRadius ?? 25,
        businessLogo: null,
        projectPhotos: []
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

    // Add sample houses for multi-house support
    const sampleHouses: House[] = [
      {
        id: "house-1",
        homeownerId: "demo-homeowner-123",
        name: "Main House",
        address: "123 Oak Street, Seattle, WA 98101",
        climateZone: "Pacific Northwest",
        homeSystems: ["Central Air", "Gas Heat", "Gas Water Heater", "Dishwasher", "Garbage Disposal"],
        isDefault: true,
        createdAt: new Date(),
      },
      {
        id: "house-2", 
        homeownerId: "demo-homeowner-123",
        name: "Vacation Cabin",
        address: "456 Mountain View Drive, Snoqualmie, WA 98065",
        climateZone: "Pacific Northwest",
        homeSystems: ["Electric Heat", "Electric Water Heater", "Wood Stove"],
        isDefault: false,
        createdAt: new Date(),
      }
    ];

    sampleHouses.forEach(house => {
      this.houses.set(house.id, house);
    });

    // Add sample appointment for testing notifications
    const sampleAppointment: ContractorAppointment = {
      id: "demo-appointment-1",
      homeownerId: "demo-homeowner-123",
      houseId: "house-1", // Link to default house
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

    // Add sample maintenance task notifications
    const sampleMaintenanceTasks = [
      {
        id: "hvac-filter-january",
        title: "Replace HVAC Filters",
        description: "Replace air filters in HVAC system for optimal air quality and system efficiency",
        month: new Date().getMonth() + 1, // Current month
        priority: "high",
        estimatedTime: "30 minutes",
        category: "HVAC"
      },
      {
        id: "smoke-detector-january", 
        title: "Test Smoke Detectors",
        description: "Test all smoke detectors and replace batteries if needed",
        month: new Date().getMonth() + 1, // Current month
        priority: "high",
        estimatedTime: "15 minutes",
        category: "Safety"
      },
      {
        id: "clean-gutters-january",
        title: "Clean Gutters and Downspouts",
        description: "Remove debris from gutters and check for proper drainage",
        month: new Date().getMonth() + 1, // Current month
        priority: "medium",
        estimatedTime: "2-3 hours",
        category: "Exterior"
      }
    ];

    // Create maintenance notifications
    this.createMaintenanceNotifications("demo-homeowner-123", sampleMaintenanceTasks);
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

      // Only show contractors whose service area overlaps with homeowner's location
      // This means the contractor's service radius must be >= the distance to the homeowner
      contractors = contractors.filter(contractor => {
        if (!contractor.distance) return true; // If no distance data, include contractor
        const distanceToHomeowner = parseFloat(contractor.distance);
        return contractor.serviceRadius >= distanceToHomeowner;
      });
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
      hasEmergencyServices: contractor.hasEmergencyServices ?? false,
      serviceRadius: contractor.serviceRadius ?? 25,
      businessLogo: contractor.businessLogo || null,
      projectPhotos: contractor.projectPhotos || []
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

  // Custom maintenance task methods
  async getCustomMaintenanceTasks(homeownerId?: string, houseId?: string): Promise<CustomMaintenanceTask[]> {
    const tasks = Array.from(this.customMaintenanceTasks.values());
    return tasks.filter(task => {
      if (homeownerId && task.homeownerId !== homeownerId) return false;
      if (houseId && task.houseId !== houseId && task.houseId !== null) return false;
      return true;
    });
  }

  async getCustomMaintenanceTask(id: string): Promise<CustomMaintenanceTask | undefined> {
    return this.customMaintenanceTasks.get(id);
  }

  async createCustomMaintenanceTask(taskData: InsertCustomMaintenanceTask): Promise<CustomMaintenanceTask> {
    const id = randomUUID();
    const now = new Date();
    const task: CustomMaintenanceTask = {
      id,
      ...taskData,
      houseId: taskData.houseId || null,
      priority: taskData.priority || 'medium',
      estimatedTime: taskData.estimatedTime || null,
      difficulty: taskData.difficulty || 'easy',
      tools: taskData.tools || null,
      cost: taskData.cost || null,
      frequencyValue: taskData.frequencyValue || null,
      specificMonths: taskData.specificMonths || null,
      isActive: taskData.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.customMaintenanceTasks.set(id, task);
    return task;
  }

  async updateCustomMaintenanceTask(id: string, taskData: Partial<InsertCustomMaintenanceTask>): Promise<CustomMaintenanceTask | undefined> {
    const existingTask = this.customMaintenanceTasks.get(id);
    if (!existingTask) {
      return undefined;
    }

    const updated: CustomMaintenanceTask = {
      ...existingTask,
      ...taskData,
      updatedAt: new Date(),
    };
    this.customMaintenanceTasks.set(id, updated);
    return updated;
  }

  async deleteCustomMaintenanceTask(id: string): Promise<boolean> {
    return this.customMaintenanceTasks.delete(id);
  }

  // House methods
  async getHouses(homeownerId?: string): Promise<House[]> {
    const houses = Array.from(this.houses.values());
    if (homeownerId) {
      return houses.filter(house => house.homeownerId === homeownerId);
    }
    return houses;
  }

  async getHouse(id: string): Promise<House | undefined> {
    return this.houses.get(id);
  }

  async createHouse(house: InsertHouse): Promise<House> {
    const id = randomUUID();
    const newHouse: House = {
      ...house,
      id,
      isDefault: house.isDefault ?? false,
      createdAt: new Date(),
    };
    this.houses.set(id, newHouse);
    return newHouse;
  }

  async updateHouse(id: string, house: Partial<InsertHouse>): Promise<House | undefined> {
    const existing = this.houses.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: House = {
      ...existing,
      ...house,
    };
    this.houses.set(id, updated);
    return updated;
  }

  async deleteHouse(id: string): Promise<boolean> {
    return this.houses.delete(id);
  }

  async getDefaultHouse(homeownerId: string): Promise<House | undefined> {
    const houses = Array.from(this.houses.values());
    return houses.find(house => house.homeownerId === homeownerId && house.isDefault);
  }

  // Contractor appointment methods
  async getContractorAppointments(homeownerId?: string, houseId?: string): Promise<ContractorAppointment[]> {
    const appointments = Array.from(this.contractorAppointments.values());
    let filtered = appointments;
    
    if (homeownerId) {
      filtered = filtered.filter(appointment => appointment.homeownerId === homeownerId);
    }
    
    if (houseId) {
      filtered = filtered.filter(appointment => appointment.houseId === houseId);
    }
    
    return filtered.sort((a, b) => new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime());
  }

  async getContractorAppointment(id: string): Promise<ContractorAppointment | undefined> {
    return this.contractorAppointments.get(id);
  }

  async createContractorAppointment(appointment: InsertContractorAppointment): Promise<ContractorAppointment> {
    const id = randomUUID();
    const newAppointment: ContractorAppointment = {
      ...appointment,
      id,
      contractorId: appointment.contractorId ?? null,
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
      houseId: notification.houseId ?? null,
      appointmentId: notification.appointmentId ?? null,
      maintenanceTaskId: notification.maintenanceTaskId ?? null,
      sentAt: notification.sentAt ?? null,
      isRead: notification.isRead ?? false,
      priority: notification.priority ?? "medium",
      actionUrl: notification.actionUrl ?? null,
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
        maintenanceTaskId: null,
        type: "24_hour",
        category: "appointment",
        title: "Contractor Visit Tomorrow",
        message: `${appointment.contractorName} is scheduled to visit tomorrow at ${appointmentDateTime.toLocaleTimeString()} for ${appointment.serviceDescription}.`,
        scheduledFor: twentyFourHourNotification.toISOString(),
        isRead: false,
        sentAt: null,
        priority: "medium",
        actionUrl: null,
      });
    }
    
    // Create 4-hour notification
    const fourHourNotification = new Date(appointmentDateTime.getTime() - 4 * 60 * 60 * 1000);
    if (fourHourNotification > now) {
      await this.createNotification({
        homeownerId: appointment.homeownerId,
        appointmentId: appointment.id,
        maintenanceTaskId: null,
        type: "4_hour",
        category: "appointment",
        title: "Contractor Visit in 4 Hours",
        message: `${appointment.contractorName} will arrive in 4 hours at ${appointmentDateTime.toLocaleTimeString()} for ${appointment.serviceDescription}.`,
        scheduledFor: fourHourNotification.toISOString(),
        isRead: false,
        sentAt: null,
        priority: "high",
        actionUrl: null,
      });
    }
    
    // Create 1-hour notification
    const oneHourNotification = new Date(appointmentDateTime.getTime() - 60 * 60 * 1000);
    if (oneHourNotification > now) {
      await this.createNotification({
        homeownerId: appointment.homeownerId,
        appointmentId: appointment.id,
        maintenanceTaskId: null,
        type: "1_hour",
        category: "appointment",
        title: "Contractor Arriving Soon",
        message: `${appointment.contractorName} will arrive in 1 hour at ${appointmentDateTime.toLocaleTimeString()}. Please ensure someone is home to let them in.`,
        scheduledFor: oneHourNotification.toISOString(),
        isRead: false,
        sentAt: null,
        priority: "high",
        actionUrl: null,
      });
    }
  }

  // New method to create maintenance task notifications
  async createMaintenanceNotifications(homeownerId: string, tasks: any[]): Promise<void> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    
    // Get tasks for current month that haven't been completed
    const pendingTasks = tasks.filter(task => task.month === currentMonth);
    
    for (const task of pendingTasks) {
      // Check if notification already exists for this task
      const existingNotifications = Array.from(this.notifications.values()).filter(n => 
        n.homeownerId === homeownerId && 
        n.maintenanceTaskId === task.id &&
        !n.isRead
      );
      
      if (existingNotifications.length === 0) {
        // Create notification based on task priority
        const priority = task.priority === 'high' ? 'high' : task.priority === 'low' ? 'low' : 'medium';
        const daysUntilEndOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
        
        let notificationType = "maintenance_due";
        let title = "Maintenance Task Due";
        let message = `${task.title} is due this month. Estimated time: ${task.estimatedTime}.`;
        
        // Make it overdue if we're in the last week of the month
        if (daysUntilEndOfMonth <= 7) {
          notificationType = "maintenance_overdue";
          title = "Maintenance Task Overdue";
          message = `${task.title} is overdue! Only ${daysUntilEndOfMonth} days left this month. Estimated time: ${task.estimatedTime}.`;
        }
        
        await this.createNotification({
          homeownerId,
          appointmentId: null,
          maintenanceTaskId: task.id,
          type: notificationType,
          category: "maintenance",
          title,
          message,
          scheduledFor: now.toISOString(),
          isRead: false,
          sentAt: null,
          priority,
          actionUrl: "/maintenance",
        });
      }
    }
  }

  // Method to get pending maintenance notifications
  async getMaintenanceNotifications(homeownerId: string): Promise<Notification[]> {
    const notifications = Array.from(this.notifications.values());
    return notifications.filter(notification => 
      notification.homeownerId === homeownerId && 
      notification.category === "maintenance" &&
      !notification.isRead
    );
  }

  // Helper method to update notifications when appointment time changes
  private async updateAppointmentNotifications(appointment: ContractorAppointment): Promise<void> {
    // Delete existing notifications for this appointment
    const existingNotifications = Array.from(this.notifications.values()).filter(n => n.appointmentId === appointment.id);
    existingNotifications.forEach(notification => this.notifications.delete(notification.id));
    
    // Create new notifications with updated times
    await this.createAppointmentNotifications(appointment);
  }

  // Search methods
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
      
      // Only show contractors whose service area overlaps with homeowner's location
      // This means the contractor's service radius must be >= the distance to the homeowner
      const withinServiceArea = !contractor.distance || contractor.serviceRadius >= parseFloat(contractor.distance);
      
      return matchesQuery && matchesLocation && withinServiceArea;
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

  // Contractor profile methods
  async getContractorProfile(contractorId: string): Promise<Contractor | undefined> {
    return this.contractors.get(contractorId);
  }

  async updateContractorProfile(contractorId: string, profileData: Partial<InsertContractor>): Promise<Contractor> {
    const existingContractor = this.contractors.get(contractorId);
    if (!existingContractor) {
      throw new Error('Contractor not found');
    }

    const updatedContractor: Contractor = {
      ...existingContractor,
      ...profileData,
      businessLogo: profileData.businessLogo ?? existingContractor.businessLogo,
      projectPhotos: profileData.projectPhotos ?? existingContractor.projectPhotos,
    };

    this.contractors.set(contractorId, updatedContractor);
    return updatedContractor;
  }

  // Service record operations
  async getServiceRecords(contractorId?: string, homeownerId?: string): Promise<ServiceRecord[]> {
    let filtered = this.serviceRecords;
    
    if (contractorId) {
      filtered = filtered.filter(record => record.contractorId === contractorId);
    }
    
    if (homeownerId) {
      filtered = filtered.filter(record => record.homeownerId === homeownerId && record.isVisibleToHomeowner);
    }
    
    return filtered;
  }

  async getHomeownerServiceRecords(homeownerId: string): Promise<ServiceRecord[]> {
    return this.serviceRecords.filter(record => 
      record.homeownerId === homeownerId && record.isVisibleToHomeowner !== false
    );
  }

  async getServiceRecord(id: string): Promise<ServiceRecord | undefined> {
    return this.serviceRecords.find(record => record.id === id);
  }

  async createServiceRecord(serviceRecord: InsertServiceRecord): Promise<ServiceRecord> {
    const newRecord: ServiceRecord = {
      ...serviceRecord,
      id: randomUUID(),
      homeownerId: serviceRecord.homeownerId ?? null,
      customerPhone: serviceRecord.customerPhone ?? null,
      customerEmail: serviceRecord.customerEmail ?? null,
      cost: serviceRecord.cost ?? "0",
      status: serviceRecord.status ?? "completed",
      notes: serviceRecord.notes ?? null,
      materialsUsed: serviceRecord.materialsUsed ?? [],
      duration: serviceRecord.duration ?? null,
      warrantyPeriod: serviceRecord.warrantyPeriod ?? null,
      followUpDate: serviceRecord.followUpDate ?? null,
      isVisibleToHomeowner: serviceRecord.isVisibleToHomeowner ?? true,
      createdAt: new Date(),
    };
    this.serviceRecords.push(newRecord);
    return newRecord;
  }

  async updateServiceRecord(id: string, serviceRecord: Partial<InsertServiceRecord>): Promise<ServiceRecord | undefined> {
    const index = this.serviceRecords.findIndex(record => record.id === id);
    if (index !== -1) {
      this.serviceRecords[index] = { ...this.serviceRecords[index], ...serviceRecord };
      return this.serviceRecords[index];
    }
    return undefined;
  }

  async deleteServiceRecord(id: string): Promise<boolean> {
    const index = this.serviceRecords.findIndex(record => record.id === id);
    if (index !== -1) {
      this.serviceRecords.splice(index, 1);
      return true;
    }
    return false;
  }

  async getCustomerServiceRecords(customerId?: string, customerEmail?: string, customerAddress?: string): Promise<ServiceRecord[]> {
    // For demo purposes, return all service records with contractor details
    // In a real app, you'd filter by customer info from the authenticated user
    return this.serviceRecords.map(record => ({
      ...record,
      contractorName: "Mike Johnson", // Add contractor name from contractors table
      contractorCompany: "Johnson Home Services"
    } as any));
  }

  // Messaging operations
  async getConversations(userId: string, userType: 'homeowner' | 'contractor'): Promise<(Conversation & { otherPartyName: string; unreadCount: number })[]> {
    const conversations = Array.from(this.conversations.values());
    const userConversations = conversations.filter(conv => 
      userType === 'homeowner' ? conv.homeownerId === userId : conv.contractorId === userId
    );

    // Get conversation details with other party name and unread count
    const enrichedConversations = await Promise.all(
      userConversations.map(async (conv) => {
        // Get other party info
        let otherPartyName = "Unknown";
        if (userType === 'homeowner') {
          const contractor = this.contractors.get(conv.contractorId);
          otherPartyName = contractor?.name || "Contractor";
        } else {
          const homeowner = this.users.get(conv.homeownerId);
          otherPartyName = homeowner?.firstName || homeowner?.email || "Homeowner";
        }

        // Count unread messages
        const messages = Array.from(this.messages.values()).filter(m => m.conversationId === conv.id);
        const unreadCount = messages.filter(m => !m.isRead && m.senderId !== userId).length;

        return {
          ...conv,
          otherPartyName,
          unreadCount
        };
      })
    );

    return enrichedConversations.sort((a, b) => 
      new Date(b.lastMessageAt || b.createdAt || new Date()).getTime() - 
      new Date(a.lastMessageAt || a.createdAt || new Date()).getTime()
    );
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const newConversation: Conversation = {
      ...conversation,
      id,
      status: conversation.status ?? "active",
      lastMessageAt: new Date(),
      createdAt: new Date()
    };
    this.conversations.set(id, newConversation);
    return newConversation;
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    const messages = Array.from(this.messages.values());
    return messages
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt || new Date()).getTime() - new Date(b.createdAt || new Date()).getTime());
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const newMessage: Message = {
      ...message,
      id,
      isRead: message.isRead ?? false,
      readAt: null,
      createdAt: new Date()
    };
    this.messages.set(id, newMessage);

    // Update conversation's lastMessageAt
    const conversation = this.conversations.get(message.conversationId);
    if (conversation) {
      conversation.lastMessageAt = new Date();
      this.conversations.set(conversation.id, conversation);
    }

    return newMessage;
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    const messages = Array.from(this.messages.values()).filter(m => 
      m.conversationId === conversationId && m.senderId !== userId && !m.isRead
    );

    messages.forEach(message => {
      message.isRead = true;
      message.readAt = new Date();
      this.messages.set(message.id, message);
    });
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const messages = Array.from(this.messages.values());
    return messages.filter(m => m.senderId !== userId && !m.isRead).length;
  }

  // Review methods
  async getContractorReviews(contractorId: string): Promise<ContractorReview[]> {
    const reviews = Array.from(this.contractorReviews.values());
    return reviews
      .filter(review => review.contractorId === contractorId)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  async getReviewsByHomeowner(homeownerId: string): Promise<ContractorReview[]> {
    const reviews = Array.from(this.contractorReviews.values());
    return reviews
      .filter(review => review.homeownerId === homeownerId)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  async createContractorReview(reviewData: InsertContractorReview): Promise<ContractorReview> {
    const id = randomUUID();
    const review: ContractorReview = {
      ...reviewData,
      id,
      comment: reviewData.comment || null,
      serviceDate: reviewData.serviceDate || null,
      serviceType: reviewData.serviceType || null,
      wouldRecommend: reviewData.wouldRecommend ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.contractorReviews.set(id, review);
    
    // Update contractor's average rating
    await this.updateContractorRating(reviewData.contractorId);
    
    return review;
  }

  async updateContractorReview(id: string, reviewData: Partial<InsertContractorReview>): Promise<ContractorReview | undefined> {
    const existing = this.contractorReviews.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: ContractorReview = {
      ...existing,
      ...reviewData,
      updatedAt: new Date(),
    };
    this.contractorReviews.set(id, updated);
    
    // Update contractor's average rating
    await this.updateContractorRating(existing.contractorId);
    
    return updated;
  }

  async deleteContractorReview(id: string): Promise<boolean> {
    const review = this.contractorReviews.get(id);
    if (!review) {
      return false;
    }
    
    const deleted = this.contractorReviews.delete(id);
    if (deleted) {
      // Update contractor's average rating
      await this.updateContractorRating(review.contractorId);
    }
    
    return deleted;
  }

  async getContractorAverageRating(contractorId: string): Promise<{ averageRating: number; totalReviews: number }> {
    const reviews = await this.getContractorReviews(contractorId);
    const totalReviews = reviews.length;
    
    if (totalReviews === 0) {
      return { averageRating: 0, totalReviews: 0 };
    }
    
    const sum = reviews.reduce((total, review) => total + review.rating, 0);
    const averageRating = Math.round((sum / totalReviews) * 10) / 10; // Round to 1 decimal place
    
    return { averageRating, totalReviews };
  }

  // Helper method to update contractor's rating in the contractors table
  private async updateContractorRating(contractorId: string): Promise<void> {
    const contractor = this.contractors.get(contractorId);
    if (!contractor) {
      return;
    }
    
    const { averageRating, totalReviews } = await this.getContractorAverageRating(contractorId);
    
    const updatedContractor: Contractor = {
      ...contractor,
      rating: averageRating.toString(),
      reviewCount: totalReviews,
    };
    
    this.contractors.set(contractorId, updatedContractor);
  }

  // Proposal methods
  async getProposals(contractorId?: string, homeownerId?: string): Promise<Proposal[]> {
    let proposals = Array.from(this.proposals.values());
    
    if (contractorId) {
      proposals = proposals.filter(proposal => proposal.contractorId === contractorId);
    }
    
    if (homeownerId) {
      proposals = proposals.filter(proposal => proposal.homeownerId === homeownerId);
    }
    
    return proposals.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  async getProposal(id: string): Promise<Proposal | undefined> {
    return this.proposals.get(id);
  }

  async createProposal(proposalData: InsertProposal): Promise<Proposal> {
    const id = randomUUID();
    const proposal: Proposal = {
      ...proposalData,
      id,
      materials: proposalData.materials || [],
      warrantyPeriod: proposalData.warrantyPeriod || null,
      customerNotes: proposalData.customerNotes || null,
      internalNotes: proposalData.internalNotes || null,
      homeownerId: proposalData.homeownerId || null,
      status: proposalData.status || 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.proposals.set(id, proposal);
    return proposal;
  }

  async updateProposal(id: string, proposalData: Partial<InsertProposal>): Promise<Proposal | undefined> {
    const existing = this.proposals.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: Proposal = {
      ...existing,
      ...proposalData,
      updatedAt: new Date(),
    };
    this.proposals.set(id, updated);
    return updated;
  }

  async deleteProposal(id: string): Promise<boolean> {
    return this.proposals.delete(id);
  }

  private seedServiceRecords() {
    this.serviceRecords = [
      {
        id: "service-1",
        contractorId: "1",
        homeownerId: "demo-homeowner-123",
        customerName: "John Smith",
        customerAddress: "123 Oak Street, Seattle, WA",
        customerPhone: "(555) 123-4567",
        customerEmail: "john.smith@email.com",
        serviceType: "HVAC Service",
        serviceDescription: "Annual HVAC system inspection and maintenance. Cleaned filters, checked refrigerant levels, and tested all components.",
        serviceDate: "2025-01-15",
        duration: "2 hours",
        cost: "175.00",
        status: "completed",
        notes: "System running efficiently. Recommended filter replacement in 3 months.",
        materialsUsed: ["HVAC Filter", "Refrigerant R-410A"],
        warrantyPeriod: "90 days",
        followUpDate: "2025-04-15",
        isVisibleToHomeowner: true,
        createdAt: new Date("2025-01-15T10:00:00"),
      },
      {
        id: "service-2",
        contractorId: "2",
        homeownerId: "demo-homeowner-123",
        customerName: "John Smith",
        customerAddress: "123 Oak Street, Seattle, WA",
        customerPhone: "(555) 123-4567",
        customerEmail: "john.smith@email.com",
        serviceType: "Plumbing Repair",
        serviceDescription: "Fixed leaking kitchen faucet and replaced worn-out gaskets.",
        serviceDate: "2025-01-20",
        duration: "1.5 hours",
        cost: "125.00",
        status: "completed",
        notes: "Customer satisfied with repair. No additional issues found.",
        materialsUsed: ["Faucet Gasket", "Plumber's Tape"],
        warrantyPeriod: "1 year",
        followUpDate: null,
        isVisibleToHomeowner: true,
        createdAt: new Date("2025-01-20T14:30:00"),
      },
      {
        id: "service-3",
        contractorId: "3",
        homeownerId: "demo-homeowner-123",
        customerName: "John Smith",
        customerAddress: "123 Oak Street, Seattle, WA",
        customerPhone: "(555) 123-4567",
        customerEmail: "john.smith@email.com",
        serviceType: "Electrical Inspection",
        serviceDescription: "Complete electrical system safety inspection and code compliance check.",
        serviceDate: "2025-01-28",
        duration: "3 hours",
        cost: "225.00",
        status: "completed",
        notes: "All systems pass inspection. Recommended upgrading two older outlets.",
        materialsUsed: ["Testing Equipment", "Labels"],
        warrantyPeriod: "6 months",
        followUpDate: "2025-07-28",
        isVisibleToHomeowner: true,
        createdAt: new Date("2025-01-28T09:00:00"),
      },
      {
        id: "service-4",
        contractorId: "1",
        homeownerId: "demo-homeowner-456",
        customerName: "Emily Davis",
        customerAddress: "789 Maple Dr, Seattle, WA",
        customerPhone: "(555) 246-8135",
        customerEmail: "emily.davis@email.com",
        serviceType: "Gutter Cleaning",
        serviceDescription: "Complete gutter cleaning and minor repair work on downspouts.",
        serviceDate: "2025-01-25",
        duration: "2.5 hours",
        cost: "150.00",
        status: "completed",
        notes: "Gutters cleaned thoroughly. Replaced one damaged section of downspout.",
        materialsUsed: ["Downspout Section", "Gutter Sealant"],
        warrantyPeriod: "3 months",
        followUpDate: null,
        isVisibleToHomeowner: true,
        createdAt: new Date("2025-01-25T11:00:00"),
      }
    ];
  }

  private seedReviews() {
    const reviews: ContractorReview[] = [
      {
        id: "review-1",
        contractorId: "1",
        homeownerId: "demo-homeowner-123",
        rating: 5,
        comment: "Mike did an excellent job installing our new gutters. He was professional, punctual, and cleaned up everything afterwards. The gutters have been working perfectly through several heavy rainstorms. Highly recommend!",
        serviceType: "Gutter Installation",
        serviceDate: new Date("2024-11-15"),
        wouldRecommend: true,
        createdAt: new Date("2024-11-20"),
        updatedAt: new Date("2024-11-20"),
      },
      {
        id: "review-2", 
        contractorId: "1",
        homeownerId: "demo-homeowner-456",
        rating: 4,
        comment: "Good work on the HVAC maintenance. Arrived on time and explained everything clearly. Only minor issue was that it took a bit longer than expected, but the quality was solid.",
        serviceType: "HVAC Maintenance",
        serviceDate: new Date("2024-12-02"),
        wouldRecommend: true,
        createdAt: new Date("2024-12-05"),
        updatedAt: new Date("2024-12-05"),
      },
      {
        id: "review-3",
        contractorId: "2", 
        homeownerId: "demo-homeowner-789",
        rating: 5,
        comment: "Sarah's drywall repair work is exceptional. You can't even tell where the damage was! She's meticulous and takes pride in her work. Will definitely hire again.",
        serviceType: "Drywall / Spackling Repair",
        serviceDate: new Date("2024-10-28"),
        wouldRecommend: true,
        createdAt: new Date("2024-11-01"),
        updatedAt: new Date("2024-11-01"),
      },
      {
        id: "review-4",
        contractorId: "3",
        homeownerId: "demo-homeowner-321",
        rating: 3,
        comment: "The electrical work was done properly and safely, but communication could have been better. Had to follow up several times to get updates on the schedule.",
        serviceType: "Electrical Repair",
        serviceDate: new Date("2024-12-10"),
        wouldRecommend: false,
        createdAt: new Date("2024-12-15"),
        updatedAt: new Date("2024-12-15"),
      }
    ];

    reviews.forEach(review => {
      this.contractorReviews.set(review.id, review);
    });
    
    // Update contractor ratings based on reviews
    this.updateContractorRating("1");
    this.updateContractorRating("2");  
    this.updateContractorRating("3");
  }

  // Home System operations
  async getHomeSystems(homeownerId?: string, houseId?: string): Promise<HomeSystem[]> {
    const allSystems = Array.from(this.homeSystems.values());
    let filtered = allSystems;

    if (homeownerId) {
      filtered = filtered.filter(system => system.homeownerId === homeownerId);
    }

    if (houseId) {
      filtered = filtered.filter(system => system.houseId === houseId);
    }

    return filtered;
  }

  async getHomeSystem(id: string): Promise<HomeSystem | undefined> {
    return this.homeSystems.get(id);
  }

  async createHomeSystem(systemData: InsertHomeSystem): Promise<HomeSystem> {
    const id = randomUUID();
    const system: HomeSystem = {
      ...systemData,
      id,
      brand: systemData.brand ?? null,
      model: systemData.model ?? null,
      notes: systemData.notes ?? null,
      installationYear: systemData.installationYear ?? null,
      lastServiceYear: systemData.lastServiceYear ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.homeSystems.set(id, system);
    return system;
  }

  async updateHomeSystem(id: string, systemData: Partial<InsertHomeSystem>): Promise<HomeSystem | undefined> {
    const existing = this.homeSystems.get(id);
    if (!existing) return undefined;

    const updated: HomeSystem = {
      ...existing,
      ...systemData,
      updatedAt: new Date(),
    };
    this.homeSystems.set(id, updated);
    return updated;
  }

  async deleteHomeSystem(id: string): Promise<boolean> {
    return this.homeSystems.delete(id);
  }

  // Push subscription methods
  async getPushSubscriptions(userId?: string): Promise<PushSubscription[]> {
    const subscriptions = Array.from(this.pushSubscriptions.values());
    if (userId) {
      return subscriptions.filter(sub => sub.userId === userId && sub.isActive);
    }
    return subscriptions.filter(sub => sub.isActive);
  }

  async getPushSubscription(id: string): Promise<PushSubscription | undefined> {
    return this.pushSubscriptions.get(id);
  }

  async createPushSubscription(subscriptionData: InsertPushSubscription): Promise<PushSubscription> {
    const id = randomUUID();
    const now = new Date();
    const subscription: PushSubscription = {
      id,
      ...subscriptionData,
      userAgent: subscriptionData.userAgent || null,
      isActive: subscriptionData.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.pushSubscriptions.set(id, subscription);
    return subscription;
  }

  async updatePushSubscription(id: string, subscriptionData: Partial<InsertPushSubscription>): Promise<PushSubscription | undefined> {
    const existingSubscription = this.pushSubscriptions.get(id);
    if (!existingSubscription) {
      return undefined;
    }

    const updated: PushSubscription = {
      ...existingSubscription,
      ...subscriptionData,
      updatedAt: new Date(),
    };
    this.pushSubscriptions.set(id, updated);
    return updated;
  }

  async deletePushSubscription(id: string): Promise<boolean> {
    return this.pushSubscriptions.delete(id);
  }

  async deletePushSubscriptionByEndpoint(endpoint: string): Promise<boolean> {
    const subscriptions = Array.from(this.pushSubscriptions.entries());
    const subscription = subscriptions.find(([_, sub]) => sub.endpoint === endpoint);
    
    if (subscription) {
      return this.pushSubscriptions.delete(subscription[0]);
    }
    return false;
  }

  // AI Maintenance helper methods
  async getHousesByHomeowner(homeownerId: string): Promise<House[]> {
    return Array.from(this.houses.values()).filter(house => house.homeownerId === homeownerId);
  }

  async getHomeSystemsByHomeowner(homeownerId: string): Promise<HomeSystem[]> {
    return Array.from(this.homeSystems.values()).filter(system => system.homeownerId === homeownerId);
  }

  async getMaintenanceLogsByHomeowner(homeownerId: string): Promise<MaintenanceLog[]> {
    return Array.from(this.maintenanceLogs.values()).filter(log => log.homeownerId === homeownerId);
  }
}

export const storage = new MemStorage();
