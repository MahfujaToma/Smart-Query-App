const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// File paths
const DB_DIR = path.join(__dirname, 'db');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const QUERIES_FILE = path.join(DB_DIR, 'queries.json');
const SHARED_QUERIES_FILE = path.join(DB_DIR, 'shared_queries.json');

// Ensure db directory exists
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR);
}

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-that-should-be-in-an-env-file';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files from 'public' directory

// --- Helper Functions ---
const readUsers = () => {
    if (!fs.existsSync(USERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
};

const writeUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

const readQueries = () => {
    if (!fs.existsSync(QUERIES_FILE)) return [];
    return JSON.parse(fs.readFileSync(QUERIES_FILE, 'utf8'));
};

const writeQueries = (queries) => {
    fs.writeFileSync(QUERIES_FILE, JSON.stringify(queries, null, 2));
};

const readSharedQueries = () => {
    if (!fs.existsSync(SHARED_QUERIES_FILE)) return [];
    return JSON.parse(fs.readFileSync(SHARED_QUERIES_FILE, 'utf8'));
};

const writeSharedQueries = (queries) => {
    fs.writeFileSync(SHARED_QUERIES_FILE, JSON.stringify(queries, null, 2));
};

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

    const users = readUsers();
    if (users.find(u => u.username === username)) {
        return res.status(409).send('Username already exists.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { id: Date.now(), username, password: hashedPassword };
    users.push(newUser);
    writeUsers(users);

    res.status(201).send('User registered successfully.');
});

// Login a user
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const users = readUsers();
    const user = users.find(u => u.username === username);

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
    } catch {
        res.status(500).send();
    }
});

// Get user's queries
app.get('/api/queries', authenticateToken, (req, res) => {
    const allQueries = readQueries();
    const userQueries = allQueries.filter(q => q.userId === req.user.id);
    res.json(userQueries);
});

// Add a new query for a user
app.post('/api/queries', authenticateToken, (req, res) => {
    const { title, query } = req.body;
    if (!title || !query) {
        return res.status(400).send('Title and query are required.');
    }

    const allQueries = readQueries();
    const newQuery = {
        id: Date.now(),
        userId: req.user.id,
        title,
        query
    };
    allQueries.push(newQuery);
    writeQueries(allQueries);
    res.status(201).json(newQuery);
});

// Update a user's query (using POST as a workaround)
app.post('/api/queries/update/:id', authenticateToken, (req, res) => {
    console.log('POST /api/queries/update/:id request received');
    const allQueries = readQueries();
    const queryId = parseInt(req.params.id);
    const { title, query } = req.body;

    if (!title || !query) {
        return res.status(400).send('Title and query are required.');
    }

    const queryIndex = allQueries.findIndex(q => q.id === queryId && q.userId === req.user.id);

    if (queryIndex === -1) {
        return res.status(404).send('Query not found or you do not have permission to edit it.');
    }

    const updatedQuery = {
        ...allQueries[queryIndex],
        title,
        query,
        updatedAt: new Date().toISOString()
    };
    allQueries[queryIndex] = updatedQuery;

    writeQueries(allQueries);
    res.json(updatedQuery);
});

// Delete a user's query
app.delete('/api/queries/:id', authenticateToken, (req, res) => {
    console.log('DELETE /api/queries/:id request received');
    const allQueries = readQueries();
    const queryId = parseInt(req.params.id);
    
    // Ensure the query exists and belongs to the user
    const queryToDelete = allQueries.find(q => q.id === queryId && q.userId === req.user.id);
    if (!queryToDelete) {
        return res.status(404).send('Query not found or you do not have permission to delete it.');
    }

    const updatedQueries = allQueries.filter(q => q.id !== queryId);
    writeQueries(updatedQueries);
    res.sendStatus(204);
});

// --- Debug Route (for viewing data on free tier) ---
app.get('/api/debug/get-all-data-for-mahfuja', (req, res) => {
    try {
        const users = readUsers();
        const queries = readQueries();
        const sharedQueries = readSharedQueries();
        res.json({
            users,
            queries,
            sharedQueries
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to read data files.', details: error.message });
    }
});


// --- Sharing Routes ---

// Create a shareable link for a query
app.post('/api/queries/share/:id', authenticateToken, (req, res) => {
    const allQueries = readQueries();
    const queryId = parseInt(req.params.id);

    const queryToShare = allQueries.find(q => q.id === queryId && q.userId === req.user.id);
    if (!queryToShare) {
        return res.status(404).send('Query not found or you do not have permission to share it.');
    }

    const sharedQueries = readSharedQueries();
    const shareId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newSharedQuery = {
        shareId,
        title: queryToShare.title,
        query: queryToShare.query,
        originalUserId: req.user.id,
        createdAt: new Date().toISOString()
    };

    sharedQueries.push(newSharedQuery);
    writeSharedQueries(sharedQueries);

    const shareLink = `${req.protocol}://${req.get('host')}/share/${shareId}`;
    res.json({ shareLink });
});

// Get a shared query by its public shareId (API)
app.get('/api/share/:shareId', (req, res) => {
    const sharedQueries = readSharedQueries();
    const { shareId } = req.params;
    const query = sharedQueries.find(q => q.shareId === shareId);

    if (!query) {
        return res.status(404).send('Shared query not found.');
    }
    res.json(query);
});

// --- Public Page for Shared Queries ---

// Serve a simple HTML page for a shared query
app.get('/share/:shareId', (req, res) => {
    const sharedQueries = readSharedQueries();
    const { shareId } = req.params;
    const query = sharedQueries.find(q => q.shareId === shareId);

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
});



// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Smart Query Server v2 is active on http://localhost:${PORT}`);
    // Initialize db files if they don't exist
    if (!fs.existsSync(USERS_FILE)) writeUsers([]);
    if (!fs.existsSync(QUERIES_FILE)) writeQueries([]);
    if (!fs.existsSync(SHARED_QUERIES_FILE)) writeSharedQueries([]);
});