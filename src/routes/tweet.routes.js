import { Router } from 'express';
import { checkUser } from '../middlewares/openAuth.middlewares.js';
import { createTweet, deleteTweet, getAllTweets, getUserTweets, updateTweet } from '../controllers/tweet.controllers.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';

const router = Router();

router.route("/user/:userId").get(checkUser, getUserTweets);
router.route("/").get(getAllTweets);

router.use(verifyJWT)
.post("/",createTweet)
.patch("/:tweetId",updateTweet)
.delete("/:tweetId",deleteTweet);

export default router