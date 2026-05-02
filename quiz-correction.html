document.addEventListener('DOMContentLoaded', function() {
    const shareId = window.location.pathname.split('/').pop();
    let quizData = null;
    let studentName = '';
    let startTime = null;
    let timerInterval = null;

    document.getElementById('nameForm').addEventListener('submit', startQuiz);
    document.getElementById('submitQuizBtn').addEventListener('click', submitQuiz);

    async function startQuiz(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        studentName = formData.get('studentName');
        
        if (!studentName.trim()) {
            alert('Please enter your name');
            return;
        }

        // Hide name form and show loading
        document.getElementById('studentNameForm').classList.add('hidden');
        document.getElementById('loadingContainer').classList.remove('hidden');

        try {
            const response = await fetch(`/api/quiz/${shareId}`);
            
            if (!response.ok) {
                throw new Error('Quiz not found');
            }

            quizData = await response.json();
            startTime = Date.now();
            
            // Hide loading and show quiz
            document.getElementById('loadingContainer').classList.add('hidden');
            displayQuiz();
            
            // Start timer if time limit is set
            if (quizData.timeLimit > 0) {
                startTimer(quizData.timeLimit * 60); // Convert minutes to seconds
            }
            
        } catch (error) {
            document.getElementById('loadingContainer').classList.add('hidden');
            document.getElementById('errorContainer').classList.remove('hidden');
        }
    }

    function startTimer(timeInSeconds) {
        let remainingTime = timeInSeconds;
        
        // Add timer display to quiz header
        const timerHTML = `
            <div class="stat-card" id="timerCard">
                <div class="stat-number" id="timeRemaining">${formatTime(remainingTime)}</div>
                <div class="stat-label">Time Remaining</div>
            </div>
        `;
        document.querySelector('.dashboard-stats').insertAdjacentHTML('beforeend', timerHTML);
        
        timerInterval = setInterval(() => {
            remainingTime--;
            document.getElementById('timeRemaining').textContent = formatTime(remainingTime);
            
            // Change color when time is running low
            const timerCard = document.getElementById('timerCard');
            if (remainingTime <= 60) { // Last minute
                timerCard.style.backgroundColor = '#fee2e2';
                timerCard.style.borderColor = '#ef4444';
            } else if (remainingTime <= 300) { // Last 5 minutes
                timerCard.style.backgroundColor = '#fef3c7';
                timerCard.style.borderColor = '#f59e0b';
            }
            
            if (remainingTime <= 0) {
                clearInterval(timerInterval);
                alert('Time is up! Submitting your quiz automatically.');
                submitQuiz();
            }
        }, 1000);
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function displayQuiz() {
        document.getElementById('quizContainer').classList.remove('hidden');
        
        // Update quiz header
        document.getElementById('quizTitle').textContent = quizData.title;
        document.getElementById('quizSubject').textContent = `Subject: ${quizData.subject}`;
        document.getElementById('questionCount').textContent = quizData.questions.length;
        
        // Add time limit info if applicable
        if (quizData.timeLimit > 0) {
            document.getElementById('quizSubject').innerHTML += `<br><small>Time Limit: ${quizData.timeLimit} minutes</small>`;
        }
        
        // Display questions
        const questionsContainer = document.getElementById('questionsContainer');
        questionsContainer.innerHTML = '';
        
        quizData.questions.forEach((question, index) => {
            const questionHTML = `
                <div class="question-item">
                    <h3 class="text-primary mb-3">
                        <i class="fas fa-question-circle"></i>
                        Question ${index + 1}
                    </h3>
                    <p class="mb-3"><strong>${question.question}</strong></p>
                    
                    <div class="option-group">
                        ${question.options.map((option, optionIndex) => `
                            <label class="option-item">
                                <input type="radio" name="question-${index}" value="${optionIndex}" required>
                                <span>${String.fromCharCode(65 + optionIndex)}. ${option}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
            
            questionsContainer.insertAdjacentHTML('beforeend', questionHTML);
        });

        // Add change listeners to update current question indicator
        document.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', updateProgress);
        });
    }

    function updateProgress() {
        const answeredQuestions = new Set();
        document.querySelectorAll('input[type="radio"]:checked').forEach(radio => {
            const questionIndex = radio.name.split('-')[1];
            answeredQuestions.add(questionIndex);
        });
        
        document.getElementById('currentQuestion').textContent = answeredQuestions.size;
    }

    async function submitQuiz() {
        // Clear timer if running
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        // Collect answers
        const answers = [];
        let allAnswered = true;
        
        for (let i = 0; i < quizData.questions.length; i++) {
            const selectedOption = document.querySelector(`input[name="question-${i}"]:checked`);
            if (selectedOption) {
                answers.push(parseInt(selectedOption.value));
            } else {
                allAnswered = false;
                break;
            }
        }

        if (!allAnswered) {
            alert('Please answer all questions before submitting');
            return;
        }

        // Calculate time spent
        const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

        // Show loading state
        const submitBtn = document.getElementById('submitQuizBtn');
        const originalBtnContent = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="loading"></span> Submitting...';
        submitBtn.disabled = true;

        try {
            const response = await fetch(`/api/submit/${shareId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    studentName,
                    answers,
                    timeSpent
                })
            });

            const result = await response.json();

            if (response.ok) {
                showResults(result);
            } else {
                alert(result.error || 'Failed to submit quiz');
            }
        } catch (error) {
            alert('Network error. Please try again.');
        } finally {
            submitBtn.innerHTML = originalBtnContent;
            submitBtn.disabled = false;
        }
    }

    function showResults(result) {
        // Hide quiz and show results
        document.getElementById('quizContainer').classList.add('hidden');
        document.getElementById('resultsContainer').classList.remove('hidden');
        
        // Update results
        document.getElementById('finalScore').textContent = result.score;
        document.getElementById('finalTotal').textContent = result.totalQuestions;
        document.getElementById('finalPercentage').textContent = result.percentage + '%';
        
        // Add celebration effect for good scores
        if (result.percentage >= 80) {
            document.querySelector('#resultsContainer .dashboard-title').innerHTML = `
                <i class="fas fa-trophy" style="color: gold;"></i>
                Excellent Work!
            `;
        } else if (result.percentage >= 60) {
            document.querySelector('#resultsContainer .dashboard-title').innerHTML = `
                <i class="fas fa-medal" style="color: silver;"></i>
                Good Job!
            `;
        } else {
            document.querySelector('#resultsContainer .dashboard-title').innerHTML = `
                <i class="fas fa-book-open"></i>
                Keep Learning!
            `;
        }

        // Add correction link
        const correctionLink = `
            <div class="hero-actions mt-4">
                <a href="/correction/${result.correctionId}" class="btn btn-secondary btn-large">
                    <i class="fas fa-eye"></i>
                    View Corrections
                </a>
                <a href="/" class="btn btn-primary btn-large">
                    <i class="fas fa-home"></i>
                    Back to Home
                </a>
            </div>
        `;
        
        document.getElementById('resultsContainer').insertAdjacentHTML('beforeend', correctionLink);
    }
});