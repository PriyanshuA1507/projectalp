
import mongoose from 'mongoose';
import { AparForm } from './src/models/aparForm.model.js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const connectDB = async () => {
    try {
        const baseUri = (process.env.MONGODB_URI || '').replace(/\/+$/, '');
        const uri = baseUri ? `${baseUri}/apar` : 'mongodb://localhost:27017/apar';
        await mongoose.connect(uri);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

const inspectForms = async () => {
    await connectDB();

    try {
        // Find all forms with lean()
        const forms = await AparForm.find({}).sort({ updatedAt: -1 }).lean();

        console.log(`Found ${forms.length} forms (showing last 10)`);

        forms.forEach((f, i) => {
            console.log(`\n--- Form ${i + 1} ---`);
            console.log('Keys:', Object.keys(f));
            console.log('Reviewing Query:', f.reviewing_query);
        });

    } catch (error) {
        console.error('Error inspecting forms:', error);
    } finally {
        await mongoose.disconnect();
    }
};

inspectForms();
