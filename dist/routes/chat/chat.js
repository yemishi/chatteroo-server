"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("src/lib/db");
const router = express_1.default.Router();
router.get("/", async (req, res) => {
    const chatId = req.query.chatId;
    if (!chatId) {
        res.status(400).json({ message: "Chat ID is required" });
        return;
    }
    try {
        const chat = await db_1.db.chat.findUnique({ where: { id: chatId } });
        if (!chat) {
            res.status(404).json({ message: "Chat not found" });
            return;
        }
        res.status(200).json({ chat });
        return;
    }
    catch (error) {
        console.error("GET /chat error:", error);
        res.status(500).json({ message: "Failed to fetch chat." });
        return;
    }
});
exports.default = router;
