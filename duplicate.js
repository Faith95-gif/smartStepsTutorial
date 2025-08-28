import express from 'express';
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
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://faithabayomi18:f1vouroluw11972@dominionspecialist.cdp3oi9.mongodb.net/videocall?retryWrites=true&w=majority&appName=dominionspecialist';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dbqcl3gyu',
    api_key: process.env.CLOUDINARY_API_KEY || '125497217998532',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'w5UR9A2UgzujVlcuzmnOFRr56Bg'
});

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
const teacherSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    subject: { type: String, required: true, enum: ['Biology', 'Mathematics', 'English', 'Physics', 'Chemistry'] },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const hostSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'host' },
    createdAt: { type: Date, default: Date.now }
});

const quizSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subject: { type: String, required: true },
    questions: [{
        question: String,
        options: [String],
        correctAnswer: Number,
        passageId: String,
        imageUrls: [String],
        imagePublicIds: [String]
    }],
    passages: [{
        id: String,
        text: String,
        questionCount: Number
    }],
    timeLimit: { type: Number, default: 0 },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    shareId: { type: String, unique: true, required: true },
    createdAt: { type: Date, default: Date.now }
});

const responseSchema = new mongoose.Schema({
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    studentName: { type: String, required: true },
    answers: [Number],
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    timeSpent: { type: Number, default: 0 },
    correctionId: { type: String, unique: true, default: uuidv4 },
    submittedAt: { type: Date, default: Date.now }
});

const correctionSchema = new mongoose.Schema({
    responseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Response', required: true },
    studentName: { type: String, required: true },
    quiz: {
        title: String,
        subject: String,
        questions: [{
            question: String,
            options: [String],
            correctAnswer: Number,
            imageUrl: String
        }]
    },
    studentAnswers: [Number],
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    percentage: { type: Number, required: true },
    submittedAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
});

// JAMB Mock Event Schema
const jambEventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    timeLimit: { type: Number, required: true },
    questionsPerSubject: { type: Number, required: true, default: 10 },
    deadline: { type: Date, required: true },
    status: { 
        type: String, 
        enum: ['active', 'completed', 'published'], 
        default: 'active' 
    },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'Host', required: true },
    shareId: { type: String, unique: true, required: true },
    subjects: [{
        subject: { type: String, required: true, enum: ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology'] },
        questions: [{
            question: String,
            options: [String],
            correctAnswer: Number,
            imageUrls: [String],
            imagePublicIds: [String],
            teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
            teacherName: String
        }],
        questionCount: { type: Number, default: 0 },
        teacherContributions: [{
            teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
            teacherName: String,
            questionCount: Number
        }]
    }],
    totalQuestions: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

// JAMB Mock Response Schema
const jambResponseSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'JambEvent', required: true },
    studentName: { type: String, required: true },
    studentEmail: { type: String, required: true },
    answers: [{
        subject: String,
        questionIndex: Number,
        selectedAnswer: Number
    }],
    scores: [{
        subject: String,
        score: Number,
        totalQuestions: Number
    }],
    totalScore: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    percentage: { type: Number, required: true },
    timeSpent: { type: Number, default: 0 },
    correctionId: { type: String, unique: true, default: uuidv4 },
    submittedAt: { type: Date, default: Date.now }
});

// Models
const Teacher = mongoose.model('Teacher', teacherSchema);
const Host = mongoose.model('Host', hostSchema);
const Quiz = mongoose.model('Quiz', quizSchema);
const Response = mongoose.model('Response', responseSchema);
const Correction = mongoose.model('Correction', correctionSchema);
const JambEvent = mongoose.model('JambEvent', jambEventSchema);
const JambResponse = mongoose.model('JambResponse', jambResponseSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'smart-steps-secret-key';

// Authentication middleware
const authenticateTeacher = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const teacher = await Teacher.findById(decoded.id || decoded.teacherId);
        
        if (!teacher) {
            return res.status(401).json({ error: 'Teacher not found' });
        }

        req.teacher = {
            id: teacher._id,
            name: teacher.name,
            email: teacher.email,
            subject: teacher.subject
        };
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

const authenticateHost = async (req, res, next) => {
    try {
        const token = req.cookies.hostToken || req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No host token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (decoded.role !== 'host') {
            return res.status(403).json({ error: 'Access denied. Host privileges required.' });
        }

        const host = await Host.findById(decoded.id || decoded.hostId);
        
        if (!host) {
            return res.status(401).json({ error: 'Host not found' });
        }

        req.host = host;
        req.hostData = {
            id: host._id,
            name: host.name,
            email: host.email
        };
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid host token' });
    }
};

// Routes

// Teacher Registration
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, subject, password } = req.body;

        const existingTeacher = await Teacher.findOne({ email });
        if (existingTeacher) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const teacher = new Teacher({
            name,
            email,
            subject,
            password: hashedPassword
        });

        await teacher.save();

        const token = jwt.sign(
            { id: teacher._id, email: teacher.email, name: teacher.name, subject: teacher.subject }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );
        res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });

        res.json({ message: 'Registration successful', teacher: { name: teacher.name, subject: teacher.subject } });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Teacher Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const teacher = await Teacher.findOne({ email });
        if (!teacher) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, teacher.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: teacher._id, email: teacher.email, name: teacher.name, subject: teacher.subject }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );
        res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });

        res.json({ message: 'Login successful', teacher: { id: teacher._id, name: teacher.name, email: teacher.email, subject: teacher.subject } });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Host Login
