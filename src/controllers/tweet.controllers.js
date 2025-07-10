import mongoose,{ isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.models";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";


const createTweet = asyncHandler(async(req, res)=>{
    const {content} = req.body;

    if(!content?.trim()){
        throw new ApiError(400, "content is required for the tweet")
    }

    const tweet = await Tweet.create({
        content:content,
        owner:req.user?._id
    })

    if(!tweet){
        throw new ApiError(500, "error while creating tweet")
    }

    return res.status(200).json(
        new ApiResponse(200, tweet, "Tweet created successfully")
    )
})

const updateTweet = asyncHandler(async(req,res)=>{
    const {tweetId} = req.params;
    const {content} = req.body;
   
    console.log("Tweet id ->", tweetId)
    
    if(!content?.trim()){
        throw new ApiError(400, "content cannot be empty")
    }

    if(!tweetId || !isValidObjectId(tweetId)){
        throw new ApiError(400, "tweet id is invalid")
    }

    const tweet = await Tweet.findById(tweetId);

    if(!tweet){
        throw new ApiError(404, "tweet not found")
    }

    if(tweet?.owner.toString() !== req.user?.id.toString()){
        throw new ApiError(400, "only owner can update this twwet")
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(tweetId,{
        $set:{
            content
        }
    },
     {
        new:true
     }
)

   if(!updatedTweet){
    throw new ApiError(500, "error while uploading tweet")
   }
   
   console.log("Updated tweet ->", updatedTweet)

   const tweetWithDetails = await Tweet.aggregate([
    {
        $match:{
            _id:updatedTweet?._id,
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
        $addFields:{
            likesCount:{
                $size:"$likes"
            },

            isLiked:{
                $cond:{
                    if:{$in:[req.user?._id, "$likes.likedBy"]},
                    then:true,
                    else:false
                }
            }
        }
    },
    {
        $project:{
             _id:1,
                owner:1,
                content:1,
                likesCount:1,
                isLiked:1,
                updatedAt:1,
                createdAt:1
        }
    }
   ])

   if(!tweetWithDetails.length){
        throw new ApiError(500,"error while fetching updated tweet details")
    }
   return res.status(200).json(
    new ApiResponse(200, tweetWithDetails[0] ,"update tweet successfully")
   )
})

const deleteTweet = asyncHandler(async(req, res)=>{
    const {tweetId} = req.params;

    if(!tweetId || !isValidObjectId(tweetId)){
        throw new ApiError(400, "Id is invalid")
    }

    const tweet = await Tweet.findById(tweetId);

    if(!tweet){
        throw new ApiError(404, "error while finding tweet")
    }

    if(req.user?._id.toString() !== tweet?.owner.toString()){
      throw new ApiError(400, "you don't have any access to deleting tweet")
    }

     const deletedTweet = await Tweet.findByIdAndDelete(tweetId);

    if (!deletedTweet) {
        throw new ApiError(500, "Error while deleting tweet");
    }

    return res.status(200).json(
        new ApiResponse(200, deletedTweet, "Tweet deleted successfully")
    );

})


const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;

  if (!userId || !isValidObjectId(userId)) {
    throw new ApiError(400, "No valid user found");
  }

  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
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
              _id: 1,
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
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
        isliked: {
          $in: [
            new mongoose.Types.ObjectId(req.user?._id),
            {
              $map: {
                input: "$likes",
                as: "like",
                in: "$$like.likedBy",
              },
            },
          ],
        },
      },
    },
    {
      $project: {
        _id: 1,
        owner: 1,
        content: 1,
        isliked: 1,
        likesCount: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  if (!tweets) {
    throw new ApiError(401, "Error while fetching tweets");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "Tweets fetched successfully"));
});


const getAllTweets = asyncHandler(async(req,res)=>{
     const {page=1,limit=30} = req.query;

     const tweets = await Tweet.aggregate([
        {
            $sort:{
                createdAt:-1
            }
        },
        {
            $skip:(page-1)*limit
        },
        {
            $limit:parseInt(limit)
        },

        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner"
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
                from:"likes",
                localField:"_id",
                foreignField:"tweet",
                as:"likes"
            }
        },

        {
            $addFields:{
                likesCount:{
                    $size:"$likes"
                },

                isliked:{
                  $cond:{
                        if:{$in:[req.user?._id,"$likes.likedBy"]},
                        then:true,
                        else:false
                    }
                }
            }
        },

        {
            $project:{
                _id:1,
                owner:1,
                content:1,
                isliked:1,
                likesCount:1,
                createdAt:1,
                updatedAt:1
            }
        }
     ])

     if(!tweets){
        throw new ApiError(402,"error while fetching tweets")
     }
    
     return res.status(200)
    .json(new ApiResponse(200,tweets,"tweets fetched successsfullt"))
})



export {createTweet, updateTweet, deleteTweet, getUserTweets, getAllTweets}
