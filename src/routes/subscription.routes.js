import { Router } from "express";
import { getSubscribedChannels, getUserChannelSubscribers, toggleSubscription } from "../controllers/subscription.contorllers.js";
import { checkUser } from "../middlewares/openAuth.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";


const router = Router();

router
    .route("/c/:channelId")
    .get(verifyJWT, getUserChannelSubscribers)
    .post(verifyJWT, toggleSubscription);

router.route("/u/:subscriberId").get(checkUser, getSubscribedChannels);

export default router;