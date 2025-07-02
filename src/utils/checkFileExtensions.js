import { ApiError } from "./ApiError";

const validateFileExtensions = (filesArray = [], validExtensions = [])=>{
    for(const file of filesArray){
        const ext = `.${file.realFileType}`;

        if(!validExtensions.includes(ext)){
            throw new ApiError( 400,
        `Invalid file type: "${ext}" of file "${file.originalname}". Allowed: ${validExtensions.join(", ")}`
      );
        }
    }
}

export default validateFileExtensions