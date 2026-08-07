# CreatorHub Developer Agent Skills

This document details the critical implementation skills required for coding CreatorHub.

---

## 1. Dynamic Database-Backed RBAC

Implementing role-based permission checks that can be dynamically altered by managers:

```typescript
// Example permission verification flow
export const requirePermission = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    // 1. Fetch user permissions override first
    const override = await prisma.authUserPermissionOverride.findUnique({
      where: { userId_permissionName: { userId, permissionName: requiredPermission } }
    });

    if (override) {
      if (override.allowed) return next();
      return res.status(403).json({ success: false, message: "Permission denied (revoked by manager)" });
    }

    // 2. Fetch role's base permissions
    const userRole = req.user?.role; // e.g. CREATOR
    const hasPermission = await prisma.authRolePermission.findFirst({
      where: {
        role: userRole,
        permissionName: requiredPermission
      }
    });

    if (hasPermission) return next();
    return res.status(403).json({ success: false, message: "Permission denied" });
  };
};
```

---

## 2. JSON Audit Logging

Logging sign-ins and state modification APIs to disk files:

```typescript
import fs from 'fs/promises';
import path from 'path';

export const logAudit = async (filename: 'login_attempts.json' | 'api_calls.json', record: object) => {
  const logDir = path.join(__dirname, '../../logs');
  const filePath = path.join(logDir, filename);

  try {
    // Ensure logs folder exists
    await fs.mkdir(logDir, { recursive: true });

    let logs = [];
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      logs = JSON.parse(data);
    } catch (e) {
      // file doesn't exist or is empty
    }

    logs.push(record);
    await fs.writeFile(filePath, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Failed to write to file log ${filename}:`, err);
  }
};
```

---

## 3. Contact Filtering Regex

Filtering message content to remove phone numbers and email addresses:

```typescript
export const filterContactLeaking = (text: string): string => {
  // Regex pattern for matching typical phone numbers
  const phonePattern = /(\+?\d{1,4}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
  // Regex pattern for matching emails
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  return text
    .replace(phonePattern, "[PHONE NUMBER REMOVED]")
    .replace(emailPattern, "[EMAIL REMOVED]");
};
```

---

## 4. IP-Based Geolocation Helper

Resolving user IP location silently:

```typescript
import axios from 'axios';

export const resolveLocationFromIP = async (ip: string) => {
  try {
    // Skip resolution for localhost in development
    if (ip === '127.0.0.1' || ip === '::1') {
      return { city: 'Localhost', country: 'Localhost' };
    }
    const response = await axios.get(`https://ipapi.co/${ip}/json/`);
    return {
      city: response.data.city || 'Unknown',
      country: response.data.country_name || 'Unknown'
    };
  } catch (error) {
    return { city: 'Unknown', country: 'Unknown' };
  }
};
```
