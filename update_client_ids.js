import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import { generateClientId } from './src/utils/admin.js';

dotenv.config();

const updateClients = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const clients = await User.find({ role: 'client' }).sort({ created_at: 1 });
    console.log(`Found ${clients.length} clients`);

    for (const client of clients) {
      if (!client.client_id || !client.client_id.startsWith('Client - ')) {
        const newClientId = await generateClientId(client.date_of_birth || new Date(), client._id);
        client.client_id = newClientId;
        await client.save({ validateBeforeSave: false });
        console.log(`Updated client ${client.email} to ${newClientId}`);
      } else {
        console.log(`Client ${client.email} already has valid ID ${client.client_id}`);
      }
    }

    console.log('Finished updating clients');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

updateClients();
