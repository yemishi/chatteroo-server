"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("src/lib/db");
const auth_1 = require("@lib/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router.get("/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
        const pendingSentRequests = await db_1.db.request.findMany({
            where: { from: userId, status: "pending" },
        });
        const pendingReceivedRequests = await db_1.db.request.findMany({
            where: { to: userId, status: "pending" },
        });
        res.status(200).json({ pendingSentRequests, pendingReceivedRequests });
        return;
    }
    catch (err) {
        console.error("GET /requests error:", err);
        res.status(500).json({ message: "We had an error trying to retrieve the friend requests" });
        return;
    }
});
router.post("/:userId", async (req, res) => {
    const { userId } = req.params;
    const currentUser = req.user;
    if (!currentUser) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        const { requestId, acceptRequest } = req.body;
        if (requestId) {
            if (!acceptRequest) {
                await db_1.db.request.delete({ where: { id: requestId } });
                res.status(200).json({ message: "Friend request declined successfully" });
                return;
            }
            await db_1.db.$transaction([
                db_1.db.user.update({
                    where: { id: userId },
                    data: { friends: { push: currentUser.id } },
                }),
                db_1.db.user.update({
                    where: { id: currentUser.id },
                    data: { friends: { push: userId } },
                }),
                db_1.db.request.update({
                    where: { id: requestId },
                    data: { status: "accepted" },
                }),
                db_1.db.chat.create({
                    data: { participants: { set: [currentUser.id, userId] } },
                }),
            ]);
            res.status(201).json({ message: "Friend request accepted successfully." });
            return;
        }
        await db_1.db.request.create({ data: { from: currentUser.id, to: userId } });
        res.status(201).json({ message: "Friend request sent successfully." });
        return;
    }
    catch (err) {
        console.error("POST /requests error:", err);
        res.status(500).json({ message: "Failed to process friend request" });
        return;
    }
});
exports.default = router;
