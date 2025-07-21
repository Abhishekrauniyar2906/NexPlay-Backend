import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Like } from "../models/likes.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const toggleVideoLike = asyncHandler(async(req, res)=>{
    const {videoId} = req.params;
    if (!req.user || !req.user._id) {
    throw new ApiError(401, "Unauthorized: User not found");
}


    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400, "Video not found by videoID")
    }

     const isLiked = await Like.findOne({
     video:videoId,
     likedBy:req.user?._id
     });

     if(isLiked){
        const removeLike = await Like.findByIdAndDelete(isLiked?._id)
        if(!removeLike){
            throw new ApiError(500, "error while removing like")
        }
     }

     else{
        const liked = await Like.create({
        video: videoId,
        likedBy: req.user?._id
        })
     if (!liked) {
        throw new ApiError(500, "error while adding like to video")
     }
        
     }

    return res.status(200)
    .json(new ApiResponse(200, { liked: !isLiked }, "like status updated"))

})  


const toggleCommentLike = asyncHandler(async(req, res)=>{
    const {commentId} = req.params;
     if (!req.user || !req.user._id) {
    throw new ApiError(401, "Unauthorized: User not found");
}

    if (!req.user || !req.user._id) {
    throw new ApiError(401, "Unauthorized: User not found");
}

    if(!commentId || !isValidObjectId(commentId)){
        throw new ApiError(400, "comment not found by id")
    }

    const isLiked = await Like.findOne({
        comment:commentId,
        likedBy:req.user?._id
    })

    if(isLiked){
        const removeLike = await Like.findByIdAndDelete(isLiked?._id);
        if(!removeLike){
            throw new ApiError(500, "Error while disliking comment")
        }
    }

    else{
        const liked = await Like.create({
        comment:commentId,
        likedBy:req.user?._id
        })

        if(!liked){
            throw new ApiError(500, "error while liking comment")
        }
    }
  

    return res.status(200).json(
        new ApiResponse(200, { liked: !isLiked }, "Like status updated")
    )
    
})


const toggleTweetLike = asyncHandler(async(req,res)=>{
    const {tweetId} = req.params

    if(!tweetId || !isValidObjectId(tweetId)){
        throw new ApiError(400,"tweet not found")
    }

    const isLiked = await Like.findOne({
        tweet:tweetId,
        likedBy:req.user?._id
    })

    if(isLiked){
        const removeLike= await Like.findByIdAndDelete(isLiked._id)
        if(!removeLike){
            throw new ApiError(500,"error while removing like")
        }
    }
  else{
        const like = await Like.create({
            tweet:tweetId,
            likedBy:req.user?._id
        })
        if(!like){
            throw new ApiError(500,"error while liking tweet")
        }
    }

    return res.status(200)
    .json(new ApiResponse(200,{ liked: !isLiked },"like status updated"))
})   

const getLikedVideos = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $skip: (page - 1) * limit,
    },
    {
      $limit: limit, 
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $match: {
              isPublished: true,
            },
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
                    fullName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: { $first: "$owner" },
            },
          },
        ],
      },
    },
    {
      $addFields: {
        video: { $first: "$video" },
      },
    },
    {
      $match: {
        video: { $ne: null }, 
      },
    },
    {
      $project: {
        video: 1,
      },
    },
  ]);

  if (!likedVideos) {
    throw new ApiError(500, "Error while getting liked videos");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"));
});


export {toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos}


