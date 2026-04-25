# Security Implementation Guide

## Overview

Home Base has been hardened with enterprise-grade security measures to protect against common web vulnerabilities and attacks. This document outlines all implemented security features and best practices.

## 🔒 Security Features Implemented

### 1. **Security Headers (Helmet.js)**

**Protection Against:** Clickjacking, XSS, MIME sniffing, protocol downgrade attacks

**Implementation:**
- Content Security Policy (CSP) - Controls resource loading
- HTTP Strict Transport Security (HSTS) - Forces HTTPS
- X-Frame-Options - Prevents clickjacking
- X-Content-Type-Options - Prevents MIME sniffing
- X-XSS-Protection - Browser XSS filter

**Configuration:** `server/index.ts`

```typescript
helmet({
  contentSecurityPolicy: { /* CSP directives */ },
  hsts: { maxAge: 31536000 },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
})
```

### 2. **Rate Limiting**

**Protection Against:** Brute force attacks, DoS, API abuse

**Implementation:**
- **General API Rate Limit:** 100 requests per 15 minutes per IP
- **Authentication Rate Limit:** 5 login attempts per 15 minutes per IP
- Failed requests don't count against successful authentication

**Configuration:**
- General limiter: `server/index.ts`
- Auth limiter: `server/routes.ts`

### 3. **CORS (Cross-Origin Resource Sharing)**

**Protection Against:** Unauthorized cross-origin requests

**Implementation:**
- Whitelist-based origin validation
- Credentials support for authenticated requests
- Restricted to specific HTTP methods

**Production Setup:**
Set `ALLOWED_ORIGINS` environment variable with comma-separated allowed domains:
```
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### 4. **Session Security**

**Protection Against:** Session hijacking, CSRF

**Implementation:**
- HttpOnly cookies (not accessible via JavaScript)
- Secure flag (HTTPS only in production)
- SameSite=Lax (CSRF protection)
- Session rotation on authentication
- Obscured cookie name

**Configuration:** `server/index.ts`
- Development: Insecure for local testing
- Production: Full security enabled

### 5. **Input Validation & Sanitization**

**Protection Against:** SQL injection, XSS, malicious input

**Implementation:**
- Zod schema validation on all API inputs
- SQL injection pattern detection
- XSS pattern detection
- String length limits
- Unicode normalization
- Null byte removal

**Security Utilities:** `server/security-utils.ts`

Example usage:
```typescript
import { secureString, VALIDATION_LIMITS } from './security-utils';

const schema = z.object({
  name: secureString({ 
    maxLength: VALIDATION_LIMITS.SHORT_TEXT,
    checkSqlInjection: true,
    fieldName: 'Name'
  }),
});
```

### 6. **Authentication & Authorization**

**Protection Against:** Unauthorized access, privilege escalation

**Implementation:**
- Replit Auth (OIDC) for enterprise-grade authentication
- Role-based access control (RBAC)
- Resource ownership validation
- Session-based authentication

**Middleware:**
- `isAuthenticated` - Verifies user login
- `requireRole('homeowner'|'contractor')` - Role enforcement
- `requirePropertyOwner` - Resource ownership check

### 7. **Database Security**

**Protection Against:** SQL injection, unauthorized data access

**Implementation:**
- Parameterized queries via Drizzle ORM
- No raw SQL with user input
- Row-level security via ownership checks
- Separate storage interfaces with type safety

**Example:**
```typescript
// Secure - uses parameterized query
await storage.getHouse(houseId);

// Insecure - NEVER do this
await db.execute(`SELECT * FROM houses WHERE id = '${userInput}'`);
```

## 🚀 Production Deployment Checklist

### Environment Variables

Set these in your production environment:

```bash
# Required
SESSION_SECRET=<strong-random-secret>
DATABASE_URL=<production-database-url>
ALLOWED_ORIGINS=https://yourdomain.com

# Optional (if using these services)
STRIPE_SECRET_KEY=<stripe-secret>
SENDGRID_API_KEY=<sendgrid-key>
```

### Security Configuration

1. **Generate Strong Session Secret**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Enable HTTPS**
   - Production deployment automatically uses HTTPS
   - Secure cookies are automatically enabled in production

3. **Set Allowed Origins**
   - Configure CORS whitelist for your production domains
   - Remove development origins

4. **Database Backups**
   - Enable automated backups
   - Test restore procedures

### Monitoring & Logging

- Monitor rate limit hits
- Track authentication failures
- Log security-relevant events
- Set up alerts for suspicious activity

## 🛡️ Security Best Practices

### For Developers

1. **Never Trust User Input**
   - Always validate with Zod schemas
   - Use security utilities for sensitive fields
   - Sanitize before storage

2. **Use Prepared Statements**
   - Always use Drizzle ORM methods
   - Never concatenate user input in queries

3. **Implement Least Privilege**
   - Check user roles and permissions
   - Validate resource ownership
   - Use middleware for authorization

4. **Handle Errors Securely**
   - Don't expose stack traces to users
   - Log detailed errors server-side only
   - Return generic error messages to clients

5. **Keep Dependencies Updated**
   ```bash
   npm audit
   npm audit fix
   npm outdated
   ```

### For Operations

1. **Regular Security Audits**
   - Review authentication logs
   - Check for suspicious patterns
   - Monitor rate limit violations

2. **Backup Strategy**
   - Daily automated backups
   - Test restore procedures monthly
   - Secure backup storage

3. **Incident Response**
   - Document security procedures
   - Have rollback plan ready
   - Contact list for security issues

## 🔍 Security Testing

### Manual Testing

1. **Test Rate Limiting**
   ```bash
   # Should block after 5 attempts
   for i in {1..6}; do
     curl -X POST http://localhost:5000/api/auth/homeowner-demo-login \
       -H "Content-Type: application/json" \
       -d '{"email":"test@test.com","name":"Test"}'
   done
   ```

2. **Test CORS**
   ```bash
   # Should be blocked if origin not whitelisted
   curl -H "Origin: http://malicious-site.com" \
     http://localhost:5000/api/auth/user
   ```

3. **Test Input Validation**
   - Try SQL injection patterns
   - Try XSS payloads
   - Try extremely long strings

### Automated Testing

Run security tests:
```bash
npm run test:security
```

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Replit Security Docs](https://docs.replit.com/security)

## 🐛 Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Contact the development team directly
3. Provide detailed reproduction steps
4. Allow time for patching before disclosure

## Compliance Notes

This implementation addresses common security requirements for:
- OWASP Top 10 vulnerabilities
- GDPR data protection requirements
- PCI DSS (when handling payments)
- SOC 2 security controls

---

**Last Updated:** October 2025  
**Security Contact:** [Your Team Email]
