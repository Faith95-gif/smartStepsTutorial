import mongoose from 'mongoose';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://faithabayomi18:f1vouroluw11972@dominionspecialist.cdp3oi9.mongodb.net/smartsteps?retryWrites=true&w=majority&appName=dominionspecialist';

// Mock Exam Schema (same as in server)
const mockExamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    duration: { type: Number, required: true },
    shareId: { type: String, unique: true, required: true },
    subjects: {
        english: [{
            question: String,
            options: [String],
            correctAnswer: Number,
            imageUrls: [String],
            imagePublicIds: [String]
        }],
        physics: [{
            question: String,
            options: [String],
            correctAnswer: Number,
            imageUrls: [String],
            imagePublicIds: [String]
        }],
        chemistry: [{
            question: String,
            options: [String],
            correctAnswer: Number,
            imageUrls: [String],
            imagePublicIds: [String]
        }],
        maths: [{
            question: String,
            options: [String],
            correctAnswer: Number,
            imageUrls: [String],
            imagePublicIds: [String]
        }],
        biology: [{
            question: String,
            options: [String],
            correctAnswer: Number,
            imageUrls: [String],
            imagePublicIds: [String]
        }]
    },
    createdAt: { type: Date, default: Date.now },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
});

const MockExam = mongoose.model('MockExam', mockExamSchema);

async function fixMockExams() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB Atlas');

        console.log('\nFetching all mock exams...');
        const mocks = await MockExam.find({});
        console.log(`Found ${mocks.length} mock exam(s)`);

        if (mocks.length === 0) {
            console.log('No mocks to fix. Database is clean.');
            process.exit(0);
        }

        let fixedCount = 0;

        for (const mock of mocks) {
            let needsUpdate = false;
            
            // Check each subject
            const subjects = ['english', 'physics', 'chemistry', 'maths', 'biology'];
            
            for (const subject of subjects) {
                if (!Array.isArray(mock.subjects[subject])) {
                    console.log(`\nFixing mock "${mock.name}" - ${subject} was not an array`);
                    mock.subjects[subject] = [];
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                await mock.save();
                fixedCount++;
                console.log(`✓ Fixed mock: ${mock.name}`);
            }
        }

        console.log(`\n✅ Database cleanup complete!`);
        console.log(`Fixed ${fixedCount} mock exam(s)`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error fixing mock exams:', error);
        process.exit(1);
    }
}

fixMockExams();
