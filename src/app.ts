import express from "express";
import "dotenv/config";
import authRouter from "./features/auth/auth.routes.js";
import userRouter from "./features/users/user.route.js";
import messageRouter from "./features/messages/message.route.js";

const app = express();

// Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/messages", messageRouter);

// Server
const PORT = process.env.PORT ?? 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT.toString()}`);
});
