import express from "express";
import { db } from "../../lib/db";
import { authenticate, AuthRequest } from "../../lib/auth";

const router = express.Router();

router.use(authenticate);
router.get("/", async (req: AuthRequest, res) => {
  const { take = 20, page = 0 } = req.query as {
    take?: number;
    page?: number;
  };
  const user = req.user;

  try {
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
      skip: Number(page) * Number(take),
      take,
    });

    res.status(200).json({ chats });
    return;
  } catch (error) {
    console.error("GET /chat error:", error);
    res.status(500).json({ message: "Failed to fetch chats." });
    return;
  }
});

router.get("/:chatId", async (req, res) => {
  const { chatId } = req.params;
  try {
    if (!chatId) {
      res.status(404).json({ message: "Chat not found" });
      return;
    }
    const chat = await db.chat.findUnique({
      where: { id: chatId as string },
      include: { users: { select: { picture: true, username: true, bio: true } } },
    });

    res.status(200).json({ chat });
    return;
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch chat." });
    return;
  }
});
export default router;
