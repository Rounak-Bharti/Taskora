/**
 * App Module - Central Coordinator for UI, Events, Navigation, Advanced Task Management, Modals & Toasts
 */

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

const App = {
    todayDateStr: '',
    currentView: 'dashboard', // 'dashboard' | 'history' | 'statistics'
    searchQuery: '',
    statusFilter: 'all', // 'all' | 'completed' | 'incomplete'
    priorityFilter: 'all', // 'all' | 'high' | 'medium' | 'low'
    categoryFilter: 'all', // 'all' | 'Study' | 'Work' ...
    sortBy: 'default', // 'default' | 'newest' | 'oldest' | 'priority_high' | 'priority_low' | 'alphabetical' | 'completed_first' | 'incomplete_first'

    // Modal state
    editingTaskId: null,
    deletingTaskId: null,
    viewingHistoryTaskId: null,

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

        // 6. Populate Category Dropdowns
        this.populateCategoryDropdowns();

        // 7. Bind all UI event listeners
        this.bindEvents();

        // 8. Initial View render
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
     * Populate Category Dropdowns dynamically (Predefined + Custom categories)
     */
    populateCategoryDropdowns() {
        const categories = Storage.getCategories();

        // 1. Add Task Category select
        const addSelect = document.getElementById('add-task-category');
        if (addSelect) {
            addSelect.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
        }

        // 2. Edit Task Category select
        const editSelect = document.getElementById('edit-task-category');
        if (editSelect) {
            editSelect.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
        }

        // 3. Filter Category select
        const filterSelect = document.getElementById('filter-category-select');
        if (filterSelect) {
            const currentVal = this.categoryFilter;
            filterSelect.innerHTML = `<option value="all">Category: All</option>` + 
                categories.map(c => `<option value="${c}">Category: ${c}</option>`).join('');
            filterSelect.value = currentVal;
        }
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

        // Add Custom Category triggers
        document.getElementById('btn-open-add-category')?.addEventListener('click', () => {
            this.openAddCategoryModal();
        });
        document.getElementById('btn-open-add-category-edit')?.addEventListener('click', () => {
            this.openAddCategoryModal();
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

        // Global ESC key to close modal & dismiss menus
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModals();
                this.closeAllDropdownMenus();
            }
        });

        // Dismiss dropdown menus when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.task-menu-container')) {
                this.closeAllDropdownMenus();
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

        // Form Submit: Add Custom Category
        document.getElementById('form-add-category')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddCategorySubmit();
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

        // Status Filter Chips
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.statusFilter = chip.getAttribute('data-filter');
                this.renderDashboard();
            });
        });

        // Priority Filter Select
        const prioritySelect = document.getElementById('filter-priority-select');
        if (prioritySelect) {
            prioritySelect.addEventListener('change', (e) => {
                this.priorityFilter = e.target.value;
                this.renderDashboard();
            });
        }

        // Category Filter Select
        const categorySelect = document.getElementById('filter-category-select');
        if (categorySelect) {
            categorySelect.addEventListener('change', (e) => {
                this.categoryFilter = e.target.value;
                this.renderDashboard();
            });
        }

        // Sort Select
        const sortSelect = document.getElementById('sort-task-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.renderDashboard();
            });
        }

        // Clear Filters Buttons
        document.getElementById('btn-clear-filters')?.addEventListener('click', () => {
            this.clearFilters();
        });
        document.getElementById('btn-empty-clear-filters')?.addEventListener('click', () => {
            this.clearFilters();
        });
    },

    /**
     * Clear all search, filter, and sort criteria (Section 14)
     */
    clearFilters() {
        this.searchQuery = '';
        this.statusFilter = 'all';
        this.priorityFilter = 'all';
        this.categoryFilter = 'all';
        this.sortBy = 'default';

        const searchInput = document.getElementById('search-task-input');
        if (searchInput) searchInput.value = '';

        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        document.getElementById('chip-status-all')?.classList.add('active');

        const pSel = document.getElementById('filter-priority-select');
        if (pSel) pSel.value = 'all';

        const cSel = document.getElementById('filter-category-select');
        if (cSel) cSel.value = 'all';

        const sSel = document.getElementById('sort-task-select');
        if (sSel) sSel.value = 'default';

        this.renderDashboard();
        this.showToast('All search & filters reset', 'info');
    },

    /**
     * Close all active task three-dot dropdown menus
     */
    closeAllDropdownMenus() {
        document.querySelectorAll('.task-dropdown-menu').forEach(menu => {
            menu.style.display = 'none';
        });
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

        // Update Status Filter Counts
        const statusCounts = TaskManager.getStatusCounts(this.todayDateStr);
        document.getElementById('cnt-status-all') && (document.getElementById('cnt-status-all').textContent = statusCounts.all);
        document.getElementById('cnt-status-completed') && (document.getElementById('cnt-status-completed').textContent = statusCounts.completed);
        document.getElementById('cnt-status-incomplete') && (document.getElementById('cnt-status-incomplete').textContent = statusCounts.incomplete);

        // Fetch Dashboard Filtered Tasks
        const tasks = TaskManager.getFilteredAndSortedTasks(
            this.todayDateStr,
            this.searchQuery,
            this.statusFilter,
            this.priorityFilter,
            this.categoryFilter,
            this.sortBy
        );

        const availableCount = TaskManager.getStatusCounts(this.todayDateStr).all;
        const resultCountEl = document.getElementById('filter-result-count');
        if (resultCountEl) {
            resultCountEl.textContent = `Showing ${tasks.length} of ${availableCount} tasks`;
        }

        // Render Summary Widgets (Category & Priority)
        this.renderCategorySummaryWidget();
        this.renderPrioritySummaryWidget();

        const container = document.getElementById('tasks-container');
        const emptyState = document.getElementById('tasks-empty-state');

        if (!container) return;

        if (tasks.length === 0) {
            container.innerHTML = '';
            if (emptyState) {
                emptyState.style.display = 'flex';
                const emptyTitle = emptyState.querySelector('.empty-title');
                const emptyText = emptyState.querySelector('.empty-text');
                
                if (this.searchQuery || this.statusFilter !== 'all' || this.priorityFilter !== 'all' || this.categoryFilter !== 'all') {
                    if (emptyTitle) emptyTitle.textContent = 'No matching tasks found';
                    if (emptyText) emptyText.textContent = 'Try adjusting or clearing your search and filter criteria.';
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
     * Render Dashboard Category Summary Widget
     */
    renderCategorySummaryWidget() {
        const container = document.getElementById('dashboard-category-summary');
        if (!container) return;

        const summary = TaskManager.getCategorySummary(this.todayDateStr);
        const categories = Object.keys(summary);

        if (categories.length === 0) {
            container.innerHTML = `<span class="widget-label">Categories:</span> <span class="empty-widget-text">No active tasks</span>`;
            return;
        }

        const pillsHtml = categories.map(cat => `
            <span class="widget-pill category-pill-sm" data-category="${cat}">
                <strong>${this.escapeHtml(cat)}</strong> (${summary[cat]})
            </span>
        `).join('');

        container.innerHTML = `
            <span class="widget-label">Categories:</span>
            <div class="widget-pills-row">${pillsHtml}</div>
        `;
    },

    /**
     * Render Dashboard Priority Summary Widget
     */
    renderPrioritySummaryWidget() {
        const container = document.getElementById('dashboard-priority-summary');
        if (!container) return;

        const counts = TaskManager.getPriorityCounts(this.todayDateStr);

        container.innerHTML = `
            <span class="widget-label">Priority:</span>
            <div class="widget-pills-row">
                <span class="widget-pill priority-pill-sm high">High (${counts.high})</span>
                <span class="widget-pill priority-pill-sm medium">Medium (${counts.medium})</span>
                <span class="widget-pill priority-pill-sm low">Low (${counts.low})</span>
            </div>
        `;
    },

    /**
     * Generate HTML for a single task card (Redesigned per Section 5, 6, 19)
     */
    createTaskCardHtml(task) {
        const isCompleted = task.status === 'completed';
        const statusBadgeText = isCompleted ? 'Completed' : 'Incomplete';
        const cardClass = isCompleted ? 'task-card completed' : 'task-card';

        const priorityLabel = (task.priority || 'medium').toUpperCase();
        const categoryLabel = task.category || 'General';
        const createdDateFormatted = this.formatFullDate(task.createdAt);

        return `
            <div class="${cardClass}" data-task-id="${task.id}">
                <div class="task-card-header">
                    <div class="task-title-group">
                        <button type="button" class="btn-toggle-status ${isCompleted ? 'checked' : ''}" data-task-id="${task.id}" title="Toggle Completion">
                            ${isCompleted ? 
                                `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>` : 
                                ``
                            }
                        </button>
                        <div>
                            <h3 class="task-title ${isCompleted ? 'line-through' : ''}">${this.escapeHtml(task.title)}</h3>
                            ${task.description ? `<p class="task-description">${this.escapeHtml(task.description)}</p>` : ''}
                        </div>
                    </div>

                    <!-- Three-Dot Menu -->
                    <div class="task-menu-container">
                        <button type="button" class="btn-icon btn-task-menu" data-task-id="${task.id}" title="Task Options" aria-label="Task Options">
                            ⋮
                        </button>
                        <div class="task-dropdown-menu" id="menu-${task.id}" style="display: none;">
                            <button type="button" class="dropdown-item btn-edit-task" data-task-id="${task.id}">
                                ✏️ Edit Task
                            </button>
                            <button type="button" class="dropdown-item btn-task-history" data-task-id="${task.id}">
                                📜 View History
                            </button>
                            <div class="dropdown-divider"></div>
                            <button type="button" class="dropdown-item danger btn-delete-task" data-task-id="${task.id}">
                                🗑️ Delete Task
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Badges Row (Category & Priority) -->
                <div class="task-badges-row">
                    <span class="badge category-badge">📁 ${this.escapeHtml(categoryLabel)}</span>
                    <span class="badge priority-badge ${task.priority}">${priorityLabel} PRIORITY</span>
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
                    <div class="footer-left">
                        <span class="status-badge ${isCompleted ? 'completed' : 'pending'}">${statusBadgeText}</span>
                        <span class="created-date-tag">Created ${createdDateFormatted}</span>
                    </div>
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

        // Three-Dot Menu Button Toggle
        container.querySelectorAll('.btn-task-menu').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = btn.getAttribute('data-task-id');
                const menu = document.getElementById(`menu-${taskId}`);
                
                const isVisible = menu && menu.style.display === 'block';
                this.closeAllDropdownMenus();

                if (menu && !isVisible) {
                    menu.style.display = 'block';
                }
            });
        });

        // Edit Button
        container.querySelectorAll('.btn-edit-task').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeAllDropdownMenus();
                const taskId = btn.getAttribute('data-task-id');
                this.openEditModal(taskId);
            });
        });

        // View Task History Button
        container.querySelectorAll('.btn-task-history').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeAllDropdownMenus();
                const taskId = btn.getAttribute('data-task-id');
                this.openTaskHistoryModal(taskId);
            });
        });

        // Delete Button
        container.querySelectorAll('.btn-delete-task').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeAllDropdownMenus();
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
            HistoryManager.renderHistoryForDate(detailContainer, selectedDateStr, this.todayDateStr);
        });

        // Render initial details for selected date
        const initialDate = HistoryManager.selectedDate || this.todayDateStr;
        HistoryManager.renderHistoryForDate(detailContainer, initialDate, this.todayDateStr);
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
        this.populateCategoryDropdowns();

        const modal = document.getElementById('modal-add-task');
        const form = document.getElementById('form-add-task');
        if (form) form.reset();

        // Default priority radio medium checked
        const mediumRadio = form?.querySelector('input[name="add-priority"][value="medium"]');
        if (mediumRadio) mediumRadio.checked = true;

        if (modal) modal.classList.add('active');
        document.getElementById('add-task-title')?.focus();
    },

    openEditModal(taskId) {
        this.closeModals();
        this.populateCategoryDropdowns();

        const tasks = Storage.getTasks();
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        this.editingTaskId = taskId;
        const modal = document.getElementById('modal-edit-task');
        const titleInput = document.getElementById('edit-task-title');
        const descInput = document.getElementById('edit-task-desc');
        const catSelect = document.getElementById('edit-task-category');
        const prioSelect = document.getElementById('edit-task-priority');

        if (titleInput) titleInput.value = task.title;
        if (descInput) descInput.value = task.description || '';
        if (catSelect) catSelect.value = task.category || 'General';
        if (prioSelect) prioSelect.value = (task.priority || 'medium').toLowerCase();

        if (modal) modal.classList.add('active');
        titleInput?.focus();
    },

    openAddCategoryModal() {
        const modal = document.getElementById('modal-add-category');
        const form = document.getElementById('form-add-category');
        if (form) form.reset();
        if (modal) modal.classList.add('active');
        document.getElementById('custom-category-name')?.focus();
    },

    openTaskHistoryModal(taskId) {
        this.closeModals();
        this.viewingHistoryTaskId = taskId;

        const historyInfo = TaskManager.getTaskHistory(taskId);
        if (!historyInfo) return;

        const modal = document.getElementById('modal-task-history');
        const titleEl = document.getElementById('task-history-title');
        const metaEl = document.getElementById('task-history-meta');
        const bodyEl = document.getElementById('task-history-body');

        if (titleEl) titleEl.textContent = `${historyInfo.task.title} — History`;
        if (metaEl) metaEl.textContent = `📁 ${historyInfo.task.category} • 🔥 ${historyInfo.task.priority.toUpperCase()} Priority • Created ${this.formatFullDate(historyInfo.task.createdAt)}`;

        let recordsHtml = '';
        if (historyInfo.records.length === 0) {
            recordsHtml = `<p class="empty-text">No historical daily records recorded yet for this task.</p>`;
        } else {
            recordsHtml = historyInfo.records.map(rec => `
                <div class="task-history-item ${rec.status === 'completed' ? 'completed' : ''}">
                    <div class="task-history-item-header">
                        <span class="history-item-date">${this.formatFullDate(rec.date)}</span>
                        <span class="status-badge ${rec.status === 'completed' ? 'completed' : 'pending'}">
                            ${rec.status === 'completed' ? '✓ Completed' : '✗ Incomplete'}
                        </span>
                    </div>
                    <div class="task-history-item-note">
                        <span class="note-tag">Note:</span> ${rec.note ? this.escapeHtml(rec.note) : 'No note recorded'}
                    </div>
                </div>
            `).join('');
        }

        if (bodyEl) {
            bodyEl.innerHTML = `
                <div class="task-history-summary-box mb-4">
                    <div class="stat-pill">
                        <strong>${historyInfo.completionRate}%</strong> Completion Rate
                    </div>
                    <div class="stat-pill">
                        <strong>${historyInfo.completedCount}</strong> Completed Days
                    </div>
                    <div class="stat-pill">
                        <strong>${historyInfo.totalRecords}</strong> Total Days
                    </div>
                </div>
                <div class="task-history-timeline">
                    ${recordsHtml}
                </div>
            `;
        }

        if (modal) modal.classList.add('active');
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
        this.viewingHistoryTaskId = null;
    },

    handleAddTaskSubmit() {
        const titleInput = document.getElementById('add-task-title');
        const descInput = document.getElementById('add-task-desc');
        const catSelect = document.getElementById('add-task-category');
        const prioRadio = document.querySelector('input[name="add-priority"]:checked');

        const title = titleInput?.value.trim();
        const desc = descInput?.value.trim();
        const category = catSelect?.value || 'General';
        const priority = prioRadio?.value || 'medium';

        if (!title) {
            this.showToast('Task title is required', 'warning');
            return;
        }

        try {
            TaskManager.createTask(title, desc, category, priority, this.todayDateStr);
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
        const catSelect = document.getElementById('edit-task-category');
        const prioSelect = document.getElementById('edit-task-priority');

        const title = titleInput?.value.trim();
        const desc = descInput?.value.trim();
        const category = catSelect?.value || 'General';
        const priority = prioSelect?.value || 'medium';

        if (!title) {
            this.showToast('Task title is required', 'warning');
            return;
        }

        try {
            TaskManager.editTask(this.editingTaskId, title, desc, category, priority);
            this.closeModals();
            this.renderDashboard();
            this.showToast('✓ Task updated successfully', 'success');
        } catch (err) {
            this.showToast(err.message || 'Error updating task', 'error');
        }
    },

    handleAddCategorySubmit() {
        const nameInput = document.getElementById('custom-category-name');
        const name = nameInput?.value.trim();

        if (!name) {
            this.showToast('Category name cannot be empty', 'warning');
            return;
        }

        try {
            Storage.addCategory(name);
            this.populateCategoryDropdowns();

            // Set new category in active selects
            const addSelect = document.getElementById('add-task-category');
            if (addSelect) addSelect.value = name;

            const editSelect = document.getElementById('edit-task-category');
            if (editSelect) editSelect.value = name;

            const modal = document.getElementById('modal-add-category');
            if (modal) modal.classList.remove('active');

            this.showToast(`✓ Category "${name}" added`, 'success');
        } catch (err) {
            this.showToast(err.message || 'Error adding category', 'error');
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

        setTimeout(() => toast.classList.add('show'), 10);

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
