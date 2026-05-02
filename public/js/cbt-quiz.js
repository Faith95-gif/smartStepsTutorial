document.addEventListener('DOMContentLoaded', function() {
    const shareId = window.location.pathname.split('/').pop();
    let quizData = null;
    let studentName = '';
    let startTime = null;
    let timerInterval = null;
    let currentQuestionIndex = 0;
    let studentAnswers = [];
    let passages = {};
    let quizEnded = false; // Flag to prevent actions after time up
    
    // Anti-cheating variables
    let visibilityViolations = 0;
    let maxViolations = 3;
    let isWarningShown = false;
    let examTerminated = false;
    let lastViolationTime = 0;
    let violationCooldown = 1000; // 1 second cooldown to prevent double counting
    let violationReasons = []; // Track all violation reasons

    // DOM Elements
    const studentNameForm = document.getElementById('studentNameForm');
    const loadingContainer = document.getElementById('loadingContainer');
    const quizContainer = document.getElementById('quizContainer');
    const resultsContainer = document.getElementById('resultsContainer');
    const errorContainer = document.getElementById('errorContainer');
    
    // Quiz elements
    const quizTitle = document.getElementById('quizTitle');
    const quizSubject = document.getElementById('quizSubject');
    const currentQuestionNum = document.getElementById('currentQuestionNum');
    const totalQuestions = document.getElementById('totalQuestions');
    const questionNumber = document.getElementById('questionNumber');
    const questionText = document.getElementById('questionText');
    const optionsContainer = document.getElementById('optionsContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const questionIndicators = document.getElementById('questionIndicators');
    
    // Navigation elements
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    
    // Timer elements
    const timerDisplay = document.getElementById('timerDisplay');
    const timeRemaining = document.getElementById('timeRemaining');

    // Event Listeners
    document.getElementById('nameForm').addEventListener('submit', startQuiz);
    prevBtn.addEventListener('click', () => { if (!quizEnded) previousQuestion(); });
    nextBtn.addEventListener('click', () => { if (!quizEnded) nextQuestion(); });
    submitBtn.addEventListener('click', () => { if (!quizEnded) submitQuiz(); });

    // Initialize anti-cheating monitoring
    initializeAntiCheating();

    function initializeAntiCheating() {
        // Create violation counter display
        const violationCounter = document.createElement('div');
        violationCounter.id = 'violationCounter';
        violationCounter.className = 'violation-counter';
        violationCounter.innerHTML = `
            <i class="fas fa-shield-alt"></i>
            <span>Violations: <span id="violationCount">0</span>/${maxViolations}</span>
        `;
        document.body.appendChild(violationCounter);

        // Page visibility change detection
        document.addEventListener('visibilitychange', function() {
            if (document.hidden && !quizEnded && !examTerminated && canRecordViolation()) {
                recordViolation('Tab switched or window minimized');
            }
        });

        // Window focus/blur detection
        window.addEventListener('blur', function() {
            if (!quizEnded && !examTerminated && canRecordViolation()) {
                recordViolation('Window lost focus');
            }
        });

        // Prevent right-click context menu
        document.addEventListener('contextmenu', function(e) {
            if (!quizEnded && !examTerminated) {
                e.preventDefault();
                recordViolation('Right-click attempted');
            }
        });

        // Prevent common keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (quizEnded || examTerminated) return;

            // Prevent F12, Ctrl+Shift+I, Ctrl+U, etc.
            if (e.key === 'F12' || 
                (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                (e.ctrlKey && e.shiftKey && e.key === 'C') ||
                (e.ctrlKey && e.key === 'u') ||
                (e.ctrlKey && e.key === 's') ||
                (e.ctrlKey && e.key === 'a') ||
                (e.ctrlKey && e.key === 'p')) {
                e.preventDefault();
                recordViolation('Attempted to use developer tools or shortcuts');
            }

            // Prevent Alt+Tab
            if (e.altKey && e.key === 'Tab') {
                e.preventDefault();
                recordViolation('Attempted to switch applications');
            }
        });

        // Detect copy/paste attempts
        document.addEventListener('copy', function(e) {
            if (!quizEnded && !examTerminated) {
                e.preventDefault();
                recordViolation('Copy attempt detected');
            }
        });

        document.addEventListener('paste', function(e) {
            if (!quizEnded && !examTerminated) {
                e.preventDefault();
                recordViolation('Paste attempt detected');
            }
        });

        // Detect text selection (potential copying)
        document.addEventListener('selectstart', function(e) {
            if (!quizEnded && !examTerminated) {
                // Allow selection in input fields
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                }
            }
        });

        // Fullscreen monitoring
        document.addEventListener('fullscreenchange', function() {
            if (!document.fullscreenElement && !quizEnded && !examTerminated) {
                recordViolation('Exited fullscreen mode');
            }
        });

        // Request fullscreen when quiz starts
        function requestFullscreen() {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {
                    console.log('Fullscreen request failed');
                });
            }
        }

        // Auto-request fullscreen when quiz container becomes visible
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.target === quizContainer && !quizContainer.classList.contains('hidden')) {
                    setTimeout(requestFullscreen, 500);
                }
            });
        });

        observer.observe(quizContainer, { attributes: true, attributeFilter: ['class'] });
    }

    function canRecordViolation() {
        const now = Date.now();
        if (now - lastViolationTime < violationCooldown) {
            return false; // Too soon, likely duplicate event
        }
        return true;
    }

    function recordViolation(reason) {
        if (examTerminated) return;
        
        // Prevent duplicate violations within cooldown period
        const now = Date.now();
        if (now - lastViolationTime < violationCooldown) {
            return;
        }
        
        lastViolationTime = now;
        visibilityViolations++;
        
        // Store violation with timestamp
        violationReasons.push({
            reason: reason,
            timestamp: new Date().toLocaleTimeString(),
            violationNumber: visibilityViolations
        });
        
        console.log(`Violation ${visibilityViolations}: ${reason}`);
        
        // Update violation counter display
        updateViolationCounter();
        
        if (visibilityViolations === 1) {
            showFirstWarning(reason);
        } else if (visibilityViolations === 2) {
            showSecondWarning(reason);
        } else if (visibilityViolations >= maxViolations) {
            terminateExam();
        }
    }

    function updateViolationCounter() {
        const violationCount = document.getElementById('violationCount');
        if (violationCount) {
            violationCount.textContent = visibilityViolations;
            
            // Change color based on violation level
            const counter = document.getElementById('violationCounter');
            if (visibilityViolations >= maxViolations - 1) {
                counter.classList.add('danger');
                counter.classList.remove('warning');
            } else if (visibilityViolations > 0) {
                counter.classList.add('warning');
            }
        }
    }

    function showFirstWarning(reason) {
        const warningModal = document.createElement('div');
        warningModal.className = 'violation-modal';
        warningModal.innerHTML = `
            <div class="violation-modal-content">
                <div class="violation-icon warning">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h2>⚠️ FIRST WARNING</h2>
                <p><strong>Violation Detected:</strong> ${reason}</p>
                <p>You have used <strong>1</strong> out of <strong>${maxViolations}</strong> allowed violations.</p>
                <p><strong>⚠️ You have ${maxViolations - 1} more chances before your exam is terminated!</strong></p>
                <div class="warning-rules">
                    <h3>📋 Exam Rules Reminder</h3>
                    <ul>
                        <li>Do not switch tabs or applications</li>
                        <li>Do not minimize the browser window</li>
                        <li>Do not navigate away from this page</li>
                        <li>Do not use browser shortcuts or developer tools</li>
                        <li>Stay completely focused on the exam</li>
                    </ul>
                </div>
                <button id="acknowledgeFirstWarning" class="btn btn-warning">
                    <i class="fas fa-check"></i>
                    I Understand - Continue Exam
                </button>
            </div>
        `;
        
        document.body.appendChild(warningModal);
        
        // Add click outside to close (disabled for security)
        // warningModal.addEventListener('click', function(e) {
        //     if (e.target === warningModal) {
        //         warningModal.remove();
        //     }
        // });
        
        document.getElementById('acknowledgeFirstWarning').addEventListener('click', function() {
            warningModal.remove();
        });

        // Auto-remove after 10 seconds if not acknowledged
        setTimeout(() => {
            if (document.body.contains(warningModal)) {
                warningModal.remove();
            }
        }, 10000);
    }

    function showSecondWarning(reason) {
        const warningModal = document.createElement('div');
        warningModal.className = 'violation-modal';
        warningModal.innerHTML = `
            <div class="violation-modal-content">
                <div class="violation-icon danger">
                    <i class="fas fa-skull-crossbones"></i>
                </div>
                <h2>🚨 FINAL WARNING - LAST CHANCE!</h2>
                <p><strong>Violation Detected:</strong> ${reason}</p>
                <p>You have used <strong>2</strong> out of <strong>${maxViolations}</strong> allowed violations.</p>
                <p class="final-warning-text">
                    🚨 ONE MORE VIOLATION WILL IMMEDIATELY TERMINATE YOUR EXAM! 🚨
                </p>
                <div class="warning-rules">
                    <h3>🔴 CRITICAL REMINDER</h3>
                    <ul>
                        <li><strong>This is your absolute final warning!</strong></li>
                        <li><strong>Any further violation will end your exam permanently</strong></li>
                        <li>Do not switch tabs, minimize window, or leave this page</li>
                        <li>Do not use any keyboard shortcuts</li>
                        <li>Stay completely focused - your exam depends on it!</li>
                    </ul>
                </div>
                <button id="acknowledgeSecondWarning" class="btn btn-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    I Understand - This Is My Last Chance
                </button>
            </div>
        `;
        
        document.body.appendChild(warningModal);
        
        document.getElementById('acknowledgeSecondWarning').addEventListener('click', function() {
            warningModal.remove();
        });

        // Auto-remove after 15 seconds if not acknowledged
        setTimeout(() => {
            if (document.body.contains(warningModal)) {
                warningModal.remove();
            }
        }, 15000);
    }

    function terminateExam() {
        examTerminated = true;
        quizEnded = true;
        
        // Clear any running timer
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        // Hide all containers
        studentNameForm.classList.add('hidden');
        loadingContainer.classList.add('hidden');
        quizContainer.classList.add('hidden');
        resultsContainer.classList.add('hidden');
        errorContainer.classList.add('hidden');
        
        // Remove any existing modals
        const existingModals = document.querySelectorAll('.violation-modal');
        existingModals.forEach(modal => modal.remove());
        
        // Show comprehensive termination message
        showTerminationScreen();
        
        // Try to submit partial answers
        submitPartialAnswers();
    }

    function showTerminationScreen() {
        const terminationContainer = document.createElement('div');
        terminationContainer.className = 'termination-container';
        
        // Create violation list HTML
        const violationListHTML = violationReasons.map(violation => `
            <div class="violation-item">
                <span>Violation #${violation.violationNumber}: ${violation.reason}</span>
                <span class="violation-time">${violation.timestamp}</span>
            </div>
        `).join('');
        
        terminationContainer.innerHTML = `
            <div class="termination-content">
                <div class="termination-icon">
                    <i class="fas fa-ban"></i>
                </div>
                <h1 class="termination-title">EXAM TERMINATED</h1>
                <p style="font-size: 1.2rem; margin-bottom: 1.5rem; color: var(--danger-color); font-weight: 600;">
                    Your examination has been automatically terminated due to multiple violations of exam security rules.
                </p>
                
                <div class="violation-summary">
                    <h3>📊 Violation Summary</h3>
                    <p style="text-align: center; margin-bottom: 1rem;">
                        <strong>Total Violations: ${visibilityViolations} out of ${maxViolations} allowed</strong>
                    </p>
                    <div class="violation-list">
                        ${violationListHTML}
                    </div>
                </div>
                
                <div style="background: var(--surface-secondary); padding: 1.5rem; border-radius: var(--border-radius-lg); margin: 2rem 0;">
                    <h3 style="color: var(--danger-color); margin-bottom: 1rem;">🔍 What Happened?</h3>
                    <p style="margin-bottom: 1rem;">The proctoring system detected ${visibilityViolations} security violations:</p>
                    <ul style="text-align: left; margin-left: 2rem;">
                        <li><strong>Switching tabs or applications</strong></li>
                        <li><strong>Minimizing the browser window</strong></li>
                        <li><strong>Navigating away from the exam page</strong></li>
                        <li><strong>Using prohibited keyboard shortcuts</strong></li>
                        <li><strong>Attempting to copy/paste content</strong></li>
                    </ul>
                </div>
                
                <div style="background: rgba(220, 38, 38, 0.1); padding: 1.5rem; border-radius: var(--border-radius-lg); border: 2px solid var(--danger-color); margin: 2rem 0;">
                    <h3 style="color: var(--danger-color); margin-bottom: 1rem;">📞 Next Steps</h3>
                    <p style="margin-bottom: 0.5rem;"><strong>Your partial answers have been automatically submitted.</strong></p>
                    <p style="margin-bottom: 0.5rem;">Please contact your instructor immediately to discuss this incident.</p>
                    <p style="color: var(--text-secondary);">Student: <strong>${studentName}</strong></p>
                    <p style="color: var(--text-secondary);">Time: <strong>${new Date().toLocaleString()}</strong></p>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <a href="/" class="btn btn-primary btn-large">
                        <i class="fas fa-home"></i>
                        Return to Home
                    </a>
                    <button onclick="window.print()" class="btn btn-secondary btn-large">
                        <i class="fas fa-print"></i>
                        Print Report
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(terminationContainer);
    }

    async function submitPartialAnswers() {
        if (!quizData || !studentName) return;
        
        try {
            const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
            const finalAnswers = studentAnswers.map(answer => answer !== null ? answer : -1);
            
            await fetch(`/api/submit/${shareId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    studentName,
                    answers: finalAnswers,
                    timeSpent,
                    terminated: true,
                    violations: visibilityViolations,
                    violationReasons: violationReasons
                })
            });
        } catch (error) {
            console.error('Failed to submit partial answers:', error);
        }
    }

    async function startQuiz(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        studentName = formData.get('studentName');
        
        if (!studentName.trim()) {
            alert('Please enter your name');
            return;
        }

        // Hide name form and show loading
        studentNameForm.classList.add('hidden');
        loadingContainer.classList.remove('hidden');

        try {
            const response = await fetch(`/api/quiz/${shareId}`);
            
            if (!response.ok) {
                throw new Error('Quiz not found');
            }

            quizData = await response.json();
            startTime = Date.now();
            
            // Store passages for easy access
            if (quizData.passages) {
                quizData.passages.forEach(passage => {
                    passages[passage.id] = passage;
                });
            }
            
            // Initialize student answers array
            studentAnswers = new Array(quizData.questions.length).fill(null);
            
            // Hide loading and show quiz
            loadingContainer.classList.add('hidden');
            initializeQuiz();
            
            // Start timer if time limit is set
            if (quizData.timeLimit > 0) {
                startTimer(quizData.timeLimit * 60); // Convert minutes to seconds
            }
            
        } catch (error) {
            loadingContainer.classList.add('hidden');
            errorContainer.classList.remove('hidden');
        }
    }

    function initializeQuiz() {
        quizContainer.classList.remove('hidden');
        
        // Set quiz information
        quizTitle.textContent = quizData.title;
        quizSubject.textContent = `Subject: ${quizData.subject}`;
        totalQuestions.textContent = quizData.questions.length;
        
        // Add time limit info if applicable
        if (quizData.timeLimit > 0) {
            quizSubject.innerHTML += `<br><small>Time Limit: ${quizData.timeLimit} minutes</small>`;
            timerDisplay.style.display = 'block';
        }
        
        // Create question indicators
        createQuestionIndicators();
        
        // Display first question
        displayQuestion(0);
        
        // Update navigation
        updateNavigation();
    }

    function createQuestionIndicators() {
        questionIndicators.innerHTML = '';
        
        for (let i = 0; i < quizData.questions.length; i++) {
            const indicator = document.createElement('div');
            indicator.className = 'question-indicator';
            indicator.textContent = i + 1;
            indicator.addEventListener('click', () => { if (!quizEnded) goToQuestion(i); });
            questionIndicators.appendChild(indicator);
        }
    }

    function displayQuestion(index) {
        if (index < 0 || index >= quizData.questions.length || quizEnded) return;
        
        currentQuestionIndex = index;
        const question = quizData.questions[index];
        
        // Update question info
        currentQuestionNum.textContent = index + 1;
        questionNumber.textContent = index + 1;
        questionText.innerHTML = question.question;
        
        // Display question images if available
        if (question.imageUrls && question.imageUrls.length > 0) {
            const imagesHTML = question.imageUrls.map((url, idx) => 
                `<img src="${url}" class="question-image" alt="Question image ${idx + 1}">`
            ).join('');
            questionText.innerHTML += `<br>${imagesHTML}`;
        }
        
        // Update progress
        const progress = ((index + 1) / quizData.questions.length) * 100;
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `Question ${index + 1} of ${quizData.questions.length}`;
        
        // Display reading passage if this question has one
        displayReadingPassage(question);
        
        // Display options
        displayOptions(question.options, index);
        
        // Update indicators
        updateQuestionIndicators();
        
        // Update navigation
        updateNavigation();
        
        // Add animation
        document.querySelector('.question-content').style.animation = 'none';
        setTimeout(() => {
            if (!quizEnded) {
                document.querySelector('.question-content').style.animation = 'fadeIn 0.3s ease-in-out';
            }
        }, 10);
    }

    function displayReadingPassage(question) {
        // Remove existing passage
        const existingPassage = document.querySelector('.reading-passage');
        if (existingPassage) {
            existingPassage.remove();
        }
        
        // Check if this question has a passage
        if (question.passageId && passages[question.passageId]) {
            const passage = passages[question.passageId];
            
            // Calculate passage progress
            const passageQuestions = quizData.questions.filter(q => q.passageId === question.passageId);
            const currentPassageIndex = passageQuestions.findIndex(q => q === question) + 1;
            
            const passageHTML = `
                <div class="reading-passage">
                    <div class="passage-info">
                        <span>Reading Comprehension</span>
                        <span class="passage-progress">Question ${currentPassageIndex} of ${passage.questionCount}</span>
                    </div>
                    <div class="passage-text">${passage.text}</div>
                </div>
            `;
            
            // Insert passage before question card
            const questionContainer = document.getElementById('questionContainer');
            questionContainer.insertAdjacentHTML('afterbegin', passageHTML);
        }
    }

    function displayOptions(options, questionIndex) {
        optionsContainer.innerHTML = '';
        
        options.forEach((option, optionIndex) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option-item';
            
            // Check if this option was previously selected
            if (studentAnswers[questionIndex] === optionIndex) {
                optionElement.classList.add('selected');
            }
            
            optionElement.innerHTML = `
                <div class="option-radio"></div>
                <span class="option-letter">${String.fromCharCode(65 + optionIndex)}.</span>
                <span class="option-text">${option}</span>
            `;
            
            optionElement.addEventListener('click', () => { 
                if (!quizEnded) selectOption(questionIndex, optionIndex); 
            });
            optionsContainer.appendChild(optionElement);
        });
    }

    function selectOption(questionIndex, optionIndex) {
        if (quizEnded) return;
        
        // Update student answers
        studentAnswers[questionIndex] = optionIndex;
        
        // Update UI
        const optionItems = optionsContainer.querySelectorAll('.option-item');
        optionItems.forEach((item, index) => {
            if (index === optionIndex) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        
        // Update question indicators
        updateQuestionIndicators();
    }

    function updateQuestionIndicators() {
        const indicators = questionIndicators.querySelectorAll('.question-indicator');
        
        indicators.forEach((indicator, index) => {
            indicator.classList.remove('current', 'answered');
            
            if (index === currentQuestionIndex) {
                indicator.classList.add('current');
            }
            
            if (studentAnswers[index] !== null) {
                indicator.classList.add('answered');
            }
        });
    }

    function updateNavigation() {
        // Update Previous button
        prevBtn.disabled = currentQuestionIndex === 0 || quizEnded;
        
        // Update Next/Submit button
        if (currentQuestionIndex === quizData.questions.length - 1) {
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'flex';
            submitBtn.disabled = quizEnded;
        } else {
            nextBtn.style.display = 'flex';
            nextBtn.disabled = quizEnded;
            submitBtn.style.display = 'none';
        }
    }

    function previousQuestion() {
        if (currentQuestionIndex > 0 && !quizEnded) {
            displayQuestion(currentQuestionIndex - 1);
        }
    }

    function nextQuestion() {
        if (currentQuestionIndex < quizData.questions.length - 1 && !quizEnded) {
            displayQuestion(currentQuestionIndex + 1);
        }
    }

    function goToQuestion(index) {
        if (index >= 0 && index < quizData.questions.length && !quizEnded) {
            displayQuestion(index);
        }
    }

    function startTimer(timeInSeconds) {
        let remainingTime = timeInSeconds;
        
        function updateTimer() {
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            timeRemaining.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Change color when time is running low
            if (remainingTime <= 60) { // Last minute
                timeRemaining.classList.add('timer-danger');
            } else if (remainingTime <= 300) { // Last 5 minutes
                timeRemaining.classList.add('timer-warning');
            }
        }
        
        updateTimer();
        
        timerInterval = setInterval(() => {
            remainingTime--;
            updateTimer();
            
            if (remainingTime <= 0) {
                clearInterval(timerInterval);
                // IMMEDIATE SUBMISSION - NO MERCY, NO ALERTS
                forceSubmitQuiz();
            }
        }, 1000);
    }

    // Force submit function for when timer expires
    async function forceSubmitQuiz() {
        quizEnded = true; // Lock all interactions
        
        // Disable all interactive elements immediately
        disableAllInteractions();
        
        // Calculate time spent
        const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

        try {
            // Convert null answers to -1 for unanswered questions
            const finalAnswers = studentAnswers.map(answer => answer !== null ? answer : -1);
            
            const response = await fetch(`/api/submit/${shareId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    studentName,
                    answers: finalAnswers,
                    timeSpent,
                    forceSubmit: true // Flag to indicate automatic submission
                })
            });

            const result = await response.json();

            if (response.ok) {
                showResults(result, true); // Pass true to indicate time expired
            } else {
                // Even on error, show a basic result to prevent user from continuing
                showTimeExpiredError();
            }
        } catch (error) {
            // Network error - still show time expired message
            showTimeExpiredError();
        }
    }

    function disableAllInteractions() {
        // Disable all navigation buttons
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        submitBtn.disabled = true;
        
        // Disable all option clicks
        const allOptions = document.querySelectorAll('.option-item');
        allOptions.forEach(option => {
            option.style.pointerEvents = 'none';
            option.style.opacity = '0.6';
        });
        
        // Disable question indicators
        const indicators = document.querySelectorAll('.question-indicator');
        indicators.forEach(indicator => {
            indicator.style.pointerEvents = 'none';
            indicator.style.opacity = '0.6';
        });
        
        // Add visual overlay to indicate quiz is locked
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 0, 0, 0.1);
            z-index: 999;
            pointer-events: none;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            color: red;
            font-weight: bold;
        `;
        overlay.innerHTML = 'TIME EXPIRED - SUBMITTING...';
        document.body.appendChild(overlay);
    }

    function showTimeExpiredError() {
        quizContainer.innerHTML = `
            <div class="alert alert-error" style="text-align: center; padding: 2rem;">
                <i class="fas fa-clock" style="font-size: 3rem; color: red; margin-bottom: 1rem;"></i>
                <h2>Time Expired</h2>
                <p>Your quiz time has ended. The system attempted to submit your answers automatically.</p>
                <p>Please contact your instructor if you need assistance.</p>
                <div style="margin-top: 2rem;">
                    <a href="/" class="btn btn-primary">
                        <i class="fas fa-home"></i>
                        Back to Home
                    </a>
                </div>
            </div>
        `;
    }

    async function submitQuiz() {
        if (quizEnded) return; // Prevent manual submission after time expires
        
        // Check if all questions are answered
        const unansweredQuestions = [];
        studentAnswers.forEach((answer, index) => {
            if (answer === null) {
                unansweredQuestions.push(index + 1);
            }
        });

        if (unansweredQuestions.length > 0) {
            const confirmSubmit = confirm(
                `You have ${unansweredQuestions.length} unanswered question(s): ${unansweredQuestions.join(', ')}.\n\nDo you want to submit anyway?`
            );
            
            if (!confirmSubmit) {
                // Go to first unanswered question
                const firstUnanswered = unansweredQuestions[0] - 1;
                displayQuestion(firstUnanswered);
                return;
            }
        }

        quizEnded = true; // Prevent further interactions
        
        // Clear timer if running
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        // Calculate time spent
        const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

        // Show loading state
        submitBtn.innerHTML = '<span class="loading"></span> Submitting...';
        submitBtn.disabled = true;

        try {
            // Convert null answers to -1 for unanswered questions
            const finalAnswers = studentAnswers.map(answer => answer !== null ? answer : -1);
            
            const response = await fetch(`/api/submit/${shareId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    studentName,
                    answers: finalAnswers,
                    timeSpent,
                    violations: visibilityViolations,
                    violationReasons: violationReasons
                })
            });

            const result = await response.json();

            if (response.ok) {
                showResults(result);
            } else {
                alert(result.error || 'Failed to submit quiz');
                quizEnded = false; // Allow retry
            }
        } catch (error) {
            alert('Network error. Please try again.');
            quizEnded = false; // Allow retry
        } finally {
            if (!quizEnded) {
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Submit Quiz';
                submitBtn.disabled = false;
            }
        }
    }

    function showResults(result, timeExpired = false) {
        // Hide quiz and show results
        quizContainer.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
        
        // Update results
        document.getElementById('finalScore').textContent = result.score;
        document.getElementById('finalTotal').textContent = result.totalQuestions;
        document.getElementById('finalPercentage').textContent = result.percentage + '%';
        
        // Add different messaging based on how quiz ended
        let titleHTML;
        if (timeExpired) {
            titleHTML = `
                <i class="fas fa-clock" style="color: red;"></i>
                Time Expired - Results
            `;
        } else if (result.percentage >= 80) {
            titleHTML = `
                <i class="fas fa-trophy" style="color: gold;"></i>
                Excellent Work!
            `;
        } else if (result.percentage >= 60) {
            titleHTML = `
                <i class="fas fa-medal" style="color: silver;"></i>
                Good Job!
            `;
        } else {
            titleHTML = `
                <i class="fas fa-book-open"></i>
                Keep Learning!
            `;
        }
        
        document.querySelector('#resultsContainer .dashboard-title').innerHTML = titleHTML;

        // Add violation warning if any violations occurred
        if (visibilityViolations > 0) {
            const violationWarning = document.createElement('div');
            violationWarning.className = 'alert alert-error';
            violationWarning.style.margin = '1rem 2rem';
            violationWarning.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <span>Warning: ${visibilityViolations} exam violations were recorded and reported to your instructor.</span>
            `;
            resultsContainer.querySelector('.dashboard-header').appendChild(violationWarning);
        }

        // Add correction link
        const correctionLink = `
            <div class="hero-actions mt-4">
                <a style="
    position: relative;
    bottom: 100px;
" href="/correction/${result.correctionId}" class="btn btn-secondary btn-large">
                    <i class="fas fa-eye"></i>
                    View Corrections
                </a>
                <a href="/" class="btn btn-primary btn-large">
                    <i class="fas fa-home"></i>
                    Back to Home
                </a>
            </div>
        `;
        
        resultsContainer.insertAdjacentHTML('beforeend', correctionLink);
    }

    // Keyboard navigation - disabled when quiz ends
    document.addEventListener('keydown', function(e) {
        if (quizContainer.classList.contains('hidden') || quizEnded) return;
        
        switch(e.key) {
            case 'ArrowLeft':
                if (!prevBtn.disabled) {
                    previousQuestion();
                }
                break;
            case 'ArrowRight':
                if (currentQuestionIndex < quizData.questions.length - 1) {
                    nextQuestion();
                }
                break;
            case 'Enter':
                if (currentQuestionIndex === quizData.questions.length - 1) {
                    submitQuiz();
                } else {
                    nextQuestion();
                }
                break;
            case '1':
            case '2':
            case '3':
            case '4':
                const optionIndex = parseInt(e.key) - 1;
                const currentQuestion = quizData.questions[currentQuestionIndex];
                if (optionIndex < currentQuestion.options.length) {
                    selectOption(currentQuestionIndex, optionIndex);
                }
                break;
        }
    });

    // Prevent accidental page refresh - but allow it if quiz has ended
    window.addEventListener('beforeunload', function(e) {
        if (!quizContainer.classList.contains('hidden') && !resultsContainer.classList.contains('hidden') && !quizEnded) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
});
