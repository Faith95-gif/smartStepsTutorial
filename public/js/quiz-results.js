document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    
    const quizId = window.location.pathname.split('/').pop();
    
    loadQuizResults();
    
    document.getElementById('logoutBtn').addEventListener('click', logout);

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

    async function loadQuizResults() {
        try {
            // Load quiz responses
            const responsesResponse = await fetch(`/api/responses/${quizId}`);
            if (!responsesResponse.ok) {
                throw new Error('Failed to load quiz results');
            }
            
            const data = await responsesResponse.json();
            
            // Load quiz statistics
            const statsResponse = await fetch(`/api/quiz-stats/${quizId}`);
            const stats = await statsResponse.json();
            
            document.getElementById('loadingContainer').classList.add('hidden');
            displayResults(data, stats);
            
        } catch (error) {
            document.getElementById('loadingContainer').classList.add('hidden');
            document.getElementById('errorContainer').classList.remove('hidden');
        }
    }

    function displayResults(data, stats) {
        document.getElementById('resultsContainer').classList.remove('hidden');
        
        // Update quiz information
        document.getElementById('quizInfo').innerHTML = `
            <strong>${data.quiz.title}</strong> - ${data.quiz.subject}<br>
            <small>Total Questions: ${data.quiz.totalQuestions}${data.quiz.timeLimit > 0 ? ` | Time Limit: ${data.quiz.timeLimit} minutes` : ''}</small>
        `;
        
        // Update statistics
        document.getElementById('totalAttempts').textContent = stats.totalAttempts;
        document.getElementById('averageScore').textContent = `${stats.averageScore}%`;
        document.getElementById('highestScore').textContent = `${stats.highestScore}%`;
        
        // Add average time if available
        if (stats.averageTime > 0) {
            const avgTimeCard = `
                <div class="stat-card">
                    <div class="stat-number">${formatTime(stats.averageTime)}</div>
                    <div class="stat-label">Average Time</div>
                </div>
            `;
            document.getElementById('quizStats').insertAdjacentHTML('beforeend', avgTimeCard);
        }
        
        // Display responses table
        displayResponsesTable(data.responses);
    }

    function displayResponsesTable(responses) {
        const container = document.getElementById('responsesTable');
        
        if (responses.length === 0) {
            container.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-clipboard-list fa-3x text-secondary mb-3"></i>
                    <p class="text-secondary">No student responses yet for this quiz.</p>
                </div>
            `;
            return;
        }

        const tableHTML = `
            <div class="table-actions">
                <div class="bulk-actions">
                    <input type="checkbox" id="selectAll" class="select-all-checkbox">
                    <label for="selectAll">Select All</label>
                    <button id="bulkDeleteBtn" class="btn btn-error" disabled>
                        <i class="fas fa-trash-alt"></i>
                        Delete Selected
                    </button>
                </div>
            </div>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th><input type="checkbox" id="headerSelectAll"></th>
                            <th><i class="fas fa-user"></i> Student Name</th>
                            <th><i class="fas fa-trophy"></i> Score</th>
                            <th><i class="fas fa-percentage"></i> Percentage</th>
                            <th><i class="fas fa-clock"></i> Time Spent</th>
                            <th><i class="fas fa-calendar"></i> Submitted</th>
                            <th><i class="fas fa-chart-line"></i> Performance</th>
                            <th><i class="fas fa-cog"></i> Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${responses.map(response => {
                            const percentage = Math.round((response.score / response.totalQuestions) * 100);
                            return `
                                <tr data-response-id="${response._id}">
                                    <td>
                                        <input type="checkbox" class="response-checkbox" value="${response._id}">
                                    </td>
                                    <td><strong>${response.studentName}</strong></td>
                                    <td>${response.score}/${response.totalQuestions}</td>
                                    <td>
                                        <span class="text-${getScoreColor(percentage)}">
                                            ${percentage}%
                                        </span>
                                    </td>
                                    <td>${formatTime(response.timeSpent || 0)}</td>
                                    <td>${new Date(response.submittedAt).toLocaleString()}</td>
                                    <td>
                                        <div class="performance-bar">
                                            <div class="performance-fill ${getScoreColor(percentage)}" 
                                                 style="width: ${percentage}%"></div>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="btn btn-outline btn-sm" onclick="viewStudentDetails('${response._id}')">
                                                <i class="fas fa-eye"></i>
                                                View
                                            </button>
                                            <button class="btn btn-error btn-sm" onclick="deleteResponse('${response._id}', '${response.studentName}')">
                                                <i class="fas fa-trash-alt"></i>
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = tableHTML;
        
        // Set up event listeners for checkboxes and bulk actions
        setupTableEventListeners();
    }

    function setupTableEventListeners() {
        // Select all functionality
        const headerSelectAll = document.getElementById('headerSelectAll');
        const selectAll = document.getElementById('selectAll');
        const responseCheckboxes = document.querySelectorAll('.response-checkbox');
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

        // Sync both select all checkboxes
        [headerSelectAll, selectAll].forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const isChecked = this.checked;
                responseCheckboxes.forEach(cb => cb.checked = isChecked);
                // Sync the other select all checkbox
                if (this === headerSelectAll) selectAll.checked = isChecked;
                else headerSelectAll.checked = isChecked;
                updateBulkDeleteButton();
            });
        });

        // Individual checkbox change handler
        responseCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const allChecked = Array.from(responseCheckboxes).every(cb => cb.checked);
                const noneChecked = Array.from(responseCheckboxes).every(cb => !cb.checked);
                
                headerSelectAll.checked = allChecked;
                selectAll.checked = allChecked;
                headerSelectAll.indeterminate = !allChecked && !noneChecked;
                selectAll.indeterminate = !allChecked && !noneChecked;
                
                updateBulkDeleteButton();
            });
        });

        // Bulk delete button handler
        bulkDeleteBtn.addEventListener('click', handleBulkDelete);
    }

    function updateBulkDeleteButton() {
        const checkedBoxes = document.querySelectorAll('.response-checkbox:checked');
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        
        if (checkedBoxes.length > 0) {
            bulkDeleteBtn.disabled = false;
            bulkDeleteBtn.innerHTML = `
                <i class="fas fa-trash-alt"></i>
                Delete Selected (${checkedBoxes.length})
            `;
        } else {
            bulkDeleteBtn.disabled = true;
            bulkDeleteBtn.innerHTML = `
                <i class="fas fa-trash-alt"></i>
                Delete Selected
            `;
        }
    }

    async function handleBulkDelete() {
        const checkedBoxes = document.querySelectorAll('.response-checkbox:checked');
        const responseIds = Array.from(checkedBoxes).map(cb => cb.value);
        
        if (responseIds.length === 0) return;

        const confirmMessage = `Are you sure you want to delete ${responseIds.length} student response(s)? This action cannot be undone.`;
        
        if (!confirm(confirmMessage)) return;

        try {
            const response = await fetch(`/api/quiz/${quizId}/responses`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ responseIds })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete responses');
            }

            const result = await response.json();
            
            // Show success message
            showNotification('success', result.message);
            
            // Reload the page to refresh data
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error) {
            console.error('Error deleting responses:', error);
            showNotification('error', error.message || 'Failed to delete responses');
        }
    }

    function formatTime(seconds) {
        if (seconds === 0) return 'N/A';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function getScoreColor(percentage) {
        if (percentage >= 80) return 'success';
        if (percentage >= 60) return 'warning';
        return 'error';
    }

    window.viewStudentDetails = function(responseId) {
        window.location.href = `/student-details/${responseId}`;
    };

    window.deleteResponse = async function(responseId, studentName) {
        const confirmMessage = `Are you sure you want to delete ${studentName}'s response? This action cannot be undone.`;
        
        if (!confirm(confirmMessage)) return;

        try {
            const response = await fetch(`/api/response/${responseId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete response');
            }

            const result = await response.json();
            
            // Show success message
            showNotification('success', result.message);
            
            // Remove the row from the table
            const row = document.querySelector(`tr[data-response-id="${responseId}"]`);
            if (row) {
                row.style.transition = 'all 0.3s ease-out';
                row.style.opacity = '0';
                row.style.transform = 'translateX(-100px)';
                
                setTimeout(() => {
                    row.remove();
                    
                    // Check if table is empty now
                    const remainingRows = document.querySelectorAll('tbody tr');
                    if (remainingRows.length === 0) {
                        document.getElementById('responsesTable').innerHTML = `
                            <div class="text-center">
                                <i class="fas fa-clipboard-list fa-3x text-secondary mb-3"></i>
                                <p class="text-secondary">No student responses for this quiz.</p>
                            </div>
                        `;
                    }
                    
                    // Reload to update statistics
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }, 300);
            }

        } catch (error) {
            console.error('Error deleting response:', error);
            showNotification('error', error.message || 'Failed to delete response');
        }
    };

    function showNotification(type, message) {
        // Remove any existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
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