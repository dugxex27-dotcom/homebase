import { db } from './db';
import { securityAuditLogs, securitySessions, rateLimitTracking } from '@shared/schema';
import type { InsertSecurityAuditLog, InsertSecuritySession, InsertRateLimitTracking } from '@shared/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Event types for SOC 2 compliance
export const AuditEventTypes = {
  // Authentication events
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_FAILED_LOGIN: 'auth.failed_login',
  AUTH_PASSWORD_CHANGE: 'auth.password_change',
  AUTH_PASSWORD_RESET_REQUEST: 'auth.password_reset_request',
  AUTH_PASSWORD_RESET_COMPLETE: 'auth.password_reset_complete',
  AUTH_SESSION_CREATED: 'auth.session_created',
  AUTH_SESSION_EXPIRED: 'auth.session_expired',
  AUTH_SESSION_TERMINATED: 'auth.session_terminated',
  
  // Data access events
  DATA_ACCESS: 'data.access',
  DATA_EXPORT: 'data.export',
  DATA_SEARCH: 'data.search',
  
  // Data modification events
  DATA_CREATE: 'data.create',
  DATA_MODIFY: 'data.modify',
  DATA_DELETE: 'data.delete',
  
  // Admin events
  ADMIN_USER_CREATE: 'admin.user_create',
  ADMIN_USER_MODIFY: 'admin.user_modify',
  ADMIN_USER_DELETE: 'admin.user_delete',
  ADMIN_ROLE_CHANGE: 'admin.role_change',
  ADMIN_PERMISSION_CHANGE: 'admin.permission_change',
  ADMIN_SETTINGS_CHANGE: 'admin.settings_change',
  ADMIN_FORCE_LOGOUT: 'admin.force_logout',
  ADMIN_DATA_EXPORT: 'admin.data_export',
  
  // Security events
  SECURITY_RATE_LIMIT: 'security.rate_limit',
  SECURITY_SUSPICIOUS_ACTIVITY: 'security.suspicious_activity',
  SECURITY_IP_BLOCKED: 'security.ip_blocked',
  SECURITY_BRUTE_FORCE_DETECTED: 'security.brute_force_detected',
} as const;

export const AuditEventCategories = {
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  DATA_ACCESS: 'data_access',
  DATA_MODIFICATION: 'data_modification',
  ADMIN: 'admin',
  SECURITY: 'security',
} as const;

export const AuditSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
} as const;

// Helper to get category from event type
function getCategoryFromEventType(eventType: string): string {
  if (eventType.startsWith('auth.')) return AuditEventCategories.AUTHENTICATION;
  if (eventType.startsWith('data.access') || eventType.startsWith('data.export') || eventType.startsWith('data.search')) {
    return AuditEventCategories.DATA_ACCESS;
  }
  if (eventType.startsWith('data.')) return AuditEventCategories.DATA_MODIFICATION;
  if (eventType.startsWith('admin.')) return AuditEventCategories.ADMIN;
  if (eventType.startsWith('security.')) return AuditEventCategories.SECURITY;
  return AuditEventCategories.DATA_ACCESS;
}

// Helper to determine severity from event type
function getSeverityFromEventType(eventType: string): string {
  const criticalEvents = [
    AuditEventTypes.AUTH_PASSWORD_CHANGE,
    AuditEventTypes.ADMIN_USER_DELETE,
    AuditEventTypes.ADMIN_ROLE_CHANGE,
    AuditEventTypes.SECURITY_BRUTE_FORCE_DETECTED,
  ];
  
  const warningEvents = [
    AuditEventTypes.AUTH_FAILED_LOGIN,
    AuditEventTypes.SECURITY_RATE_LIMIT,
    AuditEventTypes.SECURITY_SUSPICIOUS_ACTIVITY,
    AuditEventTypes.DATA_DELETE,
  ];
  
  const errorEvents = [
    AuditEventTypes.SECURITY_IP_BLOCKED,
  ];
  
  if (criticalEvents.includes(eventType as any)) return AuditSeverity.CRITICAL;
  if (errorEvents.includes(eventType as any)) return AuditSeverity.ERROR;
  if (warningEvents.includes(eventType as any)) return AuditSeverity.WARNING;
  return AuditSeverity.INFO;
}

