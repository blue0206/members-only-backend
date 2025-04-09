import express from "express";
import "dotenv/config";
import userRouter from "./routes/user.route.js";

const app = express();

// Routes
app.use("/api/v1/user", userRouter);

const PORT = process.env.PORT ?? 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT.toString()}`);
});
