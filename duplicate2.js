import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dbqcl3gyu',
  api_key: process.env.CLOUDINARY_API_KEY || '125497217998532',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'w5UR9A2UgzujVlcuzmnOFRr56Bg'
});

// Configure Multer for multiple file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per image
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'smart-steps-secret-key';
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://faithabayomi18:f1vouroluw11972@dominionspecialist.cdp3oi9.mongodb.net/videocall?retryWrites=true&w=majority&appName=dominionspecialist';

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
    mongoUrl: MONGO_URI
  }),
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Connect to MongoDB Atlas
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// Teacher Schema
const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  subject: { type: String, required: true, enum: ['Biology', 'Mathematics', 'English', 'Physics', 'Chemistry'] },
  createdAt: { type: Date, default: Date.now }
});

// Quiz Schema
const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: String, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  questions: [{
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: Number, required: true },
    passageId: { type: String },
    imageUrls: [{ type: String }], // Array for multiple image URLs
    imagePublicIds: [{ type: String }] // Array for multiple Cloudinary public IDs
  }],
  passages: [{
    id: { type: String, required: true },
    text: { type: String, required: true },
    questionCount: { type: Number, required: true }
  }],
  timeLimit: { type: Number, default: 0 },
  shareId: { type: String, unique: true, default: uuidv4 },
  createdAt: { type: Date, default: Date.now }
});

// Student Response Schema
const responseSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  answers: [{ type: Number, required: true }],
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  timeSpent: { type: Number, default: 0 },
  correctionId: { type: String, unique: true, default: uuidv4 },
  submittedAt: { type: Date, default: Date.now }
});

// Host Schema
const hostSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'host' },
  createdAt: { type: Date, default: Date.now }
});

// JAMB Mock Event Schema
const jambEventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'Host', required: true },
  timeLimit: { type: Number, required: true }, // in minutes
  questionsPerSubject: { type: Number, default: 10 },
  deadline: { type: Date, required: true },
  status: { type: String, enum: ['active', 'completed', 'published'], default: 'active' },
  shareId: { type: String, unique: true, default: uuidv4 },
  subjects: [{
    subject: { type: String, required: true, enum: ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology'] },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    questions: [{
      question: { type: String, required: true },
      options: [{ type: String, required: true }],
      correctAnswer: { type: Number, required: true },
      imageUrls: [{ type: String }],
      imagePublicIds: [{ type: String }],
      teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
      teacherName: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }],
    questionCount: { type: Number, default: 0 },
    teacherContributions: [{
      teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
      teacherName: { type: String },
      questionCount: { type: Number, default: 0 }
    }]
  }],
  totalQuestions: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// JAMB Mock Response Schema
const jambResponseSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'JambEvent', required: true },
  answers: [{
    subject: { type: String, required: true },
    questionIndex: { type: Number, required: true },
    selectedAnswer: { type: Number, required: true } // -1 for unanswered
  }],
  scores: [{
    subject: { type: String, required: true },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true }
  }],
  totalScore: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  timeSpent: { type: Number, default: 0 },
  correctionId: { type: String, unique: true, default: uuidv4 },
  submittedAt: { type: Date, default: Date.now }
});

// Correction Schema
const correctionSchema = new mongoose.Schema({
  responseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Response' },
  jambResponseId: { type: mongoose.Schema.Types.ObjectId, ref: 'JambResponse' },
  studentName: { type: String, required: true },
  quiz: {
    title: String,
    subject: String,
    questions: [{
      question: String,
      options: [String],
      correctAnswer: Number,
      imageUrls: [String]
    }]
  },
  studentAnswers: [Number],
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  percentage: { type: Number, required: true },
  timeSpent: { type: Number, default: 0 },
  submittedAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Teacher = mongoose.model('Teacher', teacherSchema);
const Quiz = mongoose.model('Quiz', quizSchema);
const Response = mongoose.model('Response', responseSchema);
const Host = mongoose.model('Host', hostSchema);
const JambEvent = mongoose.model('JambEvent', jambEventSchema);
const JambResponse = mongoose.model('JambResponse', jambResponseSchema);
const Correction = mongoose.model('Correction', correctionSchema);

// Authentication middleware
const authenticateTeacher = (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.teacher = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

// Host authentication middleware
const authenticateHost = (req, res, next) => {
  const token = req.cookies.hostToken || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role !== 'host') {
      return res.status(403).json({ error: 'Access denied. Host privileges required.' });
    }
    req.hostData = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

// Image upload endpoint for multiple images
app.post('/api/upload-image', authenticateTeacher, upload.array('images', 3), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    const uploadPromises = req.files.map(file => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { 
            folder: 'smart_steps_quiz',
            transformation: [
              { width: 800, height: 600, crop: 'limit' },
              { quality: 'auto' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve({ imageUrl: result.secure_url, publicId: result.public_id });
          }
        );
        stream.end(file.buffer);
      });
    });

    const results = await Promise.all(uploadPromises);
    res.json(results);
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

// Image deletion endpoint
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

// HTML Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/teacher-register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'teacher-register.html'));
});

