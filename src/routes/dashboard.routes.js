import { Router } from 'express';
import {verifyJWT} from "../middlewares/auth.middlewares.js"

import { getChannelStats, getChannelVideos } from '../controllers/dashboard.controllers.js';

const router = Router()

router.route("/stats/:userId").get(verifyJWT, getChannelStats)
router.route("/videos").get(verifyJWT,getChannelVideos)

export default router