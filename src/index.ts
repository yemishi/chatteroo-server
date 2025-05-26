import express from "express";

import userRouter from "./routes/user/user";
import friendRouter from "./routes/friend/friend";
import requestRouter from "./routes/friend/request/request";
import chatRouter from "./routes/chat/chat";
import messageRouter from "./routes/message/message";

const router = express.Router();

router.use("/user", userRouter);
router.use("/friends", friendRouter);
router.use("/requests", requestRouter);
router.use("/chat", chatRouter);
router.use("/messages", messageRouter);

export default router;
