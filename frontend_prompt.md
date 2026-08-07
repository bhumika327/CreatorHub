# CreatorHub Frontend Implementation Prompt

This document provides a guide for building the frontend of CreatorHub using React, Tailwind CSS, and TypeScript.

---

## 1. Directory Structure

Ensure the client folder adheres to the following vertical feature slice directory structure:

```
/frontend
  /src
    /features
      /auth
        /components
          LoginForm.tsx
          RegisterForm.tsx
        /hooks
          useAuth.ts
        api.ts
        types.ts
      /dashboard-customer
        CustomerDashboard.tsx
      /dashboard-creator
        CreatorDashboard.tsx
        PortfolioCalendar.tsx
      /dashboard-manager
        ManagerDashboard.tsx
        PermissionGrid.tsx
      /chat
        ChatWindow.tsx
      /catalog
        RequirementList.tsx
        CreatorList.tsx
    /components
      Sidebar.tsx
      Navbar.tsx
      ThemeToggle.tsx
    /layouts
      DashboardLayout.tsx
    /lib
      apiClient.ts
    App.tsx
    main.tsx
```

---

## 2. Shell Layout (ChatGPT-Style)

### Theme Mode & Color Palette
- Include a Dark/Light toggle.
- Follow ChatGPT layout style:
  - **Left Sidebar**: Dark theme, collapsible navigation. Houses features like Search, Active Chat Rooms, Pricing, Dashboard, and Admin Permissions Settings.
  - **Main Feed/Panel**: High contrast text, smooth transitions, card layouts for creators, and chat feed templates.

---

## 3. Core Frontend Components

### 1. Permission Grid (Manager Dashboard)
Managers need to adjust permissions dynamically.
- A table grid component rendering Roles (`CUSTOMER`, `CREATOR`, `MANAGER`) and individual Permission Keys (e.g. `chat:send`, `requirement:create`).
- Uses checkboxes. Clicking a checkbox triggers a PUT request to update the database state immediately.
- User Override panel: Search for a specific user and add override rows to grant/revoke specific permissions dynamically.

### 2. HTTP Polling Chat Window
Since we are storing messages in PostgreSQL and bypassing Socket.io:
- The Chat component must implement HTTP poll loops querying `GET /api/chat/:roomId` every `3000ms` to fetch new messages.
- Tracks `lastMessageId` or timestamps to only append updates.
- Highlights user alerts if a phone or email string gets filtered out (replaced by `[PHONE NUMBER REMOVED]`).

### 3. File Uploads (Cloudinary Integration)
- Create a Cloudinary upload hook using Axios to send files to the backend Cloudinary signature route or directly upload.
- Displays upload progress bars and image previews for Creator portfolios.

---

## 4. UI Polish & Visuals
- Use Google Fonts (e.g., *Inter* or *Outfit*).
- Clean borders, glassmorphic card overlays (`bg-opacity`, `backdrop-blur`).
- Transition animations on page/route navigation and sidebar toggles.
