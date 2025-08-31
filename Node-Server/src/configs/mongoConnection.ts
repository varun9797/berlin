import mongoose from "mongoose";

const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/varunDb";

export const connectToMongo = async () => {
    try {
        await mongoose.connect(mongoURI);
        console.log("Connected to MongoDB successfully");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
};