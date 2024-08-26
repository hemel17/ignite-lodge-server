const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// custom middleware
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "Unauthorized access!" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access!" });
    }
    req.user = decoded;
    next();
  });
};

// mongoDB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vgu9onq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const roomsCollection = client.db("igniteLodgeDB").collection("rooms");
    const featuredRoomsCollection = client
      .db("igniteLodgeDB")
      .collection("featuredRooms");

    // jwt authentication
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("user for jwt", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    // clear cookies after logout
    app.post("/logout", async (req, res) => {
      const user = req.body;
      // console.log("logging out", user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    // all rooms
    app.get("/rooms", async (req, res) => {
      const { min, max } = req.query;
      let query = {};
      if (min && max) {
        query.PricePerNight = { $gte: parseInt(min), $lte: parseInt(max) };
      }
      const result = await roomsCollection.find(query).toArray();
      res.send(result);
    });

    //featured rooms
    app.get("/featuredRooms", async (req, res) => {
      const result = await featuredRoomsCollection.find().toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Ignite Lodge is runnig");
});

app.listen(port, () => {
  console.log(`Ignite Lodge is runnig at port : ${port}`);
});
