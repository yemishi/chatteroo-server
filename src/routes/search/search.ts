import express from "express";
import { authenticate, AuthRequest } from "../../lib/auth";
import { db } from "../../lib/db";

const router = express.Router();
router.use(authenticate);
router.get("/user", async (req: AuthRequest, res) => {
  try {
    const { q = "", page = 0, take = 20 } = req.query;
    const query = String(q).trim();
    const pageNumber = Number(page);
    const takeNumber = Number(take);
    const skip = pageNumber * takeNumber;
    const count = await db.user.count({ where: { username: { contains: query, mode: "insensitive" } } });
    const users = await db.user.findMany({
      omit: { password: true, updateAt: true, createAt: true, email: true },
      take: takeNumber,
      skip,
      include: { receivedRequests: true, sentRequests: true },
      where: { AND: [{ username: { contains: query, mode: "insensitive" } }, { id: { not: req.user?.id } }] },
    });
    console.log(users);
    res.status(200).json({ users, hasMore: count > skip + users.length });
    return;
  } catch (error) {
    res.status(500).json({ message: "We had an error trying to search users." });
  }
});

export default router;
