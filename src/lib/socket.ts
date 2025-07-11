import { Server, Socket } from "socket.io";
import http from "http";
import express from "express";
import { db } from "./db";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const onlineUsers: Record<string, string> = {};

export function getUserSocketId(userId: string): string | undefined {
  return onlineUsers[userId];
}

io.on("connection", (socket: Socket) => {
  console.log("✅ User connected:", socket.id);

  const userId = socket.handshake.query.userId as string | undefined;
  if (userId) {
    onlineUsers[userId] = socket.id;
  }

  io.emit("online-users", Object.keys(onlineUsers));
  socket.on("getOnlineUsers", () => {
    socket.emit("online-users", Object.keys(onlineUsers));
  });

  socket.on("subscribe", (roomId: string) => {
    console.log(`${socket.id} subscribed to room ${roomId}`);
    socket.join(roomId);
  });

  socket.on("unsubscribe", (roomId: string) => {
    console.log(`${socket.id} unsubscribed from room ${roomId}`);
    socket.leave(roomId);
  });

  socket.on("send", async ({ message }) => {
    console.log(`${message.sender} sent message to ${message.room}: ${message.content}`);
    io.to(message.room).emit("message", message);

    /*  try {
      await db.message.create({
        data: {
          content: message.content,
          senderId: message.senderId,
          chatId: message.room,
        },
      });
    } catch (err) {
      console.error("Failed to save message to DB:", err);
    } */
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);

    if (userId) {
      delete onlineUsers[userId];
    }

    io.emit("online-users", Object.keys(onlineUsers));
  });
});
export { io, app, server };
