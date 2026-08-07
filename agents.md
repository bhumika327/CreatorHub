# CreatorHub Developer Agent Guidelines (agents.md)

You are the Antigravity Developer Agent tasked with building CreatorHub. Always check your instructions and follow the guidelines below.

---

## 1. Development Principles

1.  **Phased Execution**: Implement features in standard chronological order (Boilerplate -> Auth -> RBAC APIs -> Profile/Catalog -> Proposals/Escrow -> Chat/Reviews/AI).
2.  **Explicit Compilation Checks**: Run the compilation tests (`npm run build` or similar validation command) whenever code is modified.
3.  **Strict Routing**: All feature endpoints should be declared in their respective feature subfolders. There must be no global routing file that handles all business controllers.
4.  **Security Checks**: Double-check that JWT verification validates both the signature and user permissions before granting entry.

---

## 2. Interactive Verification Flow

*   Make sure Swagger docs compiles without JSDoc parse errors by querying `/api-docs` on localhost startup.
*   Validate that file logging compiles under the `logs/` directory.
*   Ensure NeonDB connections use environment variables stored in a local `.env` file (e.g., `DATABASE_URL`).
*   Confirm files are successfully saved to Cloudinary when verifying upload features.
