import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.models.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/apiResponse.js";
import { response } from "express";
const registerUser = asyncHandler(async(req,res) =>{
        // get the user details from frontend => means postman
        // validation -> not empty (means all data are required)
        // check if the user already exists : email or username
        // check for img , check for avatar,
        // upload them to the cloudnary , check avatar 
        // create user object (for mongodb) -> create entry in db
        // remove password and refresh token field from the response
        // check for user creation 
        // return response
      console.log("Request body:", req.body);
       const {username, email, fullName, password} = req.body
        console.log("Get user details");
       console.log("email", email);
       console.log("username", username);
       console.log('fullName', fullName);
       console.log('password', password);

//        if(fullName === ""){
//         throw new ApiError(400, "fullName is required")
//        }
        if(
          [fullName, email, password, username].some((field) =>
        field?.trim() === "")
        ){
               throw new ApiError(400, "All fields are required")
        }

             const existedUser = await User.findOne({
                $or: [{ username },{ email }]
              });
              if(existedUser){
                throw new ApiError(409, "Username and email already exists")
              } 

              // middlewares hme reuqest ke andar or field add karta  hein, 
             // req.body // from express
             
            const avatarLocalPath =  req.files?.avatar[0]?.path;
           // const coverImageLocalPath = req.files?.coverImage[0]?.path;
        //      console.log("req.files -> ",req.files);
        //      console.log("avatarLocalPath", avatarLocalPath);
        //      console.log("coverImage", coverImageLocalPath)

            let coverImageLocalPath;
            if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
                coverImageLocalPath = req.files.coverImage;
            }

             if(!avatarLocalPath){
                throw new ApiError(400, "Avatar file is required");
             }

            const avatar =  await uploadOnCloudinary(avatarLocalPath)
            const coverImage = await uploadOnCloudinary(coverImageLocalPath);

            if(!avatar){
                throw new ApiError(400, "Avatar field is required")
            }

         const user = await User.create({ 
                fullName,
                avatar:avatar.url,
                coverImage:coverImage?.url || "",
                email,
                password,
                username:username.toLowerCase()
            })

         const createdUser = await User.findById(user._id).select(
                "-password -refreshToken"
         )
         
         if(!createdUser){
                throw new ApiError(500, "Something went wrong while registering the user")
         }

         return res.status(201).json(
                new ApiResponse(200, createdUser, "User registered Successfully")
         )
})

export {registerUser}

