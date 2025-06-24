import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.models.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from 'jsonwebtoken'

const generateAccessAndRefreshTokens = async(userId) => {
       try{
          const user = await User.findById(userId);
         const accessToken = user.generateAccessToken()
         const refreshToken = user.generateRefreshToken()

         user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})
        return {accessToken, refreshToken};
       }
       catch(error){
       throw new ApiError(500, "Something went wrong while generating refresh and access token")
       }
}

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

const loginUser = asyncHandler(async(req,res) =>{
  // get login  data from the req.bdoy
  // validation  means field not empty
  // access check username or email
  // find user
  // check if user exists in db 
  //check passoword using bcrypt
  //generate tokens (access and refresh)
  //set refresh token cookie me bhejte h 
  //send response
   
   const{email, username, password} = req.body;

    if(!username && !email){
       throw new ApiError(400, "username or email is required");
    }

   const user = await User.findOne({
       $or:[{username}, {email}]
    })

    if(!user){
       throw new ApiError(404, "User does not exist");
    }

   const isPasswordValid = await user.isPasswordCorrect(password);
    
   if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials");
   }

   const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)
   
   const loggedInUser = await User.findById(user._id).select("-password -refreshtoken")

   const options={
      httpOnly : true,
      secure: true
   }


   return res.status(200).cookie("accessToken", accessToken, options)
   .cookie("refreshToken", refreshToken).json(
      new ApiResponse(
         200,{
            user:loggedInUser, accessToken, refreshToken
         },
         "User logged In Successfully"
      )
   )
})

const loggedOutUser = asyncHandler(async(req,res) =>{
    await User.findByIdAndUpdate(
      req.user._id,{
        $set:{
          refreshToken:undefined
        }
      },{
        new:true,
      }
     )

     const options ={
      httpOnly:true,
      secure:true,
     }

     return res.status(200)
     .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
     .json(
      new ApiResponse(200, {}, "Log Out Succesfully")
     )
})

const refreshAccessToken = asyncHandler(async(req, res) =>{

  // why incoming hamare pass bhi refresh token db me hein
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
 // 200 ki request sbse kharab h 
 if(!incomingRefreshToken){
  throw new ApiError(401, "unauthorized request")
 }
  
try {
  const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
  
  const user = await User.findById(decodedToken?._id)
  
  if(!user){
    throw new ApiEorr(401, "Invalid refresh token")
  }
  
  if(incomingRefreshToken !== user?.refreshToken){
    throw new ApiError(401, "Refresh token is expired or used")
  }
  
  const options = {
    httpOnly:true,
    secure:true
  }
  
  const {accessToken, newrefreshToken} = await generateAccessAndRefreshTokens(user?._id)
  
   return res.status(200)
   .cookie("accessToken", accessToken, options)
   .cookie("refresh token", newrefreshToken, options)
   .json(
    new ApiResponse(200, {accessToken, refreshToken : newrefreshToken}, "Access Token refreshed")
   )
  
} catch (error) {
  throw new ApiError(401, error?.message || "Invalid refresh token")
}
})  // ab hmare pass yha pe controller hein endpoint abhi bhi nhi hein

const changeCurrentPassword = asyncHandler(async(req,res) =>{
  const{oldPassword, newPassword} = req.body
  
 const user =  User.findById(req.user?._id)

 const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

 if(!isPasswordCorrect){
  throw new ApiError(400, "Invalid old password")
 }

 user.password = new password // yha pe set kiya hein save nahi
await user.save({validateBeforeSave: false})

return res.status(200)
      .json(new ApiResponse(200, "Password changed Successfully"))
})

const getCurrentUser = asyncHandler(async(req, res)=>{
  return res.status(200).json(200, req.user, "current user fetched successfully")
})

// yeah backend developer decide karenge ki user ko kya kya change karne ka option de skte hein :
const updateAccountDetails = asyncHandler(async(req, res) =>{
 const{fullName, email} = req.body

 if(!fullName || !email){
  throw new ApiError(400, "All field are required")
 }

const user = User.findByIdAndUpdate(req.user?._id,
  {
   $set:{fullName, email:email}
  },{
    new:true, // update hone ke baad info return hotii hein yha pe 
  }
 ).select("-password")
  
   return res.status(200).json(
    new ApiResponse(200, user, "Account details updated successfully")
   )
})

const updateUseravatar = asyncHandler(async(req,res) =>{
    const avatarLocalPath =  req.file?.path
    
    if(!avatarLocalPath){
      throw new ApiError(400, "Avatar File is missing")
      
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);


    if(!avatar?.url){
      throw new ApiError(400, "Error while uploading on avatar")
    }

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set:{
          avatar:avatar?.url
        },
       
      },
       {
          new:true,
        }
    ).select("-password")

    
  return res.status(200)
  .json(
    new ApiResponse(200, user, "avatar Image updated Successfully")
  )
})

const updateUsercoverImgae = asyncHandler(async(req,res) =>{
 const coverImageLocalPath =  req.file?.url

 if(!coverImageLocalPath){
  throw new ApiError(400, "Cover image file is missing")
 }

 const coverImage = await uploadOnCloudinary(coverImageLocalPath)

 if(!coverImage?.url){
  throw new ApiError(400, "Error while uploading on coverImage")
 }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        Image:coverImage.url
      }
    },{
       new:true
    }
  ).select("-password")

  return res.status(200)
  .json(
    new ApiResponse(200, user, "cover Image updated Successfully")
  )
})
export {registerUser, 
  loginUser, 
  loggedOutUser, 
  refreshAccessToken, 
  changeCurrentPassword,
   getCurrentUser, updateAccountDetails, updateUseravatar, updateUsercoverImgae}

