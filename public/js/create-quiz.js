class QuizCreator {
    constructor() {
        this.questions = [];
        this.currentImageTarget = null;
        this.passageImage = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.addInitialQuestion();
    }

    bindEvents() {
        // Form submission
        document.getElementById('quiz-form').addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Add question button
        document.getElementById('add-question').addEventListener('click', () => this.addQuestion());
        
        // Toggle passage section
        document.getElementById('toggle-passage').addEventListener('click', () => this.togglePassage());
        
        // Add passage image
        document.getElementById('add-passage-image').addEventListener('click', () => this.openImageModal('passage'));
        
        // Image modal events
        this.bindImageModalEvents();
        
        // Preview quiz
        document.getElementById('preview-quiz').addEventListener('click', () => this.previewQuiz());
    }

    bindImageModalEvents() {
        const modal = document.getElementById('image-upload-modal');
        const closeBtn = modal.querySelector('.close');
        const cancelBtn = document.getElementById('cancel-upload');
        const uploadBtn = document.getElementById('upload-image');
        const imageInput = document.getElementById('image-input');
        const uploadArea = document.getElementById('upload-area');

        // Close modal events
        closeBtn.addEventListener('click', () => this.closeImageModal());
        cancelBtn.addEventListener('click', () => this.closeImageModal());
        
        // Click outside modal to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeImageModal();
        });

        // Upload area click
        uploadArea.addEventListener('click', () => imageInput.click());

        // File input change
        imageInput.addEventListener('change', (e) => this.handleImageSelect(e));

        // Upload button
        uploadBtn.addEventListener('click', () => this.uploadImage());

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                imageInput.files = files;
                this.handleImageSelect({ target: { files } });
            }
        });
    }

    addInitialQuestion() {
        this.addQuestion();
    }

    addQuestion() {
        const questionNumber = this.questions.length + 1;
        const questionId = `question-${Date.now()}`;
        
        const questionHtml = `
            <div class="question-item" data-question-id="${questionId}">
                <div class="question-header">
                    <span class="question-number">Question ${questionNumber}</span>
                    <button type="button" class="btn btn-danger btn-sm" onclick="quizCreator.removeQuestion('${questionId}')">Remove</button>
                </div>
                
                <div class="form-group">
                    <label>Question Text</label>
                    <textarea class="question-text" name="questions[${questionId}][text]" rows="3" placeholder="Enter your question here..." required></textarea>
                </div>

                <div class="form-group">
                    <button type="button" class="btn btn-outline" onclick="quizCreator.openImageModal('question', '${questionId}')">Add Image to Question</button>
                    <div class="image-container" id="question-image-${questionId}"></div>
                </div>
                
                <div class="form-group">
                    <label>Answer Options</label>
                    <div class="options-container">
                        <div class="option-item">
                            <input type="radio" name="questions[${questionId}][correct]" value="0" required>
                            <input type="text" name="questions[${questionId}][options][0]" placeholder="Option A" required>
                        </div>
                        <div class="option-item">
                            <input type="radio" name="questions[${questionId}][correct]" value="1" required>
                            <input type="text" name="questions[${questionId}][options][1]" placeholder="Option B" required>
                        </div>
                        <div class="option-item">
                            <input type="radio" name="questions[${questionId}][correct]" value="2" required>
                            <input type="text" name="questions[${questionId}][options][2]" placeholder="Option C" required>
                        </div>
                        <div class="option-item">
                            <input type="radio" name="questions[${questionId}][correct]" value="3" required>
                            <input type="text" name="questions[${questionId}][options][3]" placeholder="Option D" required>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('questions-container').insertAdjacentHTML('beforeend', questionHtml);
        this.questions.push({ id: questionId, image: null });
        this.updateQuestionNumbers();
    }

    removeQuestion(questionId) {
        if (this.questions.length <= 1) {
            alert('You must have at least one question.');
            return;
        }

        if (confirm('Are you sure you want to remove this question?')) {
            // Remove image from Cloudinary if exists
            const question = this.questions.find(q => q.id === questionId);
            if (question && question.image) {
                this.deleteImageFromCloudinary(question.image.publicId);
            }

            document.querySelector(`[data-question-id="${questionId}"]`).remove();
            this.questions = this.questions.filter(q => q.id !== questionId);
            this.updateQuestionNumbers();
        }
    }

    updateQuestionNumbers() {
        const questionItems = document.querySelectorAll('.question-item');
        questionItems.forEach((item, index) => {
            const questionNumber = item.querySelector('.question-number');
            questionNumber.textContent = `Question ${index + 1}`;
        });
    }

    togglePassage() {
        const passageSection = document.getElementById('passage-section');
        const toggleBtn = document.getElementById('toggle-passage');
        
        if (passageSection.style.display === 'none') {
            passageSection.style.display = 'block';
            toggleBtn.textContent = 'Remove Reading Passage';
            toggleBtn.classList.remove('btn-secondary');
            toggleBtn.classList.add('btn-danger');
        } else {
            passageSection.style.display = 'none';
            toggleBtn.textContent = 'Add Reading Passage';
            toggleBtn.classList.remove('btn-danger');
            toggleBtn.classList.add('btn-secondary');
            
            // Clear passage data
            document.getElementById('passage-title').value = '';
            document.getElementById('passage-text').value = '';
            if (this.passageImage) {
                this.deleteImageFromCloudinary(this.passageImage.publicId);
                this.passageImage = null;
                document.getElementById('passage-image-container').innerHTML = '';
            }
        }
    }

    openImageModal(type, questionId = null) {
        this.currentImageTarget = { type, questionId };
        const modal = document.getElementById('image-upload-modal');
        modal.style.display = 'block';
        
        // Reset modal state
        document.getElementById('image-preview').style.display = 'none';
        document.getElementById('upload-area').style.display = 'block';
        document.getElementById('upload-image').disabled = true;
        document.getElementById('image-input').value = '';
    }

    closeImageModal() {
        const modal = document.getElementById('image-upload-modal');
        modal.style.display = 'none';
        this.currentImageTarget = null;
        
        // Reset modal state
        document.getElementById('image-preview').style.display = 'none';
        document.getElementById('upload-area').style.display = 'block';
        document.getElementById('upload-progress').style.display = 'none';
        document.getElementById('upload-image').disabled = true;
        document.getElementById('image-input').value = '';
    }

    handleImageSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size must be less than 5MB.');
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('preview-img').src = e.target.result;
            document.getElementById('upload-area').style.display = 'none';
            document.getElementById('image-preview').style.display = 'block';
            document.getElementById('upload-image').disabled = false;
        };
        reader.readAsDataURL(file);
    }

    async uploadImage() {
        const fileInput = document.getElementById('image-input');
        const file = fileInput.files[0];
        if (!file) return;

        const uploadBtn = document.getElementById('upload-image');
        const progressContainer = document.getElementById('upload-progress');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');

        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';
        progressContainer.style.display = 'block';

        try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch('/api/upload-image', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const result = await response.json();
            
            // Update progress to 100%
            progressFill.style.width = '100%';
            progressText.textContent = '100%';

            // Add image to the appropriate container
            this.addImageToContainer(result);
            
            // Close modal
            setTimeout(() => {
                this.closeImageModal();
            }, 500);

        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload image. Please try again.');
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Upload Image';
        }
    }

    addImageToContainer(imageData) {
        const { type, questionId } = this.currentImageTarget;
        
        const imageHtml = `
            <div class="image-item">
                <img src="${imageData.url}" alt="Uploaded image">
                <div class="image-info">
                    <h4>Image uploaded</h4>
                    <p>Size: ${this.formatFileSize(imageData.bytes)}</p>
                </div>
                <button type="button" class="btn btn-danger btn-sm" onclick="quizCreator.removeImage('${type}', '${questionId}', '${imageData.publicId}')">Remove</button>
            </div>
        `;

        if (type === 'passage') {
            document.getElementById('passage-image-container').innerHTML = imageHtml;
            this.passageImage = imageData;
        } else if (type === 'question') {
            document.getElementById(`question-image-${questionId}`).innerHTML = imageHtml;
            const question = this.questions.find(q => q.id === questionId);
            if (question) {
                question.image = imageData;
            }
        }
    }

    async removeImage(type, questionId, publicId) {
        if (!confirm('Are you sure you want to remove this image?')) return;

        try {
            await this.deleteImageFromCloudinary(publicId);
            
            if (type === 'passage') {
                document.getElementById('passage-image-container').innerHTML = '';
                this.passageImage = null;
            } else if (type === 'question') {
                document.getElementById(`question-image-${questionId}`).innerHTML = '';
                const question = this.questions.find(q => q.id === questionId);
                if (question) {
                    question.image = null;
                }
            }
        } catch (error) {
            console.error('Error removing image:', error);
            alert('Failed to remove image. Please try again.');
        }
    }

    async deleteImageFromCloudinary(publicId) {
        const response = await fetch('/api/delete-image', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ publicId })
        });

        if (!response.ok) {
            throw new Error('Failed to delete image');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const quizData = {
            title: formData.get('title'),
            subject: formData.get('subject'),
            duration: parseInt(formData.get('duration')),
            instructions: formData.get('instructions'),
            questions: [],
            passage: null
        };

        // Add passage if exists
        const passageTitle = formData.get('passageTitle');
        const passageText = formData.get('passageText');
        if (passageTitle || passageText) {
            quizData.passage = {
                title: passageTitle,
                text: passageText,
                image: this.passageImage
            };
        }

        // Process questions
        this.questions.forEach((questionObj, index) => {
            const questionId = questionObj.id;
            const questionText = formData.get(`questions[${questionId}][text]`);
            const correctAnswer = parseInt(formData.get(`questions[${questionId}][correct]`));
            
            const options = [];
            for (let i = 0; i < 4; i++) {
                options.push(formData.get(`questions[${questionId}][options][${i}]`));
            }

            quizData.questions.push({
                text: questionText,
                options: options,
                correctAnswer: correctAnswer,
                image: questionObj.image
            });
        });

        try {
            const response = await fetch('/api/quizzes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(quizData)
            });

            if (response.ok) {
                const result = await response.json();
                alert('Quiz created successfully!');
                window.location.href = 'teacher-dashboard.html';
            } else {
                throw new Error('Failed to create quiz');
            }
        } catch (error) {
            console.error('Error creating quiz:', error);
            alert('Failed to create quiz. Please try again.');
        }
    }

    previewQuiz() {
        // This would open a preview modal or new window
        alert('Preview functionality would be implemented here');
    }
}

// Initialize the quiz creator when the page loads
const quizCreator = new QuizCreator();