---
name: creatorhub_dev
description: Reusable developer skills for implementing CreatorHub backend and frontend features.
---

# CreatorHub Developer Skills

Use these skills to implement features across the CreatorHub codebase.

## 1. Dynamic RBAC
Ensure you query user permission overrides and roles directly from PostgreSQL:
- Check `UserPermissionOverride` first for individual bans or privileges.
- Check `RolePermission` for role-wide capabilities.

## 2. File Audit Log
Save audit records to `logs/login_attempts.json` and `logs/api_calls.json` using Node.js filesystem asynchronous modules.

## 3. Leak Filtering
Ensure message strings are scanned for typical email and phone patterns, replacing them with placeholders to preserve platform safety.

## 4. Location IP Resolution
Fetch IP-based country/city details silently via standard APIs on register or profile create events.
