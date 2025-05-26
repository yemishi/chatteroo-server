"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("./db");
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            res.status(401).json({ message: "No token provided" });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await db_1.db.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                isGuest: true,
            },
        });
        if (!user) {
            res.status(401).json({ message: "Invalid token" });
            return;
        }
        req.user = user;
        next();
    }
    catch (err) {
        {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
    }
};
exports.authenticate = authenticate;
