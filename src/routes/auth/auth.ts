import { AuthRequest } from "../../lib/auth";
import "dotenv/config";

import jwt from "jsonwebtoken";
import { compareSync } from "bcrypt";
import express from "express";
import { db } from "../../lib/db";
import { authenticate } from "../../lib/auth";

const router = express.Router();

router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    res.status(200).json({ user: req.user });
  } catch (error) {
    res.status(400).json({ message: "Failed to fetch user info." });
    return;
  }
});

router.post("/signin", async (req, res) => {
  try {
    const { password, name } = req.body;

    const user = await db.user.findFirst({
      where: {
        OR: [
          {
            username: name,
          },
          { email: name },
        ],
      },
    });
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    const isCorrectPass = compareSync(password, user.password!);

    if (!isCorrectPass) {
      res.status(401).json({ message: "User not found." });
      return;
    }
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, {
      expiresIn: "7d",
    });
    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
      secure: false,
    });
    const { createAt, friends, password: _, updateAt, ...userData } = user;
    res.status(200).json({
      user: userData,
      message: "User logged successfully.",
    });
    return;
  } catch (error) {
    res.status(400).json({ message: "Something went wrong, please try again." });
    return;
  }
});

router.post("/signin-guest", async (req, res) => {
  try {
    const { guestCode } = req.body;
    const guest = await db.user.findFirst({ where: { guestCode } });
    if (!guest) {
      res.status(404).json({ message: "Invalid Guest Code." });
      return;
    }

    const token = jwt.sign({ id: guest.id }, process.env.JWT_SECRET as string, {
      expiresIn: "7d",
    });
    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
      secure: false,
    });
    const { createAt, friends, password, updateAt, ...user } = guest;
    res.status(200).json({
      user,
      message: "Guest logged successfully.",
    });
    return;
  } catch (error) {
    res.status(400).json({ message: "Something went wrong, please try again." });
    return;
  }
});

router.post("/signout", async (_, res) => {
  try {
    res.clearCookie("jwt");
    res.status(200).json({ message: "User logged out successfully." });
    return;
  } catch (error) {
    res.status(400).json({ message: "Something went wrong, please try again." });
    return;
  }
});

export default router;
