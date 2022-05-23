const express = require('express')
const app = express()
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const objectId = require('mongodb').ObjectId;
const cors = require('cors');
const port = process.env.PORT || 5000




app.use(cors());
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rcjvl.mongodb.net/?retryWrites=true&w=majority` ;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {

    try{
        await client.connect();
        console.log('Database connect sucess');
        const partsCollection = client.db("auto_parts").collection("single_parts");


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



    }

    finally{

    }

}


run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World! Car Manufacture')
})

app.listen(port, () => {
  console.log(`Auto Parts listening on port ${port}`)
})