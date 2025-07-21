import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { deleteVideo, getAllVideos, 
    getSubscribedVideos, getUserVideos,
     getVideoById, publishAVideo, 
     togglePublishStatus, updateVideo } from "../controllers/video.controllers.js";
import { upload } from "../middlewares/multer.middlewares.js";


const router = Router();

router.route("/").get(getAllVideos);
router.route("/c/:userId").get(getUserVideos);
router.route("/:videoId").get(verifyJWT, getVideoById);
router.use(verifyJWT)
.post("/",
    upload.fields([
        {
            name: "videoFile",
            maxCount: 1,
        },
        {
            name: "thumbnail",
            maxCount: 1,
        },
    ]),
    publishAVideo
)


.delete("/:videoId",deleteVideo)
.patch("/:videoId", upload.single("thumbnail"), updateVideo)
.patch("/toggle/publish/:videoId", togglePublishStatus)
.get("/s/subscription",getSubscribedVideos);

export default router;