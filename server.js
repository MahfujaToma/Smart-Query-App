require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg'); // Import the Pool from 'pg'

// PostgreSQL Connection Pool Configuration
// These should ideally come from environment variables
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',      // Your PostgreSQL username
    host: process.env.DB_HOST || 'localhost',     // Your PostgreSQL host
    database: process.env.DB_NAME || 'smart_query_app', // The database you created
    password: process.env.DB_PASSWORD || 'your_db_password', // Your PostgreSQL password
    port: process.env.DB_PORT || 5432,            // Default PostgreSQL port
});

// Test the database connection
pool.connect()
    .then(client => {
        console.log('Connected to PostgreSQL database');
        client.release(); // Release the client back to the pool
    })
    .catch(err => {
        console.error('Error connecting to PostgreSQL database', err.stack);
    });

const app = express();
const PORT = process.env.PORT || 3000;



// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-that-should-be-in-an-env-file';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files from 'public' directory



// --- User Data Access (PostgreSQL) ---
async function findUserByUsername(username) {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0];
}

async function findUserById(id) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
}

async function createUser(username, hashedPassword) {
    const result = await pool.query(
        'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
        [username, hashedPassword]
    );
    return result.rows[0];
}

// --- Query Data Access (PostgreSQL) ---
async function getUserQueries(userId) {
    const result = await pool.query('SELECT id, user_id AS "userId", title, query_text AS query, updated_at AS "updatedAt" FROM queries WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
    return result.rows;
}

async function addQuery(userId, title, queryText) {
    const result = await pool.query(
        'INSERT INTO queries (user_id, title, query_text) VALUES ($1, $2, $3) RETURNING id, user_id AS "userId", title, query_text AS query, updated_at AS "updatedAt"',
        [userId, title, queryText]
    );
    return result.rows[0];
}

async function updateUserQuery(queryId, userId, title, queryText) {
    const result = await pool.query(
        'UPDATE queries SET title = $1, query_text = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4 RETURNING id, user_id AS "userId", title, query_text AS query, updated_at AS "updatedAt"',
        [title, queryText, queryId, userId]
    );
    return result.rows[0];
}

async function deleteUserQuery(queryId, userId) {
    const result = await pool.query('DELETE FROM queries WHERE id = $1 AND user_id = $2 RETURNING id', [queryId, userId]);
    return result.rowCount > 0;
}

async function getQueryByIdAndUserId(queryId, userId) {
    const result = await pool.query('SELECT id, user_id AS "userId", title, query_text AS query, updated_at AS "updatedAt" FROM queries WHERE id = $1 AND user_id = $2', [queryId, userId]);
    return result.rows[0];
}

// --- Query History Data Access (PostgreSQL) ---
async function addQueryToHistory(userId, title, queryText) {
    try {
        const result = await pool.query(
            'INSERT INTO query_history (user_id, title, query_text) VALUES ($1, $2, $3) RETURNING id, user_id AS "userId", title, query_text AS query, created_at AS "createdAt"',
            [userId, title, queryText]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Error adding query to history:', error);
        throw error;
    }
}

async function getHistoryForUser(userId) {
    try {
        const result = await pool.query(
            'SELECT id, user_id AS "userId", title, query_text AS query, created_at AS "createdAt" FROM query_history WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        return result.rows;
    } catch (error) {
        console.error('Error fetching query history:', error);
        throw error;
    }
}

async function deleteQueryHistoryEntry(historyId, userId) {
    try {
        const result = await pool.query('DELETE FROM query_history WHERE id = $1 AND user_id = $2 RETURNING id', [historyId, userId]);
        return result.rowCount > 0;
    } catch (error) {
        console.error('Error deleting query history entry:', error);
        throw error;
    }
}

async function deleteAllUserHistory(userId) {
    try {
        await pool.query('DELETE FROM query_history WHERE user_id = $1', [userId]);
        return true;
    } catch (error) {
        console.error('Error deleting all user history:', error);
        throw error;
    }
}

// --- Shared Query Data Access (PostgreSQL) ---
async function addSharedQuery(shareId, title, queryText, originalUserId) {
    const result = await pool.query(
        'INSERT INTO shared_queries (share_id, title, query_text, original_user_id) VALUES ($1, $2, $3, $4) RETURNING share_id AS "shareId", title, query_text AS query, original_user_id AS "originalUserId", created_at AS "createdAt"',
        [shareId, title, queryText, originalUserId]
    );
    return result.rows[0];
}

async function getSharedQueryById(shareId) {
    const result = await pool.query('SELECT share_id AS "shareId", title, query_text AS query, original_user_id AS "originalUserId", created_at AS "createdAt" FROM shared_queries WHERE share_id = $1', [shareId]);
    return result.rows[0];
}

// --- Auth Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401); // No token

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Invalid token
        req.user = user;
        next();
    });
};

