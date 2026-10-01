/**
 * App Module - Central Coordinator for UI, Events, Navigation, Modals, and Toasts
 */

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

const App = {
    todayDateStr: '',
    currentView: 'dashboard', // 'dashboard' | 'history' | 'statistics'
    searchQuery: '',
    statusFilter: 'all', // 'all' | 'completed' | 'incomplete'
    sortBy: 'default', // 'default' | 'newest' | 'oldest' | 'completed_first' | 'incomplete_first'

    // Modal state
    editingTaskId: null,
    deletingTaskId: null,

    init() {
        // 1. Detect local date YYYY-MM-DD
        this.todayDateStr = this.getTodayDate();

        // 2. Check & seed sample data if empty
        Storage.seedSampleData(false);

        // 3. Initialize History module state
        HistoryManager.init(this.todayDateStr);

        // 4. Load & apply theme settings
        this.loadSettings();

        // 5. Update header info (Date, Greeting)
        this.updateHeaderInfo();

        // 6. Bind all UI event listeners
        this.bindEvents();

        // 7. Initial View render
        this.switchView('dashboard');
    },

    /**
     * Get today's local date as YYYY-MM-DD string
     */
    getTodayDate() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    },

    /**
     * Format YYYY-MM-DD to friendly full date (e.g. "Thursday, October 1, 2026")
     */
    formatFullDate(dateStr) {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return dateObj.toLocaleDateString('en-US', options);
    },

    /**
     * Get greeting based on time of day
     */
    getGreeting(userName = 'Rounak') {
        const hour = new Date().getHours();
        let greetingWord = 'Good Morning';
        if (hour >= 12 && hour < 17) {
            greetingWord = 'Good Afternoon';
        } else if (hour >= 17) {
            greetingWord = 'Good Evening';
        }
        return `${greetingWord}, ${userName}`;
    },

    /**
     * Load settings and set UI state
     */
    loadSettings() {
        const settings = Storage.getSettings();
        document.documentElement.setAttribute('data-theme', settings.theme || 'light');
        
        const themeIcon = document.getElementById('theme-toggle-icon');
        const themeText = document.getElementById('theme-toggle-text');
        
        if (themeIcon && themeText) {
            if (settings.theme === 'dark') {
                themeText.textContent = 'Dark';
                themeIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
            } else {
                themeText.textContent = 'Light';
                themeIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
            }
        }
    },

    /**
     * Toggle Light/Dark theme
     */
    toggleTheme() {
        const currentSettings = Storage.getSettings();
        const newTheme = currentSettings.theme === 'dark' ? 'light' : 'dark';
        Storage.saveSettings({ theme: newTheme });
        this.loadSettings();
        this.showToast(`Switched to ${newTheme} theme`, 'info');
    },

    /**
     * Update Header greeting & date displays
     */
    updateHeaderInfo() {
        const settings = Storage.getSettings();
        const greetingEl = document.getElementById('user-greeting');
        const headerDateEl = document.getElementById('header-today-date');
        const dashboardDateSub = document.getElementById('dashboard-date-sub');

        if (greetingEl) greetingEl.textContent = this.getGreeting(settings.userName);
        const formatted = this.formatFullDate(this.todayDateStr);
        if (headerDateEl) headerDateEl.textContent = formatted;
        if (dashboardDateSub) dashboardDateSub.textContent = formatted;
    },

    /**
     * View Switcher Navigation
     */
    switchView(viewName) {
        this.currentView = viewName;

        // Navigation tab active state
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('data-view') === viewName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Toggle view containers
        document.querySelectorAll('.view-section').forEach(sec => {
            sec.style.display = 'none';
        });

        const targetSec = document.getElementById(`view-${viewName}`);
        if (targetSec) {
            targetSec.style.display = 'block';
        }

        // Render target view content
        if (viewName === 'dashboard') {
            this.renderDashboard();
        } else if (viewName === 'history') {
            this.renderHistoryView();
        } else if (viewName === 'statistics') {
            this.renderStatisticsView();
        }
    },

    /**
     * Bind all global event listeners
     */
    bindEvents() {
        // Navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.getAttribute('data-view');
                if (view) this.switchView(view);
            });
        });

        // Theme Toggle
        document.getElementById('theme-toggle-btn')?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Add Task Modal triggers
        document.getElementById('btn-open-add-modal')?.addEventListener('click', () => {
            this.openAddModal();
        });
        document.getElementById('btn-empty-add-task')?.addEventListener('click', () => {
            this.openAddModal();
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close, .btn-modal-cancel').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModals();
            });
        });

        // Modal backdrop click to close
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    this.closeModals();
                }
            });
        });

        // Global ESC key to close modal
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModals();
            }
        });

        // Form Submit: Add Task
        document.getElementById('form-add-task')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddTaskSubmit();
        });

        // Form Submit: Edit Task
        document.getElementById('form-edit-task')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEditTaskSubmit();
        });

        // Confirm Delete Task
        document.getElementById('btn-confirm-delete')?.addEventListener('click', () => {
            this.handleConfirmDelete();
        });

        // Search Input
        const searchInput = document.getElementById('search-task-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.renderDashboard();
            });
        }

        // Status Filter Buttons
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.statusFilter = chip.getAttribute('data-filter');
                this.renderDashboard();
            });
        });

        // Sort Dropdown
        const sortSelect = document.getElementById('sort-task-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.renderDashboard();
            });
        }
    },

    /**
     * RENDER DASHBOARD VIEW
     */
    renderDashboard() {
        const progress = TaskManager.getProgressForDate(this.todayDateStr);

        // Update Progress Summary UI
        const progressBarFill = document.getElementById('progress-bar-fill');
        const progressPercentText = document.getElementById('progress-percentage-text');
        const countCompletedText = document.getElementById('count-completed');
        const countRemainingText = document.getElementById('count-remaining');
        const countTotalText = document.getElementById('count-total');

        if (progressBarFill) progressBarFill.style.width = `${progress.percentage}%`;
        if (progressPercentText) progressPercentText.textContent = `${progress.percentage}%`;
        if (countCompletedText) countCompletedText.textContent = progress.completed;
        if (countRemainingText) countRemainingText.textContent = progress.remaining;
        if (countTotalText) countTotalText.textContent = progress.total;

        // Fetch Dashboard Tasks
        const tasks = TaskManager.getTasksForDashboard(
            this.todayDateStr,
            this.searchQuery,
            this.statusFilter,
            this.sortBy
        );

        const container = document.getElementById('tasks-container');
        const emptyState = document.getElementById('tasks-empty-state');

        if (!container) return;

        if (tasks.length === 0) {
            container.innerHTML = '';
            if (emptyState) {
                emptyState.style.display = 'flex';
                // Customize empty state message if caused by search/filter
                const emptyTitle = emptyState.querySelector('.empty-title');
                const emptyText = emptyState.querySelector('.empty-text');
                
                if (this.searchQuery || this.statusFilter !== 'all') {
                    if (emptyTitle) emptyTitle.textContent = 'No matching tasks found';
                    if (emptyText) emptyText.textContent = 'Try adjusting your search query or filter criteria.';
                } else {
                    if (emptyTitle) emptyTitle.textContent = 'No tasks yet';
                    if (emptyText) emptyText.textContent = 'Start building your daily routine by adding your first task.';
                }
            }
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        // Render Task Cards
        container.innerHTML = tasks.map(task => this.createTaskCardHtml(task)).join('');

        // Attach event handlers to task cards
        this.bindTaskCardEvents(container);
    },

    /**
     * Generate HTML for a single task card
     */
    createTaskCardHtml(task) {
        const isCompleted = task.status === 'completed';
        const statusBadgeText = isCompleted ? 'Completed' : 'Incomplete';
        const cardClass = isCompleted ? 'task-card completed' : 'task-card';

        return `
            <div class="${cardClass}" data-task-id="${task.id}">
                <div class="task-card-header">
                    <div class="task-title-group">
                        <button type="button" class="btn-toggle-status ${isCompleted ? 'checked' : ''}" data-task-id="${task.id}" aria-label="Toggle Completion">
                            ${isCompleted ? 
                                `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>` : 
                                ``
                            }
                        </button>
                        <div>
                            <h3 class="task-title">${this.escapeHtml(task.title)}</h3>
                            ${task.description ? `<p class="task-description">${this.escapeHtml(task.description)}</p>` : ''}
                        </div>
                    </div>
                    <div class="task-card-actions">
                        <button type="button" class="btn-icon btn-edit-task" data-task-id="${task.id}" title="Edit Task">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </button>
                        <button type="button" class="btn-icon btn-delete-task danger" data-task-id="${task.id}" title="Delete Task">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </div>

                <!-- Daily Note Box -->
                <div class="task-note-box">
                    <label class="task-note-label" for="note-${task.id}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Today's Note
                    </label>
                    <div class="task-note-input-wrapper">
                        <textarea 
                            id="note-${task.id}"
                            class="task-note-textarea" 
                            data-task-id="${task.id}" 
                            placeholder="Add a note about today's progress..."
                            rows="2"
                        >${this.escapeHtml(task.note || '')}</textarea>
                        <button type="button" class="btn btn-sm btn-secondary btn-save-note" data-task-id="${task.id}">Save Note</button>
                    </div>
                </div>

                <div class="task-card-footer">
                    <span class="status-badge ${isCompleted ? 'completed' : 'pending'}">${statusBadgeText}</span>
                    <button type="button" class="btn btn-sm ${isCompleted ? 'btn-secondary' : 'btn-primary'} btn-toggle-status-main" data-task-id="${task.id}">
                        ${isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Bind event handlers to task card components
     */
    bindTaskCardEvents(container) {
        // Toggle Status Checkbox & Main Button
        container.querySelectorAll('.btn-toggle-status, .btn-toggle-status-main').forEach(btn => {
            btn.addEventListener('click', () => {
                const taskId = btn.getAttribute('data-task-id');
                const newStatus = TaskManager.toggleStatus(taskId, this.todayDateStr);
                
                this.renderDashboard();
                const msg = newStatus === 'completed' ? 'Task marked as completed! ✓' : 'Task marked as incomplete';
                this.showToast(msg, newStatus === 'completed' ? 'success' : 'info');
            });
        });

        // Edit Button
        container.querySelectorAll('.btn-edit-task').forEach(btn => {
            btn.addEventListener('click', () => {
                const taskId = btn.getAttribute('data-task-id');
                this.openEditModal(taskId);
            });
        });

        // Delete Button
        container.querySelectorAll('.btn-delete-task').forEach(btn => {
            btn.addEventListener('click', () => {
                const taskId = btn.getAttribute('data-task-id');
                this.openDeleteModal(taskId);
            });
        });

        // Note Save Button & Auto Save on blur
        container.querySelectorAll('.btn-save-note').forEach(btn => {
            btn.addEventListener('click', () => {
                const taskId = btn.getAttribute('data-task-id');
                const textarea = container.querySelector(`textarea[data-task-id="${taskId}"]`);
                if (textarea) {
                    TaskManager.updateNote(taskId, this.todayDateStr, textarea.value);
                    this.showToast('Daily note saved! ✓', 'success');
                }
            });
        });

        container.querySelectorAll('.task-note-textarea').forEach(textarea => {
            textarea.addEventListener('blur', () => {
                const taskId = textarea.getAttribute('data-task-id');
                TaskManager.updateNote(taskId, this.todayDateStr, textarea.value);
            });
        });
    },

    /**
     * RENDER HISTORY VIEW
     */
    renderHistoryView() {
        const calContainer = document.getElementById('history-calendar-container');
        const detailContainer = document.getElementById('history-detail-container');

        if (!calContainer || !detailContainer) return;

        // Render Calendar
        HistoryManager.renderCalendar(calContainer, this.todayDateStr, (selectedDateStr) => {
            this.renderHistoryDateDetails(detailContainer, selectedDateStr);
        });

        // Render initial details for selected date
        this.renderHistoryDateDetails(detailContainer, HistoryManager.selectedDate || this.todayDateStr);
    },

    /**
     * Render task details for a historical date
     */
    renderHistoryDateDetails(container, dateStr) {
        const historyData = HistoryManager.getHistoryForDate(dateStr);
        const formattedDate = this.formatFullDate(dateStr);

        let tasksListHtml = '';
        if (historyData.tasks.length === 0) {
            tasksListHtml = `
                <div class="empty-state-small">
                    <p class="empty-text">No tasks existed on ${formattedDate}.</p>
                </div>
            `;
        } else {
            tasksListHtml = historyData.tasks.map(task => `
                <div class="history-task-item ${task.status === 'completed' ? 'completed' : ''}">
                    <div class="history-task-main">
                        <span class="history-status-icon ${task.status === 'completed' ? 'check' : 'cross'}">
                            ${task.status === 'completed' ? '✓' : '✗'}
                        </span>
                        <div>
                            <h4 class="history-task-title">${this.escapeHtml(task.title)}</h4>
                            ${task.description ? `<p class="history-task-desc">${this.escapeHtml(task.description)}</p>` : ''}
                        </div>
                    </div>
                    ${task.note ? `
                        <div class="history-task-note">
                            <span class="note-tag">Note:</span> ${this.escapeHtml(task.note)}
                        </div>
                    ` : '<div class="history-task-note empty-note">No note recorded</div>'}
                </div>
            `).join('');
        }

        const html = `
            <div class="history-date-header">
                <h3>${formattedDate}</h3>
                <span class="history-completion-badge">${historyData.percentage}% Completed</span>
            </div>

            <div class="history-summary-pills">
                <div class="summary-pill completed-pill">
                    <span class="pill-number">${historyData.completed}</span>
                    <span class="pill-label">Completed</span>
                </div>
                <div class="summary-pill incomplete-pill">
                    <span class="pill-number">${historyData.incomplete}</span>
                    <span class="pill-label">Incomplete</span>
                </div>
                <div class="summary-pill total-pill">
                    <span class="pill-number">${historyData.total}</span>
                    <span class="pill-label">Total Tasks</span>
                </div>
            </div>

            <div class="history-tasks-list">
                ${tasksListHtml}
            </div>
        `;

        container.innerHTML = html;
    },

    /**
     * RENDER STATISTICS VIEW
     */
    renderStatisticsView() {
        const statsContainer = document.getElementById('statistics-page-container');
        if (statsContainer) {
            StatisticsManager.renderStatisticsPage(statsContainer, this.todayDateStr);
        }
    },

    /**
     * MODAL HANDLERS
     */
    openAddModal() {
        this.closeModals();
        const modal = document.getElementById('modal-add-task');
        const form = document.getElementById('form-add-task');
        if (form) form.reset();
        if (modal) modal.classList.add('active');
        document.getElementById('add-task-title')?.focus();
    },

    openEditModal(taskId) {
        this.closeModals();
        const tasks = Storage.getTasks();
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        this.editingTaskId = taskId;
        const modal = document.getElementById('modal-edit-task');
        const titleInput = document.getElementById('edit-task-title');
        const descInput = document.getElementById('edit-task-desc');

        if (titleInput) titleInput.value = task.title;
        if (descInput) descInput.value = task.description || '';

        if (modal) modal.classList.add('active');
        titleInput?.focus();
    },

    openDeleteModal(taskId) {
        this.closeModals();
        this.deletingTaskId = taskId;
        const modal = document.getElementById('modal-delete-task');
        if (modal) modal.classList.add('active');
    },

    closeModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
        this.editingTaskId = null;
        this.deletingTaskId = null;
    },

    handleAddTaskSubmit() {
        const titleInput = document.getElementById('add-task-title');
        const descInput = document.getElementById('add-task-desc');

        const title = titleInput?.value.trim();
        const desc = descInput?.value.trim();

        if (!title) {
            this.showToast('Task title is required', 'warning');
            return;
        }

        try {
            TaskManager.createTask(title, desc, this.todayDateStr);
            this.closeModals();
            this.renderDashboard();
            this.showToast('✓ Task added successfully', 'success');
        } catch (err) {
            this.showToast(err.message || 'Error adding task', 'error');
        }
    },

    handleEditTaskSubmit() {
        if (!this.editingTaskId) return;

        const titleInput = document.getElementById('edit-task-title');
        const descInput = document.getElementById('edit-task-desc');

        const title = titleInput?.value.trim();
        const desc = descInput?.value.trim();

        if (!title) {
            this.showToast('Task title is required', 'warning');
            return;
        }

        try {
            TaskManager.editTask(this.editingTaskId, title, desc);
            this.closeModals();
            this.renderDashboard();
            this.showToast('✓ Task updated successfully', 'success');
        } catch (err) {
            this.showToast(err.message || 'Error updating task', 'error');
        }
    },

    handleConfirmDelete() {
        if (!this.deletingTaskId) return;

        try {
            TaskManager.deleteTask(this.deletingTaskId);
            this.closeModals();
            this.renderDashboard();
            this.showToast('✓ Task removed from active tracking (history preserved)', 'info');
        } catch (err) {
            this.showToast(err.message || 'Error deleting task', 'error');
        }
    },

    /**
     * TOAST NOTIFICATIONS
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconHtml = 'ℹ️';
        if (type === 'success') iconHtml = '✓';
        if (type === 'warning') iconHtml = '⚠️';
        if (type === 'error') iconHtml = '❌';

        toast.innerHTML = `
            <span class="toast-icon">${iconHtml}</span>
            <span class="toast-message">${this.escapeHtml(message)}</span>
        `;

        container.appendChild(toast);

        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);

        // Auto remove after 3s
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /**
     * HTML Escaping Security Utility
     */
    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
};
