import express from "express";
import { db } from "../../lib/db";
import { compareSync, hashSync } from "bcrypt";
import { authenticate, AuthRequest } from "../../lib/auth";

const router = express.Router();

router.get("/", async (req, res) => {
  const { userId, email } = req.query as { userId?: string; email?: string };

  try {
    if (email) {
      const isAvailable = await db.user.findFirst({ where: { email } });
      res.status(200).json({ isAvailable: !isAvailable });
      return;
    }

    const { password, id, ...user } = await db.user.findFirstOrThrow({
      where: { id: userId },
    });

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: "User not found" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { username, email, password, picture, bio, isGuest } = await req.body;

    if (isGuest) {
      const guestUsername = () => {
        const words1 = [
          "Bubbly",
          "Fluffy",
          "Pudding",
          "Snuggle",
          "Peachy",
          "Tofu",
          "Marsh",
          "Choco",
          "Cloudy",
          "Twinkle",
        ];
        const words2 = ["Bun", "Paws", "Muffin", "Bean", "Sprout", "Puff", "Cuddle", "Whiskers", "Duckie", "MooMoo"];
        const random1 = words1[Math.floor(Math.random() * words1.length)];
        const random2 = words2[Math.floor(Math.random() * words2.length)];
        return `${random1}${random2}`;
      };
      await db.user.create({
        data: {
          username: guestUsername(),
          picture: picture ?? "https://upload.wikimedia.org/wikipedia/commons/2/2c/Default_pfp.svg",
        },
      });
      res.status(201).json({ message: "User created successfully." });
      return;
    }
    const unavailableEmail = await db.user.findFirst({ where: { email } });
    if (unavailableEmail) {
      res.status(400).json({ message: "Email is already being used." });
      return;
    }
    const hashedPass = hashSync(password, 10);
    await db.user.create({
      data: {
        email,
        password: hashedPass,
        username,
        picture: picture ?? "https://upload.wikimedia.org/wikipedia/commons/2/2c/Default_pfp.svg",
        bio,
      },
    });
    res.status(201).json({ message: "User created successfully." });
  } catch {
    res.status(500).json({ message: "Failed to create user." });
  }
});

router.use(authenticate);
router.delete("/", async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { password } = req.body;

    if (user.isGuest) {
      await db.$transaction([
        db.request.deleteMany({
          where: {
            OR: [{ from: user.id }, { to: user.id }],
          },
        }),
        db.user.delete({
          where: { id: user.id },
        }),
      ]);

      res.status(200).json({ message: "Guest user deleted successfully." });
      return;
    }

    const dbUser = await db.user.findFirstOrThrow({
      where: { id: user.id },
    });

    const isPasswordCorrect = compareSync(password, dbUser.password!);
    if (!isPasswordCorrect) {
      res.status(404).json({ message: "User not found or password incorrect." });
      return;
    }

    await db.$transaction([
      db.request.deleteMany({
        where: {
          OR: [{ from: user.id }, { to: user.id }],
        },
      }),
      db.user.delete({
        where: { id: user.id },
      }),
    ]);

    res.status(200).json({ message: "User deleted successfully." });
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete user data." });
    return;
  }
});

export default router;
