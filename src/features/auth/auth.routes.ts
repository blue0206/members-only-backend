import { Router } from "express";
import { registerUser } from "./auth.controller.js";

const authRouter = Router();

authRouter.post("/register", registerUser);

export default authRouter;
