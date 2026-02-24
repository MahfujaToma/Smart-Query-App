# Smart Query App

## Project Overview

This is a **Smart Query App** designed to allow users to save, search, and manage their SQL-like queries. It is a full-stack application with individual user authentication, private query storage, public sharing capabilities, and now leverages **PostgreSQL for robust data persistence**.

## Deployment

This application is live and publicly accessible, deployed on **Render**.

*   **Public URL:** [https://smart-query-app.onrender.com/](https://smart-query-app.onrender.com/)

The server is configured to run in a production environment, and any changes pushed to the `main` branch of the [GitHub repository](https://github.com/MahfujaToma/Smart-Query-App.git) will trigger an automatic redeployment.

## Features Implemented

### Frontend
*   **User Authentication UI:** Dedicated Login and Registration pages, providing clear feedback for user interactions, now with **autofill prevention** for username and password fields.
*   **Query Management UI:** Comprehensive interface to add new queries, view existing ones, search by title, and manage individual queries (edit, delete), now displaying **last updated timestamp** on each query card.
*   **Responsive Design:** Styled using Bootstrap for a consistent and adaptive user experience across various devices.
*   **Inline Editing:** Directly edit query titles and content within the UI, with a visible "Save Changes" button appearing when modifications are detected.
*   **Query Sharing:** Integrated sharing functionality that generates a unique public link for any saved query, making it easy to share with others.
*   **React-based SPA:** Built as a Single Page Application using React (via CDN) for a dynamic and interactive user experience.
*   **Query History:** A dedicated "History" button in the title bar to view a chronological list of recently executed or updated queries. Now includes **individual delete options for history entries** and a **"Delete All History" button**. **Search results are also automatically saved to history**.

### Backend
*   **User Registration & Login:** Secure user accounts with `bcrypt` password hashing and `jsonwebtoken` (JWT) for session management.
*   **Authenticated API Endpoints:** Ensures users can only access their own private queries.
*   **Share by Link:** Generate a unique, public URL for a query that can be shared with anyone.
*   **Data Persistence (PostgreSQL):** Robust data storage for user accounts, queries, and shared query links, ensuring persistence and scalability. Now supports **logging of deleted queries to history**, and **deletion of individual or all history entries**.
*   **Query History Logging (PostgreSQL):** Automatically logs all newly added or updated queries to a dedicated `query_history` table, storing the query's title, content, and a timestamp for historical tracking.

### Recent Enhancements
*   **Navbar Layout Refinement:** The "History" button in the navigation bar has been repositioned to be beside and in front of the "Logout" option for better accessibility and logical grouping.
*   **History Management:**
    *   **Delete Individual History Entry:** Added a delete icon to each entry in the Query History, allowing users to remove specific historical queries.
    *   **Delete All History:** Introduced a "Delete All History" button in the top-right corner of the history view, enabling users to clear their entire query history with a single action (with confirmation).
*   **Query Timestamp Display:** Each saved query in the "Your Saved Queries" section now prominently displays its last updated time and date in the top-right corner of the query card.
*   **Search History Integration:** When a user performs a search for a query, all matching queries found are now automatically saved as new entries in the user's query history.
*   **Autofill Prevention:** Input fields for username and password on the login/registration page now include `autocomplete` attributes to suggest to browsers to prevent automatic pre-filling of credentials, enhancing user control.
*   **Share by Link:** A share icon (`<i class="bi bi-share"></i>`) now generates a permanent, public link to a query and copies it to the clipboard. Anyone with the link can view the shared query, even without logging in.
*   **Deployment to Render:** The entire application has been deployed to a public server, making it accessible to everyone on the internet.
*   **Dynamic Configuration:** The server is now configured to work with environment variables for port and `JWT_SECRET`, and crucially, **PostgreSQL connection details**, allowing it to run in any hosting environment.
*   **Debug Endpoint:** A secret endpoint at `/api/debug/get-all-data-for-mahfuja` has been added. This endpoint allows for viewing **all data directly from the PostgreSQL database** (users, queries, shared queries) and is primarily for debugging purposes, especially on free hosting tiers where direct database access might be limited.

## Technical Stack

*   **Frontend:** HTML, CSS, JavaScript (React v18 via CDN, Babel for JSX)
*   **Backend:** Node.js, Express.js
*   **Authentication:** `bcrypt`, `jsonwebtoken`
*   **Deployment:** GitHub (for version control), Render (for hosting)

## Data Storage

The application now primarily uses **PostgreSQL** for persistent data storage.

*   **Users:** Stored in the `users` table.
*   **Queries:** Stored in the `queries` table, linked to users.
*   **Shared Queries:** Stored in the `shared_queries` table, containing public links to queries.

**Important Note on Local Development and Deployment:**
For local development, you will need a running PostgreSQL instance. When deployed on services like Render, it is crucial to connect to a managed PostgreSQL database service to ensure data persistence across restarts and redeployments. While the debug endpoint can access current data, it does not guarantee persistence on ephemeral filesystems without a proper database setup.

## Local Development Setup

To run this application on your local machine for development purposes.

### Prerequisites
1.  **Node.js and npm:** Install from [nodejs.org](https://nodejs.org/en/download).
2.  **Git:** Install from [git-scm.com](https://git-scm.com/downloads).
3.  **PostgreSQL:** Ensure you have a PostgreSQL server running and accessible. You'll need credentials (username, password, host, port, database name) for local connection.

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
3.  **Database Setup (PostgreSQL):**
    *   Create a PostgreSQL database (e.g., `smart_query_app`).
    *   Ensure your `server.js` or environment variables (`.env`) are configured with the correct PostgreSQL connection details (DB_USER, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT).
    *   You will need to create the necessary tables for `users`, `queries`, and `shared_queries`. A simple way to do this is by running SQL commands. (Note: The current project does not include migration scripts, so you'll need to manually create these tables or run a setup script if provided separately).
        *   **Example SQL for table creation (adjust as needed):**
            ```sql
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE queries (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                query_text TEXT NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE shared_queries (
                share_id VARCHAR(255) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                query_text TEXT NOT NULL,
                original_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE query_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255),
                query_text TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            ```

4.  **Run the Server:**
    ```bash
    node server.js
    ```
    The server will start on `http://localhost:3000`.

5.  **Open the Frontend:**
    Navigate to the `public` directory and open `index.html` in your browser. This will load the client-side application, which will then connect to your locally running Node.js server.

## Key Files

*   `package.json`: Project metadata and backend dependencies.
*   `server.js`: The Node.js/Express backend server code.
*   `public/index.html`: The entire React frontend application.
*   `.gitignore`: Specifies files for Git to ignore.
*   `db/*.json`: These files were previously used for local data storage but the application now primarily uses PostgreSQL. They may remain as examples or historical context.