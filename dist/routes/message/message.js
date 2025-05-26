"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("@lib/auth");
const express_1 = __importDefault(require("express"));
const db_1 = require("src/lib/db");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router.get("/", async (req, res) => {
    const chatId = req.query.chatId;
    if (!chatId) {
        res.status(400).json({ message: "Chat ID is required" });
        return;
    }
    try {
        const chat = await db_1.db.chat.findUnique({ where: { id: chatId }, select: { participants: true } });
        if (!chat || !chat.participants.includes(req.user.id)) {
            res.status(403).json({ message: "User is not part of the chat" });
            return;
        }
        const messages = await db_1.db.message.findMany({
            where: { chatId },
            orderBy: { timestamp: "asc" },
        });
        res.status(200).json({ messages });
        return;
    }
    catch (error) {
        console.error("GET /messages error:", error);
        res.status(500).json({ message: "There was a problem retrieving the messages" });
        return;
    }
});
router.post("/", async (req, res) => {
    const { chatId, content } = req.body;
    if (!chatId || !content) {
        res.status(400).json({ message: "Chat ID and content are required" });
        return;
    }
    try {
        const chat = await db_1.db.chat.findUnique({ where: { id: chatId } });
        if (!chat || !chat.participants.includes(req.user.id)) {
            res.status(403).json({ message: "User is not part of the chat" });
            return;
        }
        const newMessage = await db_1.db.message.create({
            data: {
                content,
                senderId: req.user.id,
                chatId,
            },
        });
        res.status(200).json({ message: "Message sent successfully", newMessage });
        return;
    }
    catch (error) {
        console.error("POST /messages error:", error);
        res.status(500).json({ message: "There was a problem sending the message" });
        return;
    }
});
router.patch("/", async (req, res) => {
    const messageId = req.query.messageId;
    const { content } = req.body;
    if (!messageId || !content) {
        res.status(400).json({ message: "Message ID and content are required" });
        return;
    }
    try {
        const message = await db_1.db.message.findUnique({ where: { id: messageId } });
        if (!message) {
            res.status(404).json({ message: "Message not found" });
            return;
        }
        if (message.senderId !== req.user.id) {
            res.status(403).json({ message: "You are not authorized to update this message" });
            return;
        }
        const updatedMessage = await db_1.db.message.update({
            where: { id: messageId },
            data: {
                content,
                editedAt: new Date(),
            },
        });
        res.status(200).json({ message: "Message updated successfully", updatedMessage });
        return;
    }
    catch (error) {
        console.error("PATCH /messages error:", error);
        res.status(500).json({ message: "There was a problem updating the message" });
        return;
    }
});
exports.default = router;
