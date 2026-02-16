// tests/setup.js
// This file runs before all tests

// The idea is to set up an in-memory MongoDB instance for testing,
// so we don't affect the real database and can have a clean state for each test.

const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

let mongoServer;
let connection;
let db;

// Start in-memory MongoDB before all tests
beforeAll(async () => {
  // Create in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  // Connect to in-memory database
  connection = await MongoClient.connect(uri);
  db = connection.db('test-database');
  
  // Make db available globally
  global.__MONGO_DB__ = db;
  global.__MONGO_CONNECTION__ = connection;
  
  console.log('In-memory MongoDB started');
});

// Clean up after each test
afterEach(async () => {
  if (db) {
    // Clear all collections after each test
    const collections = await db.collections();
    for (let collection of collections) {
      await collection.deleteMany({});
    }
  }
});

// Stop in-memory MongoDB after all tests
afterAll(async () => {
  if (connection) {
    await connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
  console.log('In-memory MongoDB stopped');
});