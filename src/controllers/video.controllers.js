import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {Video} from "../models/video.models.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId, mongo, MongooseError } from "mongoose";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Subscription } from "../models/subscription.models.js";
import { deleteFromCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.models.js";


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc" } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const videos = await Video.aggregate([
        ...(query
            ? [{
                $match: {
                    $or: [
                        { title: { $regex: query, $options: "i" } },
                        { description: { $regex: query, $options: "i" } }
                    ]
                }
            }] : []),
        {
            $match: { isPublished: true }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    { $project: { username: 1, fullName: 1, avatar: 1 } }
                ]
            }
        },
        {
            $addFields: {
                owner: { $first: "$owner" }
            }
        },
        {
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1
            }
        },
        {
            $skip: (pageNum - 1) * limitNum
        },
        {
            $limit: limitNum
        },
        {
            $project: {
                _id: 1,
                createdAt: 1,
                isPublished: 1,
                owner: 1,
                views: 1,
                duration: 1,
                thumbnail: 1,
                description: 1,
                title: 1,
                videoFile: 1
            }
        },
    ]);

    if (!videos) {
        throw new ApiError(400, "No video found");
    }

    return res.status(200).json(
        new ApiResponse(200, videos, "Videos fetched successfully")
    );
});


const getUserVideos = asyncHandler(async (req, res) => {
    const { limit = 10, page = 1, sortType = "desc" } = req.query;
    const { userId } = req.params;

    if (!userId || !isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID or videos not found");
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const videos = await Video.aggregate([
        {
            $match: {
                owner: mongoose.Types.ObjectId.createFromHexString(userId)
            }
        },
        {
            $match: {
                isPublished: true
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            fullName: 1,
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "videos",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "videos",
                as: "comments"
            }
        },
        {
            $addFields: {
                owner: { $first: "$owner" }
            }
        },
        {
            $sort: {
                createdAt: sortType === "asc" ? 1 : -1
            }
        },
        {
            $skip: (pageNum - 1) * limitNum
        },
        {
            $limit: limitNum
        },
        {
            $project: {
                _id: 1,
                owner: 1,
                videoFile: 1,
                thumbnail: 1,
                createdAt: 1,
                description: 1,
                title: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
                likes: { $size: "$likes" },
                comments: { $size: "$comments" }
            }
        }
    ]);

    if (!videos) {
        throw new ApiError(404, "Error while fetching videos");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "All videos fetched successfully"));
});

const publishAVideo = asyncHandler(async(req,res)=>{

     const {title, description} = req.body;
     const videoLocalPath = req.files?.videoFile?.[0]?.path;
     const thumbnailLocalPath = req.file?.thumbnail?.[0]?.path;

     if(!title || title.trim() === ""){
        throw new ApiError(400, "title is required")
     }

     if(!videoLocalPath){
        if(thumbnailLocalPath){
            fs.unlinkSync(thumbnailLocalPath);
        }
        throw new ApiError(400, "video is required")
     }

     if(!thumbnailLocalPath){
        if(videoLocalPath){
            fs.unlinkSync(videoLocalPath)
        }
        throw new ApiError(400, "thumbnail is required")
     }

     const videoFile = await uploadOnCloudinary(videoLocalPath);
     const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

     if(!videoFile || !thumbnail){
       throw new ApiError(400, "video or thumbnail not uploaded on cloudinary")
     }

     const video = await Video.create({
        videoFile:videoFile?.secure_url,
        thumbnail:thumbnail?.secure_url,
        title:title,
        description:description,
        duration:videoFile?.duration,
        owner:req.user?._id
     })
    
     if(!video){
        throw new ApiError(500, "error while uploading video")
     }

     return res.status(201).json(
        new ApiResponse(201, video , "video uploaded successfully")
     )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    console.log("Video id -> ", videoId);

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
                isPublished: true,
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscriberCount: { $size: "$subscribers" },
                            isSubscribed: req.user
                                ? { $in: [req.user._id, "$subscribers.subscriber"] }
                                : false
                        }
                    },
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1,
                            isSubscribed: 1,
                            subscriberCount: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                owner: { $first: "$owner" },
                likesCount: { $size: "$likes" },
                isLiked: req.user
                    ? { $in: [req.user._id, "$likes.likedBy"] }
                    : false
            }
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                owner: 1,
                createdAt: 1,
                comments: 1,
                likesCount: 1,
                isLiked: 1
            }
        }
    ]);

    if (!video || !video.length) {
        throw new ApiError(404, "Video does not exist");
    }

    await Video.findByIdAndUpdate(videoId, {
        $inc: { views: 1 }
    });

    if (req.user?._id) {
        await User.findByIdAndUpdate(req.user._id, {
            $addToSet: { watchHistory: videoId }
        });
    }

    return res.status(200).json(
        new ApiResponse(200, video[0], "Video fetched successfully")
    );
});


const updateVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const { videoId } = req.params;
  const thumbnailLocalPath = req.file?.path;

  const unLinkPath = (filePath) => {
    if (filePath) {
      const fs = require("fs");
      fs.unlinkSync(filePath);
    }
  };

  if (!videoId || !isValidObjectId(videoId)) {
    unLinkPath(thumbnailLocalPath);
    throw new ApiError(400, "Invalid video id");
  }

  if (!title && !thumbnailLocalPath && !description) {
    unLinkPath(thumbnailLocalPath);
    throw new ApiError(400, "At least one field is required");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    unLinkPath(thumbnailLocalPath);
    throw new ApiError(400, "Video not found");
  }

  if (req.user?._id.toString() !== video?.owner?.toString()) {
    unLinkPath(thumbnailLocalPath);
    throw new ApiError(403, "You don't have permission to perform this activity");
  }

  let thumbnail;
  if (thumbnailLocalPath) {
    thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnail) {
      throw new ApiError(400, "Error while uploading new thumbnail");
    }

    const oldThumbnailUrl = video?.thumbnail;
    if (oldThumbnailUrl) {
      const regex = /\/([^/]+)\.[^.]+$/;
      const match = oldThumbnailUrl.match(regex);

      if (!match) {
        throw new ApiError(400, "Couldn't extract public ID of old thumbnail");
      }

      const publicId = match[1];
      await deleteFromCloudinary(publicId);
    }

    unLinkPath(thumbnailLocalPath);
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title: title || video?.title,
        description: description || video?.description,
        thumbnail: thumbnail?.secure_url || video?.thumbnail,
      }
    },
    { new: true }
  );

  if (!updatedVideo) {
    throw new ApiError(500, "Error while updating video");
  }

  return res.status(200).json(
    new ApiResponse(200, updatedVideo, "Video updated successfully")
  );
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video?.owner?.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You don't have permission to delete this video");
  }

  const thumbnailUrl = video?.thumbnail;
  const videoFileUrl = video?.videoFile;

  const regex = /\/upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+$/;


  const matchThumb = thumbnailUrl?.match(regex);
  if (!matchThumb) {
    throw new ApiError(400, "Couldn't extract public ID of thumbnail");
  }
  let publicId = matchThumb[1];
  const deleteThumbnail = await deleteFromCloudinary(publicId);

  const matchVideo = videoFileUrl?.match(regex);
  if (!matchVideo) {
    throw new ApiError(400, "Couldn't extract public ID of video file");
  }
  publicId = matchVideo[1];
  const deleteVideoFile = await deleteFromCloudinary(publicId);

  if (deleteThumbnail.result !== "ok") {
    throw new ApiError(500, "Error while deleting thumbnail from Cloudinary");
  }

  if (deleteVideoFile.result !== "ok") {
    throw new ApiError(500, "Error while deleting video file from Cloudinary");
  }

  await Video.findByIdAndDelete(videoId);

  return res.status(200).json(
    new ApiResponse(200, {}, "Video deleted successfully")
  );
});


const togglePublishStatus = asyncHandler(async(req,res)=>{
    const {videoId} = req.params;
    console.log("Video Id ->", videoId);

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video ID")
    }


    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "video not found")
    }

    if(req.user?.id.toString() !== video?.owner.toString()){
      throw new ApiError(403, "You don't have permission to toggle this video's publish status");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,{
            $set:{
                isPublished:!video.isPublished
            },

        },
        {
            new:true
        }
    );

    return res.status(200).json(
        new ApiResponse(200, updatedVideo, "Publish status toggled successfully")
    )
})

const getSubscribedVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, sortType = "desc" } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // 1. Get the channels the user is subscribed to
    const subscriptions = await Subscription.find({
        subscriber: new mongoose.Types.ObjectId(req.user?._id),
    }).select("channel");

    const channelIds = subscriptions.map((sub) => sub.channel);

    if (channelIds.length === 0) {
        return res.status(200).json(
            new ApiResponse(200, [], "No subscribed channels found")
        );
    }

    // 2. Fetch published videos from those channels
    const videos = await Video.aggregate([
        {
            $match: {
                owner: { $in: channelIds.map(id => new mongoose.Types.ObjectId(id)) },
                isPublished: true
            }
        },
        {
            $sort: {
                createdAt: sortType === "asc" ? 1 : -1
            }
        },
        {
            $skip: (pageNum - 1) * limitNum
        },
        {
            $limit: limitNum
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            username: 1,
                            fullName: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: { $first: "$owner" }
            }
        },
        {
            $project: {
                _id: 1,
                owner: 1,
                videoFile: 1,
                thumbnail: 1,
                createdAt: 1,
                description: 1,
                title: 1,
                duration: 1,
                views: 1,
                isPublished: 1
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(200, videos, "Subscribed videos fetched successfully")
    );
});



export {
     getAllVideos,
     getUserVideos, 
     publishAVideo, 
     getVideoById, 
     updateVideo,
     deleteVideo,
     togglePublishStatus,
     getSubscribedVideos

}