// Parse user agent for device info
function parseUserAgent(userAgent?: string): { deviceType: string; browser: string; os: string } {
  if (!userAgent) {
    return { deviceType: 'unknown', browser: 'unknown', os: 'unknown' };
  }
  
  let deviceType = 'desktop';
  if (/mobile/i.test(userAgent)) deviceType = 'mobile';
  else if (/tablet|ipad/i.test(userAgent)) deviceType = 'tablet';
  
  let browser = 'unknown';
  if (/chrome/i.test(userAgent) && !/edge/i.test(userAgent)) browser = 'Chrome';
  else if (/firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';
  else if (/edge/i.test(userAgent)) browser = 'Edge';
  
  let os = 'unknown';
  if (/windows/i.test(userAgent)) os = 'Windows';
  else if (/mac/i.test(userAgent)) os = 'macOS';
  else if (/linux/i.test(userAgent)) os = 'Linux';
  else if (/android/i.test(userAgent)) os = 'Android';
  else if (/ios|iphone|ipad/i.test(userAgent)) os = 'iOS';
  
  return { deviceType, browser, os };
}

// Get client IP from request
export function getClientIP(req: any): string | undefined {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress;
}

// Security Audit Logger class
export class SecurityAuditLogger {
  private static instance: SecurityAuditLogger;
  
  private constructor() {}
  
  static getInstance(): SecurityAuditLogger {
    if (!SecurityAuditLogger.instance) {
      SecurityAuditLogger.instance = new SecurityAuditLogger();
    }
    return SecurityAuditLogger.instance;
  }
  
  // Log a security event
  async log(params: {
    eventType: string;
    action: string;
    userId?: string;
    userEmail?: string;
    userRole?: string;
    targetUserId?: string;
    targetResourceType?: string;
    targetResourceId?: string;
    actionDetails?: Record<string, any>;
    req?: any; // Express request object
    responseStatus?: number;
    errorMessage?: string;
    severity?: string;
    isAnomaly?: boolean;
    riskScore?: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const requestId = randomUUID();
      const eventCategory = getCategoryFromEventType(params.eventType);
      const severity = params.severity || getSeverityFromEventType(params.eventType);
      
      const logEntry: InsertSecurityAuditLog = {
        eventType: params.eventType,
        eventCategory,
        severity,
        userId: params.userId || null,
        userEmail: params.userEmail || null,
        userRole: params.userRole || null,
        targetUserId: params.targetUserId || null,
        targetResourceType: params.targetResourceType || null,
        targetResourceId: params.targetResourceId || null,
        action: params.action,
        actionDetails: params.actionDetails || null,
        ipAddress: params.req ? getClientIP(params.req) : null,
        userAgent: params.req?.headers?.['user-agent'] || null,
        sessionId: params.req?.sessionID || params.req?.session?.id || null,
        requestMethod: params.req?.method || null,
        requestPath: params.req?.originalUrl || params.req?.path || null,
        requestId,
        responseStatus: params.responseStatus || null,
        errorMessage: params.errorMessage || null,
        geoLocation: null, // Would need GeoIP service
        deviceFingerprint: params.req?.headers?.['x-device-fingerprint'] || null,
        riskScore: params.riskScore || null,
        isAnomaly: params.isAnomaly || false,
        metadata: params.metadata || null,
      };
      
      await db.insert(securityAuditLogs).values(logEntry);
      
      // Log to console for immediate visibility in development
      const logLevel = severity === 'critical' || severity === 'error' ? 'error' : 
                       severity === 'warning' ? 'warn' : 'log';
      console[logLevel](`[SECURITY AUDIT] ${params.eventType}: ${params.action}`, {
        userId: params.userId,
        ip: logEntry.ipAddress,
        severity,
      });
    } catch (error) {
      // Never fail the main operation due to audit logging failure
      console.error('[SECURITY AUDIT ERROR] Failed to log security event:', error);
    }
  }
  
  // Log authentication events
  async logLogin(userId: string, userEmail: string, userRole: string, req: any, success: boolean): Promise<void> {
    await this.log({
      eventType: success ? AuditEventTypes.AUTH_LOGIN : AuditEventTypes.AUTH_FAILED_LOGIN,
      action: success ? 'User logged in successfully' : 'Login attempt failed',
      userId: success ? userId : undefined,
      userEmail,
      userRole: success ? userRole : undefined,
      req,
      responseStatus: success ? 200 : 401,
      errorMessage: success ? undefined : 'Invalid credentials',
      severity: success ? AuditSeverity.INFO : AuditSeverity.WARNING,
    });
  }
  
  async logLogout(userId: string, userEmail: string, userRole: string, req: any): Promise<void> {
    await this.log({
      eventType: AuditEventTypes.AUTH_LOGOUT,
      action: 'User logged out',
      userId,
      userEmail,
      userRole,
      req,
      responseStatus: 200,
    });
  }
  
  async logPasswordChange(userId: string, userEmail: string, req: any): Promise<void> {
    await this.log({
      eventType: AuditEventTypes.AUTH_PASSWORD_CHANGE,
      action: 'User changed password',
      userId,
      userEmail,
      req,
      responseStatus: 200,
      severity: AuditSeverity.CRITICAL,
    });
  }
  
  // Log data access events
  async logDataAccess(params: {
    userId: string;
    userEmail: string;
    userRole: string;
    resourceType: string;
    resourceId?: string;
    action: string;
    req: any;
  }): Promise<void> {
    await this.log({
      eventType: AuditEventTypes.DATA_ACCESS,
      action: params.action,
      userId: params.userId,
      userEmail: params.userEmail,
      userRole: params.userRole,
      targetResourceType: params.resourceType,
      targetResourceId: params.resourceId,
      req: params.req,
      responseStatus: 200,
    });
  }
  
  // Log data modification events
  async logDataModification(params: {
    userId: string;
    userEmail: string;
    userRole: string;
    resourceType: string;
    resourceId: string;
    action: 'create' | 'modify' | 'delete';
    details?: Record<string, any>;
    req: any;
  }): Promise<void> {
    const eventType = params.action === 'create' ? AuditEventTypes.DATA_CREATE :
                      params.action === 'modify' ? AuditEventTypes.DATA_MODIFY :
                      AuditEventTypes.DATA_DELETE;
    
    await this.log({
      eventType,
      action: `${params.action.charAt(0).toUpperCase() + params.action.slice(1)}d ${params.resourceType}`,
      userId: params.userId,
      userEmail: params.userEmail,
      userRole: params.userRole,
      targetResourceType: params.resourceType,
      targetResourceId: params.resourceId,
      actionDetails: params.details,
      req: params.req,
      responseStatus: 200,
    });
  }
  
  // Log admin actions
  async logAdminAction(params: {
    userId: string;
    userEmail: string;
    eventType: string;
    action: string;
    targetUserId?: string;
    details?: Record<string, any>;
    req: any;
  }): Promise<void> {
    await this.log({
      eventType: params.eventType,
      action: params.action,
      userId: params.userId,
      userEmail: params.userEmail,
      userRole: 'admin',
      targetUserId: params.targetUserId,
      actionDetails: params.details,
      req: params.req,
      severity: AuditSeverity.CRITICAL,
    });
  }
  
  // Log security events
  async logSecurityEvent(params: {
    eventType: string;
    action: string;
    userId?: string;
    userEmail?: string;
    details?: Record<string, any>;
    req: any;
    riskScore?: number;
    isAnomaly?: boolean;
  }): Promise<void> {
    await this.log({
      eventType: params.eventType,
      action: params.action,
      userId: params.userId,
      userEmail: params.userEmail,
      actionDetails: params.details,
      req: params.req,
      riskScore: params.riskScore,
      isAnomaly: params.isAnomaly,
      severity: AuditSeverity.WARNING,
    });
  }
  
  // Query audit logs
  async getAuditLogs(params: {
    userId?: string;
    eventType?: string;
    eventCategory?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: any[]; total: number }> {
    const conditions = [];
    
    if (params.userId) {
      conditions.push(eq(securityAuditLogs.userId, params.userId));
    }
    if (params.eventType) {
      conditions.push(eq(securityAuditLogs.eventType, params.eventType));
    }
    if (params.eventCategory) {
      conditions.push(eq(securityAuditLogs.eventCategory, params.eventCategory));
    }
    if (params.severity) {
      conditions.push(eq(securityAuditLogs.severity, params.severity));
    }
    if (params.startDate) {
      conditions.push(gte(securityAuditLogs.createdAt, params.startDate));
    }
    if (params.endDate) {
      conditions.push(lte(securityAuditLogs.createdAt, params.endDate));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const [logs, countResult] = await Promise.all([
      db.select()
        .from(securityAuditLogs)
        .where(whereClause)
        .orderBy(desc(securityAuditLogs.createdAt))
        .limit(params.limit || 100)
        .offset(params.offset || 0),
      db.select({ count: sql<number>`count(*)` })
        .from(securityAuditLogs)
        .where(whereClause),
    ]);
    
    return {
      logs,
      total: Number(countResult[0]?.count || 0),
    };
  }
  
  // Get security statistics
  async getSecurityStats(days: number = 7): Promise<{
    totalEvents: number;
    failedLogins: number;
    successfulLogins: number;
    dataModifications: number;
    securityAlerts: number;
    criticalEvents: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const results = await db.select({
      eventType: securityAuditLogs.eventType,
      severity: securityAuditLogs.severity,
      count: sql<number>`count(*)`,
    })
    .from(securityAuditLogs)
    .where(gte(securityAuditLogs.createdAt, startDate))
    .groupBy(securityAuditLogs.eventType, securityAuditLogs.severity);
    
    const stats = {
      totalEvents: 0,
      failedLogins: 0,
      successfulLogins: 0,
      dataModifications: 0,
      securityAlerts: 0,
      criticalEvents: 0,
    };
    
    for (const row of results) {
      const count = Number(row.count);
      stats.totalEvents += count;
      
      if (row.eventType === AuditEventTypes.AUTH_FAILED_LOGIN) {
        stats.failedLogins += count;
      }
      if (row.eventType === AuditEventTypes.AUTH_LOGIN) {
        stats.successfulLogins += count;
      }
      if (row.eventType?.startsWith('data.')) {
        stats.dataModifications += count;
      }
      if (row.eventType?.startsWith('security.')) {
        stats.securityAlerts += count;
      }
      if (row.severity === 'critical') {
        stats.criticalEvents += count;
      }
    }
    
    return stats;
  }
}

// Session Manager for enhanced session security
export class SecuritySessionManager {
  private static instance: SecuritySessionManager;
  private auditLogger: SecurityAuditLogger;
  
  private constructor() {
    this.auditLogger = SecurityAuditLogger.getInstance();
  }
  
  static getInstance(): SecuritySessionManager {
    if (!SecuritySessionManager.instance) {
      SecuritySessionManager.instance = new SecuritySessionManager();
    }
    return SecuritySessionManager.instance;
  }
  
  // Create a security session record
  async createSession(params: {
    userId: string;
    sessionSid: string;
    req: any;
    expiresAt: Date;
  }): Promise<void> {
    const userAgentInfo = parseUserAgent(params.req?.headers?.['user-agent']);
    
    const session: InsertSecuritySession = {
      userId: params.userId,
      sessionSid: params.sessionSid,
      ipAddress: getClientIP(params.req),
      userAgent: params.req?.headers?.['user-agent'] || null,
      deviceFingerprint: params.req?.headers?.['x-device-fingerprint'] || null,
      deviceType: userAgentInfo.deviceType,
      browser: userAgentInfo.browser,
      os: userAgentInfo.os,
      geoLocation: null,
      isActive: true,
      lastActivityAt: new Date(),
      expiresAt: params.expiresAt,
    };
    
    await db.insert(securitySessions).values(session);
  }
  
  // Update session activity
  async updateSessionActivity(sessionSid: string): Promise<void> {
    await db.update(securitySessions)
      .set({ lastActivityAt: new Date() })
      .where(eq(securitySessions.sessionSid, sessionSid));
  }
  
  // Terminate a session
  async terminateSession(sessionSid: string, reason: string): Promise<void> {
    await db.update(securitySessions)
      .set({
        isActive: false,
        terminatedAt: new Date(),
        terminationReason: reason,
      })
      .where(eq(securitySessions.sessionSid, sessionSid));
  }
  
  // Terminate all sessions for a user (except current)
  async terminateAllUserSessions(userId: string, exceptSessionSid?: string, reason: string = 'forced'): Promise<number> {
    const conditions = [
      eq(securitySessions.userId, userId),
      eq(securitySessions.isActive, true),
    ];
    
    if (exceptSessionSid) {
      conditions.push(sql`${securitySessions.sessionSid} != ${exceptSessionSid}`);
    }
    
    const result = await db.update(securitySessions)
      .set({
        isActive: false,
        terminatedAt: new Date(),
        terminationReason: reason,
      })
      .where(and(...conditions));
    
    return 0; // Drizzle doesn't return affected row count consistently
  }
  
  // Get active sessions for a user
  async getActiveSessions(userId: string): Promise<any[]> {
    return await db.select()
      .from(securitySessions)
      .where(and(
        eq(securitySessions.userId, userId),
        eq(securitySessions.isActive, true)
      ))
      .orderBy(desc(securitySessions.lastActivityAt));
  }
  
  // Count active sessions for a user
  async countActiveSessions(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(securitySessions)
      .where(and(
        eq(securitySessions.userId, userId),
        eq(securitySessions.isActive, true)
      ));
    
    return Number(result[0]?.count || 0);
  }
  
  // Check for concurrent session limit
  async checkSessionLimit(userId: string, maxSessions: number = 5): Promise<boolean> {
    const count = await this.countActiveSessions(userId);
    return count < maxSessions;
  }
}

// User-Level Rate Limiter for SOC 2 compliance
export class UserRateLimiter {
  private static instance: UserRateLimiter;
  private auditLogger: SecurityAuditLogger;
  
  // Default limits per endpoint category (requests per window)
  private readonly limits: Record<string, { maxRequests: number; windowMs: number }> = {
    'auth': { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 minutes for auth endpoints
    'sensitive': { maxRequests: 20, windowMs: 60 * 1000 }, // 20 requests per minute for sensitive data
    'write': { maxRequests: 50, windowMs: 60 * 1000 }, // 50 writes per minute
    'read': { maxRequests: 200, windowMs: 60 * 1000 }, // 200 reads per minute
    'default': { maxRequests: 100, windowMs: 60 * 1000 }, // 100 requests per minute default
  };
  
  private constructor() {
    this.auditLogger = SecurityAuditLogger.getInstance();
  }
  
  static getInstance(): UserRateLimiter {
    if (!UserRateLimiter.instance) {
      UserRateLimiter.instance = new UserRateLimiter();
    }
    return UserRateLimiter.instance;
  }
  
  // Determine endpoint category for rate limiting
  private getEndpointCategory(path: string, method: string): string {
    if (path.includes('/auth/login') || path.includes('/auth/register') || path.includes('/auth/reset')) {
      return 'auth';
    }
    if (path.includes('/admin') || path.includes('/billing') || path.includes('/payment')) {
      return 'sensitive';
    }
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
      return 'write';
    }
    if (method.toUpperCase() === 'GET') {
      return 'read';
    }
    return 'default';
  }
  
  // Check if request should be rate limited
  async checkRateLimit(params: {
    userId?: string;
    ipAddress: string;
    endpoint: string;
    method: string;
  }): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const category = this.getEndpointCategory(params.endpoint, params.method);
    const config = this.limits[category];
    
    // Use user ID if available, otherwise IP
    const identifier = params.userId || params.ipAddress;
    const identifierType = params.userId ? 'user' : 'ip';
    
    const now = new Date();
    const windowStart = new Date(Math.floor(now.getTime() / config.windowMs) * config.windowMs);
    const windowEnd = new Date(windowStart.getTime() + config.windowMs);
    
    try {
      // Check current request count for this window
      const existing = await db.select()
        .from(rateLimitTracking)
        .where(and(
          eq(rateLimitTracking.identifier, identifier),
          eq(rateLimitTracking.endpoint, category),
          eq(rateLimitTracking.windowStart, windowStart)
        ))
        .limit(1);
      
      if (existing.length === 0) {
        // First request in this window
        await db.insert(rateLimitTracking).values({
          identifier,
          identifierType,
          endpoint: category,
          windowStart,
          windowEnd,
          requestCount: 1,
          limitExceeded: false,
          lastRequestAt: now,
        });
        
        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetAt: windowEnd,
        };
      }
      
      const record = existing[0];
      const newCount = record.requestCount + 1;
      const exceeded = newCount > config.maxRequests;
      
      // Update request count
      await db.update(rateLimitTracking)
        .set({
          requestCount: newCount,
          limitExceeded: exceeded,
          lastRequestAt: now,
        })
        .where(eq(rateLimitTracking.id, record.id));
      
      // Log rate limit exceeded event
      if (exceeded && !record.limitExceeded) {
        await this.auditLogger.logSecurityEvent({
          eventType: AuditEventTypes.SECURITY_RATE_LIMIT,
          action: `Rate limit exceeded for ${category} endpoint`,
          userId: params.userId,
          details: {
            identifier,
            identifierType,
            endpoint: category,
            requestCount: newCount,
            limit: config.maxRequests,
          },
          req: null,
          riskScore: 60,
        });
      }
      
      return {
        allowed: !exceeded,
        remaining: Math.max(0, config.maxRequests - newCount),
        resetAt: windowEnd,
      };
    } catch (error) {
      console.error('[RateLimiter] Error checking rate limit:', error);
      // Fail open - allow request on error to avoid blocking legitimate users
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: windowEnd,
      };
    }
  }
  
  // Detect abuse patterns (multiple rate limit violations)
  async detectAbuse(params: {
    userId?: string;
    ipAddress: string;
  }): Promise<{ isAbusive: boolean; violations: number }> {
    const identifier = params.userId || params.ipAddress;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    try {
      const violations = await db.select({ count: sql<number>`count(*)` })
        .from(rateLimitTracking)
        .where(and(
          eq(rateLimitTracking.identifier, identifier),
          eq(rateLimitTracking.limitExceeded, true),
          gte(rateLimitTracking.lastRequestAt, oneHourAgo)
        ));
      
      const violationCount = Number(violations[0]?.count || 0);
      const isAbusive = violationCount >= 3; // 3+ violations in an hour = abuse
      
      if (isAbusive) {
        await this.auditLogger.logSecurityEvent({
          eventType: AuditEventTypes.SECURITY_SUSPICIOUS_ACTIVITY,
          action: 'Potential API abuse detected',
          userId: params.userId,
          details: {
            identifier,
            violationCount,
            timeframe: '1 hour',
          },
          req: null,
          riskScore: 80,
          isAnomaly: true,
        });
      }
      
      return { isAbusive, violations: violationCount };
    } catch (error) {
      console.error('[RateLimiter] Error detecting abuse:', error);
      return { isAbusive: false, violations: 0 };
    }
  }
  
  // Cleanup old rate limit records (call periodically)
  async cleanup(): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    try {
      await db.delete(rateLimitTracking)
        .where(lte(rateLimitTracking.windowEnd, oneHourAgo));
    } catch (error) {
      console.error('[RateLimiter] Error cleaning up old records:', error);
    }
  }
  
  // Create middleware for user-level rate limiting
  createMiddleware(options?: { skipAdmin?: boolean }) {
    return async (req: any, res: any, next: any) => {
      const userId = req.session?.user?.id;
      const ipAddress = getClientIP(req);
      const endpoint = req.path;
      const method = req.method;
      
      // Skip rate limiting for admins if configured
      if (options?.skipAdmin && req.session?.user?.email) {
        const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
        if (adminEmails.includes(req.session.user.email)) {
          return next();
        }
      }
      
      const result = await this.checkRateLimit({
        userId,
        ipAddress,
        endpoint,
        method,
      });
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());
      
      if (!result.allowed) {
        // Check for abuse patterns
        await this.detectAbuse({ userId, ipAddress });
        
        return res.status(429).json({
          message: 'Too many requests. Please slow down.',
          retryAfter: Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
        });
      }
      
      next();
    };
  }
}

// Export singleton instances
export const auditLogger = SecurityAuditLogger.getInstance();
export const sessionManager = SecuritySessionManager.getInstance();
export const userRateLimiter = UserRateLimiter.getInstance();
