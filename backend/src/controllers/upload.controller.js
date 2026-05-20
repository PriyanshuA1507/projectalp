import { asyncHandler } from "../utils/async-handler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import fs from "fs";
import path from "path";

const uploadFile = asyncHandler(async (req, res) => {
    const localFilePath = req.file?.path;

    if (!localFilePath) {
        throw new ApiError(400, "No file uploaded");
    }

    // Check if Cloudinary is configured
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
        // Use Cloudinary if configured
        const response = await uploadOnCloudinary(localFilePath);

        if (!response) {
            throw new ApiError(500, "Failed to upload file to cloud");
        }

        return res
            .status(200)
            .json(new ApiResponse(200, { url: response.secure_url }, "File uploaded successfully"));
    } else {
        // Fallback to local storage
        // console.log('Cloudinary not configured, using local storage');
        
        // Move file from temp to public/uploads directory
        const publicDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }

        const fileName = req.file.filename;
        const destinationPath = path.join(publicDir, fileName);
        
        // Move file from temp to uploads
        fs.renameSync(localFilePath, destinationPath);
        
        // Return local URL
        const localUrl = `/uploads/${fileName}`;
        
        return res
            .status(200)
            .json(new ApiResponse(200, { url: localUrl }, "File uploaded successfully (local storage)"));
    }
});

export { uploadFile };
