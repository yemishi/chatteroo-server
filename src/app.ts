import "dotenv/config";
import cors from "cors";
import express from "express";
import mainRouter from "./index";
import { app, server } from "./lib/socket";
import cookieParser from "cookie-parser";

app.use(express.json());

app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use("/api", mainRouter);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
