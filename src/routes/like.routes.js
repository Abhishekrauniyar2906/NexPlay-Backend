import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { getLikedVideos, toggleCommentLike, 
    toggleTweetLike, toggleVideoLike } from "../controllers/like.controllers.js";

const router = Router();

router.use(verifyJWT)
.post("/toggle/v/:videoId",toggleVideoLike)
.post("/toggle/v/:commentId",toggleCommentLike)
.post("/toggle/t/:tweetId",toggleTweetLike)
.get("/videos",getLikedVideos);


export default router;