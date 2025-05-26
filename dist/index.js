"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_1 = __importDefault(require("./routes/user/user"));
const friend_1 = __importDefault(require("./routes/friend/friend"));
const request_1 = __importDefault(require("./routes/friend/request/request"));
const chat_1 = __importDefault(require("./routes/chat/chat"));
const message_1 = __importDefault(require("./routes/message/message"));
const router = express_1.default.Router();
router.use("/user", user_1.default);
router.use("/friends", friend_1.default);
router.use("/requests", request_1.default);
router.use("/chat", chat_1.default);
router.use("/messages", message_1.default);
exports.default = router;
