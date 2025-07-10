import { Subscription } from "../models/subscription.models";
import { User } from "../models/user.models";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import mongoose, { isValidObjectId } from "mongoose";
const toggleSubscription = asyncHandler(async(req, res)=>{
     const {channelId} = req.params;

     if(!channelId || isValidObjectId(channelId)){
         throw new ApiError(404, "Invalid channek ID")
     }

     if(channelId?._id.toString() !== req.user?._id.toString()){
      throw new ApiError(403,"cannot subscribe to ur own channel")

     }

     const isSubscribed = await Subscription.findOne(

        {
           channel:channelId,
           subscriber:req.user._id
        }
     )
     console.log("isSubscribed ->" ,isSubscribed)

     if(isSubscribed){
        await Subscription.deleteOne({
            _id:isSubscribed._id
        })
     }

     else{
        const subscribe = await Subscription.create(
            {
                channel:channelId,
                subscriber:req.user.id
            },
           
            
        );
         console.log("subscribe",subscribe)
            
         if(!subscribe){
            throw new ApiError("Subscribe or not -> ", subscribe);
         }
     }

     
       return res.status(200).json
       (
        new ApiResponse(200, {isSubscribed:!isSubscribed}, "Subscription status updated")
       )
})

import mongoose from "mongoose";
import { Subscription } from "../models/subscription.model.js"; // adjust path as needed
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { response } from "express";

export const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    // Validate channelId
    if (!channelId || !mongoose.isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    const subscribersData = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            fullName: 1,
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$subscriberDetails"
        },
        {
            $group: {
                _id: null,
                subscribers: { $push: "$subscriberDetails" },
                subscribersCount: { $sum: 1 }
            }
        },
        {
            $project: {
                _id: 0,
                subscribers: 1,
                subscribersCount: 1
            }
        }
    ]);

    if (!subscribersData || subscribersData.length === 0) {
        return res.status(200).json(
            new ApiResponse(200, { subscribers: [], subscribersCount: 0 }, "No subscribers found.")
        );
    }

    return res.status(200).json(
        new ApiResponse(200, subscribersData[0], "Subscribers fetched successfully.")
    );
});

const getSubscribedChannels = asyncHandler(async(req,res)=>{
       const{subscriberId} = req.params;

       if(!subscriberId || isValidObjectId(subscriberId)){
         throw new ApiError(400, "No valid subscriber Id found");
       }

       const SubscribedChannels = await Subscription.aggregate([
        {
            $match:{
                subscriber:new mongoose.Types.ObjectId(subscriberId)
            // Sirf wahi documents lo jisme subscriber = woh user (subscriberId)
            // Ab aapke paas wahi saare subscription documents hain jisme 
            // user ne kisi channel ko subscribe kiya hai.
            }
        },

        {
            $lookup:{
                 from:"users",
                 localField:"channel",
                 foreignField:"_id",
                 as:"channelDetails",
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
            $unwind:"$channelDetails"
        },
        {
            $lookup:{
                from:"subscription",
                localField:"channel",
                foreignField:"channel",
                as:"channelSubscribers"
            }
        },

        {
          $addFields:{
            "channelDetails.subscribersCount":{
                $size:"$channelSubscribers"
            }
          }
        },

        {
            $group:{
                _id:null,
                channels:{
                   $push:"$channelDetails"
                },

                totalChannels:{
                    $sum:1
                }
            }
        },
        
            {
            $project: {
                _id: 0,
                channels: 1,
                channelsCount: "$totalChannels"
            }
        },
        
       ])

           console.log("Subscribed channles ->", SubscribedChannels);

           if(!SubscribedChannels || SubscribedChannels.length === 0){
            throw new ApiError(500, "Subscribed channel not found")
           }

           return res.status(200).json(
            new ApiResponse(200, SubscribedChannels[0],"subscribed channel fetched successfully")
           )

})
export {toggleSubscription, getUserChannelSubscribers, getSubscribedChannels}