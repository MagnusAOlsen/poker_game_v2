import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";


export async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.log("No MONGODB_URI set — running without database (stats will not be saved).");
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI, {
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