import "dotenv/config";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { db } from "./db";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    picture: string;
    username: string;
    guestCode?: string | null;
    bio?: string | null;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.jwt || req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(401).json({ message: "No token provided" });
      return;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const user = await db.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        guestCode: true,
        username: true,
        bio: true,
        tag: true,
        email: true,
        picture: true,
      },
    });

    if (!user) {
      res.status(401).json({ message: "Invalid token" });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
  }
};
