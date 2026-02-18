import express from "express";
import multer from "multer";
import cloudinary from "../../cloudinary";
import { authenticate } from "../../lib/auth";
import stream from "stream";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.use(authenticate);

router.post("/image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const { oldImg } = req.body;
    const uploadToCloudinary = (fileBuffer: Buffer): Promise<any> => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({ folder: "chat-images" }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });

        const bufferStream = new stream.PassThrough();
        bufferStream.end(fileBuffer);
        bufferStream.pipe(uploadStream);
      });
    };
    if (oldImg) {
      const parts = oldImg.split("/");
      const publicIdWithExt = parts.slice(-2).join("/");
      const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");
      await cloudinary.uploader.destroy(publicId);
    }
    const result = await uploadToCloudinary(req.file.buffer);

    res.json({
      imageUrl: result.secure_url,
      message: "Image upload successfully.",
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Image upload failed" });
  }
});

export default router;
