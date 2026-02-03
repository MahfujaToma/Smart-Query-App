# Smart Query App

## Project Overview

This is a **Smart Query App** designed to allow users to save, search, and manage their SQL-like queries. It has evolved into a full-stack application with individual user authentication and private query storage.

## Current State

The application is a **full-stack web application** running locally.
*   **Frontend:** A single `public/index.html` file, built with React (loaded via CDN), Bootstrap (for styling), and Babel (for JSX transformation). It provides the user interface for authentication and query management.
*   **Backend:** A Node.js server (`server.js`) using Express.js. It handles user registration, login (with secure password hashing and JWT for sessions), and stores user-specific queries in local JSON files.

## Features Implemented

### Frontend
*   **User Authentication UI:** Login and Registration pages.
*   **Query Management UI:** Add new queries, view existing queries, search queries by title, delete queries.
*   **Responsive Design:** Styled using Bootstrap.
*   **Login Page Design:** Custom icon, app name, blue color for the heading, and a subtle gray watermark in the background.
*   **Download Queries:** Ability to download all queries as a `.txt` file (this feature is independent of authentication and downloads only the currently displayed queries).

### Backend
*   **User Registration:** Allows new users to create accounts. Passwords are hashed using `bcrypt` for security.
*   **User Login:** Authenticates users and issues a JSON Web Token (JWT) for session management.
*   **Authenticated API Endpoints:** All query management operations (fetch, add, delete) require a valid JWT, ensuring users only access their own queries.
*   **Data Persistence:** User accounts are stored in `db/users.json` and user-specific queries in `db/queries.json`.

## Recent Updates and Enhancements

This section outlines the recent changes and improvements made to the Smart Query App.

*   **Improved Query Actions:**
    *   Added "Copy" and "Delete" actions for individual queries.
    *   "Delete" now includes a two-step verification process for safety.
    *   Actions are represented by attractive, colored icon buttons (Copy: 📋/bi-clipboard, Delete: 🗑️/bi-trash) for a more professional look.

*   **Enhanced User Interface & Design:**
    *   **Login Page Fix:** Resolved an issue where username/password input fields were unclickable on the authentication page.
    *   **Title Bar:** The main application title bar has been enhanced with:
        *   Centered "🔍 Smart Query App" text.
        *   Increased and adjusted font size.
        *   Improved color scheme (`text-info`).
        *   An integrated magnifying glass icon.
    *   **Overall Design Refresh:** Implemented a more attractive and colorful design across the application, including:
        *   Updated styling for the "Add New Query" form (header, shadow, icons, bold save button).
        *   Enhanced visual presentation for individual query cards (borders, shadows, colored titles).
        *   Refined overall background colors for a modern aesthetic.

*   **Edit Query Functionality (Enhanced):**
    *   **Direct Inline Query Editing:** Query content is now directly editable within its display area, eliminating the need to click an "Edit" button first. The query body is always rendered as a `<textarea>`.
    *   **Title Editing:** The dedicated "Edit" icon (pencil `✏️`) now specifically toggles the editability of the query's **title**.
    *   **Context-Aware Save:** A "Save Changes" button automatically appears for a query when either its title or its content is modified.
*   **Enhanced Delete Icon (`🗑️`):** The delete icon has been made smarter:
    *   If text is selected within a query's editable text area, clicking the icon deletes *only* the selected portion.
    *   If no text is selected, it maintains its previous behavior of prompting for confirmation before deleting the *entire* query.
*   **Two-Step Search Functionality:**
    *   The search bar no longer filters results in real-time as you type.
    *   Filtering is now triggered explicitly by either clicking the new search icon (`🔍`) or pressing the "Enter" key after typing.
*   **Exact Match Search:**
    *   The search now performs an exact, case-insensitive match on query titles (e.g., searching "Query" will only return items titled "Query", not "Query 1"). This prevents unintended partial matches.
*   **"Show All" Queries Feature:**
    *   Typing "All", "all", or "all queries" (case-insensitive) in the search bar (and performing an explicit search) will display all saved queries.
    *   All saved queries are also displayed by default when the application refreshes or the search bar is empty.



## Technical Stack

*   **Frontend:**
    *   HTML, CSS (inline and via Bootstrap CDN)
    *   JavaScript (React v18 via CDN, Babel for JSX)
*   **Backend:**
    *   Node.js
    *   Express.js (web framework)
    *   `bcrypt` (for password hashing)
    *   `jsonwebtoken` (for JWT authentication)
    *   `cors` (for cross-origin resource sharing between frontend and backend)
*   **Data Storage:** Local JSON files (`db/users.json`, `db/queries.json`)

## Setup and Running Instructions

To run this application, you need to set up both the backend server and open the frontend in your browser.

### Prerequisites

1.  **Node.js and npm:**
    *   Download and install Node.js (which includes npm) from [https://nodejs.org/en/download](https://nodejs.org/en/download).
    *   Verify installation by running `node -v` and `npm -v` in a new terminal.

### Backend Setup

1.  **Navigate to the project directory:**
    Open your terminal (e.g., Command Prompt on Windows) and change to the `D:\smart query app` directory:
    ```bash
    D:
    cd "smart query app"
    ```
2.  **Install Backend Dependencies:**
    Run the following command to install Express, bcrypt, jsonwebtoken, and cors:
    ```bash
    npm install express bcrypt jsonwebtoken cors
    ```
    *   **Note for Windows Users:** If you encounter a "PSSecurityException" error, you must either:
        *   Use **Command Prompt** instead of PowerShell for this command.
        *   Temporarily adjust your PowerShell execution policy: Open an **elevated (Run as administrator) PowerShell** and run `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`, then try `npm install` again in a regular terminal.
3.  **Start the Backend Server:**
    Once dependencies are installed, start the server:
    ```bash
    node server.js
    ```
    Keep this terminal window open. You should see `Server running on http://localhost:3000`.

### Frontend Usage

1.  **Open the Application:**
    Navigate to the `public` directory within your project: `D:\smart query app\public`
    Open the `index.html` file in your preferred web browser (e.g., Chrome, Firefox).

2.  **Register a New User:**
    *   On the initial login screen, click "Need an account? Register".
    *   Enter a new username and password to create your account.

3.  **Log In:**
    *   After registering (or if you already have an account), use your credentials to log in.

4.  **Use the Smart Query App:**
    *   Once logged in, you can add, search, and delete queries. Your queries will be saved specifically to your account via the backend server.
    *   You can also click the "Download as .txt" button to export your current queries to a text file.

## Key Files

*   `package.json`: Project metadata and backend dependencies.
*   `server.js`: The Node.js/Express backend server code.
*   `db/users.json`: Stores user account information (created by the backend).
*   `db/queries.json`: Stores user-specific queries (created by the backend).
*   `public/index.html`: The entire React frontend application.

## Decision Point: Server vs. Serverless

Currently, the app requires the backend server to be running for user authentication and private query storage. We discussed two paths:
*   **Path 1 (Current):** Keep authentication and secure multi-user data (requires running `node server.js`).
*   **Path 2 (Alternative):** Remove authentication and revert to a single-user app using browser Local Storage (no server needed, but no multi-user features).

Please indicate which direction you'd like to pursue.