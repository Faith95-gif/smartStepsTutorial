document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    
    let questionCount = 0;
    
    document.getElementById('addQuestionBtn').addEventListener('click', addQuestion);
    document.getElementById('quizForm').addEventListener('submit', createQuiz);
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Add first question by default
    addQuestion();

    async function checkAuthentication() {
        try {
            const response = await fetch('/api/verify');
            if (!response.ok) {
                window.location.href = '/teacher-login';
            }
        } catch (error) {
            window.location.href = '/teacher-login';
        }
    }

    function addQuestion() {
        questionCount++;
        const questionsContainer = document.getElementById('questionsContainer');
        
        const questionHTML = `
            <div class="question-item" id="question-${questionCount}">
                <div class="form-group">
                    <label class="form-label">
                        <i class="fas fa-question-circle"></i>
                        Question ${questionCount}
                    </label>
                    <input type="text" name="question-${questionCount}" class="form-input" required placeholder="Enter your question">
                </div>
                
                <div class="option-group">
                    <label class="form-label">
                        <i class="fas fa-list"></i>
                        Options (Select the correct answer)
                    </label>
                    
                    <div class="option-item">
                        <input type="radio" name="correct-${questionCount}" value="0" required>
                        <input type="text" name="option-${questionCount}-0" class="form-input" required placeholder="Option A">
                    </div>
                    
                    <div class="option-item">
                        <input type="radio" name="correct-${questionCount}" value="1" required>
                        <input type="text" name="option-${questionCount}-1" class="form-input" required placeholder="Option B">
                    </div>
                    
                    <div class="option-item">
                        <input type="radio" name="correct-${questionCount}" value="2" required>
                        <input type="text" name="option-${questionCount}-2" class="form-input" required placeholder="Option C">
                    </div>
                    
                    <div class="option-item">
                        <input type="radio" name="correct-${questionCount}" value="3" required>
                        <input type="text" name="option-${questionCount}-3" class="form-input" required placeholder="Option D">
                    </div>
                </div>

                <div class="text-right">
                    <button type="button" class="btn btn-error" onclick="removeQuestion(${questionCount})">
                        <i class="fas fa-trash"></i>
                        Remove Question
                    </button>
                </div>
            </div>
        `;
        
        questionsContainer.insertAdjacentHTML('beforeend', questionHTML);
    }

    window.removeQuestion = function(questionId) {
        if (questionCount <= 1) {
            showAlert('Quiz must have at least one question', 'warning');
            return;
        }
        
        const questionElement = document.getElementById(`question-${questionId}`);
        questionElement.remove();
        
        // Renumber remaining questions
        renumberQuestions();
    };

    function renumberQuestions() {
        const questions = document.querySelectorAll('.question-item');
        questions.forEach((question, index) => {
            const newNumber = index + 1;
            question.id = `question-${newNumber}`;
            
            // Update question label
            const label = question.querySelector('.form-label');
            label.innerHTML = `<i class="fas fa-question-circle"></i> Question ${newNumber}`;
            
            // Update input names
            const questionInput = question.querySelector('input[type="text"]');
            questionInput.name = `question-${newNumber}`;
            
            const radioInputs = question.querySelectorAll('input[type="radio"]');
            radioInputs.forEach(radio => {
                radio.name = `correct-${newNumber}`;
            });
            
            const optionInputs = question.querySelectorAll('input[type="text"]:not(:first-child)');
            optionInputs.forEach((input, optionIndex) => {
                input.name = `option-${newNumber}-${optionIndex}`;
            });
            
            // Update remove button
            const removeBtn = question.querySelector('.btn-error');
            removeBtn.setAttribute('onclick', `removeQuestion(${newNumber})`);
        });
        
        questionCount = questions.length;
    }

    async function createQuiz(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const title = formData.get('title');
        const timeLimit = parseInt(formData.get('timeLimit')) || 0;
        
        // Parse questions
        const questions = [];
        for (let i = 1; i <= questionCount; i++) {
            const question = formData.get(`question-${i}`);
            if (question) {
                const options = [
                    formData.get(`option-${i}-0`),
                    formData.get(`option-${i}-1`),
                    formData.get(`option-${i}-2`),
                    formData.get(`option-${i}-3`)
                ];
                const correctAnswer = parseInt(formData.get(`correct-${i}`));
                
                questions.push({
                    question,
                    options,
                    correctAnswer
                });
            }
        }

        if (questions.length === 0) {
            showAlert('Please add at least one question', 'error');
            return;
        }

        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalBtnContent = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="loading"></span> Creating Quiz...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/quiz', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title, questions, timeLimit })
            });

            const result = await response.json();

            if (response.ok) {
                showAlert('Quiz created successfully! Redirecting to dashboard...', 'success');
                setTimeout(() => {
                    window.location.href = '/teacher-dashboard';
                }, 2000);
            } else {
                showAlert(result.error || 'Failed to create quiz', 'error');
            }
        } catch (error) {
            showAlert('Network error. Please try again.', 'error');
        } finally {
            submitBtn.innerHTML = originalBtnContent;
            submitBtn.disabled = false;
        }
    }

    function showAlert(message, type) {
        const alertContainer = document.getElementById('alert-container');
        alertContainer.innerHTML = `
            <div class="alert alert-${type}">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'exclamation-circle'}"></i>
                ${message}
            </div>
        `;
        
        setTimeout(() => {
            alertContainer.innerHTML = '';
        }, 5000);
    }

    async function logout() {
        try {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/';
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = '/';
        }
    }
});