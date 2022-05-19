const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config();
const jwt = require('jsonwebtoken');

// Set Port
const port = process.env.PORT || 5000;

// Set Middleware
app.use(cors());
app.use(express.json());

// JWT token verify
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ Message: 'Unauthorized Access!' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' });
        }
        req.decoded = decoded;
        next();
    })
}

// Connect DB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lsrjs.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// Create API
async function run() {
    try {
        await client.connect();
        const listCollection = client.db('todo').collection('list');

        // JWT token
        app.post('/login', async (req, res) => {
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1d'
            });
            res.send({ accessToken });
        })

        // Create API for get all list
        app.get('/lists', async (req, res) => {
            const query = {};
            const cursor = listCollection.find(query);
            const lists = await cursor.toArray();
            res.send(lists);
        });

        // Create API for add new list
        app.post('/list', async (req, res) => {
            const newList = req.body;
            const result = await listCollection.insertOne(newList);
            res.send(result);
        })

        // Get My Items API
        app.get('/task-list', verifyToken, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const cursor = listCollection.find(query);
                const items = await cursor.toArray();
                res.send(items);
            } else {
                res.status(403).send({ message: 'Forbidden Access' });
            }
        })

        // Create delete API
        app.delete('/list/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await listCollection.deleteOne(query);
            res.send(result);
        })


        // Update API
        app.put('/lists/:id', async (req, res) => {
            const id = req.params.id;
            const updatedList = req.body;
            const query = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    status: updatedList.status
                }
            };
            const result = await listCollection.updateOne(query, updatedDoc, options);
            res.send(result);
        })


    } finally { }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Server Running in the Front!');
});

app.listen(port, () => {
    console.log('Server Running in the Console!');
});