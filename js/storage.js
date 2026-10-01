/**
 * Storage Module - Manages LocalStorage operations for Daily Task Tracker
 * 
 * Keys:
 * - dailyTaskTracker_tasks: Permanent task objects (with schedule & reminder)
 * - dailyTaskTracker_dailyRecords: Daily tracking records (status & notes per date)
 * - dailyTaskTracker_settings: User preferences & theme settings
 * - dailyTaskTracker_categories: Custom categories list
 * - dailyTaskTracker_triggeredReminders: Log of triggered reminder keys
 */

const STORAGE_KEYS = {
    TASKS: 'dailyTaskTracker_tasks',
    RECORDS: 'dailyTaskTracker_dailyRecords',
    SETTINGS: 'dailyTaskTracker_settings',
    CATEGORIES: 'dailyTaskTracker_categories',
    TRIGGERED_REMINDERS: 'dailyTaskTracker_triggeredReminders'
};

const DEFAULT_CATEGORIES = [
    'General',
    'Study',
    'Work',
    'Health',
    'Personal',
    'Fitness',
    'Project',
    'Other'
];

const Storage = {
    /**
     * Get all permanent tasks from LocalStorage with defaults for schedule & reminder
     * @returns {Array} Array of task objects
     */
    getTasks() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.TASKS);
            if (!data) return [];

            const tasks = JSON.parse(data);
            let updated = false;

            tasks.forEach(t => {
                if (!t.category) {
                    t.category = 'General';
                    updated = true;
                }
                if (!t.priority) {
                    t.priority = 'medium';
                    updated = true;
                }
                if (!t.schedule) {
                    t.schedule = {
                        type: 'daily',
                        days: [],
                        startDate: t.createdAt,
                        endDate: null
                    };
                    updated = true;
                }
                if (!t.reminder) {
                    t.reminder = {
                        enabled: false,
                        time: '18:00'
                    };
                    updated = true;
                }
            });

            if (updated) {
                this.saveTasks(tasks);
            }

            return tasks;
        } catch (error) {
            console.error('Error reading tasks from LocalStorage:', error);
            return [];
        }
    },

    /**
     * Save permanent tasks to LocalStorage
     * @param {Array} tasks Array of task objects
     */
    saveTasks(tasks) {
        try {
            localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
        } catch (error) {
            console.error('Error saving tasks to LocalStorage:', error);
        }
    },

    /**
     * Get categories list (Predefined + Custom)
     * @returns {Array} Array of category name strings
     */
    getCategories() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
            const customCategories = data ? JSON.parse(data) : [];
            
            const combined = [...DEFAULT_CATEGORIES];
            customCategories.forEach(c => {
                if (!combined.includes(c)) {
                    combined.push(c);
                }
            });
            return combined;
        } catch (error) {
            console.error('Error reading categories from LocalStorage:', error);
            return [...DEFAULT_CATEGORIES];
        }
    },

    /**
     * Add a new custom category
     */
    addCategory(categoryName) {
        if (!categoryName || !categoryName.trim()) {
            throw new Error('Category name cannot be empty');
        }

        const name = categoryName.trim();
        const existing = this.getCategories();

        if (existing.some(c => c.toLowerCase() === name.toLowerCase())) {
            throw new Error('Category already exists');
        }

        try {
            const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
            const customCategories = data ? JSON.parse(data) : [];
            customCategories.push(name);
            localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(customCategories));
        } catch (error) {
            console.error('Error saving category to LocalStorage:', error);
        }

        return this.getCategories();
    },

    /**
     * Get all daily records from LocalStorage
     */
    getDailyRecords() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.RECORDS);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error reading daily records from LocalStorage:', error);
            return [];
        }
    },

    /**
     * Save daily records to LocalStorage
     */
    saveDailyRecords(records) {
        try {
            localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
        } catch (error) {
            console.error('Error saving daily records to LocalStorage:', error);
        }
    },

    /**
     * Triggered reminders log helpers (Duplicate Protection - Section 17)
     */
    getTriggeredReminders() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.TRIGGERED_REMINDERS);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            return [];
        }
    },

    hasReminderBeenTriggered(key) {
        const list = this.getTriggeredReminders();
        return list.includes(key);
    },

    markReminderTriggered(key) {
        const list = this.getTriggeredReminders();
        if (!list.includes(key)) {
            list.push(key);
            try {
                localStorage.setItem(STORAGE_KEYS.TRIGGERED_REMINDERS, JSON.stringify(list));
            } catch (e) {}
        }
    },

    /**
     * Get user settings (e.g., theme, userName)
     */
    getSettings() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            const defaultSettings = {
                theme: 'light',
                userName: 'Rounak'
            };
            return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
        } catch (error) {
            console.error('Error reading settings from LocalStorage:', error);
            return { theme: 'light', userName: 'Rounak' };
        }
    },

    /**
     * Save user settings to LocalStorage
     */
    saveSettings(settings) {
        try {
            const current = this.getSettings();
            const updated = { ...current, ...settings };
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
        } catch (error) {
            console.error('Error saving settings to LocalStorage:', error);
        }
    },

    /**
     * Helper to get a specific daily record for a task and date
     */
    getRecord(taskId, dateStr) {
        const records = this.getDailyRecords();
        return records.find(r => r.taskId === taskId && r.date === dateStr) || null;
    },

    /**
     * Save or update a single daily record
     */
    saveRecord(taskId, dateStr, status, note) {
        const records = this.getDailyRecords();
        const index = records.findIndex(r => r.taskId === taskId && r.date === dateStr);
        
        let record;
        if (index !== -1) {
            records[index].status = status !== undefined ? status : records[index].status;
            records[index].note = note !== undefined ? note : records[index].note;
            record = records[index];
        } else {
            record = {
                id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                taskId: taskId,
                date: dateStr,
                status: status || 'not_completed',
                note: note || ''
            };
            records.push(record);
        }

        this.saveDailyRecords(records);
        return record;
    },

    /**
     * Seed initial sample data for demonstration if LocalStorage is empty
     */
    seedSampleData(force = false) {
        const existingTasks = this.getTasks();
        if (existingTasks.length > 0 && !force) {
            return false;
        }

        const now = new Date();
        
        const formatDateKey = (d) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };

        const todayStr = formatDateKey(now);
        
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatDateKey(yesterday);

        const sampleTasks = [
            {
                id: 'task_sample_1',
                title: 'Study Java',
                description: 'Practice core Java concepts, OOP, and data structures for 1 hour',
                category: 'Study',
                priority: 'high',
                createdAt: yesterdayStr,
                active: true,
                schedule: {
                    type: 'daily',
                    days: [],
                    startDate: yesterdayStr,
                    endDate: null
                },
                reminder: {
                    enabled: true,
                    time: '18:00'
                }
            },
            {
                id: 'task_sample_2',
                title: 'Workout',
                description: '30-minute cardio and strength training routine',
                category: 'Fitness',
                priority: 'medium',
                createdAt: yesterdayStr,
                active: true,
                schedule: {
                    type: 'weekly',
                    days: ['Mon', 'Wed', 'Fri'],
                    startDate: yesterdayStr,
                    endDate: null
                },
                reminder: {
                    enabled: true,
                    time: '07:00'
                }
            },
            {
                id: 'task_sample_3',
                title: 'Read Book',
                description: 'Read 20 pages of Atomic Habits',
                category: 'Personal',
                priority: 'low',
                createdAt: yesterdayStr,
                active: true,
                schedule: {
                    type: 'daily',
                    days: [],
                    startDate: yesterdayStr,
                    endDate: null
                },
                reminder: {
                    enabled: false,
                    time: '21:00'
                }
            },
            {
                id: 'task_sample_4',
                title: 'Practice JavaScript',
                description: 'Build DOM manipulation projects and practice async/await',
                category: 'Study',
                priority: 'high',
                createdAt: yesterdayStr,
                active: true,
                schedule: {
                    type: 'daily',
                    days: [],
                    startDate: yesterdayStr,
                    endDate: null
                },
                reminder: {
                    enabled: false,
                    time: '17:00'
                }
            },
            {
                id: 'task_sample_5',
                title: 'College Assignment',
                description: 'Complete Database Management System homework assignment',
                category: 'Project',
                priority: 'medium',
                createdAt: todayStr,
                active: true,
                schedule: {
                    type: 'one_time',
                    days: [],
                    startDate: todayStr,
                    endDate: null
                },
                reminder: {
                    enabled: true,
                    time: '20:00'
                }
            }
        ];

        const sampleRecords = [
            // Yesterday's Records
            {
                id: 'rec_sample_1_yest',
                taskId: 'task_sample_1',
                date: yesterdayStr,
                status: 'completed',
                note: 'Practiced arrays and string manipulation.'
            },
            {
                id: 'rec_sample_2_yest',
                taskId: 'task_sample_2',
                date: yesterdayStr,
                status: 'completed',
                note: '30-minute HIIT workout session done.'
            },
            {
                id: 'rec_sample_3_yest',
                taskId: 'task_sample_3',
                date: yesterdayStr,
                status: 'not_completed',
                note: 'Had less time today due to college exams.'
            },
            {
                id: 'rec_sample_4_yest',
                taskId: 'task_sample_4',
                date: yesterdayStr,
                status: 'completed',
                note: 'Solved 3 LeetCode problems in JS.'
            },

            // Today's Initial Records
            {
                id: 'rec_sample_1_today',
                taskId: 'task_sample_1',
                date: todayStr,
                status: 'completed',
                note: 'Practiced OOP inheritance and interfaces.'
            },
            {
                id: 'rec_sample_2_today',
                taskId: 'task_sample_2',
                date: todayStr,
                status: 'completed',
                note: 'Morning jog for 45 minutes.'
            },
            {
                id: 'rec_sample_3_today',
                taskId: 'task_sample_3',
                date: todayStr,
                status: 'not_completed',
                note: 'Will read before bedtime.'
            },
            {
                id: 'rec_sample_4_today',
                taskId: 'task_sample_4',
                date: todayStr,
                status: 'completed',
                note: 'Built modern Daily Task Tracker UI.'
            }
        ];

        this.saveTasks(sampleTasks);
        this.saveDailyRecords(sampleRecords);
        this.saveSettings({ theme: 'light', userName: 'Rounak' });
        return true;
    }
};
