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

export {registerUser, loginUser, loggedOutUser, refreshAccessToken}

/* import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.models.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from "../utils/apiResponse.js";
import { response } from "express";

// 🔐 Token generate karne wala helper function
token ko user ID se bana ke return karta hai
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId); // user ko DB se dhoondhna
    const accessToken = user.generateAccessToken(); // access token banana
    const refreshToken = user.generateRefreshTokens(); // refresh token banana

    user.refreshToken = refreshToken; // refresh token DB me store karna (security ke liye)
    await user.save({ validateBeforeSave: false }); // user ko DB me save karna (without validation)

    return { accessToken, refreshToken }; // dono token return karna
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating refresh and access token");
  }
};

// 👤 User register karne ka function
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullName, password } = req.body; // frontend se data lena

  // check karna ki koi bhi field empty na ho
  if ([fullName, email, password, username].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  // check karna ki user already exist to nahi karta (username/email se)
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "Username and email already exists");
  }

  // avatar file ka path lena (uploaded file se)
  const avatarLocalPath = req.files?.avatar[0]?.path;

  // cover image path optional hai, to usko condition ke sath lena
  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage;
  }

  // agar avatar nahi mila to error throw karna
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // avatar and cover image ko cloudinary pe upload karna
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // upload fail hone par error throw karna
  if (!avatar) {
    throw new ApiError(400, "Avatar field is required");
  }

  // user object create karna
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // create hone ke baad password aur refreshToken ko response me se remove karna
  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // final response bhejna
  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered Successfully")
  );
});

// 👤 Login logic
token generate + user verify + cookie set
const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  // validation: username/email and password required
  if (!username || !email) {
    throw new ApiError(400, "username and password is required");
  }

  // user ko DB me dhoondhna (username ya email se)
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  // agar user nahi mila to error
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  // password match check karna (bcrypt method)
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // valid user hone par tokens generate karna
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  // response me bhejne se pehle password & refreshToken hatana
  const loggedInUser = await User.findById(user._id).select("-password -refreshtoken");

  // cookie ke options
  const options = {
    httpOnly: true,
    secure: true,
  };

  // final response
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged In Successfully"
      )
    );
});

export { registerUser, loginUser };
*/