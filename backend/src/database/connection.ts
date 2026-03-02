import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";


export async function connectDB() {
  const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/poker_stats";
  try {
    await mongoose.connect(MONGODB_URI, {
      // These are safe defaults; Mongoose 7+ doesn't require most legacy options
      // serverSelectionTimeoutMS helps fail fast if DNS / IP whitelist is wrong
      dbName: "test",
      serverSelectionTimeoutMS: 10000,
    });

    const host = mongoose.connection.host;
    const dbName = mongoose.connection.name;

    console.log(
      `Connected to MongoDB (${MONGODB_URI.includes("mongodb.net") ? "Atlas" : "Local"}): ${host}/${dbName}`
    );
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  }
}