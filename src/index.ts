import express from "express";

import userRouter from "./routes/user/user";
import friendRouter from "./routes/friend/friend";
import requestRouter from "./routes/friend/request/request";
import chatRouter from "./routes/chat/chat";
import messageRouter from "./routes/message/message";
import authRouter from "./routes/auth/auth";

const router = express.Router();

router.use("/user", userRouter);
router.use("/friends", friendRouter);
router.use("/requests", requestRouter);
router.use("/chat", chatRouter);
router.use("/messages", messageRouter);
router.use("/auth", authRouter);

export default router;
