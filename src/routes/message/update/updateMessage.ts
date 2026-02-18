import { authenticate, AuthRequest } from "../../../lib/auth";
import express from "express";
import { db } from "../../../lib/db";
import cloudinary from "../../../cloudinary";

const router = express.Router();

router.use(authenticate);

router.patch("/", async (req: AuthRequest, res) => {
  const { content, msgId, removedImgs } = req.body;

  if (!msgId || !content) {
    res.status(400).json({ message: "Message ID and content are required" });
    return;
  }

  try {
    const message = await db.message.findUnique({ where: { id: msgId } });

    if (!message) {
      res.status(404).json({ message: "Message not found" });
      return;
    }

    if (message.senderId !== req.user!.id) {
      res.status(403).json({ message: "You are not authorized to update this message" });
      return;
    }

    if (removedImgs.length > 0) {
      await Promise.all(
        removedImgs.map(async (i: string) => {
          const parts = i.split("/");
          const publicIdWithExt = parts.slice(-2).join("/");
          const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");
          await cloudinary.uploader.destroy(publicId);
        })
      );
    }
    const updatedMessage = await db.message.update({
      where: { id: msgId },
      data: {
        content,
        editedAt: new Date(),
      },
    });

    res.status(200).json({ message: "Message updated successfully", updatedMessage: updatedMessage });
    return;
  } catch (error) {
    console.error("PATCH /messages error:", error);
    res.status(500).json({ message: "There was a problem updating the message" });
    return;
  }
});

router.delete("/", async (req: AuthRequest, res) => {
  const { msgId, imgs } = req.body;
  console.log(msgId);

  if (!msgId) {
    res.status(400).json({ message: "Message ID and content are required" });
    return;
  }

  try {
    const message = await db.message.findUnique({ where: { id: msgId } });

    if (!message) {
      res.status(404).json({ message: "Message not found" });
      return;
    }

    if (message.senderId !== req.user!.id) {
      res.status(403).json({ message: "You are not authorized to update this message" });
      return;
    }

    if (imgs.length > 0) {
      await Promise.all(
        imgs.map(async (i: string) => {
          const parts = i.split("/");
          const publicIdWithExt = parts.slice(-2).join("/");
          const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");
          await cloudinary.uploader.destroy(publicId);
        })
      );
    }

    await db.message.delete({ where: { id: message.id } });
    res.status(200).json({ message: "Message deleted successfully" });
    return;
  } catch (error) {
    console.error("PATCH /messages error:", error);
    res.status(500).json({ message: "There was a problem deleting the message try again" });
    return;
  }
});
export default router;
