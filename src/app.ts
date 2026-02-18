import cors from "cors";
import express from "express";
import mainRouter from "./index";
import { app, server } from "./lib/socket";
import cookieParser from "cookie-parser";

app.use(express.json());

app.use(cookieParser());
app.use("/uploads", express.static("uploads"));
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
app.use("/api", mainRouter);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

process.on("SIGINT", () => {
  console.log("Shutting down...");
  server.close(() => {
    process.exit(0);
  });
});
