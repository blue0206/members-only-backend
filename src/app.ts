import express from "express";
import "dotenv/config";
import userRouter from "./routes/user.route.js";
import messageRouter from "./routes/message.route.js";

const app = express();

// Routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/messages", messageRouter);

// Server
const PORT = process.env.PORT ?? 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT.toString()}`);
});
