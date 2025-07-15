import express from "express";
import { db } from "../../../lib/db";

import { authenticate, AuthRequest } from "../../../lib/auth";

const router = express.Router();

router.use(authenticate);

router.get("/", async (req: AuthRequest, res) => {
  const { userId } = req.params;
  const currentUser = req.user;

  const { take = 20, page = 0 } = req.query as { take?: number; page?: number };

  if (!currentUser) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const skip = Number(page) * Number(take);
    const requests = await db.request.findMany({
      where: { to: userId, status: "pending" },
      skip,
      take,
    });

    res.status(200).json({
      requests,
    });
  } catch (err) {
    console.error("GET /requests error:", err);
    res.status(500).json({ message: "We had an error trying to retrieve the friend requests" });
  }
});

router.post("/:userId", async (req: AuthRequest, res) => {
  const { userId } = req.params;
  const currentUser = req.user;

  if (!currentUser) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  try {
    await db.request.create({ data: { from: currentUser.id, to: userId } });
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

    if (!request || request.to !== currentUser.id) {
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

    if (!request || request.to !== currentUser.id) {
      res.status(404).json({ message: "Friend request not found or unauthorized." });
      return;
    }

    const friendId = request.from;

    await db.$transaction([
      db.user.update({
        where: { id: currentUser.id },
        data: { friends: { push: friendId } },
      }),
      db.user.update({
        where: { id: friendId },
        data: { friends: { push: currentUser.id } },
      }),
      db.request.update({
        where: { id: requestId },
        data: { status: "accepted" },
      }),
      db.chat.create({
        data: { members: { set: [currentUser.id, friendId] } },
      }),
    ]);

    res.status(200).json({ message: "Friend request accepted successfully." });
  } catch (err) {
    console.error("POST /requests/:requestId/accept error:", err);
    res.status(500).json({ message: "Failed to accept friend request." });
  }
});

export default router;
