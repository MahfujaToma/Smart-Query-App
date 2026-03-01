# Smart Query App

## Project Overview

This is a **Smart Query App** designed to allow users to save, search, and manage their SQL-like queries. It is a full-stack application with individual user authentication, private query storage, public sharing capabilities, and now leverages **Cloudflare Pages and Supabase for a lightning-fast, zero-cold-start serverless experience**.

## Deployment

This application is live and publicly accessible, deployed on **Cloudflare Pages**.

*   **Public URL:** (Add your Cloudflare URL here)

The application is now serverless. Any changes pushed to the `main` branch of the [GitHub repository](https://github.com/MahfujaToma/Smart-Query-App.git) will trigger an automatic redeployment via Cloudflare's global edge network.

## Features Implemented

### Frontend (Power User Tools)
*   **Dark Mode Toggle:** Integrated a system-persistent dark theme for low-light environments.
*   **Syntax Highlighting:** Integrated **Prism.js** for beautiful, readable SQL code blocks.
*   **Live Query Execution:** Directly execute SQL queries against your Supabase database and view results in a real-time table.
*   **SQL Auto-Formatter:** One-click SQL beautification using **sql-formatter**.
*   **Keyboard Shortcuts:**
    *   `Ctrl + S`: Quick save changes.
    *   `Ctrl + Enter`: Auto-format SQL.
    *   `Ctrl + F`: Focus search bar.
    *   `Ctrl + I`: Trigger backup import.
*   **Empty States:** Modern, visual illustrations for empty libraries and history logs.
*   **Search Improvements:** Enhanced search functionality that looks inside both query titles and the SQL content itself.

### Data & Sharing
*   **Flexible Export/Import:** Backup and restore your entire library as structured **JSON** or human-readable **TXT** documents.
*   **Professional Share Page:** Customized public pages for shared queries featuring syntax highlighting, a "Copy Code" button, and automatic dark mode support.

### User Management
*   **User Authentication UI:** Dedicated Login and Registration pages with autofill prevention and clear feedback.
*   **Query Management:** Full CRUD (Create, Read, Update, Delete) capabilities with inline editing.
*   **Query History:** Automated chronological logging of all query activities with individual and bulk delete options.

### Backend (Serverless)
*   **Edge Functions:** Backend logic powered by **Cloudflare Pages Functions**.
*   **Data Persistence:** Robust PostgreSQL storage via **Supabase**.
*   **Live SQL RPC:** A custom `exec_sql` PostgreSQL function allowing safe, dynamic query execution from the frontend.
*   **Auth:** Secure session management using `jose` (JWT) and `bcryptjs`.

## Technical Stack

*   **Frontend:** HTML, CSS, JavaScript (React v18 via CDN, Babel, Bootstrap 5, Prism.js, Sql-Formatter)
*   **Backend:** Cloudflare Pages Functions (Edge Runtime)
*   **Database:** Supabase (PostgreSQL)
*   **Authentication:** `bcryptjs`, `jose` (JWT)

## Data Storage (Supabase/PostgreSQL)

*   **users:** User credentials with UUID primary keys.
*   **queries:** Saved queries linked to user IDs.
*   **shared_queries:** Publicly accessible query snippets.
*   **query_history:** Log of recent user actions.

## Local Development Setup

### Prerequisites
1.  **Node.js and npm:** [nodejs.org](https://nodejs.org/).
2.  **Git:** [git-scm.com](https://git-scm.com/).
3.  **Wrangler:** `npm install -g wrangler` (for local Cloudflare testing).

### Instructions
1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/MahfujaToma/Smart-Query-App.git
    cd Smart-Query-App
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Local Testing:**
    ```bash
    npx wrangler pages dev public
    ```

## Key Files

*   `functions/api/[[path]].js`: Core backend API.
*   `functions/share/[shareId].js`: Professional public share page renderer.
*   `public/index.html`: The enhanced React SPA frontend.
