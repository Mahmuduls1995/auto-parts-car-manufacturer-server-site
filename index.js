const express = require('express')
const app = express()
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const objectId = require('mongodb').ObjectId;
const jwt = require('jsonwebtoken');
const cors = require('cors');
const port = process.env.PORT || 5000


const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);



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
    const userCollection = client.db("auto_parts").collection("users");
    const paymentCollection = client.db('auto_parts').collection('payments');
    const profileCollection = client.db('auto_parts').collection('profile');

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


    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {
        next();
      }

      else {
        res.status(403).send({ message: 'forbidden' });
      }

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



    app.post('/single_parts', async (req, res) => {
      const parts = req.body;
      console.log(parts.data);
      const result = await partsCollection.insertOne(parts);
      res.send(result);
    })

    app.get('/single_parts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: objectId(id) };
      const result = await partsCollection.findOne(query);
      res.send(result);
    });



    //delete a parts
    app.delete('/single_parts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: objectId(id) }
      const result = await partsCollection.deleteOne(query)
      res.send(result)
    })

    //Order Collection ApI  

    app.post('/order', async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    })

    //Order Collection ApI  

    app.get('/order', verifyJWT, async (req, res) => {

      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      

      if (email === decodedEmail) {
        const query = { email: email };
        const cursor = orderCollection.find(query);
        const orders = await cursor.toArray();
        res.send(orders);
      }
      else {
        res.status(403).send({ message: 'forbidden access' })
      }

    })

    app.get('/orders', async (req, res) => {

     
        const cursor = orderCollection.find({});
        const order = await cursor.toArray();
        // console.log(order);
        res.send(order);

    })





    app.get('/order/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: objectId(id) };
      const booking = await orderCollection.findOne(query);
      res.send(booking);
    })


    //delete a Order part
    app.delete('/order/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: objectId(id) }
      const result = await orderCollection.deleteOne(query)
      res.send(result)
    })

    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const service = req.body;
      const price = service.productPrice;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({ clientSecret: paymentIntent.client_secret })
    });



    app.patch('/order/:id', async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: objectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId
        }

      }


      const result = await paymentCollection.insertOne(payment);
      const updatedBooking = await orderCollection.updateOne(filter, updatedDoc);
      res.send(updatedBooking);
    })


    app.post('/review', async (req, res) => {
      const order = req.body;
      const result = await reviewCollection.insertOne(order);
      res.send(result);
    })


    app.get('/review', async (req, res) => {
      const parts = await reviewCollection.find({}).toArray();
      res.send(parts)
    })

    app.get('/user', verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ result, token });

    })



    app.put('/profile',async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await profileCollection.updateOne( filter,updateDoc, options);
      res.send(result);

    })


    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === 'admin';
      res.send({ admin: isAdmin })
    })



    app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: 'admin' },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
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