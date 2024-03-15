// INITIATE DEPENDENCIES
const express = require('express');
const {ObjectId} = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


// import `connectToMongoDB` function from `db.js` file
const {connectToMongoDB} = require('./db');

require('dotenv').config();
// enable Cross-Origin Resource Sharing (CORS)
const cors = require('cors');

// create the express application
const app = express();

// Set JSON as means of receiving requests and responses
app.use(express.json());
app.use(cors());

const port = 3070;

async function main(){
    try {
        const db = await connectToMongoDB();

        // SET UP THE ROUTES
        app.get("/recipes", async function (req, res) {
            try {
                // empty criteria object
                // Note: if we do a .find({}) it will return all the documents in the collection
                const criteria = {};
    
                if (req.query.name) {
                    criteria.name = {
                        '$regex': req.query.name,
                        '$options': 'i'
                    }
                }
    
                if (req.query.ingredients) {
                    criteria.ingredients = {
                        '$in':[req.query.ingredients]
                    }
                }
                
                // get all the sightings
                const results = await db.collection("recipes").find(criteria).toArray();
                console.log(results);
                res.json({
                    'recipes': results
                })
            } catch (e) {
                res.status(500);
                res.json({
                    'error': e
                })
            }
        })
    

        app.post('/recipes', async (req, res) => {
            try {
              const { name, cooking_duration, difficulty, cuisine, tags, ingredients } = req.body;
          
              // Validation
              if (!name || !cooking_duration || !difficulty || !cuisine || !tags || !ingredients) {
                return res.status(400).json({ message: 'Missing required fields' });
              }
          
              const newRecipe = { name, cooking_duration, difficulty, cuisine, tags, ingredients };
              const result = await db.collection('recipes').insertOne(newRecipe);
              res.status(201).json(result);
            } catch (error) {
              res.status(500).json({ message: 'Error adding new recipe', error: error.message });
            }
        });
        // Get all recipes
        app.get('/recipes', async (req, res) => {
            try {
                const recipes = await db.collection('recipes').find({}).toArray();
                res.json(recipes);
            } catch (error) {
                res.status(500).json({ message: 'Error fetching recipes', error: error.message });
            }
        });
        // Get a single recipe by ID
        app.get('/recipes/:id', async (req, res) => {
            try {
                const id = new ObjectId(req.params.id);
                const recipe = await db.collection('recipes').findOne({_id: id});
                if (recipe) {
                    res.json(recipe);
                } else {
                    res.status(404).json({ message: 'Recipe not found' });
                }
            } catch (error) {
                res.status(500).json({ message: 'Error fetching recipe', error: error.message });
            }
            });
            
        app.get('/recipes', async (req, res) => {
            try {
                // Fetching all recipes
                const recipes = await db.collection('recipes').find({}).toArray();
              
                // Fetching all tags
                const tags = await db.collection('tags').find({}).toArray();
                const tagMap = {};
            
                // Creating tag map using for loop
                for (let i = 0; i < tags.length; i++) {
                    const tag = tags[i];
                    tagMap[tag._id] = tag.name;
                }
              
                // Replacing tag IDs with tag names in recipes using for loops
                for (let recipe of recipes) {
                // ensure that recipe.tags is an array
                if (Array.isArray(recipe.tags)) {
                    for (let k = 0; k < recipe.tags.length; k++) {
                        const tagId = recipe.tags[k];
                    // if the tag id exists, 
                    if (tagMap[tagId]) {
                        // replace the existing tag with the one from the tags map
                        recipe.tags[k] = tagMap[tagId];
                    }
                    }
                }
                }
                res.json(recipes);
            } catch (error) {
                res.status(500).json({ message: 'Error fetching recipes', error: error.message });
            }
        });

        app.put('/recipes/:id', async (req, res) => {
            try {
                const id = new ObjectId(req.params.id);
                const { name, cooking_duration, difficulty, cuisine, tags, ingredients } = req.body;

                // Validation
                if (!name || !Array.isArray(ingredients) || ingredients.length === 0) {
                    return res.status(400).json({ message: 'Name and ingredients are required, and ingredients should be a non-empty array.'});
        
                }
                // Additional validation can be added as necessary
                const updateData = { name, cooking_duration, difficulty, cuisine, tags, ingredients };
                const result = await db.collection('recipes').updateOne(
                    { _id: id },
                    { $set: updateData }
                    );
                    if (result.modifiedCount === 0) {
                        return res.status(404).json({ message: 'No recipe found with this ID, or no new data provided' });
                    }
                    
                    res.json({ message: 'Recipe updated successfully' });
                } catch (error) {
                    res.status(500).json({ message: 'Error updating recipe', error: error.message });
                }
            });
        
        app.post('/users', async function (req, res) {
            const db = getDB();
            const result = await db.collection("users").insertOne({
                'email': req.body.email,
                'password': await bcrypt.hash(req.body.password, 12)
            })
            res.json({
                "message": "Success",
                "result": result
            })
        })

        const generateAccessToken = (id, email) => {
            return jwt.sign({
                'user_id': id,
                'email': email
            }, process.env.TOKEN_SECRET, {
                expiresIn: "1h"
            });
        }

        app.post('/login', async (req, res) => {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ message: 'Email and password are required' });
            }
            const user = await db.collection('users').findOne({ email: email });
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Invalid password' });
            }
            const accessToken = generateAccessToken(user._id, user.email);
            res.json({ accessToken: accessToken });
          });
          
        const verifyToken = (req, res, next) => {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];
            if (!token) return res.sendStatus(403);
            jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
                if (err) return res.sendStatus(403);
                req.user = user;
                next();
            });
        };

        app.get('/profile', verifyToken, (req, res) => {
            res.json({ message: 'This is a protected route', user: req.user });
        });

        app.delete('/recipes/:id', async function(req,res){
            try {
                await db.collection('recipes').deleteOne({
                    '_id': new ObjectId(req.params.id)
                });
                res.json({
                    'Message':"Recipe deleted."
                })
            } catch (e) {
                res.status(500)
                res.json({
                    'Error':e
                })
            }
        })

    } catch (error) {
        console.error('Error connecting to MongoDB', error);
    }
}

main();

// ENABLE THE SERVER
app.listen(port, () => {
    console.log(`Server is running on port ${port}.`);
});
