import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://faithabayomi18:f1vouroluw11972@dominionspecialist.cdp3oi9.mongodb.net/smartsteps?retryWrites=true&w=majority&appName=dominionspecialist';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dbqcl3gyu',
    api_key: process.env.CLOUDINARY_API_KEY || '125497217998532',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'w5UR9A2UgzujVlcuzmnOFRr56Bg'
});

// CORS configuration - MUST come before other middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://smartstepstutorial.onrender.com'] 
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'smart-steps-session-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: MONGODB_URI
    }),
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Multer configuration for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// MongoDB Schemas

// Admin Schema
const adminSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Mock Exam Schema
const mockExamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    duration: { type: Number, required: true }, // in minutes
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

// Mock Result Schema
const mockResultSchema = new mongoose.Schema({
    mockId: { type: mongoose.Schema.Types.ObjectId, ref: 'MockExam', required: true },
    studentName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    selectedSubject: { type: String, required: true, enum: ['maths', 'biology'] },
    answers: [{
        subject: String,
        questionIndex: Number,
        selectedAnswer: Number
    }],
    scores: {
        english: { score: Number, total: Number },
        physics: { score: Number, total: Number },
        chemistry: { score: Number, total: Number },
        fourth: { score: Number, total: Number, subject: String }
    },
    totalScore: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    percentage: { type: Number, required: true },
    timeSpent: { type: Number }, // in seconds
    chancesUsed: { type: Number, default: 0 },
    correctionId: { type: String, unique: true, sparse: true },
    mockSnapshot: {
        name: String,
        subjects: {
            english: [{
                question: String,
                options: [String],
                correctAnswer: Number,
                imageUrls: [String]
            }],
            physics: [{
                question: String,
                options: [String],
                correctAnswer: Number,
                imageUrls: [String]
            }],
            chemistry: [{
                question: String,
                options: [String],
                correctAnswer: Number,
                imageUrls: [String]
            }],
            maths: [{
                question: String,
                options: [String],
                correctAnswer: Number,
                imageUrls: [String]
            }],
            biology: [{
                question: String,
                options: [String],
                correctAnswer: Number,
                imageUrls: [String]
            }]
        }
    },
    submittedAt: { type: Date, default: Date.now }
});

// Pre-save hook to ensure correctionId is generated
mockResultSchema.pre('save', function(next) {
    if (!this.correctionId) {
        this.correctionId = uuidv4();
    }
    next();
});

