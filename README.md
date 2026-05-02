# Smart Steps Tutorial - Mock Exam System

A comprehensive mock exam platform designed for JAMB preparation with admin management and student exam features.

## Features

### Admin Features
- **Secure Login**: Only admin can access the dashboard
- **Mock Exam Management**: Create and manage multiple mock exams
- **Question Management**: Add, edit, and delete questions for each subject
- **Image Support**: Upload images for questions via Cloudinary
- **Live Results Monitoring**: View student results in real-time with auto-refresh
- **Result Management**: Delete spam or invalid results
- **Subject Structure**: Manage questions for English (60), Physics (40), Chemistry (40), Maths (40), and Biology (40)

### Student Features
- **No Login Required**: Students can directly access mock exams via shared link
- **Student Information**: Enter name, phone number, and choose between Maths or Biology
- **Timed Exams**: Complete mock exams within the set duration
- **Fullscreen Enforcement**: Exams must be taken in fullscreen mode
- **3-Chance System**:
  - Leaving the page deducts 1 chance
  - Exiting fullscreen deducts 1 chance
  - After 3 chances, exam ends automatically
- **Subject Selection**: Choose between Mathematics or Biology as 4th subject
- **Progress Tracking**: See answered and unanswered questions
- **Instant Results**: View scores immediately after submission

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account
- Cloudinary account

### Setup Steps

1. **Install Dependencies**
```bash
npm install express mongoose bcryptjs jsonwebtoken express-session connect-mongo cookie-parser multer cloudinary uuid
```

2. **Environment Variables**
Create a `.env` file in the root directory:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

3. **Create Public Directory**
Create a `public` folder and place all HTML files in it:
- index.html
- admin-login.html
- admin-dashboard.html
- admin-edit-mock.html
- admin-mock-results.html
- student-mock.html

4. **Start the Server**
```bash
node server-updated.js
```

5. **Access the Application**
Open your browser and navigate to `http://localhost:3000`

## Default Admin Credentials

- **Email**: admin@smartsteps.com
- **Password**: admin123

⚠️ **Important**: Change these credentials after first login!

## Directory Structure

```
smart-steps-tutorial/
├── public/
│   ├── index.html
│   ├── admin-login.html
│   ├── admin-dashboard.html
│   ├── admin-edit-mock.html
│   ├── admin-mock-results.html
│   └── student-mock.html
├── server-updated.js
├── package.json
├── .env
└── README.md
```

## Usage Guide

### For Admin

1. **Login**
   - Navigate to `/admin-login`
   - Enter admin credentials
   - You'll be redirected to the dashboard

2. **Create a Mock Exam**
   - Click "Create New Mock Exam"
   - Enter mock name and duration in minutes
   - Click "Create Mock"

3. **Add Questions**
   - Click "Edit Questions" on any mock
   - Select the subject tab (English, Physics, Chemistry, Maths, Biology)
   - Click "Add Question"
   - Enter question text, 4 options, and select correct answer
   - Optionally upload images
   - Save the question

4. **Share Mock Exam**
   - Click the share link on any mock card
   - The link is automatically copied to clipboard
   - Share with students

5. **Monitor Results**
   - Click "View Results" on any mock
   - Results auto-refresh every 5 seconds
   - Use search to filter by name or phone
   - Delete spam results as needed

### For Students

1. **Access Mock Exam**
   - Click the shared link provided by admin
   - Enter full name
   - Enter phone number
   - Select 4th subject (Maths or Biology)
   - Read the rules carefully

2. **Take the Exam**
   - Click "Start Mock Exam"
   - Browser enters fullscreen mode
   - Answer questions by clicking options
   - Use navigation buttons or question grid to move between questions
   - Watch the timer in the header

3. **Important Rules**
   - You have 3 chances
   - Leaving the page = -1 chance
   - Exiting fullscreen = -1 chance
   - After 3 chances, exam ends automatically
   - Complete within the time limit

4. **Submit Exam**
   - Click "Submit Exam" when done
   - View your results
   - Results are sent to admin

## Question Structure

### English Subject
- 60 questions required
- Comprehensive language and comprehension questions

### Science Subjects (Physics, Chemistry)
- 40 questions each
- Cover all relevant topics

### Mathematics/Biology
- 40 questions each
- Students choose one as their 4th subject

## API Endpoints

### Admin Routes
- `POST /api/admin/login` - Admin login
- `POST /api/admin/logout` - Admin logout
- `GET /api/admin/verify` - Verify admin token
- `GET /api/admin/mocks` - Get all mocks
- `POST /api/admin/mocks` - Create new mock
- `GET /api/admin/mocks/:id` - Get mock details
- `PUT /api/admin/mocks/:id` - Update mock
- `DELETE /api/admin/mocks/:id` - Delete mock
- `POST /api/admin/mocks/:id/questions` - Add question
- `PUT /api/admin/mocks/:id/questions/:subject/:index` - Update question
- `DELETE /api/admin/mocks/:id/questions/:subject/:index` - Delete question
- `GET /api/admin/mocks/:id/results` - Get mock results
- `DELETE /api/admin/results/:id` - Delete result

### Student Routes
- `GET /api/mocks/:shareId` - Get mock exam (no auth)
- `POST /api/mocks/:shareId/submit` - Submit exam results (no auth)

## Security Features

1. **Admin Authentication**: JWT-based authentication with HTTP-only cookies
2. **Fullscreen Enforcement**: Exams must be taken in fullscreen mode
3. **Page Monitoring**: Detects when students leave the exam page
4. **Chance System**: Limits attempts to prevent cheating
5. **Right-Click Prevention**: Disabled during exams
6. **Session Management**: Secure session handling with MongoDB

## Database Schema

### Admin
- name: String
- email: String (unique)
- password: String (hashed)

### MockExam
- name: String
- duration: Number (minutes)
- shareId: String (unique)
- subjects: Object (english, physics, chemistry, maths, biology)
- adminId: ObjectId (ref: Admin)

### MockResult
- mockId: ObjectId (ref: MockExam)
- studentName: String
- phoneNumber: String
- selectedSubject: String (maths or biology)
- answers: Array
- scores: Object (breakdown by subject)
- totalScore: Number
- totalQuestions: Number
- percentage: Number
- timeSpent: Number (seconds)
- chancesUsed: Number
- submittedAt: Date

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT, bcryptjs
- **Session Management**: express-session, connect-mongo
- **File Upload**: Multer, Cloudinary
- **Frontend**: HTML5, CSS3, Vanilla JavaScript

## Support

For issues or questions, please contact the system administrator.

## License

© 2025 Smart Steps Tutorial. All rights reserved.
