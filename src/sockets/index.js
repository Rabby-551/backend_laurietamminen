import { Server } from 'socket.io';

let io;

const parseOrigins = () => {
  if (!process.env.CLIENT_URL) {
    return '*';
  }

  return process.env.CLIENT_URL.split(',').map((origin) => origin.trim());
};

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: parseOrigins(),
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    socket.emit('socket:connected', {
      message: 'Socket connection established',
      socket_id: socket.id,
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }

  return io;
};

export default initSocket;
