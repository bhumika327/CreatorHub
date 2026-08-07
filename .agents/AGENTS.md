# Workspace Customizations: CreatorHub Rules

This file sets up custom project rules for the Antigravity agent when working on the CreatorHub repository.

## Rules & Coding Guidelines

### 1. Monorepo Feature Slices
- All code files must be organized inside `/backend/src/features/[feature-name]/`.
- Each slice contains its own routing, controller, service, middlewares, types, and dto validations.

### 2. Swagger JSDoc Specifications
- All routes must contain Swagger JSDoc comments defining the route pathways, parameters, request body schemas, and HTTP response codes.
- Do not build endpoints without adding Swagger definitions.

### 3. PostgreSQL HTTP Chat
- Chat messages must be stored directly in the `ChatMessage` and `ChatRoom` tables in the NeonDB database.
- Do not use Socket.io. The frontend will fetch messages and poll the endpoint periodically.

### 4. File-Based Auditing Loggers
- Authentication login actions must write to `/backend/logs/login_attempts.json`.
- State-changing API modifications (POST, PUT, DELETE) must write to `/backend/logs/api_calls.json`.

### 5. Media & Storage
- Cloudinary must be used for saving images and user files.
