import mongoose from "mongoose"

export const connectDB = async () => {
    try {
        const baseUri = (process.env.MONGODB_URI || '').replace(/\/+$/, '');
        const uri = baseUri ? `${baseUri}/apar` : 'mongodb://localhost:27017/apar';
        const connectionInstance = await mongoose.connect(uri);
        // console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error("MONGODB connection error ", error);
        process.exit(1)
    }
}
