import { fileTypeFromFile } from "file-type";
import path from "path";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import deleteFilesFromLocalServer from "../utils/deleteFilesFromLocalServer.utils.js";

const validateFileType = asyncHandler(async (req, res, next) => {
  let files = [];

  try {
    if (req.file && Object.keys(req.file).length > 0) {
      files.push(req.file);
    } else if (req.files && Object.keys(req.files).length > 0) {
           // // upload.fields se files bhut saari aayengi 
        // // Example: req.files = { 
        //    upload.fields{
        //     [name:"videos"],
        //     [name:"thubnail"]
        //    }
        //  }
    
      if (Object.values(req.files).every(val => Array.isArray(val))) {
        // req.files ={
            //  videos:[{f1,f2 ....}],
        //      thumbnail:[{f2,f3,f3...}],    
        // } // like this 
        files = Object.values(req.files).flat();

      } else {
        files = req.files;
      }
    }

    if (files.length > 0) {
      for (const file of files) {
        const originalFileType = await fileTypeFromFile(file.path);

        if (!originalFileType || !originalFileType?.ext) {
          throw new ApiError(400, `Invalid file: ${file.originalname}`);
        }

        if (
          `.${originalFileType.ext.toLowerCase()}` !==
          path.extname(file.originalname).toLowerCase()
        ) {
          throw new ApiError(
            400,
            `Mismatch: actual "${originalFileType.ext}" vs extension "${path.extname(file.originalname)}"`
          );
        }

        file.originalFileType = originalFileType.ext.toLowerCase();
      }
    }

    next();
  } catch (error) {
    deleteFilesFromLocalServer(files);
    throw error;
  }
});

export default validateFileType;