app.get('/teacher-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'teacher-login.html'));
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

app.get('/jamb-mock/:shareId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'jamb-mock-quiz.html'));
});

app.get('/correction/:correctionId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'quiz-correction.html'));
});

app.get('/quiz-results/:quizId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'quiz-results.html'));
});

app.get('/student-details/:responseId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student-details.html'));
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

// Teacher registration
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, subject } = req.body;

    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({ error: 'Teacher with this email already exists' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const teacher = new Teacher({
      name,
      email,
      password: hashedPassword,
      subject
    });

    await teacher.save();

    const token = jwt.sign(
      { id: teacher._id, email: teacher.email, name: teacher.name, subject: teacher.subject },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.status(201).json({ message: 'Teacher registered successfully', teacher: { id: teacher._id, name, email, subject } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Teacher login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const teacher = await Teacher.findOne({ email });
    if (!teacher) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, teacher.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: teacher._id, email: teacher.email, name: teacher.name, subject: teacher.subject },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.json({ message: 'Login successful', teacher: { id: teacher._id, name: teacher.name, email: teacher.email, subject: teacher.subject } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Teacher logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Host login
app.post('/api/host/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // For demo purposes, create a default host if none exists
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
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isValidPassword = email === 'host@smartsteps.com' ? true : await bcrypt.compare(password, host.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: host._id, email: host.email, name: host.name, role: 'host' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('hostToken', token, { 
      httpOnly: true, 
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      secure: false
    });
    res.json({ message: 'Login successful', host: { id: host._id, name: host.name, email: host.email } });
  } catch (error) {
    console.error('Host login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Host logout
app.post('/api/host/logout', (req, res) => {
  res.clearCookie('hostToken');
  res.json({ message: 'Logged out successfully' });
});

// Verify teacher authentication
app.get('/api/verify', authenticateTeacher, (req, res) => {
  res.json({ authenticated: true, teacher: req.teacher });
});

// Verify host authentication
app.get('/api/host/verify', authenticateHost, (req, res) => {
  res.json({ 
    authenticated: true, 
    host: { 
      id: req.hostData.id, 
      name: req.hostData.name, 
      email: req.hostData.email 
    } 
  });
});

// Create JAMB Mock Event
app.post('/api/host/events', authenticateHost, async (req, res) => {
  try {
    const { title, description, timeLimit, questionsPerSubject, deadline } = req.body;
    
    // Initialize subjects with empty question arrays
    const subjects = ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology'].map(subject => ({
      subject,
      questions: [],
      questionCount: 0,
      teacherContributions: []
    }));
    
    const event = new JambEvent({
      title,
      description,
      hostId: req.hostData.id,
      timeLimit,
      questionsPerSubject: questionsPerSubject || 10,
      deadline: new Date(deadline),
      subjects,
      totalQuestions: 0,
      shareId: uuidv4()
    });

    await event.save();
    res.status(201).json({ message: 'JAMB Mock event created successfully', event });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Error creating event' });
  }
});

// Get host events
app.get('/api/host/events', authenticateHost, async (req, res) => {
  try {
    const events = await JambEvent.find({ hostId: req.hostData.id }).sort({ createdAt: -1 });
    res.json(events || []);
  } catch (error) {
    console.error('Error fetching host events:', error);
    res.status(500).json({ error: 'Error fetching events' });
  }
});

// Get all teachers (for host)
app.get('/api/host/teachers', authenticateHost, async (req, res) => {
  try {
    const teachers = await Teacher.find({}, { password: 0 }).sort({ createdAt: -1 });
    
    const teachersWithStats = await Promise.all(teachers.map(async (teacher) => {
      const quizCount = await Quiz.countDocuments({ teacherId: teacher._id });
      const eventParticipation = await JambEvent.countDocuments({
        'subjects.teacherId': teacher._id
      });
      
      return {
        ...teacher.toObject(),
        quizCount,
        eventParticipation
      };
    }));
    
    res.json(teachersWithStats || []);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ error: 'Error fetching teachers' });
  }
});

// Get all quizzes for host dashboard
app.get('/api/host/quizzes', authenticateHost, async (req, res) => {
  try {
    const quizzes = await Quiz.find({})
      .populate('teacherId', 'name email subject')
      .sort({ createdAt: -1 });
    
    const quizzesWithStats = await Promise.all(quizzes.map(async (quiz) => {
      const responseCount = await Response.countDocuments({ quizId: quiz._id });
      
      return {
        ...quiz.toObject(),
        responseCount
      };
    }));
    
    res.json(quizzesWithStats || []);
  } catch (error) {
    console.error('Error fetching host quizzes:', error);
    res.status(500).json({ error: 'Error fetching quizzes' });
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

// Get specific event details (host only)
app.get('/api/host/events/:eventId/details', authenticateHost, async (req, res) => {
  try {
    const event = await JambEvent.findById(req.params.eventId)
      .populate('hostId', 'name email');
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.hostId._id.toString() !== req.hostData.id) {
      return res.status(403).json({ error: 'Access denied. You can only view your own events.' });
    }

    const responseCount = await JambResponse.countDocuments({ eventId: event._id });

    const eventDetails = {
      ...event.toObject(),
      responseCount,
      isExpired: new Date() > new Date(event.deadline),
      daysLeft: Math.ceil((new Date(event.deadline) - new Date()) / (1000 * 60 * 60 * 24))
    };

    res.json(eventDetails);
  } catch (error) {
    console.error('Error fetching event details:', error);
    res.status(500).json({ error: 'Error fetching event details' });
  }
});

// Get event responses for host
app.get('/api/host/events/:eventId/responses', authenticateHost, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    
    const event = await JambEvent.findById(eventId);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.hostId.toString() !== req.hostData.id) {
      return res.status(403).json({ error: 'Access denied. You can only view responses for your own events.' });
    }

    const responses = await JambResponse.find({ eventId: eventId })
      .sort({ submittedAt: -1 });

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

    res.json({
      event: eventData,
      responses: responses
    });
  } catch (error) {
    console.error('Error fetching event responses:', error);
    res.status(500).json({ error: 'Error fetching event responses', details: error.message });
  }
});

// Delete event (host only)
app.delete('/api/host/events/:eventId', authenticateHost, async (req, res) => {
  try {
    const event = await JambEvent.findById(req.params.eventId);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.hostId.toString() !== req.hostData.id) {
      return res.status(403).json({ error: 'Access denied. You can only delete your own events.' });
    }

    // Delete associated images from Cloudinary
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

    await JambResponse.deleteMany({ eventId: req.params.eventId });
    await JambEvent.findByIdAndDelete(req.params.eventId);

    res.json({ message: 'Event and all associated data deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Error deleting event' });
  }
});

// Publish event (host only)
app.post('/api/host/events/:eventId/publish', authenticateHost, async (req, res) => {
  try {
    const event = await JambEvent.findById(req.params.eventId);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.hostId.toString() !== req.hostData.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const incompleteSubjects = event.subjects.filter(subject => subject.questionCount < (event.questionsPerSubject || 10));

    if (incompleteSubjects.length > 0) {
      return res.status(400).json({ 
        error: `Cannot publish event. Need at least ${event.questionsPerSubject || 10} questions in: ${incompleteSubjects.map(s => s.subject).join(', ')}` 
      });
    }

    event.status = 'published';
    await event.save();

    res.json({ message: 'Event published successfully', shareId: event.shareId });
  } catch (error) {
    console.error('Error publishing event:', error);
    res.status(500).json({ error: 'Error publishing event' });
  }
});

// Get events for teachers
app.get('/api/teacher/events', authenticateTeacher, async (req, res) => {
  try {
    const events = await JambEvent.find({ 
      status: { $in: ['active', 'completed', 'published'] } 
    }).sort({ createdAt: -1 });
    
    let myContributions = 0;
    let pendingEvents = 0;
    
    events.forEach(event => {
      const mySubject = (event.subjects || []).find(s => s.subject === req.teacher.subject);
      const myContribution = mySubject ? mySubject.teacherContributions.find(c => c.teacherId.toString() === req.teacher.id) : null;
      if (myContribution && myContribution.questionCount > 0) {
        myContributions++;
      }
      if (event.status === 'active' && (!myContribution || myContribution.questionCount === 0)) {
        pendingEvents++;
      }
    });
    
    res.json({
      events: events || [],
      teacherSubject: req.teacher.subject,
      myContributions,
      pendingEvents
    });
  } catch (error) {
    console.error('Error fetching teacher events:', error);
    res.status(500).json({ error: 'Error fetching events' });
  }
});

// Get specific event for teacher contribution
app.get('/api/teacher/events/:eventId', authenticateTeacher, async (req, res) => {
  try {
    const event = await JambEvent.findById(req.params.eventId);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.status !== 'active') {
      return res.status(400).json({ error: 'Event is no longer accepting contributions' });
    }

    const mySubject = event.subjects.find(s => s.subject === req.teacher.subject);
    const existingQuestions = mySubject ? 
      mySubject.questions.filter(q => q.teacherId.toString() === req.teacher.id) : [];
    
    res.json({
      event,
      existingQuestions
    });
  } catch (error) {
    console.error('Error fetching event for teacher:', error);
    res.status(500).json({ error: 'Error fetching event details' });
  }
});

// Contribute questions to event
app.post('/api/teacher/events/:eventId/contribute', authenticateTeacher, async (req, res) => {
  try {
    const { questions } = req.body;
    const event = await JambEvent.findById(req.params.eventId);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.status !== 'active') {
      return res.status(400).json({ error: 'Event is no longer accepting contributions' });
    }

    if (new Date() > event.deadline) {
      return res.status(400).json({ error: 'Event deadline has passed' });
    }

    // Find or create subject entry
    let subjectIndex = event.subjects.findIndex(s => s.subject === req.teacher.subject);
    if (subjectIndex === -1) {
      event.subjects.push({
        subject: req.teacher.subject,
        teacherId: req.teacher.id,
        questions: [],
        questionCount: 0,
        teacherContributions: []
      });
      subjectIndex = event.subjects.length - 1;
    }

    // Add teacher info to each question
    const questionsWithTeacher = questions.map(q => ({
      ...q,
      teacherId: req.teacher.id,
      teacherName: req.teacher.name
    }));

    // Remove existing questions from this teacher
    event.subjects[subjectIndex].questions = event.subjects[subjectIndex].questions.filter(
      q => q.teacherId.toString() !== req.teacher.id
    );

    // Add new questions from this teacher
    event.subjects[subjectIndex].questions.push(...questionsWithTeacher);

    // Update teacher contributions
    const contributionIndex = event.subjects[subjectIndex].teacherContributions.findIndex(
      c => c.teacherId.toString() === req.teacher.id
    );
    
    if (contributionIndex === -1) {
      event.subjects[subjectIndex].teacherContributions.push({
        teacherId: req.teacher.id,
        teacherName: req.teacher.name,
        questionCount: questions.length
      });
    } else {
      event.subjects[subjectIndex].teacherContributions[contributionIndex].questionCount = questions.length;
    }

    // Update total question count for this subject
    event.subjects[subjectIndex].questionCount = event.subjects[subjectIndex].questions.length;

    // Update total questions count
    event.totalQuestions = event.subjects.reduce((sum, subject) => sum + subject.questionCount, 0);

    // Check if event is complete
    const questionsPerSubject = event.questionsPerSubject || 10;
    const allSubjectsComplete = event.subjects.every(subject => subject.questionCount >= questionsPerSubject);
    if (allSubjectsComplete) {
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
    console.error('Error saving questions:', error);
    res.status(500).json({ error: 'Error saving questions' });
  }
});

// Create quiz
app.post('/api/quiz', authenticateTeacher, async (req, res) => {
  try {
    const { title, questions, passages, timeLimit } = req.body;
    
    const quiz = new Quiz({
      title,
      subject: req.teacher.subject,
      teacherId: req.teacher.id,
      questions,
      passages: passages || [],
      timeLimit: timeLimit || 0,
      shareId: uuidv4()
    });

    await quiz.save();
    res.status(201).json({ message: 'Quiz created successfully', quiz });
  } catch (error) {
    console.error('Quiz creation error:', error);
    res.status(500).json({ error: 'Error creating quiz' });
  }
});

// Delete quiz
app.delete('/api/quiz/:quizId', authenticateTeacher, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (quiz.teacherId.toString() !== req.teacher.id) {
      return res.status(403).json({ error: 'Access denied. You can only delete your own quizzes.' });
    }

    // Delete associated images from Cloudinary
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

    await Response.deleteMany({ quizId: req.params.quizId });
    await Quiz.findByIdAndDelete(req.params.quizId);

    res.json({ message: 'Quiz and all associated responses deleted successfully' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ error: 'Error deleting quiz' });
  }
});

