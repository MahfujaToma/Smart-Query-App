require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { MongoClient, ObjectId } = require('mongodb'); // Import MongoClient and ObjectId
// PostgreSQL Connection Pool Configuration
// These should ideally come from environment variables
/*
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',      // Your PostgreSQL username
    host: process.env.DB_HOST || 'localhost',     // Your PostgreSQL host
    database: process.env.DB_NAME || 'smart_query_app', // The database you created
    password: process.env.DB_PASSWORD || 'your_db_password', // Your PostgreSQL password
    port: process.env.DB_PORT || 5432,            // Default PostgreSQL port
});
*/

let db; // MongoDB database instance
let usersCollection;
let queriesCollection;
let sharedQueriesCollection;
let queryHistoryCollection;

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mahfujatoma5431_db_user:M0dk4EmacAGF0L7S@cluster0.aeffuxp.mongodb.net/?appName=Cluster0'; // Your MongoDB Atlas connection string

async function connectToMongoDB() {
    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        console.log('Connected to MongoDB Atlas');
        db = client.db('smart_query_app'); // Specify your database name
        usersCollection = db.collection('users');
        queriesCollection = db.collection('queries');
        sharedQueriesCollection = db.collection('shared_queries');
        queryHistoryCollection = db.collection('query_history');
    } catch (error) {
        console.error('Error connecting to MongoDB Atlas:', error);
        process.exit(1); // Exit process if MongoDB connection fails
    }
}

// Test the database connection
/*
pool.connect()
    .then(client => {
        console.log('Connected to PostgreSQL database');
        client.release(); // Release the client back to the pool
    })
    .catch(err => {
        console.error('Error connecting to PostgreSQL database', err.stack);
    });
*/

const app = express();
const PORT = process.env.PORT || 3000;



// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-that-should-be-in-an-env-file';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files from 'public' directory



// --- User Data Access (MongoDB) ---
async function findUserByUsername(username) {
    return await usersCollection.findOne({ username: username });
}

async function findUserById(id) {
    try {
        return await usersCollection.findOne({ _id: new ObjectId(id) });
    } catch (error) {
        // Handle cases where id is not a valid ObjectId format
        return null;
    }
}

async function createUser(username, hashedPassword) {
    const result = await usersCollection.insertOne({
        username: username,
        password: hashedPassword,
        createdAt: new Date()
    });
    return { _id: result.insertedId, username: username }; // Return the new user with MongoDB's _id
}

// --- Query Data Access (MongoDB) ---
async function getUserQueries(userId) {
    return await queriesCollection.find({ userId: userId }).sort({ updatedAt: -1 }).toArray();
}

async function addQuery(userId, title, queryText) {
    const newQuery = {
        userId: userId,
        title: title,
        query: queryText,
        updatedAt: new Date(),
        createdAt: new Date()
    };
    const result = await queriesCollection.insertOne(newQuery);
    return { ...newQuery, _id: result.insertedId };
}

async function updateUserQuery(queryId, userId, title, queryText) {
    const result = await queriesCollection.findOneAndUpdate(
        { _id: new ObjectId(queryId), userId: userId },
        { $set: { title: title, query: queryText, updatedAt: new Date() } },
        { returnDocument: 'after' } // Return the updated document
    );
    // MongoDB returns { value: doc } or null if not found
    return result.value;
}

async function deleteUserQuery(queryId, userId) {
    const result = await queriesCollection.deleteOne({ _id: new ObjectId(queryId), userId: userId });
    return result.deletedCount > 0;
}

async function getQueryByIdAndUserId(queryId, userId) {
    return await queriesCollection.findOne({ _id: new ObjectId(queryId), userId: userId });
}

// --- Query History Data Access (MongoDB) ---
async function addQueryToHistory(userId, title, queryText) {
    try {
        const historyEntry = {
            userId: userId,
            title: title,
            query: queryText,
            createdAt: new Date()
        };
        const result = await queryHistoryCollection.insertOne(historyEntry);
        return { ...historyEntry, _id: result.insertedId };
    } catch (error) {
        console.error('Error adding query to history:', error);
        throw error;
    }
}

async function getHistoryForUser(userId) {
    try {
        return await queryHistoryCollection.find({ userId: userId }).sort({ createdAt: -1 }).toArray();
    } catch (error) {
        console.error('Error fetching query history:', error);
        throw error;
    }
}

async function deleteQueryHistoryEntry(historyId, userId) {
    try {
        const result = await queryHistoryCollection.deleteOne({ _id: new ObjectId(historyId), userId: userId });
        return result.deletedCount > 0;
    } catch (error) {
        console.error('Error deleting query history entry:', error);
        throw error;
    }
}

async function deleteAllUserHistory(userId) {
    try {
        const result = await queryHistoryCollection.deleteMany({ userId: userId });
        return result.deletedCount > 0;
    } catch (error) {
        console.error('Error deleting all user history:', error);
        throw error;
    }
}

// --- Shared Query Data Access (MongoDB) ---
async function addSharedQuery(shareId, title, queryText, originalUserId) {
    const newSharedQuery = {
        shareId: shareId,
        title: title,
        query: queryText,
        originalUserId: originalUserId, // This will be an ObjectId
        createdAt: new Date()
    };
    await sharedQueriesCollection.insertOne(newSharedQuery);
    return newSharedQuery;
}

async function getSharedQueryById(shareId) {
    return await sharedQueriesCollection.findOne({ shareId: shareId });
}

// --- Auth Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401); // No token

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Invalid token
        req.user = { ...user, id: new ObjectId(user.id) };
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
            const accessToken = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
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
    const queryId = req.params.id; // Removed parseInt
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
    const queryId = req.params.id; // Removed parseInt
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
            return res.status(404).send('Query not found during deletion.');
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
    const historyId = req.params.id; // Removed parseInt
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
        const usersResult = await usersCollection.find({}).toArray();
        const queriesResult = await queriesCollection.find({}).toArray();
        const sharedQueriesResult = await sharedQueriesCollection.find({}).toArray();
        const queryHistoryResult = await queryHistoryCollection.find({}).toArray(); // Also include history

        res.json({
            users: usersResult,
            queries: queriesResult,
            sharedQueries: sharedQueriesResult,
            queryHistory: queryHistoryResult
        });
    } catch (error) {
        console.error('Error fetching debug data from MongoDB:', error);
        res.status(500).json({ error: 'Failed to read data from MongoDB.', details: error.message });
    }
});


// --- Sharing Routes ---

// Create a shareable link for a query
app.post('/api/queries/share/:id', authenticateToken, async (req, res) => {
    const queryId = req.params.id;

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
async function startServer() {
    await connectToMongoDB();
    app.listen(PORT, () => {
        console.log(`Smart Query Server v2 is active on http://localhost:${PORT}`);
    });
}

startServer();