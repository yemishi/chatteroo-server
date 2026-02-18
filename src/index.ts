import express from "express";

import userRouter from "./routes/user/user";
import updateUserRouter from "./routes/user/update/userUpdate";
import friendRouter from "./routes/friend/friend";
import requestRouter from "./routes/friend/request/request";
import chatRouter from "./routes/chat/chat";
import chatUpdateRouter from "./routes/chat/update/updateChat";
import messageRouter from "./routes/message/message";
import messageUpdateRouter from "./routes/message/update/updateMessage";
import authRouter from "./routes/auth/auth";
import searchRouter from "./routes/search/search";
import notificationRouter from "./routes/notification/notification";
import uploadImg from "./routes/upload/upload";
const router = express.Router();

router.use("/user", userRouter);
router.use("/user", updateUserRouter);

router.use("/friends", friendRouter);
router.use("/request", requestRouter);

router.use("/chat", chatRouter);
router.use("/chat", chatUpdateRouter);

router.use("/message", messageRouter);
router.use("/message", messageUpdateRouter);

router.use("/auth", authRouter);
router.use("/search", searchRouter);

router.use("/notification", notificationRouter);

router.use("/upload", uploadImg);

export default router;
