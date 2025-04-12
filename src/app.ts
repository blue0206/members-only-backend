import "dotenv/config";
import { config } from "./core/config/index.js";
import express from "express";
import authRouter from "./features/auth/auth.routes.js";
import userRouter from "./features/users/user.route.js";
import messageRouter from "./features/messages/message.route.js";
import assignRequestId from "./core/middlewares/assignRequestId.js";

const app = express();
// Assign request id via middleware.
app.use(assignRequestId);

// Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/messages", messageRouter);

// Server
const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT.toString()}`);
});
