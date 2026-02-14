const dotenv = require('dotenv');
dotenv.config();

const {MongoClient} = require('mongodb');

let database;

const initDB = (callback) => {
    if (database) {
        console.log('Database is already initialized!');
        return callback(null, database);
    }
    MongoClient.connect(process.env.MONGODB_URL)
        .then((client) => {
            database = client;
            console.log('Connected to MongoDB!');
            callback(null, database);
        })
        .catch((err) => {
            console.log('Failed to connect to MongoDB', err);
            callback(err);
        });
};

const getDatabase = () => {
    if (!database) {
        throw Error('Database not initialized!');
    }
    return database;
};

module.exports = {
    initDB,
    getDatabase
};