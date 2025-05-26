import express from "express";
import { db } from "src/lib/db";

import { authenticate, AuthRequest } from "@lib/auth";

const router = express.Router();

router.use(authenticate);

router.get("/:userId", async (req: AuthRequest, res) => {
  const { userId } = req.params;

  try {
    const pendingSentRequests = await db.request.findMany({
      where: { from: userId, status: "pending" },
    });

    const pendingReceivedRequests = await db.request.findMany({
      where: { to: userId, status: "pending" },
    });

    res.status(200).json({ pendingSentRequests, pendingReceivedRequests });
    return;
  } catch (err) {
    console.error("GET /requests error:", err);
    res.status(500).json({ message: "We had an error trying to retrieve the friend requests" });
    return;
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
    const { requestId, acceptRequest } = req.body;

    if (requestId) {
      if (!acceptRequest) {
        await db.request.delete({ where: { id: requestId } });
        res.status(200).json({ message: "Friend request declined successfully" });
        return;
      }

      await db.$transaction([
        db.user.update({
          where: { id: userId },
          data: { friends: { push: currentUser.id } },
        }),
        db.user.update({
          where: { id: currentUser.id },
          data: { friends: { push: userId } },
        }),
        db.request.update({
          where: { id: requestId },
          data: { status: "accepted" },
        }),
        db.chat.create({
          data: { participants: { set: [currentUser.id, userId] } },
        }),
      ]);

      res.status(201).json({ message: "Friend request accepted successfully." });
      return;
    }

    await db.request.create({ data: { from: currentUser.id, to: userId } });
    res.status(201).json({ message: "Friend request sent successfully." });
    return;
  } catch (err) {
    console.error("POST /requests error:", err);
    res.status(500).json({ message: "Failed to process friend request" });
    return;
  }
});

export default router;