// --- API Routes ---

// Register a new user
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Username and password are required.');
    }

    const existingUser = await findUserByUsername(username);
    if (existingUser) {
        return res.status(409).send('Username already exists.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        await createUser(username, hashedPassword);
        res.status(201).send('User registered successfully.');
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).send('Internal server error.');
    }
});

// Login a user
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await findUserByUsername(username);

    if (user == null) {
        return res.status(400).send('Cannot find user.');
    }

    try {
        if (await bcrypt.compare(password, user.password)) {
            const accessToken = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
            res.json({ accessToken });
        } else {
            res.status(403).send('Not Allowed. Incorrect password.');
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Internal server error.');
    }
});

// Get user's queries
app.get('/api/queries', authenticateToken, async (req, res) => {
    try {
        const userQueries = await getUserQueries(req.user.id);
        res.json(userQueries);
    } catch (error) {
        console.error('Error fetching user queries:', error);
        res.status(500).send('Internal server error.');
    }
});

// Add a new query for a user
app.post('/api/queries', authenticateToken, async (req, res) => {
    const { title, query } = req.body;
    if (!title || !query) {
        return res.status(400).send('Title and query are required.');
    }

    try {
        const newQuery = await addQuery(req.user.id, title, query);
        // Log to history
        await addQueryToHistory(req.user.id, title, query);
        res.status(201).json(newQuery);
    } catch (error) {
        console.error('Error adding new query:', error);
        res.status(500).send('Internal server error.');
    }
});

// Update a user's query (using POST as a workaround)
app.post('/api/queries/update/:id', authenticateToken, async (req, res) => {
    console.log('POST /api/queries/update/:id request received');
    const queryId = parseInt(req.params.id);
    const { title, query } = req.body;

    if (!title || !query) {
        return res.status(400).send('Title and query are required.');
    }

    try {
        const updatedQuery = await updateUserQuery(queryId, req.user.id, title, query);
        if (!updatedQuery) {
            return res.status(404).send('Query not found or you do not have permission to edit it.');
        }
        // Log to history
        await addQueryToHistory(req.user.id, title, query);
        res.json(updatedQuery);
    } catch (error) {
        console.error('Error updating query:', error);
        res.status(500).send('Internal server error.');
    }
});

// Delete a user's query
app.delete('/api/queries/:id', authenticateToken, async (req, res) => {
    console.log('DELETE /api/queries/:id request received');
    const queryId = parseInt(req.params.id);
    const userId = req.user.id;

    try {
        // Find the query to be deleted to log it to history
        const queryToDelete = await getQueryByIdAndUserId(queryId, userId);

        if (!queryToDelete) {
            return res.status(404).send('Query not found or you do not have permission to delete it.');
        }

        // Add the query to the history table before deleting
        await addQueryToHistory(userId, queryToDelete.title, queryToDelete.query);

        // Now, delete the query from the main queries table
        const deleted = await deleteUserQuery(queryId, userId);

        if (!deleted) {
            // This case should not be reached if the find query worked, but for safety
            return res.status(4_04).send('Query not found during deletion.');
        }

        res.sendStatus(204); // Success
    } catch (error) {
        console.error('Error deleting query:', error);
        res.status(500).send('Internal server error.');
    }
});

// --- Query History API ---
app.post('/api/history', authenticateToken, async (req, res) => {
    const { title, query } = req.body;
    if (!title || !query) {
        return res.status(400).send('Title and query are required for history logging.');
    }
    try {
        const historyEntry = await addQueryToHistory(req.user.id, title, query);
        res.status(201).json(historyEntry);
    } catch (error) {
        console.error('Error logging query to history:', error);
        res.status(500).send('Internal server error.');
    }
});

app.get('/api/history', authenticateToken, async (req, res) => {
    try {
        const history = await getHistoryForUser(req.user.id);
        res.json(history);
    } catch (error) {
        console.error('Error fetching query history:', error);
        res.status(500).send('Internal server error.');
    }
});

