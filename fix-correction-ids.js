import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://faithabayomi18:f1vouroluw11972@dominionspecialist.cdp3oi9.mongodb.net/smartsteps?retryWrites=true&w=majority&appName=dominionspecialist';

// Mock Result Schema
const mockResultSchema = new mongoose.Schema({
    mockId: { type: mongoose.Schema.Types.ObjectId, required: true },
    studentName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    selectedSubject: { type: String, required: true },
    answers: Array,
    scores: Object,
    totalScore: Number,
    totalQuestions: Number,
    percentage: Number,
    timeSpent: Number,
    chancesUsed: Number,
    correctionId: String,
    mockSnapshot: Object,
    submittedAt: Date
});

const MockResult = mongoose.model('MockResult', mockResultSchema);

async function fixCorrectionIds() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB Atlas');

        console.log('\nFetching all mock results...');
        const results = await MockResult.find({});
        console.log(`Found ${results.length} result(s)`);

        if (results.length === 0) {
            console.log('No results to fix. Database is clean.');
            process.exit(0);
        }

        let fixedCount = 0;

        for (const result of results) {
            if (!result.correctionId) {
                result.correctionId = uuidv4();
                await result.save();
                console.log(`✓ Added correctionId to result for ${result.studentName}: ${result.correctionId}`);
                fixedCount++;
            } else {
                console.log(`  Result for ${result.studentName} already has correctionId: ${result.correctionId}`);
            }
        }

        console.log(`\n✅ Correction ID fix complete!`);
        console.log(`Fixed ${fixedCount} result(s)`);
        console.log(`${results.length - fixedCount} result(s) already had correctionIds`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error fixing correction IDs:', error);
        process.exit(1);
    }
}

fixCorrectionIds();
