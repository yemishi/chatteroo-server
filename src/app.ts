import "dotenv/config";
import cors from "cors";
import express from "express";
import mainRouter from "./index";
import { app } from "./lib/server";

app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);
app.use("/api", mainRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
