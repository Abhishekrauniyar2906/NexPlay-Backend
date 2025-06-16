// import multer from "multer";

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, './public/temp')
//   },
//   filename: function (req, file, cb) {
   
//     cb(null, file.originalname);
//     console.log(file);
//   }
// })

// export const upload = multer(
//     { 
//         storage,
//     }
// )

import multer from "multer";


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/temp'); // Ensure this folder exists!
  },
  filename: function (req, file, cb) {
    console.log("File received:", file);

    // Optional: Add timestamp to avoid filename collisions
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

export const upload = multer({ storage });
