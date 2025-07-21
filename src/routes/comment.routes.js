import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { checkUser } from "../middlewares/openAuth.middlewares.js";
import { addComment, deleteComment, getVideoComment, updateComment } from "../controllers/comment.controllers.js";


const router = Router();

router.route("/:videoId").get(checkUser, getVideoComment);
router.route("/:videoId").post(verifyJWT, addComment);
router.route("/c/:commentId").post(verifyJWT, deleteComment);
router.route("/c/:commentId").post(verifyJWT, updateComment);

export default router