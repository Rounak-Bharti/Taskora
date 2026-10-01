/**
 * Mock Auth Module - Temporary Authentication System for Testing & Development
 * 
 * Provides mock authentication with 4 pre-configured demo accounts:
 * 1. Mayank (mayank@demo.com / Mayank123) -> ID: mock-mayank
 * 2. Rounak (rounak@demo.com / Rounak123) -> ID: mock-rounak
 * 3. Harsh (harsh@demo.com / Harsh123)   -> ID: mock-harsh
 * 4. Rishav (rishav@demo.com / Rishav123) -> ID: mock-rishav
 * 
 * Also supports dynamically creating new mock accounts via Signup.
 */

const PREDEFINED_MOCK_ACCOUNTS = [
    { id: "mock-mayank", name: "Mayank", email: "mayank@demo.com", password: "Mayank123" },
    { id: "mock-rounak", name: "Rounak", email: "rounak@demo.com", password: "Rounak123" },
    { id: "mock-harsh",  name: "Harsh",  email: "harsh@demo.com",  password: "Harsh123" },
    { id: "mock-rishav", name: "Rishav", email: "rishav@demo.com", password: "Rishav123" }
];

const MOCK_STORAGE_KEYS = {
    CUSTOM_USERS: 'taskora_mock_custom_users',
    CURRENT_SESSION: 'taskora_mock_session'
};

