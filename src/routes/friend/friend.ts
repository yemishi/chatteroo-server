import { authenticate, AuthRequest } from "../../lib/auth";
import express from "express";
import { db } from "../../lib/db";

const router = express.Router();

router.use(authenticate);

router.get("/:userId", async (req: AuthRequest, res) => {
  const { userId } = req.params;
  const isFriend = req.query.isFriend as string;
  const currentUser = req.user;

  if (!currentUser) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    if (isFriend) {
      const checkFriend = await db.user.findFirst({
        where: {
          id: userId,
          friends: {
            has: currentUser.id,
          },
        },
      });

      res.status(200).json({ isFriend: !!checkFriend });
      return;
    }

    const userFriends = await db.user.findFirstOrThrow({
      where: { id: userId },
      select: { friends: true },
    });

    const friendsData = await db.user.findMany({
      where: {
        id: { in: userFriends.friends },
      },
      select: {
        id: true,
        username: true,
        picture: true,
        bio: true,
      },
    });

    res.status(200).json({ friends: friendsData });
    return;
  } catch (err) {
    console.error("Friend GET error:", err);
    res.status(500).json({
      message: "We had a problem trying to get data of friends from this user.",
    });
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
    const { unfriend } = req.body;

    if (unfriend) {
      const targetUser = await db.user.findUnique({
        where: { id: userId },
        select: { friends: true },
      });

      if (!targetUser) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const updatedTargetFriends = targetUser.friends.filter((fid) => fid !== currentUser.id);

      const currentUserRecord = await db.user.findUnique({
        where: { id: currentUser.id },
        select: { friends: true },
      });

      const updatedCurrentFriends = currentUserRecord?.friends.filter((fid) => fid !== userId) ?? [];

      await db.$transaction([
        db.user.update({
          where: { id: userId },
          data: { friends: { set: updatedTargetFriends } },
        }),
        db.user.update({
          where: { id: currentUser.id },
          data: { friends: { set: updatedCurrentFriends } },
        }),
      ]);

      res.status(201).json({ message: "User unfriended successfully" });
      return;
    }

    res.status(200).json({ message: "No action taken" });
    return;
  } catch (err) {
    console.error("Friend POST error:", err);
    res.status(500).json({ message: "There was a problem processing your request" });
    return;
  }
});

export default router;
