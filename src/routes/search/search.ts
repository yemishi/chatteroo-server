import express from "express";
import { authenticate, AuthRequest } from "../../lib/auth";
import { db } from "../../lib/db";

const router = express.Router();
router.use(authenticate);
router.get("/user", async (req: AuthRequest, res) => {
  try {
    const currUserId = req.user?.id as string;
    const { q = "", page = 0, take = 20 } = req.query;

    const query = String(q).trim();
    const pageNumber = Number(page);
    const takeNumber = Number(take);
    const skip = pageNumber * takeNumber;

    const count = await db.user.count({
      where: { username: { contains: query, mode: "insensitive" }, AND: { id: { not: currUserId } } },
    });

    const users = await db.user.findMany({
      where: {
        username: { contains: query, mode: "insensitive" },
        AND: { id: { not: currUserId } },
      },
      take: takeNumber,
      skip,
      include: {
        receivedRequests: true,
        sentRequests: true,
      },
    });

    const usersData = await Promise.all(
      users.map(async (u) => {
        const chat = await db.chat.findFirst({
          where: {
            AND: [
              { members: { some: { id: u.id, isRemoved: false } } },
              { members: { some: { id: currUserId, isRemoved: false } } },
            ],
          },
        });
        return {
          id: u.id,
          username: u.username,
          receivedRequests: u.receivedRequests,
          sentRequests: u.sentRequests,
          picture: u.picture,
          chat,
        };
      })
    );
    const usersId = Array.from(
      new Set(
        usersData
          .filter((d) => d.chat !== null)
          .flatMap((d) => d.chat!.members.filter((u) => u.id !== currUserId).map((e) => e.id))
      )
    );
    if (!usersId.length) {
      res.status(200).json({
        users: usersData,
        hasMore: count > skip + users.length,
      });
      return;
    }
    const membersData = await db.user.findMany({
      where: { id: { in: usersId } },
      select: { id: true, username: true, picture: true },
    });
    const userMap = Object.fromEntries(membersData.map((u) => [u.id, u]));
    const data = usersData.map((c) => {
      const chat = c.chat
        ? {
            ...c.chat,
            members: c.chat?.members.filter((u) => u.id !== currUserId).map((u) => userMap[u.id]),
          }
        : null;
      return { ...c, chat };
    });

    res.status(200).json({
      users: data,
      hasMore: count > skip + users.length,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "We had an error trying to search users." });
  }
});

export default router;
