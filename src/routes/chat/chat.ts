import express from "express";
import { db } from "../../lib/db";
import { authenticate, AuthRequest } from "../../lib/auth";

const router = express.Router();

router.use(authenticate);
router.get("/", async (req: AuthRequest, res) => {
  const user = req.user;

  try {
    const chats = await db.chat.findMany({
      where: { members: { has: user?.id } },
      orderBy: { lastMessageAt: "desc" },
      include: { messages: { orderBy: { timestamp: "desc" }, take: 1 } },
    });

    const usersId = Array.from(new Set(chats.flatMap((c) => c.members.filter((id) => id !== user?.id))));

    const users = await db.user.findMany({
      where: { id: { in: usersId } },
      select: { id: true, username: true, picture: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
    const data = chats.map((c) => {
      return { ...c, members: c.members.filter((id) => id !== user?.id).map((id) => userMap[id]) };
    });

    res.status(200).json(data);
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
    });

    res.status(200).json({ chat });
    return;
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch chat." });
    return;
  }
});
export default router;