app.post('/api/host/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Create default host if it doesn't exist
        let host = await Host.findOne({ email });
        if (!host && email === 'host@smartsteps.com') {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            host = new Host({
                name: 'Smart Steps Host',
                email: 'host@smartsteps.com',
                password: hashedPassword,
                role: 'host'
            });
            await host.save();
        }

        if (!host) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = email === 'host@smartsteps.com' ? true : await bcrypt.compare(password, host.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: host._id, email: host.email, name: host.name, role: 'host' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.cookie('hostToken', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });

        res.json({ message: 'Login successful', host: { name: host.name, email: host.email } });
    } catch (error) {
        console.error('Host login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Verify teacher authentication
app.get('/api/verify', authenticateTeacher, (req, res) => {
    res.json({ 
        authenticated: true, 
        teacher: { 
            name: req.teacher.name, 
            subject: req.teacher.subject,
            email: req.teacher.email,
            id: req.teacher.id
        } 
    });
});

// Verify host authentication
app.get('/api/host/verify', authenticateHost, (req, res) => {
    res.json({ 
        authenticated: true, 
        host: { 
            name: req.host.name, 
            email: req.host.email,
            id: req.host._id
        } 
    });
});

// Teacher logout
app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

// Host logout
app.post('/api/host/logout', (req, res) => {
    res.clearCookie('hostToken');
    res.json({ message: 'Logged out successfully' });
});

// Image upload
app.post('/api/upload-image', authenticateTeacher, upload.array('images', 3), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No images uploaded' });
        }

        const uploadPromises = req.files.map(file => {
            return new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'image',
                        folder: 'smart_steps_quiz',
                        transformation: [
                            { width: 800, height: 600, crop: 'limit' },
                            { quality: 'auto' }
                        ]
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve({
                            imageUrl: result.secure_url,
                            publicId: result.public_id
                        });
                    }
                ).end(file.buffer);
            });
        });

        const results = await Promise.all(uploadPromises);
        res.json(results);
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ error: 'Failed to upload images' });
    }
});

// Delete image
app.delete('/api/delete-image/:publicId', authenticateTeacher, async (req, res) => {
    try {
        const { publicId } = req.params;
        await cloudinary.uploader.destroy(publicId);
        res.json({ message: 'Image deleted successfully' });
    } catch (error) {
        console.error('Image deletion error:', error);
        res.status(500).json({ error: 'Failed to delete image' });
    }
});

// Create quiz
app.post('/api/quiz', authenticateTeacher, async (req, res) => {
    try {
        const { title, questions, passages, timeLimit } = req.body;

        const shareId = uuidv4();
        const quiz = new Quiz({
            title,
            subject: req.teacher.subject,
            questions,
            passages: passages || [],
            timeLimit: timeLimit || 0,
            teacherId: req.teacher.id,
            shareId
        });

        await quiz.save();
        res.json({ message: 'Quiz created successfully', shareId });
    } catch (error) {
        console.error('Quiz creation error:', error);
        res.status(500).json({ error: 'Failed to create quiz' });
    }
});

// Get teacher's quizzes
app.get('/api/quizzes', authenticateTeacher, async (req, res) => {
    try {
        const quizzes = await Quiz.find({ teacherId: req.teacher.id }).sort({ createdAt: -1 });
        res.json(quizzes);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch quizzes' });
    }
});

// Get quiz by share ID
app.get('/api/quiz/:shareId', async (req, res) => {
    try {
        const quiz = await Quiz.findOne({ shareId: req.params.shareId });
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }
        
        const studentQuiz = {
            ...quiz.toObject(),
            questions: quiz.questions.map(q => ({
                question: q.question,
                options: q.options,
                passageId: q.passageId,
                imageUrls: q.imageUrls
            }))
        };
        
        res.json(studentQuiz);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch quiz' });
    }
});

// Submit quiz response
app.post('/api/submit/:shareId', async (req, res) => {
    try {
        const { studentName, answers, timeSpent } = req.body;
        const quiz = await Quiz.findOne({ shareId: req.params.shareId });

        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        let score = 0;
        answers.forEach((answer, index) => {
            if (answer !== -1 && answer === quiz.questions[index].correctAnswer) {
                score++;
            }
        });

        const response = new Response({
            quizId: quiz._id,
            studentName,
            answers,
            score,
            totalQuestions: quiz.questions.length,
            timeSpent: timeSpent || 0
        });

        await response.save();

        const correction = new Correction({
            responseId: response._id,
            studentName,
            quiz: {
                title: quiz.title,
                subject: quiz.subject,
                questions: quiz.questions.map(q => ({
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    imageUrl: q.imageUrls?.[0] || null
                }))
            },
            studentAnswers: answers,
            score,
            totalQuestions: quiz.questions.length,
            percentage: Math.round((score / quiz.questions.length) * 100),
            submittedAt: response.submittedAt
        });

        await correction.save();

        res.json({
            score,
            totalQuestions: quiz.questions.length,
            percentage: Math.round((score / quiz.questions.length) * 100),
            correctionId: response.correctionId
        });
    } catch (error) {
        console.error('Submit error:', error);
        res.status(500).json({ error: 'Failed to submit quiz' });
    }
});

