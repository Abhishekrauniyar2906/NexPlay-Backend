import mongoose, {isValidObjectId} from "mongoose";

import { Subscription } from "../models/subscription.models.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";


const toggleSubscription = asyncHandler(async (req,res)=>{
    const {channelId}= req.params

    if(!channelId||!isValidObjectId(channelId)){
        throw new ApiError(500,"error while getting channel")
    }

    if(channelId.toString()=== req.user?._id.toString()){
        throw new ApiError(403,"cannot subscribe to ur own channel")
    }
    console.log("channelid",channelId)

    const isSubscribed= await Subscription.findOne({
        channel:channelId,
        // subscriber:req.user?._id
    })
    console.log(isSubscribed)

    if(isSubscribed){
        const unSubscribed = await Subscription.deleteOne(isSubscribed._id)
        console.log("unsubscribed",unSubscribed)
        if(!unSubscribed){
            throw new ApiError(500,"error while unsubscribing channel")
        }
    }
    else{
        const subscribe= await Subscription.create({
            channel:channelId,
            subscriber:req.user?._id
        })

        console.log("subscribe",subscribe)

        if(!subscribe){
            throw new ApiError(500,"error while subscribing channel")
        }
    }

    return res.status(200)
    .json(new ApiResponse(200,{isSubscribed: !isSubscribed },"subscribe status updated"))
})

const getUserChannelSubscribers = asyncHandler(async(req,res)=>{
    const {channelId} = req.params

    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiError(400,"channel id is not valid")
    }

    const subscribers = await Subscription.aggregate([
        {
            $match:{
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup:{
                from :"users",
                localField:"subscriber",
                foreignField:"_id",
                as:"subscribers",
                pipeline:[
                    {
                        $project:{
                            _id:1,
                            avatar:1,
                            fullName:1,
                            username:1
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                subscribers:{
                    $first:"$subscribers"
                }
            }
        },
        {
            $group:{
                _id:null,
                subscribers:{
                    $push:"subscribers"
                },
                totalSubscribers:{
                    $sum:1
                }
            }
        },{
            $project:{
                subscribersCount:"$totalSubscribers"
            }
        }
    ])

    if(!subscribers){
        throw new ApiError(500,"error while getting subscribers")
    }

    return res.status(200)
    .json(new ApiResponse(200,subscribers,"subscribers fetched successfully"))
})

const getSubscribedChannels = asyncHandler(async(req,res)=>{
    const {subscriberId} = req.params

    if (!subscriberId || !isValidObjectId(subscriberId)) {
        throw new ApiError(400, "No valid subscriber Id found");
    }

    

    const SubscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            avatar: 1,
                            username: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$channelDetails"
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "channel",
                foreignField: "channel",
                as: "channelSubscribers"
            }
        },
        {
            $addFields: {
                "channelDetails.isSubscribed": {
                    $cond: {
                        if: { $in: [req.user?._id, ["$channelDetail.isSubscribed"]] },
                        then: true,
                        else: false
                    }
                },
                "channelDetails.subscribersCount": {
                    $size: "$channelSubscribers"
                }
            }
        },
        {
            $group: {
                _id: null,
                channels: {
                    $push: "$channelDetails"
                },
                totalChannels: {
                    $sum: 1
                }
            }
        },
        {
            $project: {
                _id: 0,
                channels: 1,
                channelsCount: "$totalChannels"
            }
        }
    ])
    console.log(SubscribedChannels)

    if(!SubscribedChannels){
        throw new ApiError(500,"channels not found")
    }

    return res.status(200)
    .json(new ApiResponse(200,SubscribedChannels[0],"subscribed channel fetched successfully"))
})

export{
    toggleSubscription,
    getSubscribedChannels,
    getUserChannelSubscribers,
}