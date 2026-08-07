# CreatorHub Project Rules & Coding Guidelines

This document outlines the strict guidelines and conventions for developing the CreatorHub platform.

---

## 1. Directory Structure

Ensure the codebase strictly adheres to the following vertical feature slice structure:

```
/backend
  /src
    /features
      /[feature-name]
        [feature-name].routes.ts       # Express router with Swagger JSDoc annotation
        [feature-name].controller.ts   # Parses inputs, handles status codes, calls service
        [feature-name].service.ts      # Core business logic, queries database via Prisma
        [feature-name].middleware.ts   # Feature-specific validation/guards
        [feature-name].dto.ts          # Zod request/response schema specifications
        [feature-name].types.ts        # TypeScript interfaces and type definitions
    /common
      /middleware                      # Global error handlers, request loggers, rate limits
      /config                          # Environment variable validation, Cloudinary configuration, Gemini API setup
    /prisma
      schema.prisma                    # Namespaced Prisma schemas
      client.ts                        # Singular global database connection instance
```

---

## 2. API Design & Validation

1.  **Zod Schema Validation**:
    *   Every HTTP route accepting input (query params, URL parameters, request body) must have a corresponding validation schema inside `*.dto.ts`.
    *   Validation must check for clean types, bounds, strings lengths, and correct formats (e.g. valid emails).
2.  **Swagger Documentation**:
    *   Each endpoint in `*.routes.ts` must contain detailed JSDoc comments defining the route paths, inputs, schema references, and possible response codes (200, 201, 400, 401, 403, 404, 500).
3.  **JSON Audit Logging**:
    *   **Login Auditing**: Every sign-in request (success or failure) must append a record containing `{ userId, email, timestamp, ip, userAgent, status }` to `backend/logs/login_attempts.json`.
    *   **API Auditing**: Every state-changing API request (POST, PUT, DELETE) must write a record to `backend/logs/api_calls.json`.

---

## 3. Database & Transactions

1.  **Logical Namespacing**:
    *   All tables inside `schema.prisma` must be named using their feature namespace (e.g., `AuthUser`, `ProfileCreator`, `EngagementProposal`, `ChatMessage`).
2.  **No Cross-Feature DB Modification**:
    *   Service methods must *only* write to models belonging to their own feature namespace. If a service needs to write to or read from another feature's models, it must do so by calling that feature's service public method, not via Prisma directly.
3.  **No Real-time Socket.io for Chat**:
    *   Chat messages are written directly to PostgreSQL and read via HTTP polling endpoints.

---

## 4. Error Handling & Security

1.  **RBAC and Granular Permissions**:
    *   Endpoints requiring auth must use the `requirePermission(permissionName)` middleware.
    *   Permission checks must dynamically lookup role mappings from the database, accounting for user-specific overrides.
2.  **Masking Phone Numbers & Emails in Chat**:
    *   Before saving messages to the database, run a regex parser to mask email addresses and phone numbers to keep transactions on the platform.
3.  **Unified Error Responder**:
    *   Never leak internal stack traces or Prisma query issues. Return clean JSON: `{ success: false, message: "User friendly error message" }`.
