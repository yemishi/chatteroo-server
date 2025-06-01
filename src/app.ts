import "dotenv/config";

import express from "express";
import mainRouter from "./index";
const app = express();

app.use(express.json());

app.use("/api", mainRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