// Get quiz responses
app.get('/api/responses/:quizId', authenticateTeacher, async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.quizId);
        if (!quiz || quiz.teacherId.toString() !== req.teacher.id.toString()) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        const responses = await Response.find({ quizId: req.params.quizId }).sort({ submittedAt: -1 });
        res.json({ quiz, responses });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch responses' });
    }
});

// Get all responses grouped by quiz
app.get('/api/all-responses', authenticateTeacher, async (req, res) => {
    try {
        const quizzes = await Quiz.find({ teacherId: req.teacher.id });
        const groupedResponses = {};

        for (const quiz of quizzes) {
            const responses = await Response.find({ quizId: quiz._id }).sort({ submittedAt: -1 });
            groupedResponses[quiz._id] = {
                quiz: {
                    _id: quiz._id,
                    title: quiz.title,
                    subject: quiz.subject,
                    totalQuestions: quiz.questions.length,
                    timeLimit: quiz.timeLimit
                },
                responses
            };
        }

        res.json(groupedResponses);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch responses' });
    }
});

// Delete quiz
app.delete('/api/quiz/:quizId', authenticateTeacher, async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.quizId);
        if (!quiz || quiz.teacherId.toString() !== req.teacher.id.toString()) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        // Delete associated responses and corrections
        await Response.deleteMany({ quizId: req.params.quizId });
        await Correction.deleteMany({ 'quiz._id': req.params.quizId });

        // Delete images from Cloudinary
        for (const question of quiz.questions) {
            if (question.imagePublicIds && question.imagePublicIds.length > 0) {
                for (const publicId of question.imagePublicIds) {
                    try {
                        await cloudinary.uploader.destroy(publicId);
                    } catch (error) {
                        console.error('Error deleting image:', error);
                    }
                }
            }
        }

        await Quiz.findByIdAndDelete(req.params.quizId);
        res.json({ message: 'Quiz deleted successfully' });
    } catch (error) {
        console.error('Delete quiz error:', error);
        res.status(500).json({ error: 'Failed to delete quiz' });
    }
});

// Get quiz statistics
app.get('/api/quiz-stats/:quizId', authenticateTeacher, async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.quizId);
        if (!quiz || quiz.teacherId.toString() !== req.teacher.id.toString()) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        const responses = await Response.find({ quizId: req.params.quizId });
        
        const totalAttempts = responses.length;
        const averageScore = totalAttempts > 0 ? 
            Math.round(responses.reduce((sum, r) => sum + (r.score / r.totalQuestions * 100), 0) / totalAttempts) : 0;
        const highestScore = totalAttempts > 0 ? 
            Math.max(...responses.map(r => Math.round(r.score / r.totalQuestions * 100))) : 0;
        const averageTime = totalAttempts > 0 ? 
            Math.round(responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0) / totalAttempts) : 0;

        res.json({
            totalAttempts,
            averageScore,
            highestScore,
            averageTime
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch quiz statistics' });
    }
});

