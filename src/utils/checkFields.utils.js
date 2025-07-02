import mongoose from "mongoose";
import { ApiError } from "./ApiError";

const checkFields = (fields, message, requireAll = true) =>{
  
    let isValid = null;

    if(requireAll){
        isValid = fields.every(
            field => field && typeof field === "string" && field.trim()
        );
    }

    else{
        isValid = fields.some(
            field => field && typeof field === "string" && field.trim()
        );
    }

    if(!isValid){
        throw new ApiError(400, message || "All fields are required");
    }
};

const checkObjectID = (id, message) =>{
    if(!mongoose.Schema.Types.ObjectId.isValid(id)){
        throw new ApiError(400, message)
    }
};

export {checkFields, checkObjectID};