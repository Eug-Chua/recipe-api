const { MongoClient } = require('mongodb');
require('dotenv').config();

// function to handle connectin to MongoDB
async function connectToMongoDB() {
    // access URI from .env file
    const uri = process.env.MONGO_URI;
    console.log(uri);
    const client = new MongoClient(uri);
    try {
        await client.connect();
        console.log('Connected to MongoDB.');
        return client.db("recipes_db");
    } catch (error) {
        console.error('Error connecting to MongoDB', error);
        throw error;
    }
}

module.exports = { connectToMongoDB };
