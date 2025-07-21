import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Subscription } from "../models/subscription.models.js";
import { Video } from "../models/video.models.js"; // ADD THIS

const getChannelStats = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!userId || !isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id");
    }

    const videoStats = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
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
            $project: {
                likesCount: { $size: "$likes" },
                viewsCount: "$views"
            }
        },
        {
            $group: {
                _id: null,
                totalCount: { $sum: "$likesCount" },
                totalViewsCount: { $sum: "$viewsCount" },
                totalVideos: { $sum: 1 }
            }
        }
    ]);

    const SubscriberStats = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group: {
                _id: null,
                subscriberCount: { $sum: 1 }
            }
        }
    ]);

   if (!videoStats.length && !SubscriberStats.length) {
    return res.status(200).json(
        new ApiResponse(200, {
            subscriberCount: 0,
            totalVideos: 0,
            totalViews: 0,
            totalLikes: 0
        }, "No activity found for this channel")
    );
}


    const stats = {
        subscriberCount: SubscriberStats[0]?.subscriberCount || 0,
        totalVideos: videoStats[0]?.totalVideos || 0,
        totalViews: videoStats[0]?.totalViewsCount || 0,
        totalLikes: videoStats[0]?.totalCount || 0
    };

    return res.status(200).json(
        new ApiResponse(200, stats, "Channel statistics fetched successfully")

    );
}); 

const getChannelVideos = asyncHandler(async (req, res) => {
    if (!req.user || !isValidObjectId(req.user._id)) {
        throw new ApiError(401, "Unauthorized or invalid user");
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const videos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        { $skip: skip },
        { $limit: limit },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "video",
                as: "comments"
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                commentsCount: { $size: "$comments" }
            }
        },
        {
            $project: {
                _id: 1,
                videoFile: 1,
                isPublished: 1,
                thumbnail: 1,
                likesCount: 1,
                commentsCount: 1,
                createdAt: 1,
                description: 1,
                title: 1,
                views: 1
            }
        },
        { $sort: { createdAt: -1 } }
    ]);

    if (!videos.length) {
        throw new ApiError(404, "No videos found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };
