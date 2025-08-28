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
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartsteps';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'your_cloud_name',
    api_key: process.env.CLOUDINARY_API_KEY || 'your_api_key',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'your_api_secret'
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
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
    }
});

// MongoDB Schemas
const teacherSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    subject: { type: String, required: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const hostSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const quizSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subject: { type: String, required: true },
    questions: [{
        question: String,
        options: [String],
        correctAnswer: Number,
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
    questionsPerSubject: { type: Number, required: true },
    deadline: { type: Date, required: true },
    status: { 
        type: String, 
        enum: ['active', 'completed', 'published'], 
        default: 'active' 
    },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'Host', required: true },
    shareId: { type: String, unique: true, required: true },
    subjects: [{
        subject: { type: String, required: true },
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
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';

// Authentication middleware
const authenticateTeacher = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const teacher = await Teacher.findById(decoded.teacherId);
        
        if (!teacher) {
            return res.status(401).json({ error: 'Teacher not found' });
        }

        req.teacher = teacher;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

const authenticateHost = async (req, res, next) => {
    try {
        const token = req.cookies.hostToken;
        if (!token) {
            return res.status(401).json({ error: 'No host token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const host = await Host.findById(decoded.hostId);
        
        if (!host) {
            return res.status(401).json({ error: 'Host not found' });
        }

        req.host = host;
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

        const token = jwt.sign({ teacherId: teacher._id }, JWT_SECRET, { expiresIn: '24h' });
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

        const token = jwt.sign({ teacherId: teacher._id }, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });

        res.json({ message: 'Login successful', teacher: { name: teacher.name, subject: teacher.subject } });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Host Login
app.post('/api/host/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const host = await Host.findOne({ email });
        if (!host) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, host.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ hostId: host._id }, JWT_SECRET, { expiresIn: '24h' });
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
            id: req.teacher._id
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
                        folder: 'quiz-images',
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
            passages,
            timeLimit,
            teacherId: req.teacher._id,
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
        const quizzes = await Quiz.find({ teacherId: req.teacher._id }).sort({ createdAt: -1 });
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
        res.json(quiz);
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
            if (answer === quiz.questions[index].correctAnswer) {
                score++;
            }
        });

        const response = new Response({
            quizId: quiz._id,
            studentName,
            answers,
            score,
            totalQuestions: quiz.questions.length,
            timeSpent
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
            correctionId: correction._id
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
        if (!quiz || quiz.teacherId.toString() !== req.teacher._id.toString()) {
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
        const quizzes = await Quiz.find({ teacherId: req.teacher._id });
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
        if (!quiz || quiz.teacherId.toString() !== req.teacher._id.toString()) {
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
        if (!quiz || quiz.teacherId.toString() !== req.teacher._id.toString()) {
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
        if (quiz.teacherId.toString() !== req.teacher._id.toString()) {
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
        const correction = await Correction.findById(req.params.correctionId);
        if (!correction) {
            return res.status(404).json({ error: 'Correction not found' });
        }
        res.json(correction);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch correction' });
    }
});

// HOST ROUTES

// Create JAMB Mock Event
app.post('/api/host/events', authenticateHost, async (req, res) => {
    try {
        const { title, description, timeLimit, questionsPerSubject, deadline } = req.body;

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
        res.json(teachers);
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

        res.json(event);
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

        if (event.status !== 'completed') {
            return res.status(400).json({ error: 'Event must be completed before publishing' });
        }

        event.status = 'published';
        await event.save();

        res.json({ message: 'Event published successfully' });
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

        res.json({ event, responses });
    } catch (error) {
        console.error('Error fetching event responses:', error);
        res.status(500).json({ error: 'Failed to fetch event responses' });
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
            if (mySubject && mySubject.questionCount > 0) {
                myContributions++;
            }
            if (event.status === 'active' && (!mySubject || mySubject.questionCount < event.questionsPerSubject)) {
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
            q.teacherId && q.teacherId.toString() === req.teacher._id.toString()
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
        console.log('Teacher contribution request received');
        console.log('Event ID:', req.params.eventId);
        console.log('Teacher ID:', req.teacher._id);
        console.log('Teacher Subject:', req.teacher.subject);
        console.log('Questions received:', req.body.questions?.length);

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

        // Find the subject for this teacher
        const subjectIndex = event.subjects.findIndex(s => s.subject === req.teacher.subject);
        if (subjectIndex === -1) {
            return res.status(400).json({ error: 'Subject not found in event' });
        }

        // Remove existing questions from this teacher
        event.subjects[subjectIndex].questions = event.subjects[subjectIndex].questions.filter(q => 
            !q.teacherId || q.teacherId.toString() !== req.teacher._id.toString()
        );

        // Add new questions
        const newQuestions = questions.map(q => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            imageUrls: q.imageUrls || [],
            imagePublicIds: q.imagePublicIds || [],
            teacherId: req.teacher._id,
            teacherName: req.teacher.name
        }));

        event.subjects[subjectIndex].questions.push(...newQuestions);
        event.subjects[subjectIndex].questionCount = event.subjects[subjectIndex].questions.length;

        // Update teacher contributions
        const existingContribution = event.subjects[subjectIndex].teacherContributions.find(tc => 
            tc.teacherId.toString() === req.teacher._id.toString()
        );

        if (existingContribution) {
            existingContribution.questionCount = questions.length;
        } else {
            event.subjects[subjectIndex].teacherContributions.push({
                teacherId: req.teacher._id,
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

        console.log('Questions saved successfully');
        console.log('Subject question count:', event.subjects[subjectIndex].questionCount);
        console.log('Total event questions:', event.totalQuestions);
        console.log('Event status:', event.status);

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

        res.json(event);
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
            timeSpent
        });

        await response.save();

        res.json({
            totalScore,
            totalQuestions,
            percentage,
            scores
        });
    } catch (error) {
        console.error('JAMB Mock submit error:', error);
        res.status(500).json({ error: 'Failed to submit JAMB Mock' });
    }
});

// Get teacher quizzes for host dashboard
app.get('/api/host/teacher-quizzes', authenticateHost, async (req, res) => {
    try {
        const quizzes = await Quiz.find({})
            .populate('teacherId', 'name email subject')
            .sort({ createdAt: -1 });

        const quizzesWithStats = await Promise.all(quizzes.map(async (quiz) => {
            const responses = await Response.find({ quizId: quiz._id });
            const responseCount = responses.length;
            const averageScore = responseCount > 0 ? 
                Math.round(responses.reduce((sum, r) => sum + (r.score / r.totalQuestions * 100), 0) / responseCount) : 0;

            return {
                _id: quiz._id,
                title: quiz.title,
                subject: quiz.subject,
                questionCount: quiz.questions.length,
                timeLimit: quiz.timeLimit,
                shareId: quiz.shareId,
                teacherId: quiz.teacherId,
                responseCount,
                averageScore,
                createdAt: quiz.createdAt
            };
        }));

        res.json(quizzesWithStats);
    } catch (error) {
        console.error('Error fetching teacher quizzes:', error);
        res.status(500).json({ error: 'Failed to fetch teacher quizzes' });
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
                password: hashedPassword
            });
            await host.save();
            console.log('Default host account created: host@smartsteps.com / admin123');
        }
    } catch (error) {
        console.error('Error creating default host:', error);
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    createDefaultHost();
});