const MockAuth = {
    /**
     * Get all registered mock accounts (predefined + custom signups)
     */
    getAllAccounts() {
        let customUsers = [];
        try {
            const data = localStorage.getItem(MOCK_STORAGE_KEYS.CUSTOM_USERS);
            if (data) customUsers = JSON.parse(data);
        } catch (e) {
            console.error('Error reading custom mock users:', e);
        }
        return [...PREDEFINED_MOCK_ACCOUNTS, ...customUsers];
    },

    /**
     * Find user by email
     */
    findUserByEmail(email) {
        if (!email) return null;
        const normalized = email.trim().toLowerCase();
        return this.getAllAccounts().find(u => u.email.toLowerCase() === normalized) || null;
    },

    /**
     * Attempt login with email and password
     */
    login(email, password) {
        if (!email || !password) {
            return { success: false, message: 'Please enter your email and password.' };
        }

        const user = this.findUserByEmail(email);

        if (!user || user.password !== password) {
            return { success: false, message: 'Invalid email or password.' };
        }

        // Save active session
        const sessionUser = { id: user.id, name: user.name, email: user.email };
        localStorage.setItem(MOCK_STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(sessionUser));
        
        return { success: true, user: sessionUser };
    },

    /**
     * Attempt signup with name, email, password
     */
    signup(name, email, password) {
        if (!email || !password) {
            return { success: false, message: 'Please fill out all required fields.' };
        }

        const existing = this.findUserByEmail(email);
        if (existing) {
            return { success: false, message: 'An account with this email already exists. Try logging in.' };
        }

        const cleanName = name || email.split('@')[0];
        const newId = 'mock-' + cleanName.toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Date.now();
        const newUser = {
            id: newId,
            name: cleanName,
            email: email.trim(),
            password: password
        };

        // Save to custom users array
        try {
            const data = localStorage.getItem(MOCK_STORAGE_KEYS.CUSTOM_USERS);
            const customUsers = data ? JSON.parse(data) : [];
            customUsers.push(newUser);
            localStorage.setItem(MOCK_STORAGE_KEYS.CUSTOM_USERS, JSON.stringify(customUsers));
        } catch (e) {
            console.error('Error saving custom user:', e);
        }

        // Save active session
        const sessionUser = { id: newUser.id, name: newUser.name, email: newUser.email };
        localStorage.setItem(MOCK_STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(sessionUser));

        return { success: true, user: sessionUser };
    },

    /**
     * Get active logged in mock user session
     */
    getCurrentUser() {
        try {
            const data = localStorage.getItem(MOCK_STORAGE_KEYS.CURRENT_SESSION);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    },

    /**
     * Logout active session
     */
    logout() {
        localStorage.removeItem(MOCK_STORAGE_KEYS.CURRENT_SESSION);
    },

    /**
     * Helper to seed demo tasks for initial account testing if empty
     */
    seedDemoTasksIfEmpty(userId, userName) {
        Storage.setCurrentUserId(userId);
        const existingTasks = Storage.getTasks();
        if (existingTasks.length > 0) return;

        const today = new Date().toISOString().split('T')[0];
        let initialTasks = [];

        if (userId === 'mock-mayank') {
            initialTasks = [
                {
                    id: 'task_mayank_1',
                    title: "Mayank's Java Practice",
                    description: "Solve 3 LeetCode problems in Java",
                    category: "Study",
                    priority: "high",
                    createdAt: today,
                    active: true,
                    schedule: { type: "daily", days: [], startDate: today, endDate: null },
                    reminder: { enabled: true, time: "19:00" }
                },
                {
                    id: 'task_mayank_2',
                    title: "Workout & Stretching",
                    description: "45 mins gym session",
                    category: "Fitness",
                    priority: "medium",
                    createdAt: today,
                    active: true,
                    schedule: { type: "daily", days: [], startDate: today, endDate: null },
                    reminder: { enabled: false, time: "08:00" }
                }
            ];
        } else if (userId === 'mock-rounak') {
            initialTasks = [
                {
                    id: 'task_rounak_1',
                    title: "Rounak's Project Review",
                    description: "Review Taskora daily task tracker code",
                    category: "Project",
                    priority: "high",
                    createdAt: today,
                    active: true,
                    schedule: { type: "daily", days: [], startDate: today, endDate: null },
                    reminder: { enabled: true, time: "18:00" }
                },
                {
                    id: 'task_rounak_2',
                    title: "Read Tech Articles",
                    description: "Read 2 articles on Web Performance",
                    category: "Study",
                    priority: "low",
                    createdAt: today,
                    active: true,
                    schedule: { type: "daily", days: [], startDate: today, endDate: null },
                    reminder: { enabled: false, time: "21:00" }
                }
            ];
        } else if (userId === 'mock-harsh') {
            initialTasks = [
                {
                    id: 'task_harsh_1',
                    title: "Harsh's System Design Notes",
                    description: "Study microservices and caching",
                    category: "Study",
                    priority: "high",
                    createdAt: today,
                    active: true,
                    schedule: { type: "daily", days: [], startDate: today, endDate: null },
                    reminder: { enabled: true, time: "17:00" }
                },
                {
                    id: 'task_harsh_2',
                    title: "Evening Walk",
                    description: "30 mins walking in the park",
                    category: "Health",
                    priority: "medium",
                    createdAt: today,
                    active: true,
                    schedule: { type: "daily", days: [], startDate: today, endDate: null },
                    reminder: { enabled: false, time: "19:30" }
                }
            ];
        } else if (userId === 'mock-rishav') {
            initialTasks = [
                {
                    id: 'task_rishav_1',
                    title: "Rishav's Database Queries",
                    description: "Practice SQL joins and indexing",
                    category: "Work",
                    priority: "high",
                    createdAt: today,
                    active: true,
                    schedule: { type: "daily", days: [], startDate: today, endDate: null },
                    reminder: { enabled: true, time: "16:00" }
                },
                {
                    id: 'task_rishav_2',
                    title: "Organize Workspace",
                    description: "Clean desk and file downloads folder",
                    category: "Personal",
                    priority: "low",
                    createdAt: today,
                    active: true,
                    schedule: { type: "daily", days: [], startDate: today, endDate: null },
                    reminder: { enabled: false, time: "20:00" }
                }
            ];
        }

        if (initialTasks.length > 0) {
            Storage.saveTasks(initialTasks, false);
        }
    }
};
