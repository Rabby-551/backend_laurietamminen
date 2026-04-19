import mongoose from 'mongoose';

export const connectDB = async () => {
  mongoose.set('strictQuery', true);

  const connection = await mongoose.connect(process.env.MONGODB_URI);

  console.log(`MongoDB connected: ${connection.connection.host}`);
};

export default connectDB;
