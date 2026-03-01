# Smart Query App

## Project Overview

This is a **Smart Query App** designed to allow users to save, search, and manage their SQL-like queries. It is a full-stack application with individual user authentication, private query storage, public sharing capabilities, and now leverages **Cloudflare Pages and Supabase for a lightning-fast, zero-cold-start serverless experience**.

## Deployment

This application is live and publicly accessible, deployed on **Cloudflare Pages**.

*   **Public URL:** (Add your Cloudflare URL here)

The application is now serverless. Any changes pushed to the `main` branch of the [GitHub repository](https://github.com/MahfujaToma/Smart-Query-App.git) will trigger an automatic redeployment via Cloudflare's global edge network.

## Features Implemented

### Frontend
*   **User Authentication UI:** Dedicated Login and Registration pages, providing clear feedback for user interactions, with **autofill prevention** for username and password fields.
*   **Query Management UI:** Comprehensive interface to add new queries, view existing ones, search by title, and manage individual queries (edit, delete), now displaying **last updated timestamp** on each query card.
*   **Responsive Design:** Styled using Bootstrap for a consistent and adaptive user experience across various devices.
*   **Inline Editing:** Directly edit query titles and content within the UI, with a visible "Save Changes" button appearing when modifications are detected.
*   **Query Sharing:** Integrated sharing functionality that generates a unique public link for any saved query, making it easy to share with others.
*   **React-based SPA:** Built as a Single Page Application using React (via CDN) for a dynamic and interactive user experience.
*   **Query History:** A dedicated "History" button in the title bar to view a chronological list of recently executed or updated queries. Now includes **individual delete options for history entries** and a **"Delete All History" button**. **Search results are also automatically saved to history**.

### Backend (Serverless)
*   **Edge Functions:** Entire backend logic migrated to **Cloudflare Pages Functions** for zero latency and high availability.
*   **User Registration & Login:** Secure user accounts with `bcryptjs` password hashing and `jose` for lightweight JWT session management.
*   **Authenticated API Endpoints:** Ensures users can only access their own private queries.
*   **Share by Link:** Generate a unique, public URL for a query that can be shared with anyone, served via dynamic Cloudflare Functions.
*   **Data Persistence (Supabase/PostgreSQL):** Robust PostgreSQL data storage for user accounts, queries, and shared query links, ensuring permanent persistence on a free cloud tier.
*   **Query History Logging (Supabase):** Automatically logs all newly added, updated, or deleted queries to a dedicated `query_history` table.

### Recent Enhancements
*   **Migration to Cloudflare Pages:** Moved from Render to Cloudflare Pages to eliminate "Cold Start" lag. The application is now "Instant-On."
*   **Migration to Supabase:** Transitioned from MongoDB Atlas to **Supabase (PostgreSQL)** for better alignment with SQL-like query storage and faster database response times.
*   **Edge-Compatible Libraries:** Swapped `jsonwebtoken` for `jose` and `bcrypt` for `bcryptjs` to ensure 100% compatibility with Cloudflare's serverless environment.
*   **PostgreSQL Schema:** Implemented a relational schema for users, queries, history, and sharing, with automatic UUID generation.
*   **Dynamic Sharing Functions:** Implemented specialized Cloudflare functions to serve shared queries dynamically.
*   **History Management:**
    *   **Delete Individual History Entry:** Added a delete icon to each entry in the Query History.
    *   **Delete All History:** Introduced a "Delete All History" button in the top-right corner of the history view.
*   **Query Timestamp Display:** Each saved query prominently displays its last updated time and date.

## Technical Stack (AI Assistant Active)

*   **Frontend:** HTML, CSS, JavaScript (React v18 via CDN, Babel for JSX)
*   **Backend:** Cloudflare Pages Functions (Serverless Node.js)
*   **Database:** Supabase (PostgreSQL)
*   **Authentication:** `bcryptjs`, `jose` (JWT)
*   **Deployment:** GitHub (Version Control), Cloudflare Pages (Hosting)

## Data Storage (Supabase/PostgreSQL)

The application uses **Supabase** for persistent data storage.

*   **users:** Stores user credentials with UUID primary keys.
*   **queries:** Stores saved queries linked to user UUIDs.
*   **shared_queries:** Stores public links to queries with unique `share_id`s.
*   **query_history:** Stores a chronological log of query activities.

## Local Development Setup

### Prerequisites
1.  **Node.js and npm:** Install from [nodejs.org](https://nodejs.org/en/download).
2.  **Git:** Install from [git-scm.com](https://git-scm.com/downloads).
3.  **Wrangler (Optional):** Install Cloudflare's CLI tool (`npm install -g wrangler`) to test functions locally.

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
    Use Wrangler to run the project locally:
    ```bash
    npx wrangler pages dev public
    ```

## Key Files

*   `package.json`: Project metadata and dependencies (Jose, Supabase, BcryptJS).
*   `functions/api/[[path]].js`: The core Cloudflare Function for the backend API.
*   `functions/share/[shareId].js`: Function to serve public shared query pages.
*   `public/index.html`: The entire React frontend application.
*   `.gitignore`: Specifies files for Git to ignore.
