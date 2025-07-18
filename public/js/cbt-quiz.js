class CBTQuiz {
    constructor() {
        this.currentQuestion = 0;
        this.answers = {};
        this.timeRemaining = 0;
        this.timer = null;
        this.quizData = null;
        this.studentInfo = null;
        this.init();
    }

    async init() {
        try {
            await this.loadQuizData();
            await this.loadStudentInfo();
            this.setupQuiz();
            this.startTimer();
            this.bindEvents();
        } catch (error) {
            console.error('Error initializing quiz:', error);
            this.showError('Failed to load quiz. Please try again.');
        }
    }

    async loadQuizData() {
        const urlParams = new URLSearchParams(window.location.search);
        const quizId = urlParams.get('id');
        
        if (!quizId) {
            throw new Error('No quiz ID provided');
        }

        const response = await fetch(`/api/quizzes/${quizId}`);
        if (!response.ok) {
            throw new Error('Failed to load quiz data');
        }
        
        this.quizData = await response.json();
    }

    async loadStudentInfo() {
        const studentData = localStorage.getItem('currentStudent');
        if (!studentData) {
            window.location.href = 'student-details.html';
            return;
        }
        
        this.studentInfo = JSON.parse(studentData);
    }

    setupQuiz() {
        // Set quiz title and info
        document.getElementById('quiz-title').textContent = this.quizData.title;
        document.getElementById('student-name').textContent = this.studentInfo.name;
        document.getElementById('total-questions').textContent = this.quizData.questions.length;
        
        // Set timer
        this.timeRemaining = this.quizData.duration * 60; // Convert minutes to seconds
        
        // Show passage if exists
        if (this.quizData.passage) {
            this.setupPassage();
        }
        
        // Setup question navigation
        this.setupQuestionNavigation();
        
        // Show first question
        this.showQuestion(0);
    }

    setupPassage() {
        const passageContainer = document.getElementById('passage-container');
        const passage = this.quizData.passage;
        
        let passageHtml = `
            <div class="passage-content">
                <h3>${passage.title || 'Reading Passage'}</h3>
                <div class="passage-text">${passage.text}</div>
        `;
        
        if (passage.image) {
            passageHtml += `
                <div class="passage-image">
                    <img src="${passage.image.url}" alt="Passage illustration" />
                </div>
            `;
        }
        
        passageHtml += `</div>`;
        passageContainer.innerHTML = passageHtml;
        passageContainer.style.display = 'block';
    }

    setupQuestionNavigation() {
        const navContainer = document.getElementById('question-nav');
        const navHtml = this.quizData.questions.map((_, index) => 
            `<button class="nav-btn" data-question="${index}">${index + 1}</button>`
        ).join('');
        
        navContainer.innerHTML = navHtml;
        
        // Add click events to navigation buttons
        navContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-btn')) {
                const questionIndex = parseInt(e.target.dataset.question);
                this.showQuestion(questionIndex);
            }
        });
    }

    showQuestion(index) {
        if (index < 0 || index >= this.quizData.questions.length) return;
        
        this.currentQuestion = index;
        const question = this.quizData.questions[index];
        
        // Update question counter
        document.getElementById('current-question').textContent = index + 1;
        
        // Build question HTML
        let questionHtml = `
            <div class="question-content">
                <h3>Question ${index + 1}</h3>
                <div class="question-text">${question.text}</div>
        `;
        
        // Add question image if exists
        if (question.image) {
            questionHtml += `
                <div class="question-image">
                    <img src="${question.image.url}" alt="Question illustration" />
                </div>
            `;
        }
        
        // Add options
        questionHtml += `<div class="options-container">`;
        question.options.forEach((option, optionIndex) => {
            const isChecked = this.answers[index] === optionIndex ? 'checked' : '';
            questionHtml += `
                <label class="option-label">
                    <input type="radio" name="question-${index}" value="${optionIndex}" ${isChecked}>
                    <span class="option-text">${option}</span>
                </label>
            `;
        });
        questionHtml += `</div></div>`;
        
        document.getElementById('question-container').innerHTML = questionHtml;
        
        // Add event listeners for answer selection
        const radioButtons = document.querySelectorAll(`input[name="question-${index}"]`);
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.answers[index] = parseInt(e.target.value);
                this.updateNavigationStatus();
            });
        });
        
        // Update navigation buttons
        this.updateNavigationButtons();
        this.updateNavigationStatus();
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        
        prevBtn.disabled = this.currentQuestion === 0;
        nextBtn.disabled = this.currentQuestion === this.quizData.questions.length - 1;
        
        // Update next button text for last question
        if (this.currentQuestion === this.quizData.questions.length - 1) {
            nextBtn.style.display = 'none';
            document.getElementById('submit-btn').style.display = 'inline-block';
        } else {
            nextBtn.style.display = 'inline-block';
            document.getElementById('submit-btn').style.display = 'none';
        }
    }

    updateNavigationStatus() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach((btn, index) => {
            btn.classList.remove('current', 'answered');
            
            if (index === this.currentQuestion) {
                btn.classList.add('current');
            }
            
            if (this.answers.hasOwnProperty(index)) {
                btn.classList.add('answered');
            }
        });
        
        // Update progress
        const answeredCount = Object.keys(this.answers).length;
        const totalQuestions = this.quizData.questions.length;
        const progressPercent = (answeredCount / totalQuestions) * 100;
        
        document.getElementById('progress-fill').style.width = `${progressPercent}%`;
        document.getElementById('answered-count').textContent = answeredCount;
    }

    startTimer() {
        this.updateTimerDisplay();
        
        this.timer = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();
            
            if (this.timeRemaining <= 0) {
                this.submitQuiz(true); // Auto-submit when time runs out
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        document.getElementById('time-remaining').textContent = timeString;
        
        // Change color when time is running low
        const timerElement = document.getElementById('timer');
        if (this.timeRemaining <= 300) { // 5 minutes
            timerElement.classList.add('warning');
        }
        if (this.timeRemaining <= 60) { // 1 minute
            timerElement.classList.add('critical');
        }
    }

    bindEvents() {
        // Navigation buttons
        document.getElementById('prev-btn').addEventListener('click', () => {
            if (this.currentQuestion > 0) {
                this.showQuestion(this.currentQuestion - 1);
            }
        });
        
        document.getElementById('next-btn').addEventListener('click', () => {
            if (this.currentQuestion < this.quizData.questions.length - 1) {
                this.showQuestion(this.currentQuestion + 1);
            }
        });
        
        // Submit button
        document.getElementById('submit-btn').addEventListener('click', () => {
            this.confirmSubmit();
        });
        
        // Prevent page refresh/close without warning
        window.addEventListener('beforeunload', (e) => {
            if (this.timer) {
                e.preventDefault();
                e.returnValue = 'Are you sure you want to leave? Your progress will be lost.';
            }
        });
    }

    confirmSubmit() {
        const answeredCount = Object.keys(this.answers).length;
        const totalQuestions = this.quizData.questions.length;
        
        if (answeredCount < totalQuestions) {
            const unanswered = totalQuestions - answeredCount;
            if (!confirm(`You have ${unanswered} unanswered question(s). Are you sure you want to submit?`)) {
                return;
            }
        }
        
        this.submitQuiz(false);
    }

    async submitQuiz(autoSubmit = false) {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        // Calculate score
        let correctAnswers = 0;
        const results = [];
        
        this.quizData.questions.forEach((question, index) => {
            const userAnswer = this.answers[index];
            const isCorrect = userAnswer === question.correctAnswer;
            
            if (isCorrect) correctAnswers++;
            
            results.push({
                questionIndex: index,
                question: question.text,
                options: question.options,
                userAnswer: userAnswer,
                correctAnswer: question.correctAnswer,
                isCorrect: isCorrect
            });
        });
        
        const score = Math.round((correctAnswers / this.quizData.questions.length) * 100);
        
        const submissionData = {
            quizId: this.quizData._id,
            studentInfo: this.studentInfo,
            answers: this.answers,
            score: score,
            correctAnswers: correctAnswers,
            totalQuestions: this.quizData.questions.length,
            timeSpent: (this.quizData.duration * 60) - this.timeRemaining,
            autoSubmit: autoSubmit,
            submittedAt: new Date().toISOString(),
            results: results
        };
        
        try {
            const response = await fetch('/api/quiz-submissions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(submissionData)
            });
            
            if (response.ok) {
                const result = await response.json();
                // Store results for the results page
                localStorage.setItem('quizResults', JSON.stringify(result));
                localStorage.removeItem('currentStudent');
                
                // Redirect to results page
                window.location.href = 'quiz-results-student.html';
            } else {
                throw new Error('Failed to submit quiz');
            }
        } catch (error) {
            console.error('Error submitting quiz:', error);
            this.showError('Failed to submit quiz. Please try again.');
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        document.body.insertBefore(errorDiv, document.body.firstChild);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

// Initialize the quiz when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CBTQuiz();
});