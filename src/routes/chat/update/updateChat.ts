import express from "express";
import { db } from "../../../lib/db";
import { authenticate, AuthRequest } from "../../../lib/auth";

const router = express.Router();

router.use(authenticate);

router.patch("/read", async (req: AuthRequest, res) => {
  const { chatId } = req.body;
  const userId = req.user!.id;

  if (!chatId) {
    res.status(400).json({ message: "Message ID and content are required" });
    return;
  }

  try {
    const chat = await db.chat.findUnique({ where: { id: chatId }, select: { members: true } });
    if (!chat) {
      res.status(404).json({ message: "Message not found" });
      return;
    }
    const lastMessageReadAt = new Date();
    const updatedMembers = chat.members.map((m) => (m.id === userId ? { ...m, lastMessageReadAt } : m));
    await db.chat.update({
      where: { id: chatId },
      data: { members: updatedMembers },
      select: { members: true },
    });

    res.status(200).json({ message: "Message updated successfully", lastMessageReadAt });
    return;
  } catch (error) {
    console.error("PATCH /messages error:", error);
    res.status(500).json({ message: "There was a problem updating the message" });
    return;
  }
});

router.patch("/quit", async (req: AuthRequest, res) => {
  const { chatId } = req.body;
  const userId = req.user!.id;

  if (!chatId) {
    res.status(400).json({ message: "Chat ID is required" });
    return;
  }

  try {
    const chat = await db.chat.findUnique({
      where: { id: chatId },
      select: { members: true },
    });

    if (!chat) {
      res.status(404).json({ message: "Chat not found" });
      return;
    }

    const updatedMembers = chat.members.map((m) => (m.id === userId ? { ...m, isRemoved: true } : m));

    await db.chat.update({
      where: { id: chatId },
      data: { members: updatedMembers },
    });

    await Promise.all(
      chat.members.map(async (m) => {
        const user = await db.user.findUnique({
          where: { id: m.id },
          select: { friends: true },
        });

        if (!user) return;

        const updatedFriends = user.friends.filter((fid) => fid !== userId);

        return db.user.update({
          where: { id: m.id },
          data: { friends: { set: updatedFriends } },
        });
      })
    );
    res.status(200).json({ message: "Chat updated successfully" });
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
    return;
  }
});

export default router;
