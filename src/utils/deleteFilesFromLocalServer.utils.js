import fs from 'fs';

const deleteFilesFromLocalServer = files =>{
    for(const file of files){
        if(file?.path && fs.existsSync(file.path)){
            fs.unlinkSync(file.path)
        }
    }
};

export default deleteFilesFromLocalServer