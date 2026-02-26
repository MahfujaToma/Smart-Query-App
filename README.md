# Smart Query App

## Project Overview

This is a **Smart Query App** designed to allow users to save, search, and manage their SQL-like queries. It is a full-stack application with individual user authentication, private query storage, public sharing capabilities, and now leverages **MongoDB Atlas for robust, scalable, and permanent data persistence**.

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
*   **Data Persistence (MongoDB Atlas):** Robust NoSQL data storage for user accounts, queries, and shared query links, ensuring long-term persistence on a free cloud tier.
*   **Query History Logging (MongoDB):** Automatically logs all newly added, updated, or deleted queries to a dedicated `query_history` collection.

### Recent Enhancements
*   **Migration to MongoDB Atlas:** Successfully migrated the entire application database from PostgreSQL to MongoDB Atlas to ensure permanent data availability on the free tier.
*   **Data Migration Script:** Executed a custom migration process that transferred users, queries, and history while maintaining all relational integrity using MongoDB ObjectIDs.
*   **Navbar Layout Refinement:** The "History" button in the navigation bar has been repositioned to be beside and in front of the "Logout" option for better accessibility.
*   **History Management:**
    *   **Delete Individual History Entry:** Added a delete icon to each entry in the Query History.
    *   **Delete All History:** Introduced a "Delete All History" button in the top-right corner of the history view.
*   **Query Timestamp Display:** Each saved query now prominently displays its last updated time and date.
*   **Search History Integration:** Search results are automatically saved as new entries in the user's query history.
*   **Autofill Prevention:** Enhanced security on login/registration pages to prevent browser credential pre-filling.
*   **Share by Link:** A share icon generates a permanent, public link to a query and copies it to the clipboard.
*   **Dynamic Configuration:** The server is configured via environment variables for `PORT`, `JWT_SECRET`, and `MONGO_URI`.
*   **Debug Endpoint:** A secure endpoint at `/api/debug/get-all-data-for-mahfuja` allows for viewing the raw MongoDB data for debugging purposes.

## Technical Stack

*   **Frontend:** HTML, CSS, JavaScript (React v18 via CDN, Babel for JSX)
*   **Backend:** Node.js, Express.js
*   **Database:** MongoDB Atlas (NoSQL)
*   **Authentication:** `bcrypt`, `jsonwebtoken`
*   **Deployment:** GitHub (for version control), Render (for hosting)

## Data Storage (MongoDB)

The application uses **MongoDB Atlas** for persistent data storage.

*   **users:** Stores user credentials and profile information.
*   **queries:** Stores saved queries linked to specific user ObjectIDs.
*   **shared_queries:** Stores public links to queries with unique `shareId`s.
*   **query_history:** Stores a chronological log of query activities.

## Local Development Setup

To run this application on your local machine for development purposes.

### Prerequisites
1.  **Node.js and npm:** Install from [nodejs.org](https://nodejs.org/en/download).
2.  **Git:** Install from [git-scm.com](https://git-scm.com/downloads).
3.  **MongoDB Atlas Account:** You will need a MongoDB connection string (`MONGO_URI`).

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
3.  **Environment Configuration:**
    Create a `.env` file in the root directory and add:
    ```env
    PORT=3000
    MONGO_URI=your_mongodb_atlas_connection_string
    JWT_SECRET=your_secret_key
    ```
4.  **Run the Server:**
    ```bash
    node server.js
    ```
    The server will start on `http://localhost:3000`.

5.  **Open the Frontend:**
    Navigate to the `public` directory and open `index.html` in your browser, or simply access `http://localhost:3000` via the Express server.

## Key Files

*   `package.json`: Project metadata and backend dependencies.
*   `server.js`: The Node.js/Express backend server code (now using MongoDB).
*   `public/index.html`: The entire React frontend application.
*   `.gitignore`: Specifies files for Git to ignore (includes `.env`).
