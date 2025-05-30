import express from "express";
import { db } from "../../lib/db";

const router = express.Router();

router.get("/", async (req, res) => {
  const chatId = req.query.chatId as string;

  if (!chatId) {
    res.status(400).json({ message: "Chat ID is required" });
    return;
  }

  try {
    const chat = await db.chat.findUnique({ where: { id: chatId } });

    if (!chat) {
      res.status(404).json({ message: "Chat not found" });
      return;
    }

    res.status(200).json({ chat });
    return;
  } catch (error) {
    console.error("GET /chat error:", error);
    res.status(500).json({ message: "Failed to fetch chat." });
    return;
  }
});

export default router;
