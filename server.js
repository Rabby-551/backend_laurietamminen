import 'dotenv/config';
import { createServer } from 'http';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { initSocket } from './src/sockets/index.js';
import cleanupExpiredOtps from './src/jobs/cleanupExpiredOtps.js';

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);
initSocket(httpServer);

connectDB().then(() => {
  cleanupExpiredOtps.start();

  httpServer.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err.message);
  httpServer.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message);
  process.exit(1);
});
