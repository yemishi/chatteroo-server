import { AuthRequest } from "./../../lib/auth";
import "dotenv/config";

import jwt from "jsonwebtoken";
import { compareSync } from "bcrypt";
import express from "express";
import { db } from "../../lib/db";
import { authenticate } from "../../lib/auth";

const router = express.Router();

router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await db.user.findUnique({
      where: { id: req?.user?.id },
      select: { picture: true, username: true, id: true },
    });
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ message: "Failed to fetch user info." });
    return;
  }
});

router.post("/signin", async (req, res) => {
  try {
    const { password, email } = req.body;
    const user = await db.user.findFirst({ where: { email } });
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }
    const isCorrectPass = compareSync(user.password as string, password);
    if (!isCorrectPass) {
      res.status(401).json({ message: "Invalid credentials." });
      return;
    }
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, { expiresIn: "7d" });
    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV !== "development",
    });
    res.status(200).json({ message: "User logged successfully." });
    return;
  } catch (error) {
    res.status(400).json({ message: "Something went wrong, please try again." });
    return;
  }
});

router.post("/signin-guest", async (req, res) => {
  try {
    const { guestId } = req.body;
    const guest = await db.user.findFirst({ where: { guestId } });
    if (!guest) {
      res.status(404).json({ message: "Guest not found." });
      return;
    }

    const token = jwt.sign({ id: guest.id, isGuest: true }, process.env.JWT_SECRET as string, { expiresIn: "7d" });
    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV !== "development",
    });
    res.status(200).json({ message: "Guest logged successfully." });
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