// Models
const Admin = mongoose.model('Admin', adminSchema);
const MockExam = mongoose.model('MockExam', mockExamSchema);
const MockResult = mongoose.model('MockResult', mockResultSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'smart-steps-secret-key';

// Authentication middleware
const authenticateAdmin = async (req, res, next) => {
    try {
        const token = req.cookies.adminToken || req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const admin = await Admin.findById(decoded.id);
        
        if (!admin) {
            return res.status(401).json({ error: 'Admin not found' });
        }

        req.admin = admin;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Admin Routes

// Admin Login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, admin.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '24h' });

        res.cookie('adminToken', token, {
            httpOnly: true,
            secure: false,
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({
            success: true,
            admin: {
                id: admin._id,
                email: admin.email,
                name: admin.name
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Admin Logout
app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('adminToken');
    res.json({ success: true });
});

// Verify Admin Token
app.get('/api/admin/verify', authenticateAdmin, (req, res) => {
    res.json({
        valid: true,
        admin: {
            id: req.admin._id,
            email: req.admin.email,
            name: req.admin.name
        }
    });
});

// Create Mock Exam
app.post('/api/admin/mocks', authenticateAdmin, async (req, res) => {
    try {
        const { name, duration } = req.body;

        if (!name || !duration) {
            return res.status(400).json({ error: 'Name and duration are required' });
        }

        const mockExam = new MockExam({
            name,
            duration: parseInt(duration),
            shareId: uuidv4(),
            adminId: req.admin._id,
            subjects: {
                english: [],
                physics: [],
                chemistry: [],
                maths: [],
                biology: []
            }
        });

        await mockExam.save();

        res.json({
            success: true,
            mock: {
                id: mockExam._id,
                name: mockExam.name,
                duration: mockExam.duration,
                shareId: mockExam.shareId,
                url: `${req.protocol}://${req.get('host')}/mock/${mockExam.shareId}`
            }
        });
    } catch (error) {
        console.error('Create mock error:', error);
        res.status(500).json({ error: 'Failed to create mock exam' });
    }
});

// Get All Mock Exams
app.get('/api/admin/mocks', authenticateAdmin, async (req, res) => {
    try {
        const mocks = await MockExam.find({ adminId: req.admin._id })
            .sort({ createdAt: -1 })
            .select('name duration shareId createdAt');

        // Get question counts for each mock
        const mocksWithCounts = await Promise.all(mocks.map(async (mock) => {
            const fullMock = await MockExam.findById(mock._id);
            return {
                id: mock._id,
                name: mock.name,
                duration: mock.duration,
                shareId: mock.shareId,
                createdAt: mock.createdAt,
                questionCounts: {
                    english: fullMock.subjects.english.length,
                    physics: fullMock.subjects.physics.length,
                    chemistry: fullMock.subjects.chemistry.length,
                    maths: fullMock.subjects.maths.length,
                    biology: fullMock.subjects.biology.length
                }
            };
        }));

        res.json({ mocks: mocksWithCounts });
    } catch (error) {
        console.error('Get mocks error:', error);
        res.status(500).json({ error: 'Failed to fetch mock exams' });
    }
});

// Get Mock Exam Details
app.get('/api/admin/mocks/:id', authenticateAdmin, async (req, res) => {
    try {
        const mock = await MockExam.findOne({ 
            _id: req.params.id,
            adminId: req.admin._id 
        });

        if (!mock) {
            return res.status(404).json({ error: 'Mock exam not found' });
        }

        res.json({ mock });
    } catch (error) {
        console.error('Get mock error:', error);
        res.status(500).json({ error: 'Failed to fetch mock exam' });
    }
});

// Update Mock Exam
app.put('/api/admin/mocks/:id', authenticateAdmin, async (req, res) => {
    try {
        const { name, duration } = req.body;

        const mock = await MockExam.findOneAndUpdate(
            { _id: req.params.id, adminId: req.admin._id },
            { name, duration: parseInt(duration) },
            { new: true }
        );

        if (!mock) {
            return res.status(404).json({ error: 'Mock exam not found' });
        }

        res.json({ success: true, mock });
    } catch (error) {
        console.error('Update mock error:', error);
        res.status(500).json({ error: 'Failed to update mock exam' });
    }
});

// Delete Mock Exam
app.delete('/api/admin/mocks/:id', authenticateAdmin, async (req, res) => {
    try {
        const mock = await MockExam.findOneAndDelete({ 
            _id: req.params.id,
            adminId: req.admin._id 
        });

        if (!mock) {
            return res.status(404).json({ error: 'Mock exam not found' });
        }

        // Delete all related results
        await MockResult.deleteMany({ mockId: req.params.id });

        res.json({ success: true });
    } catch (error) {
        console.error('Delete mock error:', error);
        res.status(500).json({ error: 'Failed to delete mock exam' });
    }
});

// Upload Image Helper Function
async function uploadImageToCloudinary(imageData) {
    try {
        const result = await cloudinary.uploader.upload(imageData, {
            folder: 'smart-steps-mocks',
            resource_type: 'auto'
        });
        return {
            url: result.secure_url,
            publicId: result.public_id
        };
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
}

// Add Question to Mock Exam
app.post('/api/admin/mocks/:id/questions', authenticateAdmin, async (req, res) => {
    try {
        const { subject, question, options, correctAnswer, images } = req.body;

        if (!subject || !question || !options || correctAnswer === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const mock = await MockExam.findOne({ 
            _id: req.params.id,
            adminId: req.admin._id 
        });

        if (!mock) {
            return res.status(404).json({ error: 'Mock exam not found' });
        }

        const validSubjects = ['english', 'physics', 'chemistry', 'maths', 'biology'];
        if (!validSubjects.includes(subject)) {
            return res.status(400).json({ error: 'Invalid subject' });
        }

        // Upload images if provided
        let imageUrls = [];
        let imagePublicIds = [];
        
        if (images && images.length > 0) {
            for (const imageData of images) {
                const uploaded = await uploadImageToCloudinary(imageData);
                imageUrls.push(uploaded.url);
                imagePublicIds.push(uploaded.publicId);
            }
        }

        const newQuestion = {
            question,
            options,
            correctAnswer: parseInt(correctAnswer),
            imageUrls,
            imagePublicIds
        };

        mock.subjects[subject].push(newQuestion);
        await mock.save();

        res.json({ 
            success: true, 
            question: newQuestion,
            questionIndex: mock.subjects[subject].length - 1
        });
    } catch (error) {
        console.error('Add question error:', error);
        res.status(500).json({ error: 'Failed to add question' });
    }
});

// Update Question in Mock Exam
app.put('/api/admin/mocks/:id/questions/:subject/:index', authenticateAdmin, async (req, res) => {
    try {
        const { id, subject, index } = req.params;
        const { question, options, correctAnswer, images } = req.body;

        const mock = await MockExam.findOne({ 
            _id: id,
            adminId: req.admin._id 
        });

        if (!mock) {
            return res.status(404).json({ error: 'Mock exam not found' });
        }

        const validSubjects = ['english', 'physics', 'chemistry', 'maths', 'biology'];
        if (!validSubjects.includes(subject)) {
            return res.status(400).json({ error: 'Invalid subject' });
        }

        const questionIndex = parseInt(index);
        if (questionIndex < 0 || questionIndex >= mock.subjects[subject].length) {
            return res.status(404).json({ error: 'Question not found' });
        }

        // Handle image updates
        let imageUrls = mock.subjects[subject][questionIndex].imageUrls || [];
        let imagePublicIds = mock.subjects[subject][questionIndex].imagePublicIds || [];

        if (images && images.length > 0) {
            // Delete old images from Cloudinary
            for (const publicId of imagePublicIds) {
                try {
                    await cloudinary.uploader.destroy(publicId);
                } catch (err) {
                    console.error('Error deleting old image:', err);
                }
            }

            // Upload new images
            imageUrls = [];
            imagePublicIds = [];
            for (const imageData of images) {
                const uploaded = await uploadImageToCloudinary(imageData);
                imageUrls.push(uploaded.url);
                imagePublicIds.push(uploaded.publicId);
            }
        }

        mock.subjects[subject][questionIndex] = {
            question,
            options,
            correctAnswer: parseInt(correctAnswer),
            imageUrls,
            imagePublicIds
        };

        await mock.save();

        res.json({ 
            success: true, 
            question: mock.subjects[subject][questionIndex]
        });
    } catch (error) {
        console.error('Update question error:', error);
        res.status(500).json({ error: 'Failed to update question' });
    }
});

// Delete Question from Mock Exam
app.delete('/api/admin/mocks/:id/questions/:subject/:index', authenticateAdmin, async (req, res) => {
    try {
        const { id, subject, index } = req.params;

        const mock = await MockExam.findOne({ 
            _id: id,
            adminId: req.admin._id 
        });

        if (!mock) {
            return res.status(404).json({ error: 'Mock exam not found' });
        }

        const validSubjects = ['english', 'physics', 'chemistry', 'maths', 'biology'];
        if (!validSubjects.includes(subject)) {
            return res.status(400).json({ error: 'Invalid subject' });
        }

        const questionIndex = parseInt(index);
        if (questionIndex < 0 || questionIndex >= mock.subjects[subject].length) {
            return res.status(404).json({ error: 'Question not found' });
        }

        // Delete images from Cloudinary
        const question = mock.subjects[subject][questionIndex];
        if (question.imagePublicIds && question.imagePublicIds.length > 0) {
            for (const publicId of question.imagePublicIds) {
                try {
                    await cloudinary.uploader.destroy(publicId);
                } catch (err) {
                    console.error('Error deleting image:', err);
                }
            }
        }

        mock.subjects[subject].splice(questionIndex, 1);
        await mock.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Delete question error:', error);
        res.status(500).json({ error: 'Failed to delete question' });
    }
});

// Bulk Update Mock Questions (for setting questions from code)
app.put('/api/admin/mocks/:id/bulk-update', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { subjects } = req.body;

        const mock = await MockExam.findOne({ 
            _id: id,
            adminId: req.admin._id 
        });

        if (!mock) {
            return res.status(404).json({ error: 'Mock exam not found' });
        }

        // Validate subjects structure
        const validSubjects = ['english', 'physics', 'chemistry', 'maths', 'biology'];
        for (const subject of validSubjects) {
            if (subjects[subject]) {
                mock.subjects[subject] = subjects[subject].map(q => ({
                    question: q.question,
                    options: q.options,
                    correctAnswer: parseInt(q.correctAnswer),
                    imageUrls: q.imageUrls || [],
                    imagePublicIds: q.imagePublicIds || []
                }));
            }
        }

        await mock.save();

        res.json({ 
            success: true,
            message: 'Questions updated successfully',
            questionCounts: {
                english: mock.subjects.english.length,
                physics: mock.subjects.physics.length,
                chemistry: mock.subjects.chemistry.length,
                maths: mock.subjects.maths.length,
                biology: mock.subjects.biology.length
            }
        });
    } catch (error) {
        console.error('Bulk update error:', error);
        res.status(500).json({ error: 'Failed to bulk update questions' });
    }
});

// Student Routes

// Check if phone number has already attempted this mock
app.post('/api/mocks/:shareId/check-attempt', async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        const mock = await MockExam.findOne({ shareId: req.params.shareId });
        if (!mock) {
            return res.status(404).json({ error: 'Mock exam not found' });
        }

        const existingAttempt = await MockResult.findOne({
            mockId: mock._id,
            phoneNumber: phoneNumber
        });

        if (existingAttempt) {
            return res.json({
                attempted: true,
                attemptDate: existingAttempt.submittedAt,
                studentName: existingAttempt.studentName
            });
        }

        res.json({ attempted: false });
    } catch (error) {
        console.error('Check attempt error:', error);
        res.status(500).json({ error: 'Failed to check attempt status' });
    }
});

// Get Mock Exam for Student (Public)
app.get('/api/mocks/:shareId', async (req, res) => {
    try {
        const mock = await MockExam.findOne({ shareId: req.params.shareId })
            .select('name duration subjects');

        if (!mock) {
            return res.status(404).json({ error: 'Mock exam not found' });
        }

        // Remove correct answers from questions
        const sanitizedSubjects = {};
        for (const subject in mock.subjects) {
            // Ensure the subject has questions (is an array)
            if (Array.isArray(mock.subjects[subject])) {
                sanitizedSubjects[subject] = mock.subjects[subject].map(q => ({
                    question: q.question,
                    options: q.options,
                    imageUrls: q.imageUrls || []
                }));
            } else {
                // If not an array, initialize as empty array
                sanitizedSubjects[subject] = [];
            }
        }

        res.json({
            id: mock._id,
            name: mock.name,
            duration: mock.duration,
            subjects: sanitizedSubjects
        });
    } catch (error) {
        console.error('Get mock error:', error);
        res.status(500).json({ error: 'Failed to fetch mock exam' });
    }
});

// Submit Mock Exam Result
app.post('/api/mocks/:shareId/submit', async (req, res) => {
    try {
        const { studentName, phoneNumber, selectedSubject, answers, timeSpent, chancesUsed } = req.body;

        if (!studentName || !phoneNumber || !selectedSubject || !answers) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!['maths', 'biology'].includes(selectedSubject)) {
            return res.status(400).json({ error: 'Invalid subject selection' });
        }

        const mock = await MockExam.findOne({ shareId: req.params.shareId });
        if (!mock) {
            return res.status(404).json({ error: 'Mock exam not found' });
        }

        // Check if this phone number has already attempted this mock
        const existingAttempt = await MockResult.findOne({
            mockId: mock._id,
            phoneNumber: phoneNumber
        });

        if (existingAttempt) {
            return res.status(400).json({ 
                error: 'You have already attempted this mock exam',
                details: `Previous attempt on ${new Date(existingAttempt.submittedAt).toLocaleString()}`
            });
        }

        // Calculate scores for each subject
        const scores = {};
        let totalScore = 0;
        let totalQuestions = 0;

        // English (60 questions)
        const englishAnswers = answers.filter(a => a.subject === 'english');
        let englishScore = 0;
        englishAnswers.forEach(answer => {
            if (mock.subjects.english[answer.questionIndex] && 
                mock.subjects.english[answer.questionIndex].correctAnswer === answer.selectedAnswer) {
                englishScore++;
            }
        });
        scores.english = { score: englishScore, total: mock.subjects.english.length };
        totalScore += englishScore;
        totalQuestions += mock.subjects.english.length;

        // Physics (40 questions)
        const physicsAnswers = answers.filter(a => a.subject === 'physics');
        let physicsScore = 0;
        physicsAnswers.forEach(answer => {
            if (mock.subjects.physics[answer.questionIndex] && 
                mock.subjects.physics[answer.questionIndex].correctAnswer === answer.selectedAnswer) {
                physicsScore++;
            }
        });
        scores.physics = { score: physicsScore, total: mock.subjects.physics.length };
        totalScore += physicsScore;
        totalQuestions += mock.subjects.physics.length;

        // Chemistry (40 questions)
        const chemistryAnswers = answers.filter(a => a.subject === 'chemistry');
        let chemistryScore = 0;
        chemistryAnswers.forEach(answer => {
            if (mock.subjects.chemistry[answer.questionIndex] && 
                mock.subjects.chemistry[answer.questionIndex].correctAnswer === answer.selectedAnswer) {
                chemistryScore++;
            }
        });
        scores.chemistry = { score: chemistryScore, total: mock.subjects.chemistry.length };
        totalScore += chemistryScore;
        totalQuestions += mock.subjects.chemistry.length;

        // Fourth subject (Maths or Biology - 40 questions)
        const fourthAnswers = answers.filter(a => a.subject === selectedSubject);
        let fourthScore = 0;
        fourthAnswers.forEach(answer => {
            if (mock.subjects[selectedSubject][answer.questionIndex] && 
                mock.subjects[selectedSubject][answer.questionIndex].correctAnswer === answer.selectedAnswer) {
                fourthScore++;
            }
        });
        scores.fourth = { 
            score: fourthScore, 
            total: mock.subjects[selectedSubject].length,
            subject: selectedSubject
        };
        totalScore += fourthScore;
        totalQuestions += mock.subjects[selectedSubject].length;

        const percentage = (totalScore / totalQuestions) * 100;

        // Create a snapshot of the mock questions for correction
        const mockSnapshot = {
            name: mock.name,
            subjects: {
                english: mock.subjects.english.map(q => ({
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    imageUrls: q.imageUrls || []
                })),
                physics: mock.subjects.physics.map(q => ({
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    imageUrls: q.imageUrls || []
                })),
                chemistry: mock.subjects.chemistry.map(q => ({
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    imageUrls: q.imageUrls || []
                })),
                maths: mock.subjects.maths.map(q => ({
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    imageUrls: q.imageUrls || []
                })),
                biology: mock.subjects.biology.map(q => ({
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    imageUrls: q.imageUrls || []
                }))
            }
        };

        const result = new MockResult({
            mockId: mock._id,
            studentName,
            phoneNumber,
            selectedSubject,
            answers,
            scores,
            totalScore,
            totalQuestions,
            percentage: parseFloat(percentage.toFixed(2)),
            timeSpent: timeSpent || 0,
            chancesUsed: chancesUsed || 0,
            correctionId: uuidv4(),
            mockSnapshot
        });

        console.log('Creating result with correctionId:', result.correctionId);
        await result.save();
        console.log('Result saved successfully with correctionId:', result.correctionId);

        res.json({
            success: true,
            result: {
                id: result._id,
                studentName: result.studentName,
                scores: result.scores,
                totalScore: result.totalScore,
                totalQuestions: result.totalQuestions,
                percentage: result.percentage,
                correctionId: result.correctionId
            }
        });
    } catch (error) {
        console.error('Submit mock error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to submit mock exam', details: error.message });
    }
});

// Get Results for a Mock (Admin)
app.get('/api/admin/mocks/:id/results', authenticateAdmin, async (req, res) => {
    try {
        const results = await MockResult.find({ mockId: req.params.id })
            .sort({ submittedAt: -1 });

        res.json({ results });
    } catch (error) {
        console.error('Get results error:', error);
        res.status(500).json({ error: 'Failed to fetch results' });
    }
});

// Delete Result (Admin)
app.delete('/api/admin/results/:id', authenticateAdmin, async (req, res) => {
    try {
        const result = await MockResult.findByIdAndDelete(req.params.id);

        if (!result) {
            return res.status(404).json({ error: 'Result not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Delete result error:', error);
        res.status(500).json({ error: 'Failed to delete result' });
    }
});

// Get Correction Data (Public - Student)
app.get('/api/correction/:correctionId', async (req, res) => {
    try {
        const result = await MockResult.findOne({ correctionId: req.params.correctionId });

        if (!result) {
            return res.status(404).json({ error: 'Correction not found' });
        }

        res.json({
            studentName: result.studentName,
            mockName: result.mockSnapshot.name,
            scores: result.scores,
            totalScore: result.totalScore,
            totalQuestions: result.totalQuestions,
            percentage: result.percentage,
            timeSpent: result.timeSpent,
            selectedSubject: result.selectedSubject,
            answers: result.answers,
            questions: result.mockSnapshot.subjects,
            submittedAt: result.submittedAt
        });
    } catch (error) {
        console.error('Get correction error:', error);
        res.status(500).json({ error: 'Failed to fetch correction data' });
    }
});

// Routes for serving HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

app.get('/admin/create-mock', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-create-mock.html'));
});

app.get('/admin/edit-mock/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-edit-mock.html'));
});

app.get('/admin/mock-results/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-mock-results.html'));
});

app.get('/mock/:shareId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'student-mock.html'));
});

app.get('/correction/:correctionId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'student-correction.html'));
});

app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test.html'));
});

// Create default admin account
async function createDefaultAdmin() {
    try {
        const existingAdmin = await Admin.findOne({ email: 'admin@smartsteps.com' });
        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const admin = new Admin({
                name: 'Smart Steps Admin',
                email: 'admin@smartsteps.com',
                password: hashedPassword
            });
            await admin.save();
            console.log('Default admin account created: admin@smartsteps.com / admin123');
        }
    } catch (error) {
        console.error('Error creating default admin:', error);
    }
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Smart Steps Mock Server running on port ${PORT}`);
    console.log(`Connected to MongoDB Atlas database: smartsteps`);
    createDefaultAdmin();
});
