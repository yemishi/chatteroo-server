import express from "express";
import { db } from "../../lib/db";
import { compareSync, hashSync } from "bcrypt";
import { authenticate, AuthRequest } from "../../lib/auth";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";

const router = express.Router();

const generateGuestUsername = async (): Promise<string> => {
  const words1 = ["Bubbly", "Fluffy", "Pudding", "Snuggle", "Peachy", "Tofu", "Marsh", "Choco", "Cloudy", "Twinkle"];
  const words2 = ["Bun", "Paws", "Muffin", "Bean", "Sprout", "Puff", "Cuddle", "Whiskers", "Duckie", "MooMoo"];

  let candidate;
  let isTaken = true;
  let attempts = 0;

  while (isTaken && attempts < 10) {
    const random1 = words1[Math.floor(Math.random() * words1.length)];
    const random2 = words2[Math.floor(Math.random() * words2.length)];
    candidate = `${random1}${random2}`;
    isTaken = !!(await db.user.findFirst({ where: { username: candidate } }));
    attempts++;
  }

  return candidate!;
};

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

router.post("/guest", async (_, res) => {
  try {
    const guestId = uuidv4();

    const defaultPfp = "https://upload.wikimedia.org/wikipedia/commons/2/2c/Default_pfp.svg";

    const guestUsername = await generateGuestUsername();

    const newGuest = await db.user.create({
      data: {
        username: guestUsername,
        picture: defaultPfp,
        guestId,
      },
    });
    const token = jwt.sign({ id: newGuest.id }, process.env.JWT_SECRET as string, { expiresIn: "7d" });
    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
      secure: false,
    });
    res.status(201).json({ message: "Guest user created successfully.", guestId: newGuest.guestId });
  } catch (error) {
    console.error("User creation failed:", error);
    res.status(500).json({ message: "Internal server error during user creation." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { username, email, password, picture, bio } = req.body;

    const defaultPfp = "https://upload.wikimedia.org/wikipedia/commons/2/2c/Default_pfp.svg";

    if (!email || !username || !password) {
      res.status(400).json({ message: "Username, email, and password are required." });
      return;
    }
    const existingEmail = await db.user.findFirst({ where: { email } });
    if (existingEmail) {
      res.status(400).json({ message: "Email is already in use." });
      return;
    }

    const hashedPassword = hashSync(password, 10);

    const user = await db.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        picture: picture ?? defaultPfp,
        bio,
      },
    });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, { expiresIn: "7d" });
    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
      secure: false,
    });

    res.status(201).json({ message: "User created successfully." });
  } catch (error) {
    console.error("User creation failed:", error);
    res.status(500).json({ message: "Internal server error during user creation." });
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
            OR: [{ fromId: user.id }, { toId: user.id }],
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
          OR: [{ fromId: user.id }, { toId: user.id }],
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