// Get teacher's quizzes
app.get('/api/quizzes', authenticateTeacher, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ teacherId: req.teacher.id }).sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ error: 'Error fetching quizzes' });
  }
});

// Get quiz by share ID (for students)
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
    console.error('Error fetching quiz:', error);
    res.status(500).json({ error: 'Error fetching quiz' });
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
    quiz.questions.forEach((question, index) => {
      if (answers[index] !== -1 && answers[index] === question.correctAnswer) {
        score++;
      }
    });

    const response = new Response({
      studentName,
      quizId: quiz._id,
      answers,
      score,
      totalQuestions: quiz.questions.length,
      timeSpent: timeSpent || 0,
      correctionId: uuidv4()
    });

    await response.save();

    res.json({ 
      message: 'Quiz submitted successfully', 
      score, 
      totalQuestions: quiz.questions.length,
      percentage: Math.round((score / quiz.questions.length) * 100),
      correctionId: response.correctionId
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ error: 'Error submitting quiz' });
  }
});

// Get correction data for student
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
    console.error('Error fetching correction data:', error);
    res.status(500).json({ error: 'Error fetching correction data' });
  }
});

// Get quiz responses (for teachers)
app.get('/api/responses/:quizId', authenticateTeacher, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz || quiz.teacherId.toString() !== req.teacher.id) {
      return res.status(404).json({ error: 'Quiz not found or access denied' });
    }

    const responses = await Response.find({ quizId: req.params.quizId })
      .populate('quizId', 'title')
      .sort({ submittedAt: -1 });
    
    res.json({
      quiz: {
        title: quiz.title,
        subject: quiz.subject,
        totalQuestions: quiz.questions.length,
        timeLimit: quiz.timeLimit
      },
      responses
    });
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ error: 'Error fetching responses' });
  }
});

