import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comments.models";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";


const getVideoComment = asyncHandler(async(req, res)=>{
      const {videoId} = req.params;
      const {page = 1, limit = 10} = req.query;

      if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid or missing video ID");
    }

    const getCommets = await Comment.aggregate([
        {
            $match:{
                video:new mongoose.Types.ObjectId(videoId)
            }
        },

        {
            $sort:{
                createdAt:-1
            }
        },
        {
            $skip:(page - 1) * limit
        },
        {
            $limit:parseInt(limit)
        },
        {
            $lookup:{

            }
        }
    ])

})