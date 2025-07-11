import express from "express";
import { db } from "../../lib/db";
import { authenticate, AuthRequest } from "../../lib/auth";

const router = express.Router();

router.use(authenticate);
router.get("/", async (req: AuthRequest, res) => {
  const chatId = req.query.chatId as string;

  const user = req.user;

  try {
    if (chatId) {
      const chat = await db.chat.findUnique({
        where: { id: chatId },
        include: { users: { select: { picture: true, username: true, bio: true } } },
      });

      res.status(200).json({ chat });
      return;
    }
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const chats = await db.chat.findMany({
      where: {
        members: {
          has: user.id,
        },
      },
      include: {
        messages: { orderBy: { timestamp: "desc" }, take: 1 },
        users: { select: { picture: true, username: true, bio: true } },
      },
    });

    res.status(200).json({ chats });
    return;
  } catch (error) {
    console.error("GET /chat error:", error);
    res.status(500).json({ message: "Failed to fetch chat." });
    return;
  }
});

export default router;
