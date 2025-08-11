import express from "express";
import { db } from "../../../lib/db";

import { authenticate, AuthRequest } from "../../../lib/auth";

const router = express.Router();

router.use(authenticate);

router.get("/sent/:userId", async (req: AuthRequest, res) => {
  const id = req.query.userId ? req.query.userId : req.user?.id;
  const take = Number(req.query.take ?? 20);
  const page = Number(req.query.page ?? 0);

  await handleRequestList({
    userId: id as string,
    relationField: "fromId",
    includeField: "to",
    res,
    take,
    page,
  });
});

router.get("/receives", async (req: AuthRequest, res) => {
  const id = req.query.userId ? req.query.userId : req.user?.id;
  const take = Number(req.query.take ?? 20);
  const page = Number(req.query.page ?? 0);
  await handleRequestList({
    userId: id as string,
    relationField: "toId",
    includeField: "from",
    res,
    take,
    page,
  });
});

router.post("/:userId", async (req: AuthRequest, res) => {
  const { userId } = req.params;
  const currentUser = req.user;

  try {
    await db.request.create({ data: { fromId: currentUser?.id!, toId: userId } });
    res.status(201).json({ message: "Friend request sent successfully." });
    return;
  } catch (err) {
    console.error("POST /requests error:", err);
    res.status(500).json({ message: "Failed to process friend request" });
    return;
  }
});

router.delete("/:requestId", async (req: AuthRequest, res) => {
  const { requestId } = req.params;
  const currentUser = req.user;

  if (!currentUser) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const request = await db.request.findUnique({
      where: { id: requestId },
    });

    if (!request || request.toId !== currentUser.id) {
      res.status(404).json({ message: "Request not found or unauthorized." });
      return;
    }

    await db.request.delete({ where: { id: requestId } });
    res.status(200).json({ message: "Friend request declined successfully." });
  } catch (err) {
    console.error("DELETE /requests/:requestId error:", err);
    res.status(500).json({ message: "Failed to decline friend request." });
  }
});

router.patch("/:requestId/accept", async (req: AuthRequest, res) => {
  const { requestId } = req.params;
  const currentUser = req.user;

  if (!currentUser) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const request = await db.request.findUnique({
      where: { id: requestId },
    });

    if (!request || request.toId !== currentUser.id) {
      res.status(404).json({ message: "Friend request not found or unauthorized." });
      return;
    }

    const friendId = request.fromId;
    const existingChat = await db.chat.findFirst({
      where: {
        members: {
          hasEvery: [currentUser.id, friendId],
        },
      },
    });

    await db.$transaction([
      db.user.update({
        where: { id: currentUser.id },
        data: { friends: { push: friendId } },
      }),
      db.user.update({
        where: { id: friendId },
        data: { friends: { push: currentUser.id } },
      }),
      db.request.delete({
        where: { id: requestId },
      }),
      ...(existingChat
        ? []
        : [
            db.chat.create({
              data: { members: { set: [currentUser.id, friendId] } },
            }),
          ]),
    ]);

    res.status(200).json({ message: "Friend request accepted successfully." });
  } catch (err) {
    console.error("POST /requests/:requestId/accept error:", err);
    res.status(500).json({ message: "Failed to accept friend request." });
  }
});

async function handleRequestList({
  userId,
  relationField,
  includeField,
  res,
  take,
  page,
}: {
  userId: string;
  relationField: "fromId" | "toId";
  includeField: "from" | "to";
  res: any;
  take: number;
  page: number;
}) {
  const skip = page * take;
  try {
    const [count, requests] = await db.$transaction([
      db.request.count({ where: { [relationField]: userId } }),
      db.request.findMany({
        where: { [relationField]: userId },
        skip,
        take,
        include: {
          [includeField]: {
            select: { username: true, picture: true, guestId: true },
          },
        },
      }),
    ]);
    res.status(200).json({
      requests,
      hasMore: skip + requests.length < count,
    });
  } catch (err) {
    console.error(`GET /requests/${relationField} error:`, err);
    res.status(500).json({
      message: "We had an error trying to retrieve the friend requests.",
    });
  }
}

export default router;
