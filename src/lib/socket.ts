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
  const userId = socket.handshake.query.userId as string | undefined;
  console.log("✅ User connected:", userId);

  if (userId) {
    onlineUsers[userId] = socket.id;
  }
  /*   socket.on("subscribe-all", (chatIds: string[]) => {
    for (const id of chatIds) {
      socket.join(id);
      console.log("joined", id);
    }
  }); */

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

  type Message = {
    room: string;
    senderId: string;
    senderName: string;
    senderPicture: string;
    content: { text?: string; imgs: string[] };
    timestamp: Date;
  };

  socket.on("typing", ({ roomId, userId, usersId }: { roomId: string; userId: string; usersId: string[] }) => {
    for (const id of usersId) {
      const socketId = onlineUsers[id];
      if (socketId && socketId !== socket.id) {
        io.to(socketId).emit("user-typing", { roomId, userId });
      }
    }
  });

  socket.on("stop-typing", ({ roomId, userId, usersId }: { roomId: string; userId: string; usersId: string[] }) => {
    for (const id of usersId) {
      const socketId = onlineUsers[id];
      if (socketId && socketId !== socket.id) {
        io.to(socketId).emit("user-stop-typing", { roomId, userId });
      }
    }
  });

  socket.on("edit-message", async ({ message, chatRoom }) => {
    io.to(chatRoom).emit("update-message", message);
  });
  socket.on("send-message", async ({ message, membersId }: { message: Message; membersId: any[] }) => {
    const timestamp = new Date();
    const newMessage = await db.message.create({
      data: {
        content: message.content,
        senderId: message.senderId,
        chatId: message.room,
      },
    });

    io.to(message.room).emit("message", { ...message, timestamp, id: newMessage.id });
    for (const userId of [...membersId, socket.handshake.query.userId]) {
      const socketId = onlineUsers[userId];

      if (socketId) {
        io.to(socketId).emit("chat-updated", {
          chatId: message.room,
          content: message.content,
          senderId: message.senderId,

          timestamp,
        });

        if (!io.sockets.adapter.rooms.get(message.room)?.has(socketId)) {
          io.to(socketId).emit("toast", {
            title: message.senderName,
            icon: message.senderPicture,
            chatId: message.room,
            message: message.content,
          });
        }
      }
    }

    try {
      await db.chat.update({
        where: { id: message.room },
        data: { lastMessageAt: timestamp },
      });
    } catch (err) {
      console.error("Failed to save message to DB:", err);
    }
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
