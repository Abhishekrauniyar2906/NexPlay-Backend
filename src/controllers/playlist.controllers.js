import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId, mongo } from "mongoose";
import { Playlist, } from "../models/playlists.models.js";
import { Video } from "../models/video.models.js";

const createPlaylist = asyncHandler(async (req,res)=>{
    const {name , description} = req.body

    if(!name || name.trim()===""){
        throw new ApiError(400,"name of playlist must required to create playlist")
    }

    const playlist = await Playlist.create({
        name,
        description: description || "",
        owner: req.user?._id
    })

    if(!playlist){
        throw new ApiError(500,"playlist not created")
    }

    return res.status(200)
    .json(new ApiResponse(200,playlist,"playlist created successfully"))
})

const getUserPlaylists = asyncHandler(async(req,res)=>{
    const {userId} = req.params;

    if(!userId ||!isValidObjectId(userId)){
        throw new ApiError(400,"invalid userID")
    }

    const playlist = await Playlist.aggregate([
        {
            $match :{
                owner :new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
                pipeline:[
                    {
                        $project:{
                            username:1,
                            fullName:1,
                            avatar:1
                        }
                    }
                ]
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"videos",
                foreignField:"_id",
                as:"videos",
                pipeline: [
                    {
                        $match: {
                            isPublished: true 
                        },
                    },
                    {
                        $project: {
                            thumbnail: 1,
                            views: 1,
                        },
                    },
                ],
            }
        },
        {
            $unwind :"$owner"
        },
        {
            $project: {
                name: 1,
                description: 1,
                owner: 1,
                thumbnail: 1,
                createdAt: 1,
                updatedAt: 1,
                thumbnail: {
                    $first: "$videos.thumbnail",
                },
                videosCount: {
                    $size: "$videos",
                },
                totalViews: {
                    $sum: "$videos.views",
                },
            },
        },
    ])

    if (!playlist || playlist.length === 0) {
    throw new ApiError(404, "No playlists found for this user");
}

    return res.status(200)
    .json(new ApiResponse(200, playlist, "playlist fetched successfully"))
})

const getPlaylistById = asyncHandler(async (req,res)=>{
    const {playlistId} = req.params

    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400,"invalid playlist Id")
    }

    const playlist = await Playlist.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
                pipeline:[
                    {
                        $project:{
                            username:1,
                            fullName:1,
                            avatar:1
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                owner:{
                    $first:"$owner"
                }
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"videos",
                foreignField:"_id",
                as:"videos",
                pipeline:[
                    {
                        $match:{
                            isPublished:true
                        }
                    },
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        username:1,
                                        fullName:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        },{
            $project: {
                name: 1,
                description: 1,
                videos: 1,
                owner: 1,
                thumbnail: {
                    $first: "$videos.thumbnail",
                },
                videosCount: {
                    $size: "$videos",
                },
                totalViews: {
                    $sum: "$videos.views",
                },
                createdAt: 1,
                updatedAt: 1,
            },
        }
    ])

    if (!playlist || playlist.length === 0) {
    throw new ApiError(404, "playlist not found")
}


    return res.status(200)
    .json(new ApiResponse(200, playlist[0], "playlist fetched successsfully"))
})

const addVideoToPlaylist = asyncHandler(async (req,res)=>{
    const {playlistId, videoId} = req.params

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400,"invalid video ID")
    }

    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400,"invalid playlist ID")
    }

    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(404,"plalist not found")
    }

    if(req.user?._id.toString()!== playlist?.owner.toString()){
        throw new ApiError(401, "you do not have to add video in this playlist")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404,"video not found")
    }

   if (playlist.videos.some(id => id.toString() === videoId)) {
    throw new ApiError(400, "Video already exists in playlist");
}

    const addToPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet:{
                videos: videoId
            }
        },
        {
            new:true
        }
    )

    if(!addToPlaylist){
        throw new ApiError(500, "error while fetching video to playlist")
    }

    return res.status(200)
    .json(new ApiResponse(200, addToPlaylist, "video added successfully"))
})

const removeVideoFromPlaylist = asyncHandler(async(req,res)=>{
    const {playlistId, videoId} = req.params

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400,"invalid videoID")
    }

    if(!playlistId ||!isValidObjectId(playlistId)){
        throw new ApiError(400, "invalid playlistID")
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404,"video not found")
    }

    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new ApiError(404,"playlist not found")
    }

    if (!playlist.videos.some(id => id.toString() === videoId)) {
    throw new ApiError(400, "Video does not exist in playlist");
}


    if(playlist?.owner.toString()!==req.user?._id.toString()){
        throw new ApiError(401,"you don't have access to remove video from playlist")
    }

    const removeVideo = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull:{
                  videos: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            new:true
        }
    )

    if(!removeVideo){
        throw new ApiError(400,"video not removed from playlist")
    }

   return res.status(200)
.json(new ApiResponse(200, {}, "video removed successfully"))




})

const deletePlaylist = asyncHandler (async(req,res)=>{
    const {playlistId} = req.params

    if(!playlistId ||!isValidObjectId(playlistId)){
        throw new ApiError(400,"invalid playlist ID")
    }

    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(404,"playlist not found")
    }

    if(playlist?.owner.toString()!== req.user?._id.toString()){
        throw new ApiError(400,"you don't have to delete this playlist")
    }

    const delplaylist = await Playlist.findByIdAndDelete(playlistId)

    if(!delplaylist){
        throw new ApiError(500,"error while deleting playlist")
    }

    return res.status(200)
    .json(new ApiResponse(200,{},"playlist deleted successfully"))
})

const updatePlaylist = asyncHandler(async(req,res)=>{
    const {name, description} = req.body
    const {playlistId} = req.params

    if(!playlistId ||!isValidObjectId(playlistId)){
        throw new ApiError(400,"invalid playlist ID")
    }

    if(!name && !description){
        throw new ApiError(400,"field is required for update")
    }

    const playlist = await Playlist.findById(playlistId)
    
    if(!playlist){
        throw new ApiError(404,"playlist not found")
    }

    if(playlist?.owner.toString()!==req.user?._id.toString()){
        throw new ApiError(400,"you do not have to update the playlist")
    }

    const updatePlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set:{
                name:name ||playlist?.name,
                description:description ||playlist?.description
            }
        },
        {
            new :true
        }
    )

    if(!updatePlaylist){
        throw new ApiError(400,"error while updating playlist")
    }

    return res.status(200)
    .json(new ApiResponse(200,updatePlaylist,"playlist updated successfully"))
})

const getVideoPlaylist = asyncHandler(async(req,res)=>{
    const {videoId}= req.params

    if(!videoId ||!isValidObjectId(videoId)){
        throw new ApiError(400,"invalid video id")
    }

    const playlists = await Playlist.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $project:{
                name:1,
                isVideopresent:{
                    $cond:{
                        if:{$in:[new mongoose.Types.ObjectId(videoId),"$videos"]},
                        then:true,
                        else:false
                    }
                }
            }
        }
    ])

    if (playlists.length === 0) {
    return res.status(200).json(new ApiResponse(200, [], "No playlists found"));
}

    return res.status(200)
    .json(new ApiResponse(200,playlists, "playlist fetched successfully"))
})

export{
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
    getVideoPlaylist
}