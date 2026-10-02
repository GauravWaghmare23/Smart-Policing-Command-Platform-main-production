import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';
import PoliceOfficer from '../models/PoliceOfficer.js';
import { getRedisClient, REDIS_KEYS } from '../config/redis.js';
import { corsOrigin } from '../config/cors.js';

let io = null;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST', 'PATCH'],
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        return next(); // Anonymous/public connection
      }

      const decoded = jwt.verify(token, env.jwtAccessSecret);
      const user = await User.findById(decoded.userId);
      if (user && user.status === 'ACTIVE') {
        socket.user = user;
      }
      next();
    } catch (err) {
      console.warn('Socket authentication warning:', err.message);
      next();
    }
  });

  io.on('connection', (socket) => {
    // Join room based on user role and ID
    if (socket.user) {
      const userId = socket.user._id.toString();
      const role = socket.user.role;

      if (role === 'CONTROL_ROOM_ADMIN') {
        socket.join('control-room');
      } else if (role === 'CITIZEN') {
        socket.join(`citizen:${userId}`);
      } else {
        // Police Roles (STATION_HEAD, INVESTIGATING_OFFICER, FIELD_OFFICER)
        socket.join(`officer:${userId}`);
        
        PoliceOfficer.findOne({ userId }).then((officer) => {
          if (officer && officer.stationId) {
            socket.join(`station:${officer.stationId}`);
          }
        });
      }
    }

    // Handle high-frequency real-time officer location updates
    socket.on('officer:location:update', async (data) => {
      if (socket.user && ['STATION_HEAD', 'INVESTIGATING_OFFICER', 'FIELD_OFFICER'].includes(socket.user.role)) {
        const { latitude, longitude, accuracy, dutyStatus } = data;
        const userId = socket.user._id;

        try {
          const updateFields = {
            currentLocation: { latitude, longitude },
            lastLocationUpdate: new Date()
          };
          if (dutyStatus) {
            updateFields.dutyStatus = dutyStatus;
          }

          const officer = await PoliceOfficer.findOneAndUpdate(
            { userId },
            { $set: updateFields },
            { new: true }
          );
          
          if (officer) {
            const payload = {
              officerId: officer._id,
              userId,
              name: socket.user.name,
              badgeNumber: officer.badgeNumber,
              rank: officer.rank,
              role: officer.role,
              stationId: officer.stationId,
              dutyStatus: officer.dutyStatus,
              currentLocation: { latitude, longitude },
              accuracy: accuracy || null,
              lastLocationUpdate: officer.lastLocationUpdate
            };

            // Cache in Redis for instant retrieval
            const redis = getRedisClient();
            if (redis) {
              redis.set(REDIS_KEYS.OFFICER_LOC(userId), JSON.stringify(payload), 'EX', 300);
            }

            // Broadcast to Control Room and Station
            io.to('control-room').emit('officer:location', payload);
            if (officer.stationId) {
              io.to(`station:${officer.stationId}`).emit('officer:location', payload);
            }
          }
        } catch (err) {
          console.error('Error saving socket location update:', err.message);
        }
      }
    });

    // Handle patrol real-time breadcrumb streaming
    socket.on('patrol:location:update', async (data) => {
      const { patrolId, latitude, longitude, accuracy } = data;
      if (!patrolId || latitude == null || longitude == null) return;

      const Patrol = (await import('../models/Patrol.js')).default;
      try {
        const patrol = await Patrol.findOne({ _id: patrolId });
        if (patrol && patrol.status === 'ACTIVE') {
          patrol.actualPath.push({ latitude, longitude, accuracy: accuracy || 0, timestamp: new Date() });
          patrol.currentLocation = { latitude, longitude, accuracy: accuracy || 0, lastUpdate: new Date() };
          await patrol.save();

          const payload = {
            patrolId: patrol._id,
            patrolCode: patrol.patrolId,
            currentLocation: patrol.currentLocation,
            actualPath: patrol.actualPath
          };

          io.to('control-room').emit('patrol:progress', payload);
          if (patrol.stationId) {
            io.to(`station:${patrol.stationId}`).emit('patrol:progress', payload);
          }
        }
      } catch (err) {
        console.error('Error updating patrol stream:', err.message);
      }
    });

    socket.on('disconnect', () => {});
  });

  return io;
};

export const getIO = () => io;

export const sendRealtimeEvent = (room, event, payload) => {
  if (io) {
    io.to(room).emit(event, payload);
  }
};