// Get detailed student response (for teachers)
app.get('/api/student-details/:responseId', authenticateTeacher, async (req, res) => {
  try {
    const response = await Response.findById(req.params.responseId)
      .populate('quizId');
    
    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }

    if (response.quizId.teacherId.toString() !== req.teacher.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const detailedResponse = {
      studentName: response.studentName,
      quiz: response.quizId,
      studentAnswers: response.answers,
      score: response.score,
      totalQuestions: response.totalQuestions,
      percentage: Math.round((response.score / response.totalQuestions) * 100),
      timeSpent: response.timeSpent,
      submittedAt: response.submittedAt,
      questionAnalysis: response.quizId.questions.map((question, index) => ({
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        studentAnswer: response.answers[index],
        isCorrect: response.answers[index] === question.correctAnswer,
        imageUrls: question.imageUrls
      }))
    };

    res.json(detailedResponse);
  } catch (error) {
    console.error('Error fetching student details:', error);
    res.status(500).json({ error: 'Error fetching student details' });
  }
});

// Get all responses for teacher's quizzes
app.get('/api/all-responses', authenticateTeacher, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ teacherId: req.teacher.id });
    const quizIds = quizzes.map(quiz => quiz._id);
    
    const responses = await Response.find({ quizId: { $in: quizIds } })
      .populate('quizId', 'title subject timeLimit')
      .sort({ submittedAt: -1 });
    
    const groupedResponses = {};
    responses.forEach(response => {
      const quizId = response.quizId._id.toString();
      if (!groupedResponses[quizId]) {
        groupedResponses[quizId] = {
          quiz: response.quizId,
          responses: []
        };
      }
      groupedResponses[quizId].responses.push(response);
    });
    
    res.json(groupedResponses);
  } catch (error) {
    console.error('Error fetching all responses:', error);
    res.status(500).json({ error: 'Error fetching all responses' });
  }
});

