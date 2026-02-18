import express from "express";
import { db } from "../../lib/db";
import { hashSync } from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";

const router = express.Router();

const generateGuestTag = async (username: string) => {
  let tag = "";
  let isAlreadyTaken = true;

  while (isAlreadyTaken) {
    const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
    tag = `${username}#${randomDigits}`;

    isAlreadyTaken = !!(await db.user.findFirst({ where: { tag } }));
  }

  return tag;
};

const generateGuestInfo = async (): Promise<{ username: string; tag: string }> => {
  const words1 = ["Bubbly", "Fluffy", "Pudding", "Snuggle", "Peachy", "Tofu", "Marsh", "Choco", "Cloudy", "Twinkle"];
  const words2 = ["Bun", "Paws", "Muffin", "Bean", "Sprout", "Puff", "Cuddle", "Whiskers", "Duckie", "MooMoo"];

  let candidate = "";
  let isTaken = true;
  let attempts = 0;
  let tag = "";

  while (isTaken && attempts < 10) {
    const random1 = words1[Math.floor(Math.random() * words1.length)];
    const random2 = words2[Math.floor(Math.random() * words2.length)];
    candidate = `${random1} ${random2}`;

    isTaken = !!(await db.user.findFirst({ where: { username: candidate } }));

    if (!isTaken) {
      tag = await generateGuestTag(candidate);
    }

    attempts++;
  }

  if (!candidate || !tag) throw new Error("Failed to generate unique guest username or tag");

  return { username: candidate, tag };
};

router.get("/", async (req, res) => {
  const { userId, email } = req.query as { userId?: string; email?: string };

  try {
    if (email) {
      const isAvailable = await db.user.findFirst({ where: { email } });
      res.status(200).json({ isAvailable: !isAvailable });
      return;
    }

    const { password, ...user } = await db.user.findFirstOrThrow({
      where: { id: userId },
    });

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: "User not found" });
  }
});

router.get("/guest", async (_, res) => {
  try {
    const generateGuestCode = () => {
      const raw = uuidv4().replace(/-/g, "").slice(0, 16).toUpperCase();
      return raw.match(/.{1,4}/g)?.join("-");
    };

    const guestCode = generateGuestCode();
    const defaultPfp = "https://upload.wikimedia.org/wikipedia/commons/2/2c/Default_pfp.svg";
    const { tag, username } = await generateGuestInfo();

    const user = {
      username,
      picture: defaultPfp,
      guestCode,
      tag,
    };
    res.status(200).json({ user, message: "Guest user generated successfully." });
  } catch (error) {
    console.error("Guest user generation failed:", error);
    res.status(500).json({ message: "Internal server error during user creation." });
  }
});

router.post("/guest", async (req, res) => {
  try {
    const { username, picture, guestCode, tag } = req.body;

    const newGuest = await db.user.create({
      data: {
        username,
        picture,
        guestCode,
        tag,
      },
    });
    const token = jwt.sign({ id: newGuest.id }, process.env.JWT_SECRET as string, { expiresIn: "7d" });
    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
      secure: false,
    });
    const { password, bio, createAt, friends, updateAt, ...user } = newGuest;
    res.status(201).json({ user, message: "Guest user created successfully." });
  } catch (error) {
    console.error("User creation failed:", error);
    res.status(500).json({ message: "Internal server error during user creation." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { username, email, password, picture, bio, tag } = req.body;
    const defaultPfp = "https://upload.wikimedia.org/wikipedia/commons/2/2c/Default_pfp.svg";

    if (!email || !username || !password) {
      res.status(400).json({ message: "Username, email, and password are required." });
      return;
    }
    const tagLower = tag.toLowerCase();
    const existingEmail = await db.user.findFirst({ where: { email } });
    const existingTag = await db.user.findFirst({ where: { tag: tagLower } });

    if (existingEmail) {
      res.status(400).json({ message: "Email is already in use." });
      return;
    }

    if (existingTag) {
      res.status(400).json({ message: "Tag is already in use." });
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
        tag: tagLower,
      },
    });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, { expiresIn: "7d" });
    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
      secure: false,
    });
    const { password: __, bio: _, createAt, friends, updateAt, ...userData } = user;
    res.status(201).json({ user: userData, message: "User created successfully." });
  } catch (error) {
    console.error("User creation failed:", error);
    res.status(500).json({ message: "Internal server error during user creation." });
  }
});

export default router;
