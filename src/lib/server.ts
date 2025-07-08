import { Server, Socket } from "socket.io";
import http from "http";
import express from "express";

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

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);

    if (userId) {
      delete onlineUsers[userId];
    }

    io.emit("online-users", Object.keys(onlineUsers));
  });
});

export { io, app, server };