// Get quiz statistics
app.get('/api/quiz-stats/:quizId', authenticateTeacher, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz || quiz.teacherId.toString() !== req.teacher.id) {
      return res.status(404).json({ error: 'Quiz not found or access denied' });
    }

    const responses = await Response.find({ quizId: req.params.quizId });
    
    const stats = {
      totalAttempts: responses.length,
      averageScore: responses.length > 0 ? 
        Math.round(responses.reduce((sum, r) => sum + (r.score / r.totalQuestions * 100), 0) / responses.length) : 0,
      highestScore: responses.length > 0 ? 
        Math.max(...responses.map(r => Math.round(r.score / r.totalQuestions * 100))) : 0,
      lowestScore: responses.length > 0 ? 
        Math.min(...responses.map(r => Math.round(r.score / r.totalQuestions * 100))) : 0,
      averageTime: responses.length > 0 ? 
        Math.round(responses.reduce((sum, r) => sum + r.timeSpent, 0) / responses.length) : 0
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching quiz statistics:', error);
    res.status(500).json({ error: 'Error fetching quiz statistics' });
  }
});

// Get all available JAMB mock quizzes (published events)
app.get('/api/jamb-mock/available', async (req, res) => {
  try {
    const availableEvents = await JambEvent.find({
      status: 'published',
      deadline: { $gt: new Date() }
    })
    .populate('hostId', 'name')
    .select('title description shareId deadline timeLimit totalQuestions subjects createdAt')
    .sort({ createdAt: -1 });

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

// Get JAMB mock quiz by shareId (for students taking the quiz)
app.get('/api/jamb-mock/:shareId', async (req, res) => {
  try {
    const event = await JambEvent.findOne({ 
      shareId: req.params.shareId,
      status: 'published'
    });
    
    if (!event) {
      return res.status(404).json({ error: 'JAMB mock quiz not found' });
    }

    if (new Date() > event.deadline) {
      return res.status(400).json({ error: 'This JAMB mock quiz has expired' });
    }

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
    console.error('Error fetching JAMB mock quiz:', error);
    res.status(500).json({ error: 'Error fetching JAMB mock quiz' });
  }
});

// Submit JAMB mock quiz response
app.post('/api/jamb-mock/submit/:shareId', async (req, res) => {
  try {
    const { studentName, studentEmail, answers, timeSpent } = req.body;
    
    const event = await JambEvent.findOne({ 
      shareId: req.params.shareId,
      status: 'published'
    });
    
    if (!event) {
      return res.status(404).json({ error: 'JAMB mock quiz not found' });
    }

    if (new Date() > event.deadline) {
      return res.status(400).json({ error: 'This JAMB mock quiz has expired' });
    }

    // Calculate scores per subject
    const scores = [];
    let totalScore = 0;
    let totalQuestions = 0;

    event.subjects.forEach(subject => {
      let subjectScore = 0;
      const subjectQuestions = subject.questions.length;
      
      const subjectAnswers = answers.filter(answer => answer.subject === subject.subject);
      
      subjectAnswers.forEach(answer => {
        const question = subject.questions[answer.questionIndex];
        if (question && answer.selectedAnswer === question.correctAnswer) {
          subjectScore++;
        }
      });

      scores.push({
        subject: subject.subject,
        score: subjectScore,
        totalQuestions: subjectQuestions
      });

      totalScore += subjectScore;
      totalQuestions += subjectQuestions;
    });

    const response = new JambResponse({
      studentName,
      studentEmail,
      eventId: event._id,
      answers,
      scores,
      totalScore,
      totalQuestions,
      timeSpent: timeSpent || 0,
      correctionId: uuidv4()
    });

    await response.save();

    res.json({ 
      message: 'JAMB mock quiz submitted successfully',
      totalScore,
      totalQuestions,
      percentage: Math.round((totalScore / totalQuestions) * 100),
      subjectScores: scores.map(s => ({
        subject: s.subject,
        score: s.score,
        total: s.totalQuestions,
        percentage: Math.round((s.score / s.totalQuestions) * 100)
      })),
      correctionId: response.correctionId
    });
  } catch (error) {
    console.error('Error submitting JAMB mock quiz:', error);
    res.status(500).json({ error: 'Error submitting JAMB mock quiz' });
  }
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
      console.log('Default host account created: host@smartsteps.com / admin123');
    }
  } catch (error) {
    console.error('Error creating default host:', error);
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
  console.log(`Smart Steps Quiz Server running on port ${PORT}`);
  console.log(`Connected to MongoDB Atlas database: videocall`);
  createDefaultHost();
});