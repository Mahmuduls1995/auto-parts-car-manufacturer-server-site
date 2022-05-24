const express = require('express')
const app = express()
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const objectId = require('mongodb').ObjectId;
const jwt = require('jsonwebtoken');
const cors = require('cors');
const port = process.env.PORT || 5000






app.use(cors());
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rcjvl.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {

  try {
    await client.connect();
    console.log('Database connect sucess');
    const partsCollection = client.db("auto_parts").collection("single_parts");
    const orderCollection = client.db("auto_parts").collection("order");
    const reviewCollection = client.db("auto_parts").collection("review");


    function verifyJWT(req, res, next) {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = authHeader.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(403).send({ message: 'Forbidden access' });
        }
        console.log('decoded', decoded);
        req.decoded = decoded;
        next();
      })
    }

    app.post("/login", async (req, res) => {
      const email = req.body;

      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET);

      res.send({ token })
  })



    app.get('/single_parts', async (req, res) => {
      const parts = await partsCollection.find({}).toArray();
      res.send(parts)
    })

    app.get('/single_parts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: objectId(id) };
      const result = await partsCollection.findOne(query);
      res.send(result);
    });


    //Order Collection ApI  

    app.post('/order', async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    })

    //Order Collection ApI  

    app.get('/order',  async (req, res) => {

      // const decodedEmail = req.decoded.email;
      const email = req.query.email;
      // console.log(decodedEmail);

      if (email ) {
        const query = { email: email };
        const cursor = orderCollection.find(query);
        const orders = await cursor.toArray();
        res.send(orders);
      }
      else {
        res.status(403).send({ message: 'forbidden access' })
      }

    })

    app.post('/review', async (req, res) => {
      const order = req.body;
      const result = await reviewCollection.insertOne(order);
      res.send(result);
    })

    


  }

  finally {

  }

}


run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World! Car Manufacture')
})

app.listen(port, () => {
  console.log(`Auto Parts listening on port ${port}`)
})