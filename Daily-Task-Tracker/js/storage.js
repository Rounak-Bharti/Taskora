/**
 * Storage Module - Manages LocalStorage operations for Daily Task Tracker
 * 
 * Keys:
 * - dailyTaskTracker_tasks: Permanent task objects
 * - dailyTaskTracker_dailyRecords: Daily tracking records (status & notes per date)
 * - dailyTaskTracker_settings: User preferences & theme settings
 */

const STORAGE_KEYS = {
    TASKS: 'dailyTaskTracker_tasks',
    RECORDS: 'dailyTaskTracker_dailyRecords',
    SETTINGS: 'dailyTaskTracker_settings'
};

const Storage = {
    /**
     * Get all permanent tasks from LocalStorage
     * @returns {Array} Array of task objects
     */
    getTasks() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.TASKS);
            return data ? JSON.parse(data) : [];
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
     * Get all daily records from LocalStorage
     * @returns {Array} Array of daily record objects
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
     * @param {Array} records Array of daily record objects
     */
    saveDailyRecords(records) {
        try {
            localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
        } catch (error) {
            console.error('Error saving daily records to LocalStorage:', error);
        }
    },

    /**
     * Get user settings (e.g., theme, userName)
     * @returns {Object} Settings object
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
     * @param {Object} settings Settings object
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
     * @param {string} taskId Task ID
     * @param {string} dateStr Date string YYYY-MM-DD
     * @returns {Object|null} Daily record object or null
     */
    getRecord(taskId, dateStr) {
        const records = this.getDailyRecords();
        return records.find(r => r.taskId === taskId && r.date === dateStr) || null;
    },

    /**
     * Save or update a single daily record
     * @param {string} taskId Task ID
     * @param {string} dateStr Date string YYYY-MM-DD
     * @param {string} status 'completed' or 'not_completed'
     * @param {string} note Daily note string
     * @returns {Object} Updated/created record
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

        // Get local date strings for today and yesterday
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
                createdAt: yesterdayStr,
                active: true
            },
            {
                id: 'task_sample_2',
                title: 'Workout',
                description: '30-minute cardio and strength training routine',
                createdAt: yesterdayStr,
                active: true
            },
            {
                id: 'task_sample_3',
                title: 'Read Book',
                description: 'Read 20 pages of Atomic Habits',
                createdAt: yesterdayStr,
                active: true
            },
            {
                id: 'task_sample_4',
                title: 'Practice JavaScript',
                description: 'Build DOM manipulation projects and practice async/await',
                createdAt: yesterdayStr,
                active: true
            },
            {
                id: 'task_sample_5',
                title: 'College Assignment',
                description: 'Complete Database Management System homework assignment',
                createdAt: todayStr,
                active: true
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

            // Today's Initial Records (sample)
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
