# Smart Query App

## Project Overview

This is a **Smart Query App** designed to allow users to save, search, and manage their SQL-like queries. It is a full-stack application with individual user authentication, private query storage, and public sharing capabilities.

## Deployment

This application is live and publicly accessible, deployed on **Render**.

*   **Public URL:** [https://smart-query-app.onrender.com/](https://smart-query-app.onrender.com/)

The server is configured to run in a production environment, and any changes pushed to the `main` branch of the [GitHub repository](https://github.com/MahfujaToma/Smart-Query-App.git) will trigger an automatic redeployment.

## Features Implemented

### Frontend
*   **User Authentication UI:** Login and Registration pages.
*   **Query Management UI:** Add, view, search, edit, and delete queries.
*   **Responsive Design:** Styled using Bootstrap.
*   **Inline Editing:** Edit query titles and content directly in the UI.

### Backend
*   **User Registration & Login:** Secure user accounts with `bcrypt` password hashing and `jsonwebtoken` (JWT) for session management.
*   **Authenticated API Endpoints:** Ensures users can only access their own private queries.
*   **Share by Link:** Generate a unique, public URL for a query that can be shared with anyone.
*   **Data Persistence (Local):** User accounts and queries are stored in local JSON files.

### Recent Enhancements
*   **Share by Link:** A share icon (`<i class="bi bi-share"></i>`) now generates a permanent, public link to a query and copies it to the clipboard. Anyone with the link can view the shared query, even without logging in.
*   **Deployment to Render:** The entire application has been deployed to a public server, making it accessible to everyone on the internet.
*   **Dynamic Configuration:** The server is now configured to work with environment variables for port and `JWT_SECRET`, allowing it to run in any hosting environment.
*   **Debug Endpoint:** A secret endpoint at `/api/debug/get-all-data-for-mahfuja` has been added to view the live database files for free on Render's hosting tier.

## Technical Stack

*   **Frontend:** HTML, CSS, JavaScript (React v18 via CDN, Babel for JSX)
*   **Backend:** Node.js, Express.js
*   **Authentication:** `bcrypt`, `jsonwebtoken`
*   **Deployment:** GitHub (for version control), Render (for hosting)

## Data Storage

The application currently uses JSON files (`db/users.json`, `db/queries.json`, `db/shared_queries.json`) for data storage.

**_Warning:_** When running on a hosting service like Render, the filesystem is **ephemeral**. This means any new data added (new users, new queries) **will be deleted** when the server restarts or redeploys. For a production-ready application, this should be migrated to a persistent database service like PostgreSQL.

## Local Development Setup

To run this application on your local machine for development purposes.

### Prerequisites
1.  **Node.js and npm:** Install from [nodejs.org](https://nodejs.org/en/download).
2.  **Git:** Install from [git-scm.com](https://git-scm.com/downloads).

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
3.  **Run the Server:**
    ```bash
    node server.js
    ```
    The server will start on `http://localhost:3000`.

4.  **Open the Frontend:**
    Navigate to the `public` directory and open `index.html` in your browser. You can now use the application locally. It will connect to your local server.

## Key Files

*   `package.json`: Project metadata and backend dependencies.
*   `server.js`: The Node.js/Express backend server code.
*   `public/index.html`: The entire React frontend application.
*   `.gitignore`: Specifies files for Git to ignore.
*   `db/*.json`: Database files (used for local development).