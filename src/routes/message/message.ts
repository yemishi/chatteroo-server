import { authenticate, AuthRequest } from "@lib/auth";
import express from "express";
import { db } from "src/lib/db";

const router = express.Router();

router.use(authenticate);

router.get("/", async (req: AuthRequest, res) => {
  const chatId = req.query.chatId as string;
  if (!chatId) {
    res.status(400).json({ message: "Chat ID is required" });
    return;
  }

  try {
    const chat = await db.chat.findUnique({ where: { id: chatId }, select: { participants: true } });

    if (!chat || !chat.participants.includes(req.user!.id)) {
      res.status(403).json({ message: "User is not part of the chat" });
      return;
    }

    const messages = await db.message.findMany({
      where: { chatId },
      orderBy: { timestamp: "asc" },
    });

    res.status(200).json({ messages });
    return;
  } catch (error) {
    console.error("GET /messages error:", error);
    res.status(500).json({ message: "There was a problem retrieving the messages" });
    return;
  }
});

router.post("/", async (req: AuthRequest, res) => {
  const { chatId, content } = req.body;

  if (!chatId || !content) {
    res.status(400).json({ message: "Chat ID and content are required" });
    return;
  }

  try {
    const chat = await db.chat.findUnique({ where: { id: chatId } });

    if (!chat || !chat.participants.includes(req.user!.id)) {
      res.status(403).json({ message: "User is not part of the chat" });
      return;
    }

    const newMessage = await db.message.create({
      data: {
        content,
        senderId: req.user!.id,
        chatId,
      },
    });

    res.status(200).json({ message: "Message sent successfully", newMessage });
    return;
  } catch (error) {
    console.error("POST /messages error:", error);
    res.status(500).json({ message: "There was a problem sending the message" });
    return;
  }
});

router.patch("/", async (req: AuthRequest, res) => {
  const messageId = req.query.messageId as string;
  const { content } = req.body;

  if (!messageId || !content) {
    res.status(400).json({ message: "Message ID and content are required" });
    return;
  }

  try {
    const message = await db.message.findUnique({ where: { id: messageId } });

    if (!message) {
      res.status(404).json({ message: "Message not found" });
      return;
    }

    if (message.senderId !== req.user!.id) {
      res.status(403).json({ message: "You are not authorized to update this message" });
      return;
    }

    const updatedMessage = await db.message.update({
      where: { id: messageId },
      data: {
        content,
        editedAt: new Date(),
      },
    });

    res.status(200).json({ message: "Message updated successfully", updatedMessage });
    return;
  } catch (error) {
    console.error("PATCH /messages error:", error);
    res.status(500).json({ message: "There was a problem updating the message" });
    return;
  }
});

export default router;
