/**
 * App Module - Central Coordinator for UI, Events, Navigation, Scheduling, Reminders, Modals & Toasts
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
    viewingDetailsTaskId: null,

    // Periodic reminder checker handle
    reminderTimerId: null,

    init() {
        // 1. Detect local date YYYY-MM-DD
        this.todayDateStr = this.getTodayDate();

        // 2. Initialize History module state
        HistoryManager.init(this.todayDateStr);

        // 3. Load & apply theme settings
        this.loadSettings();

        // 4. Update header info (Date, Greeting)
        this.updateHeaderInfo();

        // 5. Populate Category Dropdowns
        this.populateCategoryDropdowns();

        // 6. Bind all UI event listeners
        this.bindEvents();

        // 7. Start Background Reminder Checker (Section 16)
        this.startReminderChecker();

        // 8. Initialize Authentication State Listener & View
        this.initAuth();
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
     * Get current local time as HH:MM string (24h format)
     */
    getCurrentTime() {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    },

    /**
     * Format 24h time string HH:MM to 12h format (e.g. "18:00" -> "6:00 PM")
     */
    formatTime12h(time24) {
        if (!time24) return '';
        const [h, m] = time24.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
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

        this.updateNotificationStatusUI();
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
     * Populate Category Dropdowns dynamically
     */
    populateCategoryDropdowns() {
        const categories = Storage.getCategories();

        const addSelect = document.getElementById('add-task-category');
        if (addSelect) {
            addSelect.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
        }

        const editSelect = document.getElementById('edit-task-category');
        if (editSelect) {
            editSelect.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
        }

        const filterSelect = document.getElementById('filter-category-select');
        if (filterSelect) {
            const currentVal = this.categoryFilter;
            filterSelect.innerHTML = `<option value="all">Category: All</option>` + 
                categories.map(c => `<option value="${c}">Category: ${c}</option>`).join('');
            filterSelect.value = currentVal;
        }
    },

    // ==========================================
    // AUTHENTICATION & SESSION MANAGEMENT
    // ==========================================

    /**
     * Firebase Auth State Listener & Initialization
     */
    initAuth() {
        if (typeof auth === 'undefined' || !auth) {
            console.warn('Firebase Auth not available. Running in local fallback mode.');
            Storage.seedSampleData(false);
            this.switchView('dashboard');
            return;
        }

        auth.onAuthStateChanged(async (user) => {
            const emailBadge = document.getElementById('header-user-email');
            const logoutBtn = document.getElementById('btn-header-logout');
            const navContainer = document.querySelector('.nav-links');

            if (user) {
                // User logged in
                Storage.setCurrentUserId(user.uid);
                
                // Fetch & restore user data from Cloud Firestore
                await Storage.loadUserDataFromFirestore(user.uid);

                if (emailBadge) {
                    emailBadge.textContent = user.email;
                    emailBadge.style.display = 'inline-block';
                }
                if (logoutBtn) logoutBtn.style.display = 'inline-flex';
                if (navContainer) navContainer.style.display = 'flex';

                const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
                this.updateHeaderInfo(displayName);
                this.populateCategoryDropdowns();
                this.switchView('dashboard');
            } else {
                // User logged out / not authenticated
                Storage.clearCurrentUserData();

                if (emailBadge) emailBadge.style.display = 'none';
                if (logoutBtn) logoutBtn.style.display = 'none';
                if (navContainer) navContainer.style.display = 'none';

                this.updateHeaderInfo('Guest');
                this.switchView('auth');
            }
        });
    },

    /**
     * Handle Login Form Submission
     */
    async handleLoginSubmit() {
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        const email = emailInput?.value.trim();
        const password = passwordInput?.value;

        if (!email || !password) {
            this.showToast('Please enter your email and password.', 'warning');
            return;
        }

        if (typeof auth === 'undefined' || !auth) {
            this.showToast('Firebase Auth unavailable. Check your connection.', 'error');
            return;
        }

        try {
            this.showToast('Logging in...', 'info');
            await auth.signInWithEmailAndPassword(email, password);
            this.showToast('✓ Login successful!', 'success');
        } catch (err) {
            console.error('Login error:', err);
            let msg = 'Failed to log in. Please check your credentials.';
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                msg = 'Invalid email or password.';
            } else if (err.code === 'auth/invalid-email') {
                msg = 'Invalid email address format.';
            }
            this.showToast(msg, 'error');
        }
    },

    /**
     * Handle Signup Form Submission
     */
    async handleSignupSubmit() {
        const nameInput = document.getElementById('signup-name');
        const emailInput = document.getElementById('signup-email');
        const passInput = document.getElementById('signup-password');
        const confirmInput = document.getElementById('signup-confirm-password');

        const name = nameInput?.value.trim();
        const email = emailInput?.value.trim();
        const password = passInput?.value;
        const confirmPassword = confirmInput?.value;

        if (!email || !password || !confirmPassword) {
            this.showToast('Please fill out all required fields.', 'warning');
            return;
        }

        if (password !== confirmPassword) {
            this.showToast('Passwords do not match. Please re-enter.', 'warning');
            return;
        }

        if (password.length < 6) {
            this.showToast('Password must be at least 6 characters long.', 'warning');
            return;
        }

        if (typeof auth === 'undefined' || !auth) {
            this.showToast('Firebase Auth unavailable.', 'error');
            return;
        }

        try {
            this.showToast('Creating account...', 'info');
            const cred = await auth.createUserWithEmailAndPassword(email, password);
            
            if (cred.user) {
                const uid = cred.user.uid;

                // 1. Update Auth Display Name if provided
                if (name) {
                    try {
                        await cred.user.updateProfile({ displayName: name });
                    } catch (pErr) {
                        console.warn('Profile name update warning:', pErr);
                    }
                }

                // 2. Create Root User Profile Document under users/{uid} in Firestore
                if (typeof db !== 'undefined' && db) {
                    try {
                        await db.collection('users').doc(uid).set({
                            uid: uid,
                            email: email,
                            displayName: name || email.split('@')[0],
                            createdAt: (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
                        }, { merge: true });
                    } catch (fsErr) {
                        console.warn('Firestore user doc creation warning:', fsErr);
                    }
                }

                // 3. Initialize user-scoped storage & save initial settings
                Storage.setCurrentUserId(uid);
                const userName = name || email.split('@')[0];
                Storage.saveSettings({ userName }, false);

                // 4. Initialize clean user document in Cloud Firestore
                await Storage.syncUserDataToFirestore();
            }

            this.showToast('✓ Account created successfully!', 'success');
        } catch (err) {
            console.error('Signup error:', err);
            let msg = 'Failed to create account: ' + (err.message || 'Unknown error');
            if (err.code === 'auth/email-already-in-use') {
                msg = 'An account with this email already exists. Try logging in.';
            } else if (err.code === 'auth/invalid-email') {
                msg = 'Invalid email address format.';
            } else if (err.code === 'auth/weak-password') {
                msg = 'Password is too weak. Must be at least 6 characters.';
            } else if (err.code === 'auth/api-key-not-valid' || err.code === 'auth/invalid-api-key') {
                msg = 'Invalid Firebase API Key. Please update your Firebase config in Settings or firebase-config.js.';
            }
            this.showToast(msg, 'error');
        }
    },

    /**
     * Handle Forgot Password Form Submission
     */
    async handleForgotSubmit() {
        const emailInput = document.getElementById('reset-email');
        const email = emailInput?.value.trim();

        if (!email) {
            this.showToast('Please enter your account email address.', 'warning');
            return;
        }

        if (typeof auth === 'undefined' || !auth) {
            this.showToast('Firebase Auth unavailable.', 'error');
            return;
        }

        try {
            await auth.sendPasswordResetEmail(email);
            this.showToast('✓ Password reset link sent to your email!', 'success');
            
            // Return to login card
            document.getElementById('auth-card-forgot').style.display = 'none';
            document.getElementById('auth-card-login').style.display = 'block';
        } catch (err) {
            console.error('Reset password error:', err);
            let msg = 'Failed to send reset link.';
            if (err.code === 'auth/user-not-found') {
                msg = 'No account found with this email.';
            }
            this.showToast(msg, 'error');
        }
    },

    /**
     * Handle User Logout
     */
    async handleLogout() {
        if (typeof auth === 'undefined' || !auth) return;

        try {
            await auth.signOut();
            Storage.clearCurrentUserData();
            this.showToast('Logged out successfully.', 'info');
            this.switchView('auth');
        } catch (err) {
            console.error('Logout error:', err);
            this.showToast('Error signing out.', 'error');
        }
    },

    // ==========================================
    // REMINDER SYSTEM & NOTIFICATIONS (SECTION 13, 14, 16, 17)
    // ==========================================

    /**
     * Start periodic reminder checker (every 30s)
     */
    startReminderChecker() {
        if (this.reminderTimerId) clearInterval(this.reminderTimerId);

        // Run immediate check
        this.checkReminders();

        // Interval check
        this.reminderTimerId = setInterval(() => {
            this.checkReminders();
        }, 30000);
    },

    /**
     * Periodic Reminder Checker Logic
     */
    checkReminders() {
        const currentTime = this.getCurrentTime();
        const scheduledToday = TaskManager.getTodayReminders(this.todayDateStr);

        scheduledToday.forEach(t => {
            if (t.reminder && t.reminder.enabled && t.reminder.time === currentTime) {
                const triggerKey = `${t.id}_${this.todayDateStr}_${t.reminder.time}`;

                if (!Storage.hasReminderBeenTriggered(triggerKey)) {
                    Storage.markReminderTriggered(triggerKey);

                    // Show Toast
                    this.showToast(`⏰ Reminder: ${t.title} (${this.formatTime12h(t.reminder.time)})`, 'warning');

                    // Show Browser Native Notification if granted
                    if ('Notification' in window && Notification.permission === 'granted') {
                        try {
                            new Notification('DailyTrack Reminder', {
                                body: `Time to complete: ${t.title}`,
                                icon: 'images/icon.png'
                            });
                        } catch (err) {
                            console.error('Notification error:', err);
                        }
                    }
                }
            }
        });
    },

    /**
     * Request browser notification permission (Section 13 & 14)
     */
    requestNotificationPermission() {
        if (!('Notification' in window)) {
            this.showToast('Your browser does not support native notifications.', 'warning');
            this.updateNotificationStatusUI();
            return;
        }

        Notification.requestPermission().then(permission => {
            this.updateNotificationStatusUI();
            if (permission === 'granted') {
                this.showToast('✓ Browser notifications enabled!', 'success');
            } else if (permission === 'denied') {
                this.showToast('Notifications blocked in browser settings.', 'warning');
            }
        });
    },

    /**
     * Update Notification Status UI label
     */
    updateNotificationStatusUI() {
        const statusEl = document.getElementById('notification-status-label');
        if (!statusEl) return;

        if (!('Notification' in window)) {
            statusEl.textContent = 'Unsupported in browser';
            statusEl.className = 'status-badge pending';
        } else if (Notification.permission === 'granted') {
            statusEl.textContent = '✓ Notifications Granted';
            statusEl.className = 'status-badge completed';
        } else if (Notification.permission === 'denied') {
            statusEl.textContent = 'Blocked in settings';
            statusEl.className = 'status-badge danger';
        } else {
            statusEl.textContent = 'Not Requested';
            statusEl.className = 'status-badge pending';
        }
    },

    /**
     * View Switcher Navigation
     */
    switchView(viewName) {
        // If Firebase Auth is available and user is not authenticated, force Auth view
        if (typeof auth !== 'undefined' && auth && !auth.currentUser && viewName !== 'auth') {
            viewName = 'auth';
        }

        this.currentView = viewName;

        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('data-view') === viewName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        document.querySelectorAll('.view-section').forEach(sec => {
            sec.style.display = 'none';
        });

        const targetSec = document.getElementById(`view-${viewName}`);
        if (targetSec) {
            targetSec.style.display = 'block';
        }

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

        // Header Logout Button
        document.getElementById('btn-header-logout')?.addEventListener('click', () => {
            this.handleLogout();
        });

        // Auth Card View Toggles
        document.getElementById('btn-show-signup')?.addEventListener('click', () => {
            document.getElementById('auth-card-login').style.display = 'none';
            document.getElementById('auth-card-forgot').style.display = 'none';
            document.getElementById('auth-card-signup').style.display = 'block';
        });

        document.getElementById('btn-show-login')?.addEventListener('click', () => {
            document.getElementById('auth-card-signup').style.display = 'none';
            document.getElementById('auth-card-forgot').style.display = 'none';
            document.getElementById('auth-card-login').style.display = 'block';
        });

        document.getElementById('btn-forgot-back-login')?.addEventListener('click', () => {
            document.getElementById('auth-card-signup').style.display = 'none';
            document.getElementById('auth-card-forgot').style.display = 'none';
            document.getElementById('auth-card-login').style.display = 'block';
        });

        document.getElementById('btn-show-forgot')?.addEventListener('click', () => {
            document.getElementById('auth-card-login').style.display = 'none';
            document.getElementById('auth-card-signup').style.display = 'none';
            document.getElementById('auth-card-forgot').style.display = 'block';
        });

        // Auth Form Submits
        document.getElementById('form-login')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLoginSubmit();
        });

        document.getElementById('form-signup')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignupSubmit();
        });

        document.getElementById('form-forgot-password')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleForgotSubmit();
        });

        // Theme Toggle
        document.getElementById('theme-toggle-btn')?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Notification Permission Button
        document.getElementById('btn-request-notifications')?.addEventListener('click', () => {
            this.requestNotificationPermission();
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

        // Add Task Schedule Type change event
        document.getElementById('add-schedule-type')?.addEventListener('change', (e) => {
            this.toggleScheduleTypeInputs('add', e.target.value);
        });

        // Edit Task Schedule Type change event
        document.getElementById('edit-schedule-type')?.addEventListener('change', (e) => {
            this.toggleScheduleTypeInputs('edit', e.target.value);
        });

        // Add Task Reminder toggle event
        document.getElementById('add-reminder-enabled')?.addEventListener('change', (e) => {
            const timeWrapper = document.getElementById('add-reminder-time-group');
            if (timeWrapper) timeWrapper.style.display = e.target.checked ? 'block' : 'none';
            if (e.target.checked) this.requestNotificationPermission();
        });

        // Edit Task Reminder toggle event
        document.getElementById('edit-reminder-enabled')?.addEventListener('change', (e) => {
            const timeWrapper = document.getElementById('edit-reminder-time-group');
            if (timeWrapper) timeWrapper.style.display = e.target.checked ? 'block' : 'none';
            if (e.target.checked) this.requestNotificationPermission();
        });

        // Weekday Button Toggles (Add Modal)
        document.querySelectorAll('#add-schedule-days-container .btn-day-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
            });
        });

        // Weekday Button Toggles (Edit Modal)
        document.querySelectorAll('#edit-schedule-days-container .btn-day-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
            });
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
     * Clear all search, filter, and sort criteria
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
     * Toggle schedule inputs in Add/Edit modal based on type
     */
    toggleScheduleTypeInputs(prefix, type) {
        const daysGroup = document.getElementById(`${prefix}-schedule-days-group`);
        const startDateGroup = document.getElementById(`${prefix}-start-date-group`);
        const endDateGroup = document.getElementById(`${prefix}-end-date-group`);

        if (daysGroup) daysGroup.style.display = (type === 'weekly' || type === 'custom') ? 'block' : 'none';
        if (startDateGroup) {
            const label = startDateGroup.querySelector('.form-label');
            if (label) label.textContent = (type === 'one_time') ? 'Task Date *' : 'Start Date *';
        }
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
            resultCountEl.textContent = `Showing ${tasks.length} of ${availableCount} scheduled tasks`;
        }

        // Render Summary Widgets (Category, Priority, Reminders, Upcoming)
        this.renderCategorySummaryWidget();
        this.renderPrioritySummaryWidget();
        this.renderTodayRemindersWidget();
        this.renderUpcomingTasksWidget();

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
                    if (emptyTitle) emptyTitle.textContent = 'No tasks scheduled for today';
                    if (emptyText) emptyText.textContent = 'You have no active tasks scheduled for today.';
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
            <span class="widget-pill category-pill-sm">
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
     * Render Today's Reminders Widget (Section 18)
     */
    renderTodayRemindersWidget() {
        const container = document.getElementById('dashboard-today-reminders');
        if (!container) return;

        const reminders = TaskManager.getTodayReminders(this.todayDateStr);

        if (reminders.length === 0) {
            container.innerHTML = `
                <div class="widget-header-title">⏰ Today's Reminders</div>
                <p class="empty-widget-text">No reminders scheduled for today.</p>
            `;
            return;
        }

        const listHtml = reminders.map(t => `
            <div class="reminder-item-row">
                <span class="reminder-time-tag">${this.formatTime12h(t.reminder.time)}</span>
                <span class="reminder-task-title">${this.escapeHtml(t.title)}</span>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="widget-header-title">⏰ Today's Reminders</div>
            <div class="reminders-list-grid">${listHtml}</div>
        `;
    },

    /**
     * Render Upcoming Tasks Widget (Section 19)
     */
    renderUpcomingTasksWidget() {
        const container = document.getElementById('dashboard-upcoming-tasks');
        if (!container) return;

        const upcoming = TaskManager.getUpcomingTasks(this.todayDateStr, 5);

        if (upcoming.length === 0) {
            container.innerHTML = `
                <div class="widget-header-title">📅 Upcoming Tasks</div>
                <p class="empty-widget-text">No upcoming tasks scheduled.</p>
            `;
            return;
        }

        const listHtml = upcoming.map(item => `
            <div class="upcoming-item-row">
                <div class="upcoming-meta">
                    <span class="upcoming-date-badge">${item.dateLabel}</span>
                    ${item.reminderTime ? `<span class="upcoming-time-tag">⏰ ${this.formatTime12h(item.reminderTime)}</span>` : ''}
                </div>
                <span class="upcoming-task-title">${this.escapeHtml(item.task.title)}</span>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="widget-header-title">📅 Upcoming Tasks</div>
            <div class="upcoming-list-grid">${listHtml}</div>
        `;
    },

    /**
     * Generate Compact Schedule Badge string for task cards (Section 20 & 29)
     */
    getScheduleBadgeText(schedule) {
        if (!schedule) return 'Daily';
        const type = schedule.type || 'daily';

        if (type === 'daily') return 'Daily';
        if (type === 'one_time') return `One Time • ${schedule.startDate}`;
        if (type === 'weekly' || type === 'custom') {
            if (Array.isArray(schedule.days) && schedule.days.length > 0) {
                return schedule.days.join(' • ');
            }
            return 'Custom Days';
        }
        return 'Daily';
    },

    /**
     * Generate HTML for a single task card
     */
    createTaskCardHtml(task) {
        const isCompleted = task.status === 'completed';
        const statusBadgeText = isCompleted ? 'Completed' : 'Incomplete';
        const cardClass = isCompleted ? 'task-card completed' : 'task-card';

        const priorityLabel = (task.priority || 'medium').toUpperCase();
        const categoryLabel = task.category || 'General';
        const scheduleBadge = this.getScheduleBadgeText(task.schedule);
        const hasReminder = task.reminder && task.reminder.enabled;
        const reminderTimeStr = hasReminder ? this.formatTime12h(task.reminder.time) : '';

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
                            <button type="button" class="dropdown-item btn-view-details" data-task-id="${task.id}">
                                📋 Task Details
                            </button>
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

                <!-- Badges Row (Schedule, Category, Priority, Reminder) -->
                <div class="task-badges-row">
                    <span class="badge schedule-badge" title="Schedule">🔄 ${this.escapeHtml(scheduleBadge)}</span>
                    <span class="badge category-badge">📁 ${this.escapeHtml(categoryLabel)}</span>
                    <span class="badge priority-badge ${task.priority}">${priorityLabel} PRIORITY</span>
                    ${hasReminder ? `<span class="badge reminder-badge" title="Reminder Time">⏰ ${reminderTimeStr}</span>` : ''}
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
                            placeholder="What did you do today?"
                            rows="2"
                        >${this.escapeHtml(task.note || '')}</textarea>
                        <button type="button" class="btn btn-sm btn-secondary btn-save-note" data-task-id="${task.id}">Save Note</button>
                    </div>
                </div>

                <div class="task-card-footer">
                    <div class="footer-left">
                        <span class="status-badge ${isCompleted ? 'completed' : 'pending'}">${statusBadgeText}</span>
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

        // View Task Details Button
        container.querySelectorAll('.btn-view-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeAllDropdownMenus();
                const taskId = btn.getAttribute('data-task-id');
                this.openTaskDetailsModal(taskId);
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

        HistoryManager.renderCalendar(calContainer, this.todayDateStr, (selectedDateStr) => {
            HistoryManager.renderHistoryForDate(detailContainer, selectedDateStr, this.todayDateStr);
        });

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

        // Defaults
        const mediumRadio = form?.querySelector('input[name="add-priority"][value="medium"]');
        if (mediumRadio) mediumRadio.checked = true;

        const startDateInput = document.getElementById('add-schedule-start-date');
        if (startDateInput) startDateInput.value = this.todayDateStr;

        this.toggleScheduleTypeInputs('add', 'daily');
        document.querySelectorAll('#add-schedule-days-container .btn-day-chip').forEach(b => b.classList.remove('active'));

        const reminderToggle = document.getElementById('add-reminder-enabled');
        if (reminderToggle) reminderToggle.checked = false;
        const timeWrapper = document.getElementById('add-reminder-time-group');
        if (timeWrapper) timeWrapper.style.display = 'none';

        if (modal) modal.classList.add('active');
        setTimeout(() => {
            document.getElementById('add-task-title')?.focus({ preventScroll: true });
        }, 100);
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
        const typeSelect = document.getElementById('edit-schedule-type');
        const startDateInput = document.getElementById('edit-schedule-start-date');
        const endDateInput = document.getElementById('edit-schedule-end-date');
        const reminderToggle = document.getElementById('edit-reminder-enabled');
        const reminderTimeInput = document.getElementById('edit-reminder-time');

        if (titleInput) titleInput.value = task.title;
        if (descInput) descInput.value = task.description || '';
        if (catSelect) catSelect.value = task.category || 'General';
        if (prioSelect) prioSelect.value = (task.priority || 'medium').toLowerCase();

        const sch = task.schedule || { type: 'daily', days: [], startDate: task.createdAt, endDate: null };
        if (typeSelect) typeSelect.value = sch.type || 'daily';
        if (startDateInput) startDateInput.value = sch.startDate || task.createdAt;
        if (endDateInput) endDateInput.value = sch.endDate || '';

        this.toggleScheduleTypeInputs('edit', sch.type || 'daily');

        // Set Weekday chips active
        document.querySelectorAll('#edit-schedule-days-container .btn-day-chip').forEach(btn => {
            const day = btn.getAttribute('data-day');
            if (sch.days && sch.days.includes(day)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        const rem = task.reminder || { enabled: false, time: '18:00' };
        if (reminderToggle) reminderToggle.checked = rem.enabled;
        if (reminderTimeInput) reminderTimeInput.value = rem.time || '18:00';
        const timeWrapper = document.getElementById('edit-reminder-time-group');
        if (timeWrapper) timeWrapper.style.display = rem.enabled ? 'block' : 'none';

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

    openTaskDetailsModal(taskId) {
        this.closeModals();
        const tasks = Storage.getTasks();
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        this.viewingDetailsTaskId = taskId;
        const modal = document.getElementById('modal-task-details');
        const body = document.getElementById('task-details-body');

        const sch = task.schedule || { type: 'daily', days: [], startDate: task.createdAt, endDate: null };
        const rem = task.reminder || { enabled: false, time: '18:00' };
        const scheduleLabel = this.getScheduleBadgeText(sch);

        if (body) {
            body.innerHTML = `
                <div class="task-details-grid">
                    <div class="details-row">
                        <span class="details-label">Title</span>
                        <span class="details-value font-bold">${this.escapeHtml(task.title)}</span>
                    </div>
                    ${task.description ? `
                        <div class="details-row">
                            <span class="details-label">Description</span>
                            <span class="details-value">${this.escapeHtml(task.description)}</span>
                        </div>
                    ` : ''}
                    <div class="details-row">
                        <span class="details-label">Category</span>
                        <span class="details-value">📁 ${this.escapeHtml(task.category || 'General')}</span>
                    </div>
                    <div class="details-row">
                        <span class="details-label">Priority</span>
                        <span class="details-value"><span class="badge priority-badge ${task.priority}">${(task.priority || 'medium').toUpperCase()}</span></span>
                    </div>
                    <div class="details-row">
                        <span class="details-label">Schedule Type</span>
                        <span class="details-value">🔄 ${this.escapeHtml(scheduleLabel)}</span>
                    </div>
                    <div class="details-row">
                        <span class="details-label">Start Date</span>
                        <span class="details-value">${this.formatFullDate(sch.startDate || task.createdAt)}</span>
                    </div>
                    <div class="details-row">
                        <span class="details-label">End Date</span>
                        <span class="details-value">${sch.endDate ? this.formatFullDate(sch.endDate) : 'No end date (Continuous)'}</span>
                    </div>
                    <div class="details-row">
                        <span class="details-label">Reminder</span>
                        <span class="details-value">${rem.enabled ? `⏰ Enabled (${this.formatTime12h(rem.time)})` : 'Disabled'}</span>
                    </div>
                </div>
            `;
        }

        if (modal) modal.classList.add('active');
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
        this.viewingDetailsTaskId = null;
    },

    handleAddTaskSubmit() {
        const titleInput = document.getElementById('add-task-title');
        const descInput = document.getElementById('add-task-desc');
        const catSelect = document.getElementById('add-task-category');
        const prioRadio = document.querySelector('input[name="add-priority"]:checked');

        const typeSelect = document.getElementById('add-schedule-type');
        const startDateInput = document.getElementById('add-schedule-start-date');
        const endDateInput = document.getElementById('add-schedule-end-date');
        const reminderToggle = document.getElementById('add-reminder-enabled');
        const reminderTimeInput = document.getElementById('add-reminder-time');

        const title = titleInput?.value.trim();
        const desc = descInput?.value.trim();
        const category = catSelect?.value || 'General';
        const priority = prioRadio?.value || 'medium';

        // Schedule & Reminder objects
        const scheduleType = typeSelect?.value || 'daily';
        const startDate = startDateInput?.value || this.todayDateStr;
        const endDate = endDateInput?.value || null;

        const selectedDays = [];
        document.querySelectorAll('#add-schedule-days-container .btn-day-chip.active').forEach(b => {
            selectedDays.push(b.getAttribute('data-day'));
        });

        const scheduleObj = {
            type: scheduleType,
            days: selectedDays,
            startDate: startDate,
            endDate: endDate || null
        };

        const reminderObj = {
            enabled: Boolean(reminderToggle && reminderToggle.checked),
            time: reminderTimeInput?.value || '18:00'
        };

        if (!title) {
            this.showToast('Task title is required', 'warning');
            return;
        }

        try {
            TaskManager.createTask(title, desc, category, priority, scheduleObj, reminderObj, this.todayDateStr);
            this.closeModals();
            this.renderDashboard();
            this.showToast('✓ Task added successfully with schedule!', 'success');
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

        const typeSelect = document.getElementById('edit-schedule-type');
        const startDateInput = document.getElementById('edit-schedule-start-date');
        const endDateInput = document.getElementById('edit-schedule-end-date');
        const reminderToggle = document.getElementById('edit-reminder-enabled');
        const reminderTimeInput = document.getElementById('edit-reminder-time');

        const title = titleInput?.value.trim();
        const desc = descInput?.value.trim();
        const category = catSelect?.value || 'General';
        const priority = prioSelect?.value || 'medium';

        const scheduleType = typeSelect?.value || 'daily';
        const startDate = startDateInput?.value || this.todayDateStr;
        const endDate = endDateInput?.value || null;

        const selectedDays = [];
        document.querySelectorAll('#edit-schedule-days-container .btn-day-chip.active').forEach(b => {
            selectedDays.push(b.getAttribute('data-day'));
        });

        const scheduleObj = {
            type: scheduleType,
            days: selectedDays,
            startDate: startDate,
            endDate: endDate || null
        };

        const reminderObj = {
            enabled: Boolean(reminderToggle && reminderToggle.checked),
            time: reminderTimeInput?.value || '18:00'
        };

        if (!title) {
            this.showToast('Task title is required', 'warning');
            return;
        }

        try {
            TaskManager.editTask(this.editingTaskId, title, desc, category, priority, scheduleObj, reminderObj);
            this.closeModals();
            this.renderDashboard();
            this.showToast('✓ Task updated successfully!', 'success');
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
            TaskManager.deleteTask(this.deletingTaskId, this.todayDateStr);
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
