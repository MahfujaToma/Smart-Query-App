require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const { Pool } = require('pg');

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mahfujatoma5431_db_user:M0dk4EmacAGF0L7S@cluster0.aeffuxp.mongodb.net/?appName=Cluster0';
let mongoClient;
let mongoDb;

// PostgreSQL Connection
const pgPool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'smart_query_app',
    password: process.env.DB_PASSWORD || 'your_db_password',
    port: process.env.DB_PORT || 5432,
});

async function migrateData() {
    try {
        // Connect to MongoDB
        mongoClient = new MongoClient(MONGO_URI);
        await mongoClient.connect();
        mongoDb = mongoClient.db('smart_query_app');
        console.log('Connected to MongoDB Atlas for migration.');

        // Clear existing data in MongoDB collections (optional, for clean migration)
        console.log('Clearing existing MongoDB collections...');
        await mongoDb.collection('users').deleteMany({});
        await mongoDb.collection('queries').deleteMany({});
        await mongoDb.collection('shared_queries').deleteMany({});
        await mongoDb.collection('query_history').deleteMany({});
        console.log('MongoDB collections cleared.');


        // --- Migrate Users ---
        console.log('Migrating users...');
        const pgUsers = await pgPool.query('SELECT id, username, password, created_at FROM users ORDER BY id');
        const userMap = new Map(); // Map old PG user ID to new Mongo ObjectId

        for (const pgUser of pgUsers.rows) {
            const newUser = {
                _id: new ObjectId(), // Generate new ObjectId for MongoDB
                username: pgUser.username,
                password: pgUser.password,
                createdAt: pgUser.created_at
            };
            await mongoDb.collection('users').insertOne(newUser);
            userMap.set(pgUser.id, newUser._id); // Store mapping
            console.log(`Migrated user: ${pgUser.username} (PG ID: ${pgUser.id} -> Mongo ID: ${newUser._id})`);
        }
        console.log(`Migrated ${pgUsers.rows.length} users.`);

        // --- Migrate Queries ---
        console.log('Migrating queries...');
        const pgQueries = await pgPool.query('SELECT id, user_id, title, query_text, updated_at FROM queries ORDER BY id');
        for (const pgQuery of pgQueries.rows) {
            const newQuery = {
                _id: new ObjectId(),
                userId: userMap.get(pgQuery.user_id), // Use new Mongo ObjectId
                title: pgQuery.title,
                query: pgQuery.query_text,
                updatedAt: pgQuery.updated_at,
                createdAt: pgQuery.updated_at // Assuming createdAt is same as updatedAt if not present in PG
            };
            // Ensure userId is valid before inserting
            if (newQuery.userId) {
                await mongoDb.collection('queries').insertOne(newQuery);
                console.log(`Migrated query: ${pgQuery.title} (PG ID: ${pgQuery.id})`);
            } else {
                console.warn(`Skipping query ${pgQuery.id}: User ID ${pgQuery.user_id} not found in migrated users.`);
            }
        }
        console.log(`Migrated ${pgQueries.rows.length} queries.`);

        // --- Migrate Shared Queries ---
        console.log('Migrating shared queries...');
        const pgSharedQueries = await pgPool.query('SELECT share_id, title, query_text, original_user_id, created_at FROM shared_queries ORDER BY created_at');
        for (const pgSharedQuery of pgSharedQueries.rows) {
            const newSharedQuery = {
                shareId: pgSharedQuery.share_id,
                title: pgSharedQuery.title,
                query: pgSharedQuery.query_text,
                originalUserId: userMap.get(pgSharedQuery.original_user_id), // Use new Mongo ObjectId
                createdAt: pgSharedQuery.created_at
            };
             // Ensure originalUserId is valid before inserting
            if (newSharedQuery.originalUserId) {
                await mongoDb.collection('shared_queries').insertOne(newSharedQuery);
                console.log(`Migrated shared query: ${pgSharedQuery.title} (Share ID: ${pgSharedQuery.share_id})`);
            } else {
                console.warn(`Skipping shared query ${pgSharedQuery.share_id}: Original User ID ${pgSharedQuery.original_user_id} not found in migrated users.`);
            }
        }
        console.log(`Migrated ${pgSharedQueries.rows.length} shared queries.`);

        // --- Migrate Query History ---
        console.log('Migrating query history...');
        const pgQueryHistory = await pgPool.query('SELECT id, user_id, title, query_text, created_at FROM query_history ORDER BY id');
        for (const pgHistory of pgQueryHistory.rows) {
            const newHistory = {
                _id: new ObjectId(),
                userId: userMap.get(pgHistory.user_id), // Use new Mongo ObjectId
                title: pgHistory.title,
                query: pgHistory.query_text,
                createdAt: pgHistory.created_at
            };
             // Ensure userId is valid before inserting
            if (newHistory.userId) {
                await mongoDb.collection('query_history').insertOne(newHistory);
                console.log(`Migrated history entry: ${pgHistory.title} (PG ID: ${pgHistory.id})`);
            } else {
                console.warn(`Skipping history entry ${pgHistory.id}: User ID ${pgHistory.user_id} not found in migrated users.`);
            }
        }
        console.log(`Migrated ${pgQueryHistory.rows.length} history entries.`);


        console.log('Data migration complete!');

    } catch (error) {
        console.error('Error during data migration:', error);
    } finally {
        // Close connections
        if (mongoClient) {
            await mongoClient.close();
            console.log('MongoDB connection closed.');
        }
        await pgPool.end();
        console.log('PostgreSQL connection closed.');
    }
}

migrateData();
