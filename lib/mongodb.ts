import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
console.log("MongoDB URI:", uri); // Log the MongoDB URI for debugging
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your MongoDB URI to .env.local");
}

client = new MongoClient(uri, options);

clientPromise = client.connect();

export default clientPromise;