// Delete all query history for a user
app.delete('/api/history/all', authenticateToken, async (req, res) => {
    console.log('DELETE /api/history/all request received');
    const userId = req.user.id;

    try {
        await deleteAllUserHistory(userId);
        res.sendStatus(204); // Success, no content
    } catch (error) {
        console.error('Error deleting all user history:', error);
        res.status(500).send('Internal server error.');
    }
});

// Delete a query history entry
app.delete('/api/history/:id', authenticateToken, async (req, res) => {
    console.log('DELETE /api/history/:id request received');
    const historyId = parseInt(req.params.id);
    const userId = req.user.id;

    try {
        const deleted = await deleteQueryHistoryEntry(historyId, userId);
        if (!deleted) {
            return res.status(404).send('History entry not found or you do not have permission to delete it.');
        }
        res.sendStatus(204); // No content to send back, successful deletion
    } catch (error) {
        console.error('Error deleting query history entry:', error);
        res.status(500).send('Internal server error.');
    }
});


// --- Debug Route (for viewing data on free tier) ---
app.get('/api/debug/get-all-data-for-mahfuja', async (req, res) => {
    try {
        const usersResult = await pool.query('SELECT id, username FROM users');
        const queriesResult = await pool.query('SELECT id, user_id AS "userId", title, query_text AS query, updated_at AS "updatedAt" FROM queries');
        const sharedQueriesResult = await pool.query('SELECT share_id AS "shareId", title, query_text AS query, original_user_id AS "originalUserId", created_at AS "createdAt" FROM shared_queries');
        
        res.json({
            users: usersResult.rows,
            queries: queriesResult.rows,
            sharedQueries: sharedQueriesResult.rows
        });
    } catch (error) {
        console.error('Error fetching debug data from PostgreSQL:', error);
        res.status(500).json({ error: 'Failed to read data from PostgreSQL.', details: error.message });
    }
});


// --- Sharing Routes ---

// Create a shareable link for a query
app.post('/api/queries/share/:id', authenticateToken, async (req, res) => {
    const queryId = parseInt(req.params.id);

    try {
        const queryToShare = await getQueryByIdAndUserId(queryId, req.user.id);
        if (!queryToShare) {
            return res.status(404).send('Query not found or you do not have permission to share it.');
        }

        const shareId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const newSharedQuery = await addSharedQuery(
            shareId,
            queryToShare.title,
            queryToShare.query,
            req.user.id
        );

        const shareLink = `${req.protocol}://${req.get('host')}/share/${newSharedQuery.shareId}`;
        res.json({ shareLink });
    } catch (error) {
        console.error('Error sharing query:', error);
        res.status(500).send('Internal server error.');
    }
});

// Get a shared query by its public shareId (API)
app.get('/api/share/:shareId', async (req, res) => {
    const { shareId } = req.params;
    try {
        const query = await getSharedQueryById(shareId);

        if (!query) {
            return res.status(404).send('Shared query not found.');
        }
        res.json(query);
    } catch (error) {
        console.error('Error fetching shared query (API):', error);
        res.status(500).send('Internal server error.');
    }
});

// --- Public Page for Shared Queries ---

// Serve a simple HTML page for a shared query
app.get('/share/:shareId', async (req, res) => {
    const { shareId } = req.params;
    try {
        const query = await getSharedQueryById(shareId);

        if (!query) {
            return res.status(404).send('<h1>Not Found</h1><p>The query you are looking for does not exist or has been removed.</p>');
        }

        res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Shared Query: ${query.title}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body { background-color: #f8f9fa; padding: 2rem; }
                .container { max-width: 800px; }
                .query-card {
                    word-wrap: break-word;
                    white-space: pre-wrap;
                    background-color: #e9ecef;
                    border-left: 5px solid #0dcaf0;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="card shadow-sm">
                    <div class="card-header">
                        <h1 class="card-title h3">${query.title}</h1>
                    </div>
                    <div class="card-body">
                        <pre class="query-card p-3 rounded"><code>${query.query}</code></pre>
                    </div>
                    <div class="card-footer text-muted">
                        Shared at ${new Date(query.createdAt).toLocaleString()}
                    </div>
                </div>
                 <div class="mt-3 text-center">
                    <a href="/" class="btn btn-primary">Create your own queries with Smart Query App</a>
                </div>
            </div>
        </body>
        </html>
    `);
    } catch (error) {
        console.error('Error serving shared query page:', error);
        res.status(500).send('<h1>Error</h1><p>An error occurred while loading the shared query.</p>');
    }
});



// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Smart Query Server v2 is active on http://localhost:${PORT}`);

});