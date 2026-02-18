import express from "express";
import { authenticate, AuthRequest } from "../../lib/auth";
import { db } from "../../lib/db";

const router = express.Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const { take = 20, page = 0 } = req.query;
    const pageNumber = Number(page);
    const takeNumber = Number(take);
    const skip = pageNumber * takeNumber;

    const user = req.user;

    const [count, notifications] = await Promise.all([
      db.notification.count({ where: { userId: user?.id } }),
      db.notification.findMany({
        where: { userId: user?.id },
        include: { sender: true },
        take: takeNumber,
        skip,
        orderBy: { createAt: "desc" },
      }),
    ]);

    const formattedNotifications = notifications.map((n) => {
      if (n.type === "FRIEND_REQUEST" && n.sender) {
        const { sender, ...rest } = n;
        return {
          ...rest,
          title: `${sender.username}`,
          icon: sender.picture,
        };
      }
      return n;
    });
    res.status(200).json({ notifications: formattedNotifications, hasMore: count > skip + notifications.length });
    return;
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "We had an error trying to get notifications" });
    return;
  }
});

router.patch("/read", async (req: AuthRequest, res) => {
  try {
    const { id } = req.body;
    const notification = await db.notification.update({ where: { id }, data: { read: true } });
    if (!notification || notification.userId !== req.user!.id) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }
    res.status(202).json({ message: "We read that with successfully!" });
    return;
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "We had an error trying to read this" });
    return;
  }
});

router.delete("/", async (req, res) => {
  try {
    const { id } = req.body;
    await db.notification.delete({ where: { id } });
    res.status(204).json({ message: "Notification deleted with successfully!" });
    return;
  } catch (error) {
    res.status(500).json({ message: "We had an error trying to delete this" });
    return;
  }
});

export default router;
