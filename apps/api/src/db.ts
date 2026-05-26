import mongoose from "mongoose";

const mongoUri =
  process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/customs_broker_track";

export async function connectDb() {
  await mongoose.connect(mongoUri);
  console.log(`MongoDB connected: ${mongoUri}`);
}
