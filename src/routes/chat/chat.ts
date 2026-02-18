import express from "express";
import { db } from "../../lib/db";
import { authenticate, AuthRequest } from "../../lib/auth";

const router = express.Router();

router.use(authenticate);
router.get("/", async (req: AuthRequest, res) => {
  const user = req.user;
  try {
    const chats = await db.chat.findMany({
      where: { members: { some: { id: String(user?.id), AND: { isRemoved: false } } } },
      orderBy: { lastMessageAt: "desc" },
      include: { messages: { orderBy: { timestamp: "desc" }, take: 1 } },
    });

    const usersId = Array.from(
      new Set(chats.flatMap((c) => c.members.filter((u) => u.id !== user?.id || u.isRemoved).map((e) => e.id)))
    );
    const users = await db.user.findMany({
      where: { id: { in: usersId } },
      select: {
        id: true,
        username: true,
        picture: true,
        guestCode: true,
        email: true,
        bio: true,
        tag: true,
        createAt: true,
      },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
    const defaultUser = {
      id: "_",
      username: "Unknown",
      picture: "https://upload.wikimedia.org/wikipedia/commons/2/2c/Default_pfp.svg",
    };
    const data = chats.map((c) => {
      const filtered = c.members.filter((u) => u.id !== user?.id);
      const highlight =
        filtered.length > 0 && filtered.every((u) => !u.isRemoved) ? userMap[filtered[0].id] : defaultUser;

      return {
        ...c,
        highlight,
        messages: c.messages.map((i) =>
          i.content.text ? i : { ...i, content: { text: `[sent ${i.content.imgs.length > 1 ? "some" : "a"} picture]` } }
        ),
        members: c.members.map((u) => {
          if (u.id === user?.id) return u;
          if (u.isRemoved) {
            return defaultUser;
          }
          return userMap[u.id];
        }),
      };
    });

    res.status(200).json(data);
    return;
  } catch (error) {
    console.error("GET /chat error:", error);
    res.status(500).json({ message: "Failed to fetch chats." });
    return;
  }
});

router.get("/:chatId", async (req: AuthRequest, res) => {
  const user = req.user;
  const { chatId } = req.params;

  try {
    if (!chatId) {
      res.status(404).json({ message: "Chat not found" });
      return;
    }

    const chat = await db.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      res.status(404).json({ message: "Chat not found" });
      0;
      return;
    }

    const usersId = Array.from(new Set(chat.members.filter((u) => u.id !== user?.id || u.isRemoved).map((e) => e.id)));

    const users = await db.user.findMany({
      where: { id: { in: usersId } },
      select: {
        id: true,
        username: true,
        picture: true,
        guestCode: true,
        email: true,
        bio: true,
        tag: true,
        createAt: true,
      },
    });

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
    const defaultUser = {
      id: "_",
      username: "Unknown",
      picture: "https://upload.wikimedia.org/wikipedia/commons/2/2c/Default_pfp.svg",
    };

    const filtered = chat.members.filter((u) => u.id !== user?.id);

    const highlight =
      filtered.length > 0 && filtered.every((u) => !u.isRemoved) ? userMap[filtered[0].id] : defaultUser;

    const data = {
      ...chat,
      highlight,
      members: chat.members.map((u) => {
        if (u.id === user?.id) return u;
        if (u.isRemoved) {
          return defaultUser;
        }
        return userMap[u.id];
      }),
    };

    res.status(200).json(data);
  } catch (error) {
    console.error("GET /chat/:chatId error:", error);
    res.status(500).json({ message: "Failed to fetch chat." });
  }
});
export default router;
