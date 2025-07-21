import { Router } from "express";
import { checkUser } from "../middlewares/openAuth.middlewares.js";
import { addVideoToPlaylist, 
    createPlaylist, 
    deletePlaylist, 
    getPlaylistById, 
    getUserPlaylists, 
    getVideoPlaylist, 
    removeVideoFromPlaylist, 
    updatePlaylist } from "../controllers/playlist.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";



const router = Router();

router.route("/:playlistId").get(checkUser, getPlaylistById);
router.route("/user/:userId").get(checkUser, getUserPlaylists);

router.use(verifyJWT);

router.route("/").post(createPlaylist);

router.route("/:playlistId").patch(updatePlaylist).delete(deletePlaylist);

router.route("/add/:videoId/:playlistId").patch(addVideoToPlaylist);
router.route("/remove/:videoId/:playlistId").patch(removeVideoFromPlaylist);
router.route("/user/p/:videoId").get(getVideoPlaylist);

export default router;