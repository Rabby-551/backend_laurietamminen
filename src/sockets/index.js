import { Server } from 'socket.io';
import User from '../models/User.js';
import { verifyAccessToken } from '../utils/token.js';

let io;
const ADMIN_ROOM = 'admin_room';

const getTokenFromHandshake = (socket) => {
  const rawToken = socket.handshake.auth?.token;

  if (!rawToken || typeof rawToken !== 'string') {
    return null;
  }

  return rawToken.startsWith('Bearer ') ? rawToken.split(' ')[1] : rawToken;
};

export const getClientRoom = (userId) => `client:${userId}`;

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

  io.use(async (socket, next) => {
    try {
      const token = getTokenFromHandshake(socket);

      if (!token) {
        return next(new Error('Authentication failed'));
      }

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id);

      if (!user || !user.is_active) {
        return next(new Error('Authentication failed'));
      }

      socket.user = {
        id: user._id.toString(),
        role: user.role,
        full_name: user.full_name,
      };

      return next();
    } catch (error) {
      return next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(getClientRoom(socket.user.id));

    if (socket.user.role === 'admin') {
      socket.join(ADMIN_ROOM);
    }

    socket.emit('socket:connected', {
      message: 'Socket connection established',
      socket_id: socket.id,
      role: socket.user.role,
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

export const emitNewAlert = (payload) => {
  getIO().to(ADMIN_ROOM).emit('new_alert', payload);
};

export const emitAlertLocationUpdate = (payload) => {
  getIO().to(ADMIN_ROOM).emit('alert_location_update', payload);
};

export const emitAlertStatusChanged = (payload) => {
  const socket = getIO();
  socket.to(ADMIN_ROOM).emit('alert_status_changed', payload);

  if (payload.client_user_id) {
    socket
      .to(getClientRoom(payload.client_user_id.toString()))
      .emit('alert_status_changed', payload);
  }
};

export default initSocket;