// Get student details
app.get('/api/student-details/:responseId', authenticateTeacher, async (req, res) => {
    try {
        const response = await Response.findById(req.params.responseId).populate('quizId');
        if (!response) {
            return res.status(404).json({ error: 'Response not found' });
        }

        const quiz = response.quizId;
        if (quiz.teacherId.toString() !== req.teacher.id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const questionAnalysis = quiz.questions.map((question, index) => ({
            question: question.question,
            options: question.options,
            correctAnswer: question.correctAnswer,
            studentAnswer: response.answers[index],
            isCorrect: response.answers[index] === question.correctAnswer,
            imageUrl: question.imageUrls?.[0] || null
        }));

        res.json({
            studentName: response.studentName,
            quiz: {
                title: quiz.title,
                subject: quiz.subject
            },
            score: response.score,
            totalQuestions: response.totalQuestions,
            percentage: Math.round((response.score / response.totalQuestions) * 100),
            timeSpent: response.timeSpent,
            submittedAt: response.submittedAt,
            questionAnalysis
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch student details' });
    }
});

// Get correction
app.get('/api/correction/:correctionId', async (req, res) => {
    try {
        const response = await Response.findOne({ correctionId: req.params.correctionId })
            .populate('quizId');
        
        if (!response) {
            return res.status(404).json({ error: 'Correction not found' });
        }

        const correctionData = {
            studentName: response.studentName,
            quiz: response.quizId,
            studentAnswers: response.answers,
            score: response.score,
            totalQuestions: response.totalQuestions,
            percentage: Math.round((response.score / response.totalQuestions) * 100),
            timeSpent: response.timeSpent,
            submittedAt: response.submittedAt
        };

        res.json(correctionData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch correction' });
    }
});

// HOST ROUTES

// Create JAMB Mock Event
app.post('/api/host/events', authenticateHost, async (req, res) => {
    try {
        const { title, description, timeLimit, questionsPerSubject = 10, deadline } = req.body;

        const shareId = uuidv4();
        const subjects = ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology'];
        
        const event = new JambEvent({
            title,
            description,
            timeLimit,
            questionsPerSubject,
            deadline: new Date(deadline),
            hostId: req.host._id,
            shareId,
            subjects: subjects.map(subject => ({
                subject,
                questions: [],
                questionCount: 0,
                teacherContributions: []
            }))
        });

        await event.save();
        res.json({ message: 'JAMB Mock event created successfully', eventId: event._id });
    } catch (error) {
        console.error('Event creation error:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

// Get host events
app.get('/api/host/events', authenticateHost, async (req, res) => {
    try {
        const events = await JambEvent.find({ hostId: req.host._id }).sort({ createdAt: -1 });
        res.json(events);
    } catch (error) {
        console.error('Error fetching host events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// Get teachers
app.get('/api/host/teachers', authenticateHost, async (req, res) => {
    try {
        const teachers = await Teacher.find({}, { password: 0 }).sort({ createdAt: -1 });
        
        // Add statistics for each teacher
        const teachersWithStats = await Promise.all(teachers.map(async (teacher) => {
            const quizCount = await Quiz.countDocuments({ teacherId: teacher._id });
            const eventParticipation = await JambEvent.countDocuments({
                'subjects.teacherContributions.teacherId': teacher._id
            });
            
            return {
                ...teacher.toObject(),
                quizCount,
                eventParticipation
            };
        }));
        
        res.json(teachersWithStats);
    } catch (error) {
        console.error('Error fetching teachers:', error);
        res.status(500).json({ error: 'Failed to fetch teachers' });
    }
});

// Get event details
app.get('/api/host/events/:eventId/details', authenticateHost, async (req, res) => {
    try {
        const event = await JambEvent.findOne({ 
            _id: req.params.eventId, 
            hostId: req.host._id 
        }).populate('subjects.questions.teacherId', 'name');

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Get response count for this event
        const responseCount = await JambResponse.countDocuments({ eventId: event._id });

        // Add additional statistics
        const eventDetails = {
            ...event.toObject(),
            responseCount,
            isExpired: new Date() > new Date(event.deadline),
            daysLeft: Math.ceil((new Date(event.deadline) - new Date()) / (1000 * 60 * 60 * 24))
        };

        res.json(eventDetails);
    } catch (error) {
        console.error('Error fetching event details:', error);
        res.status(500).json({ error: 'Failed to fetch event details' });
    }
});

// Publish event
app.post('/api/host/events/:eventId/publish', authenticateHost, async (req, res) => {
    try {
        const event = await JambEvent.findOne({ 
            _id: req.params.eventId, 
            hostId: req.host._id 
        });

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Check if all subjects have required questions
        const incompleteSubjects = event.subjects.filter(subject => 
            subject.questionCount < event.questionsPerSubject
        );

        if (incompleteSubjects.length > 0) {
            return res.status(400).json({ 
                error: `Cannot publish event. Need at least ${event.questionsPerSubject} questions in: ${incompleteSubjects.map(s => s.subject).join(', ')}` 
            });
        }

        event.status = 'published';
        await event.save();

        res.json({ message: 'Event published successfully', shareId: event.shareId });
    } catch (error) {
        console.error('Error publishing event:', error);
        res.status(500).json({ error: 'Failed to publish event' });
    }
});

// Delete event
app.delete('/api/host/events/:eventId', authenticateHost, async (req, res) => {
    try {
        const event = await JambEvent.findOne({ 
            _id: req.params.eventId, 
            hostId: req.host._id 
        });

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Delete associated responses
        await JambResponse.deleteMany({ eventId: req.params.eventId });

        // Delete images from Cloudinary
        for (const subject of event.subjects) {
            for (const question of subject.questions) {
                if (question.imagePublicIds && question.imagePublicIds.length > 0) {
                    for (const publicId of question.imagePublicIds) {
                        try {
                            await cloudinary.uploader.destroy(publicId);
                        } catch (error) {
                            console.error('Error deleting image:', error);
                        }
                    }
                }
            }
        }

        await JambEvent.findByIdAndDelete(req.params.eventId);
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

// Get event responses
app.get('/api/host/events/:eventId/responses', authenticateHost, async (req, res) => {
    try {
        const event = await JambEvent.findOne({ 
            _id: req.params.eventId, 
            hostId: req.host._id 
        });

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const responses = await JambResponse.find({ eventId: req.params.eventId }).sort({ submittedAt: -1 });

        // Prepare event data for response
        const eventData = {
            title: event.title,
            description: event.description,
            totalQuestions: event.totalQuestions,
            timeLimit: event.timeLimit,
            deadline: event.deadline,
            status: event.status,
            subjects: event.subjects.map(subject => ({
                subject: subject.subject,
                questionCount: subject.questionCount
            }))
        };

        res.json({ event: eventData, responses });
    } catch (error) {
        console.error('Error fetching event responses:', error);
        res.status(500).json({ error: 'Failed to fetch event responses' });
    }
});

// Get all quizzes for host dashboard
app.get('/api/host/quizzes', authenticateHost, async (req, res) => {
    try {
        const quizzes = await Quiz.find({})
            .populate('teacherId', 'name email subject')
            .sort({ createdAt: -1 });
        
        // Add response count for each quiz
        const quizzesWithStats = await Promise.all(quizzes.map(async (quiz) => {
            const responseCount = await Response.countDocuments({ quizId: quiz._id });
            const responses = await Response.find({ quizId: quiz._id });
            const averageScore = responseCount > 0 ? 
                Math.round(responses.reduce((sum, r) => sum + (r.score / r.totalQuestions * 100), 0) / responseCount) : 0;
            
            return {
                ...quiz.toObject(),
                responseCount,
                averageScore
            };
        }));
        
        res.json(quizzesWithStats);
    } catch (error) {
        console.error('Error fetching host quizzes:', error);
        res.status(500).json({ error: 'Failed to fetch teacher quizzes' });
    }
});

// Get responses for a specific quiz (host view)
app.get('/api/host/quiz/:quizId/responses', authenticateHost, async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.quizId)
            .populate('teacherId', 'name email subject');
        
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        const responses = await Response.find({ quizId: req.params.quizId })
            .sort({ submittedAt: -1 });
        
        res.json({
            quiz: {
                title: quiz.title,
                subject: quiz.subject,
                teacher: quiz.teacherId,
                totalQuestions: quiz.questions.length,
                timeLimit: quiz.timeLimit,
                shareId: quiz.shareId,
                createdAt: quiz.createdAt
            },
            responses
        });
    } catch (error) {
        console.error('Error fetching quiz responses:', error);
        res.status(500).json({ error: 'Error fetching quiz responses' });
    }
});

// Get quiz responses summary for host
app.get('/api/host/quiz-responses-summary', authenticateHost, async (req, res) => {
    try {
        const totalResponses = await Response.countDocuments();
        res.json({ totalResponses });
    } catch (error) {
        console.error('Error fetching quiz responses summary:', error);
        res.status(500).json({ error: 'Failed to fetch responses summary' });
    }
});

// Get detailed response breakdown
app.get('/api/host/response/:responseId/breakdown', authenticateHost, async (req, res) => {
    try {
        const responseId = req.params.responseId;
        
        const response = await JambResponse.findById(responseId)
            .populate('eventId');
        
        if (!response) {
            return res.status(404).json({ error: 'Response not found' });
        }

        // Check if the host owns the event this response belongs to
        if (response.eventId.hostId.toString() !== req.host._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get detailed breakdown by subject
        const subjectBreakdown = response.scores.map(score => {
            const subjectAnswers = response.answers.filter(answer => answer.subject === score.subject);
            const correctAnswers = subjectAnswers.length > 0 ? score.score : 0;
            
            return {
                subject: score.subject,
                score: score.score,
                totalQuestions: score.totalQuestions,
                percentage: Math.round((score.score / score.totalQuestions) * 100),
                correctAnswers,
                wrongAnswers: score.totalQuestions - score.score,
                unanswered: score.totalQuestions - subjectAnswers.length
            };
        });

        res.json({
            studentName: response.studentName,
            studentEmail: response.studentEmail,
            totalScore: response.totalScore,
            totalQuestions: response.totalQuestions,
            timeSpent: response.timeSpent,
            submittedAt: response.submittedAt,
            subjectBreakdown
        });
    } catch (error) {
        console.error('Error fetching response breakdown:', error);
        res.status(500).json({ error: 'Error fetching response breakdown' });
    }
});

// TEACHER EVENT ROUTES

// Get teacher events
app.get('/api/teacher/events', authenticateTeacher, async (req, res) => {
    try {
        const events = await JambEvent.find({}).sort({ createdAt: -1 });
        
        let myContributions = 0;
        let pendingEvents = 0;

        events.forEach(event => {
            const mySubject = event.subjects.find(s => s.subject === req.teacher.subject);
            const myContribution = mySubject ? mySubject.teacherContributions.find(c => 
                c.teacherId.toString() === req.teacher.id.toString()
            ) : null;
            
            if (myContribution && myContribution.questionCount > 0) {
                myContributions++;
            }
            if (event.status === 'active' && (!myContribution || myContribution.questionCount === 0)) {
                pendingEvents++;
            }
        });

        res.json({
            events,
            teacherSubject: req.teacher.subject,
            myContributions,
            pendingEvents
        });
    } catch (error) {
        console.error('Error fetching teacher events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// Get specific event for teacher contribution
app.get('/api/teacher/events/:eventId', authenticateTeacher, async (req, res) => {
    try {
        const event = await JambEvent.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const mySubject = event.subjects.find(s => s.subject === req.teacher.subject);
        const existingQuestions = mySubject ? mySubject.questions.filter(q => 
            q.teacherId && q.teacherId.toString() === req.teacher.id.toString()
        ) : [];

        res.json({ event, existingQuestions });
    } catch (error) {
        console.error('Error fetching event for teacher:', error);
        res.status(500).json({ error: 'Failed to fetch event' });
    }
});

// Teacher contribute questions to event
app.post('/api/teacher/events/:eventId/contribute', authenticateTeacher, async (req, res) => {
    try {
        const { questions } = req.body;

        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ error: 'No questions provided' });
        }

        const event = await JambEvent.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        if (event.status !== 'active') {
            return res.status(400).json({ error: 'Event is not active for contributions' });
        }

        if (new Date() > event.deadline) {
            return res.status(400).json({ error: 'Event deadline has passed' });
        }

        // Find the subject for this teacher
        const subjectIndex = event.subjects.findIndex(s => s.subject === req.teacher.subject);
        if (subjectIndex === -1) {
            return res.status(400).json({ error: 'Subject not found in event' });
        }

        // Remove existing questions from this teacher
        event.subjects[subjectIndex].questions = event.subjects[subjectIndex].questions.filter(q => 
            !q.teacherId || q.teacherId.toString() !== req.teacher.id.toString()
        );

        // Add new questions
        const newQuestions = questions.map(q => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            imageUrls: q.imageUrls || [],
            imagePublicIds: q.imagePublicIds || [],
            teacherId: req.teacher.id,
            teacherName: req.teacher.name
        }));

        event.subjects[subjectIndex].questions.push(...newQuestions);
        event.subjects[subjectIndex].questionCount = event.subjects[subjectIndex].questions.length;

        // Update teacher contributions
        const existingContribution = event.subjects[subjectIndex].teacherContributions.find(tc => 
            tc.teacherId.toString() === req.teacher.id.toString()
        );

        if (existingContribution) {
            existingContribution.questionCount = questions.length;
        } else {
            event.subjects[subjectIndex].teacherContributions.push({
                teacherId: req.teacher.id,
                teacherName: req.teacher.name,
                questionCount: questions.length
            });
        }

        // Update total questions count
        event.totalQuestions = event.subjects.reduce((total, subject) => total + subject.questionCount, 0);

        // Check if event is completed (all subjects have required questions)
        const allSubjectsComplete = event.subjects.every(subject => 
            subject.questionCount >= event.questionsPerSubject
        );

        if (allSubjectsComplete && event.status === 'active') {
            event.status = 'completed';
        }

        await event.save();

        res.json({ 
            message: 'Questions saved successfully',
            questionCount: questions.length,
            totalSubjectQuestions: event.subjects[subjectIndex].questionCount,
            eventStatus: event.status
        });
    } catch (error) {
        console.error('Error saving teacher questions:', error);
        res.status(500).json({ 
            error: 'Failed to save questions',
            details: error.message
        });
    }
});

// JAMB MOCK PUBLIC ROUTES

// Get all available JAMB mock quizzes (published events)
app.get('/api/jamb-mock/available', async (req, res) => {
    try {
        // Find all published JAMB events that haven't passed their deadline
        const availableEvents = await JambEvent.find({
            status: 'published',
            deadline: { $gt: new Date() } // Only events that haven't expired
        })
        .populate('hostId', 'name') // Get host name
        .select('title description shareId deadline timeLimit totalQuestions subjects createdAt')
        .sort({ createdAt: -1 });

        // Format the response with quiz links and details
        const quizLinks = availableEvents.map(event => ({
            id: event._id,
            title: event.title,
            description: event.description,
            hostName: event.hostId?.name || 'Unknown Host',
            shareId: event.shareId,
            quizUrl: `${req.protocol}://${req.get('host')}/jamb-mock/${event.shareId}`,
            deadline: event.deadline,
            timeLimit: event.timeLimit,
            totalQuestions: event.totalQuestions,
            subjects: event.subjects.map(subject => ({
                subject: subject.subject,
                questionCount: subject.questionCount
            })),
            createdAt: event.createdAt,
            daysLeft: Math.ceil((new Date(event.deadline) - new Date()) / (1000 * 60 * 60 * 24))
        }));

        res.json({
            success: true,
            count: quizLinks.length,
            quizzes: quizLinks
        });
    } catch (error) {
        console.error('Error fetching available JAMB mock quizzes:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error fetching available JAMB mock quizzes' 
        });
    }
});

// Get all JAMB mock quizzes (including expired ones) - for admin/host use
app.get('/api/jamb-mock/all', async (req, res) => {
    try {
        const allEvents = await JambEvent.find({ status: 'published' })
            .populate('hostId', 'name')
            .select('title description shareId deadline timeLimit totalQuestions subjects createdAt status')
            .sort({ createdAt: -1 });

        const quizLinks = allEvents.map(event => {
            const isExpired = new Date() > new Date(event.deadline);
            
            return {
                id: event._id,
                title: event.title,
                description: event.description,
                hostName: event.hostId?.name || 'Unknown Host',
                shareId: event.shareId,
                quizUrl: `${req.protocol}://${req.get('host')}/jamb-mock/${event.shareId}`,
                deadline: event.deadline,
                timeLimit: event.timeLimit,
                totalQuestions: event.totalQuestions,
                subjects: event.subjects.map(subject => ({
                    subject: subject.subject,
                    questionCount: subject.questionCount
                })),
                createdAt: event.createdAt,
                status: isExpired ? 'expired' : 'active',
                daysLeft: isExpired ? 0 : Math.ceil((new Date(event.deadline) - new Date()) / (1000 * 60 * 60 * 24))
            };
        });

        res.json({
            success: true,
            count: quizLinks.length,
            quizzes: quizLinks
        });
    } catch (error) {
        console.error('Error fetching all JAMB mock quizzes:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error fetching JAMB mock quizzes' 
        });
    }
});

// Get JAMB Mock by share ID
app.get('/api/jamb-mock/:shareId', async (req, res) => {
    try {
        const event = await JambEvent.findOne({ 
            shareId: req.params.shareId,
            status: 'published'
        });

        if (!event) {
            return res.status(404).json({ error: 'JAMB Mock not found or not published' });
        }

        // Check if the quiz has expired
        if (new Date() > event.deadline) {
            return res.status(400).json({ error: 'This JAMB Mock quiz has expired' });
        }

        // Format questions for student (hide correct answers)
        const studentEvent = {
            ...event.toObject(),
            subjects: event.subjects.map(subject => ({
                subject: subject.subject,
                questions: subject.questions.map(q => ({
                    question: q.question,
                    options: q.options,
                    imageUrls: q.imageUrls || []
                }))
            }))
        };

        res.json(studentEvent);
    } catch (error) {
        console.error('Error fetching JAMB Mock:', error);
        res.status(500).json({ error: 'Failed to fetch JAMB Mock' });
    }
});

// Submit JAMB Mock response
app.post('/api/jamb-mock/submit/:shareId', async (req, res) => {
    try {
        const { studentName, studentEmail, answers, timeSpent } = req.body;
        
        const event = await JambEvent.findOne({ 
            shareId: req.params.shareId,
            status: 'published'
        });

        if (!event) {
            return res.status(404).json({ error: 'JAMB Mock not found' });
        }

        // Check if the quiz has expired
        if (new Date() > event.deadline) {
            return res.status(400).json({ error: 'This JAMB Mock quiz has expired' });
        }

        // Calculate scores by subject
        const scores = [];
        let totalScore = 0;
        let totalQuestions = 0;

        event.subjects.forEach(subject => {
            const subjectAnswers = answers.filter(a => a.subject === subject.subject);
            let subjectScore = 0;
            
            subjectAnswers.forEach(answer => {
                const question = subject.questions[answer.questionIndex];
                if (question && answer.selectedAnswer === question.correctAnswer) {
                    subjectScore++;
                }
            });

            scores.push({
                subject: subject.subject,
                score: subjectScore,
                totalQuestions: subjectAnswers.length
            });

            totalScore += subjectScore;
            totalQuestions += subjectAnswers.length;
        });

        const percentage = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

        const response = new JambResponse({
            eventId: event._id,
            studentName,
            studentEmail,
            answers,
            scores,
            totalScore,
            totalQuestions,
            percentage,
            timeSpent: timeSpent || 0
        });

        await response.save();

        res.json({
            totalScore,
            totalQuestions,
            percentage,
            scores: scores.map(s => ({
                subject: s.subject,
                score: s.score,
                total: s.totalQuestions,
                percentage: Math.round((s.score / s.totalQuestions) * 100)
            })),
            correctionId: response.correctionId
        });
    } catch (error) {
        console.error('JAMB Mock submit error:', error);
        res.status(500).json({ error: 'Failed to submit JAMB Mock' });
    }
});

// DEBUG ENDPOINTS

// Debug endpoint - Check all JAMB events regardless of status
app.get('/api/debug/jamb-events', async (req, res) => {
    try {
        const allEvents = await JambEvent.find({})
            .populate('hostId', 'name')
            .sort({ createdAt: -1 });

        const eventSummary = allEvents.map(event => ({
            id: event._id,
            title: event.title,
            status: event.status,
            shareId: event.shareId,
            deadline: event.deadline,
            totalQuestions: event.totalQuestions,
            hostId: event.hostId,
            subjects: event.subjects.map(s => ({
                subject: s.subject,
                questionCount: s.questionCount
            })),
            createdAt: event.createdAt,
            isExpired: new Date() > new Date(event.deadline)
        }));

        res.json({
            totalEvents: allEvents.length,
            events: eventSummary,
            breakdown: {
                active: allEvents.filter(e => e.status === 'active').length,
                completed: allEvents.filter(e => e.status === 'completed').length,
                published: allEvents.filter(e => e.status === 'published').length,
                expired: allEvents.filter(e => new Date() > new Date(e.deadline)).length
            }
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ error: 'Debug error' });
    }
});

// Debug endpoint - Check hosts
app.get('/api/debug/hosts', async (req, res) => {
    try {
        const hosts = await Host.find({}, { password: 0 });
        res.json({
            totalHosts: hosts.length,
            hosts
        });
    } catch (error) {
        res.status(500).json({ error: 'Debug error' });
    }
});

// Debug endpoint - Check teachers
app.get('/api/debug/teachers', async (req, res) => {
    try {
        const teachers = await Teacher.find({}, { password: 0 });
        res.json({
            totalTeachers: teachers.length,
            teachers
        });
    } catch (error) {
        res.status(500).json({ error: 'Debug error' });
    }
});

// Test endpoint - Create sample JAMB event (for testing only)
app.post('/api/debug/create-sample-event', async (req, res) => {
    try {
        // First, ensure we have a host
        let host = await Host.findOne({ email: 'host@smartsteps.com' });
        if (!host) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            host = new Host({
                name: 'Smart Steps Host',
                email: 'host@smartsteps.com',
                password: hashedPassword,
                role: 'host'
            });
            await host.save();
        }

        // Create sample teachers if they don't exist
        const subjects = ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology'];
        const teachers = {};
        
        for (const subject of subjects) {
            let teacher = await Teacher.findOne({ subject, email: `${subject.toLowerCase()}@teacher.com` });
            if (!teacher) {
                const hashedPassword = await bcrypt.hash('teacher123', 10);
                teacher = new Teacher({
                    name: `${subject} Teacher`,
                    email: `${subject.toLowerCase()}@teacher.com`,
                    password: hashedPassword,
                    subject
                });
                await teacher.save();
            }
            teachers[subject] = teacher;
        }

        // Create a sample JAMB event with questions
        const sampleEvent = new JambEvent({
            title: 'Sample JAMB Mock Test 2025',
            description: 'A comprehensive JAMB practice test covering all subjects',
            hostId: host._id,
            timeLimit: 180, // 3 hours
            questionsPerSubject: 10,
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            status: 'published',
            shareId: uuidv4(),
            subjects: subjects.map(subject => ({
                subject,
                questions: Array.from({ length: 10 }, (_, i) => ({
                    question: `Sample ${subject} question ${i + 1}: What is the basic concept in ${subject}?`,
                    options: [`Option ${i}A`, `Option ${i}B`, `Option ${i}C`, `Option ${i}D`],
                    correctAnswer: i % 4,
                    teacherId: teachers[subject]._id,
                    teacherName: teachers[subject].name,
                    imageUrls: [],
                    imagePublicIds: []
                })),
                questionCount: 10,
                teacherContributions: [{
                    teacherId: teachers[subject]._id,
                    teacherName: teachers[subject].name,
                    questionCount: 10
                }]
            })),
            totalQuestions: 50
        });

        await sampleEvent.save();

        res.json({
            message: 'Sample JAMB event created successfully',
            event: {
                id: sampleEvent._id,
                title: sampleEvent.title,
                shareId: sampleEvent.shareId,
                quizUrl: `${req.protocol}://${req.get('host')}/jamb-mock/${sampleEvent.shareId}`,
                status: sampleEvent.status,
                totalQuestions: sampleEvent.totalQuestions,
                deadline: sampleEvent.deadline
            }
        });
    } catch (error) {
        console.error('Error creating sample event:', error);
        res.status(500).json({ error: 'Error creating sample event', details: error.message });
    }
});

// Routes for serving HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/teacher-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'teacher-login.html'));
});

app.get('/teacher-register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'teacher-register.html'));
});

app.get('/teacher-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'teacher-dashboard.html'));
});

app.get('/create-quiz', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'create-quiz.html'));
});

app.get('/quiz/:shareId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'student-quiz.html'));
});

app.get('/quiz-results/:quizId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'quiz-results.html'));
});

app.get('/student-details/:responseId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'student-details.html'));
});

app.get('/correction/:correctionId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'quiz-correction.html'));
});

app.get('/host-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'host-login.html'));
});

app.get('/host-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'host-dashboard.html'));
});

app.get('/host/event-details/:eventId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'host-event-details.html'));
});

app.get('/host/event-responses/:eventId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'host-event-responses.html'));
});

app.get('/teacher-events', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'teacher-events.html'));
});

app.get('/teacher/event-contribute/:eventId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'teacher-event-contribute.html'));
});

app.get('/jamb-mock/:shareId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'jamb-mock-quiz.html'));
});

// Create default host account
async function createDefaultHost() {
    try {
        const existingHost = await Host.findOne({ email: 'host@smartsteps.com' });
        if (!existingHost) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const host = new Host({
                name: 'Smart Steps Host',
                email: 'host@smartsteps.com',
                password: hashedPassword,
                role: 'host'
            });
            await host.save();
            console.log('Default host account created successfully');
        }
    }
    catch (error) {
        console.error('Error creating default host account:', error);
    }
}
createDefaultHost();
// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

                