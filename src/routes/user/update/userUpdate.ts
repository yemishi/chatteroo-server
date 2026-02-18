import express from "express";
import { db } from "../../../lib/db";
import { compare, hashSync } from "bcrypt";
import { authenticate, AuthRequest } from "../../../lib/auth";

const router = express.Router();

router.use(authenticate);

router.patch("/", async (req: AuthRequest, res) => {
  try {
    const id = req.user?.id;
    const user = await db.user.findFirst({ where: { id } });
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }
    const { password, email, tag, bio, username, picture } = req.body;
    const userData: any = {};

    if (password) userData.password = hashSync(password, 10);

    if (user.guestCode) {
      if (!password || !email) {
        res.status(400).json({ message: "Password and email required for guest upgrade." });
        return;
      }
      const emailExists = await db.user.findUnique({ where: { email } });
      if (emailExists) {
        res.status(400).json({ message: "Email unavailable." });
        return;
      }
      userData.email = email;
      userData.guestCode = null;
    }
    if (tag) {
      const isTagUnavailable = await db.user.findUnique({ where: { tag } });
      if (isTagUnavailable) {
        res.status(400).json({ message: "Tag unavailable." });
        return;
      }
      userData.tag = tag;
    }
    if (email) {
      const isEmailUnavailable = await db.user.findUnique({ where: { email } });
      if (isEmailUnavailable) {
        res.status(400).json({ message: "Email unavailable." });
        return;
      }
      userData.email = email;
    }

    if (bio) userData.bio = bio;
    if (username) userData.username = username;
    if (picture) userData.picture = picture;

    const updatedUser = await db.user.update({ where: { id }, data: userData, omit: { guestCode: true } });

    const { password: _, ...safeUser } = updatedUser;

    req.user = {
      id: updatedUser.id,
      bio: updatedUser.bio,
      username: updatedUser.username,
      picture: updatedUser.picture,
    };
    res.status(200).json({ user: safeUser, message: "User updated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Internal server error during user update." });
  }
});

router.delete("/", async (req: AuthRequest, res) => {
  try {
    const id = req.user?.id!;
    const { password } = req.body;
    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }
    const isPassCorrect = !req.user?.guestCode ? await compare(password, user.password!) : true;

    if (!isPassCorrect) {
      res.status(400).json({ message: "Password incorrect." });
      return;
    }

    const chatsToUpdate = await db.chat.findMany({ where: { members: { some: { id } } } });

    await Promise.all(
      chatsToUpdate.map((c) =>
        db.chat.update({
          where: { id: c.id },
          data: {
            members: {
              set: c.members.map((mid) => {
                if (mid.id === id) return { ...mid, isRemoved: true };
                return mid;
              }),
            },
          },
        })
      )
    );
    const usersWithFriend = await db.user.findMany({ where: { friends: { hasSome: [id] } } });

    await Promise.all(
      usersWithFriend.map((u) =>
        db.user.update({
          where: { id: u.id },
          data: { friends: { set: u.friends.filter((fid) => fid !== id) } },
        })
      )
    );

    await Promise.all([
      db.request.deleteMany({ where: { OR: [{ fromId: id }, { toId: id }] } }),
      db.notification.deleteMany({ where: { OR: [{ senderId: id }, { userId: id }] } }),
    ]);
    await db.user.delete({ where: { id } });

    res.status(204).json({ message: "User deleted successfully." });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error during user update." });
  }
});
export default router;
