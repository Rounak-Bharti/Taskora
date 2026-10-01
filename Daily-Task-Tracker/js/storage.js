/**
 * Storage Module - Manages LocalStorage & Cloud Firestore Operations for Taskora
 * 
 * Supports user-specific data isolation:
 * - LocalStorage caching per userId
 * - Cloud Firestore remote sync under `users/{uid}`
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
    currentUserId: null,
    isSyncing: false,

    /**
     * Set active user ID for storage scoping
     */
    setCurrentUserId(uid) {
        this.currentUserId = uid || null;
    },

    /**
     * Get user-scoped storage key
     */
    getKey(baseKey) {
        if (this.currentUserId) {
            return `${baseKey}_${this.currentUserId}`;
        }
        return `${baseKey}_guest`;
    },

    /**
     * Get all permanent tasks from LocalStorage
     */
    getTasks() {
        try {
            const data = localStorage.getItem(this.getKey(STORAGE_KEYS.TASKS));
            if (!data) return [];

            const tasks = JSON.parse(data);
            let updated = false;

            tasks.forEach(t => {
                if (!t.category) { t.category = 'General'; updated = true; }
                if (!t.priority) { t.priority = 'medium'; updated = true; }
                if (!t.schedule) {
                    t.schedule = { type: 'daily', days: [], startDate: t.createdAt, endDate: null };
                    updated = true;
                }
                if (!t.reminder) {
                    t.reminder = { enabled: false, time: '18:00' };
                    updated = true;
                }
            });

            if (updated) {
                this.saveTasks(tasks, false);
            }

            return tasks;
        } catch (error) {
            console.error('Error reading tasks:', error);
            return [];
        }
    },

    /**
     * Save permanent tasks to LocalStorage and Cloud Firestore
     */
    saveTasks(tasks, syncRemote = true) {
        try {
            localStorage.setItem(this.getKey(STORAGE_KEYS.TASKS), JSON.stringify(tasks));
            if (syncRemote && this.currentUserId) {
                this.syncUserDataToFirestore();
            }
        } catch (error) {
            console.error('Error saving tasks:', error);
        }
    },

    /**
     * Get categories list
     */
    getCategories() {
        try {
            const data = localStorage.getItem(this.getKey(STORAGE_KEYS.CATEGORIES));
            const customCategories = data ? JSON.parse(data) : [];
            
            const combined = [...DEFAULT_CATEGORIES];
            customCategories.forEach(c => {
                if (!combined.includes(c)) {
                    combined.push(c);
                }
            });
            return combined;
        } catch (error) {
            console.error('Error reading categories:', error);
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
            const data = localStorage.getItem(this.getKey(STORAGE_KEYS.CATEGORIES));
            const customCategories = data ? JSON.parse(data) : [];
            customCategories.push(name);
            localStorage.setItem(this.getKey(STORAGE_KEYS.CATEGORIES), JSON.stringify(customCategories));
            
            if (this.currentUserId) {
                this.syncUserDataToFirestore();
            }
        } catch (error) {
            console.error('Error saving category:', error);
        }

        return this.getCategories();
    },

    /**
     * Get all daily records
     */
    getDailyRecords() {
        try {
            const data = localStorage.getItem(this.getKey(STORAGE_KEYS.RECORDS));
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error reading daily records:', error);
            return [];
        }
    },

    /**
     * Save daily records to LocalStorage & Firestore
     */
    saveDailyRecords(records, syncRemote = true) {
        try {
            localStorage.setItem(this.getKey(STORAGE_KEYS.RECORDS), JSON.stringify(records));
            if (syncRemote && this.currentUserId) {
                this.syncUserDataToFirestore();
            }
        } catch (error) {
            console.error('Error saving daily records:', error);
        }
    },

    /**
     * Get settings
     */
    getSettings() {
        try {
            const data = localStorage.getItem(this.getKey(STORAGE_KEYS.SETTINGS));
            const defaultSettings = {
                theme: 'light',
                userName: 'User'
            };
            return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
        } catch (error) {
            console.error('Error reading settings:', error);
            return { theme: 'light', userName: 'User' };
        }
    },

    /**
     * Save settings
     */
    saveSettings(settings, syncRemote = true) {
        try {
            const current = this.getSettings();
            const updated = { ...current, ...settings };
            localStorage.setItem(this.getKey(STORAGE_KEYS.SETTINGS), JSON.stringify(updated));
            if (syncRemote && this.currentUserId) {
                this.syncUserDataToFirestore();
            }
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    },

    /**
     * Helper to get a specific daily record
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
     * Check if a reminder key has been triggered
     */
    hasReminderBeenTriggered(triggerKey) {
        try {
            const data = localStorage.getItem(this.getKey(STORAGE_KEYS.TRIGGERED_REMINDERS));
            const keys = data ? JSON.parse(data) : [];
            return keys.includes(triggerKey);
        } catch (e) {
            return false;
        }
    },

    /**
     * Mark a reminder key as triggered
     */
    markReminderTriggered(triggerKey) {
        try {
            const data = localStorage.getItem(this.getKey(STORAGE_KEYS.TRIGGERED_REMINDERS));
            const keys = data ? JSON.parse(data) : [];
            if (!keys.includes(triggerKey)) {
                keys.push(triggerKey);
                localStorage.setItem(this.getKey(STORAGE_KEYS.TRIGGERED_REMINDERS), JSON.stringify(keys));
            }
        } catch (e) {
            console.error('Error marking reminder triggered:', e);
        }
    },

    // ==========================================
    // CLOUD FIRESTORE SYNC & PERSISTENCE
    // ==========================================

    /**
     * Load user data from Cloud Firestore upon login
     */
    async loadUserDataFromFirestore(uid) {
        this.setCurrentUserId(uid);
        if (typeof db === 'undefined' || !db) {
            console.warn('Firestore not initialized, relying on local storage cache');
            return false;
        }

        try {
            const userDocRef = db.collection('users').doc(uid).collection('userData').doc('main');
            const docSnap = await userDocRef.get();

            if (docSnap.exists) {
                const data = docSnap.data();
                if (data.tasks) {
                    localStorage.setItem(this.getKey(STORAGE_KEYS.TASKS), JSON.stringify(data.tasks));
                }
                if (data.records) {
                    localStorage.setItem(this.getKey(STORAGE_KEYS.RECORDS), JSON.stringify(data.records));
                }
                if (data.categories) {
                    localStorage.setItem(this.getKey(STORAGE_KEYS.CATEGORIES), JSON.stringify(data.categories));
                }
                if (data.settings) {
                    localStorage.setItem(this.getKey(STORAGE_KEYS.SETTINGS), JSON.stringify(data.settings));
                }
                console.log('✓ Successfully restored user data from Cloud Firestore!');
                return true;
            } else {
                console.log('New user detected in Firestore. Initializing clean Cloud document.');
                await this.syncUserDataToFirestore();
                return true;
            }
        } catch (err) {
            console.error('Error fetching user data from Firestore:', err);
            return false;
        }
    },

    /**
     * Sync local user data to Cloud Firestore
     */
    async syncUserDataToFirestore() {
        if (!this.currentUserId || typeof db === 'undefined' || !db || this.isSyncing) return;

        this.isSyncing = true;
        try {
            const tasks = this.getTasks();
            const records = this.getDailyRecords();
            const categoriesData = localStorage.getItem(this.getKey(STORAGE_KEYS.CATEGORIES));
            const categories = categoriesData ? JSON.parse(categoriesData) : [];
            const settings = this.getSettings();

            const userDocRef = db.collection('users').doc(this.currentUserId).collection('userData').doc('main');

            await userDocRef.set({
                tasks,
                records,
                categories,
                settings,
                updatedAt: (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
            }, { merge: true });

            console.log('✓ User data synced to Cloud Firestore');
        } catch (err) {
            console.error('Error syncing user data to Firestore:', err);
        } finally {
            this.isSyncing = false;
        }
    },

    /**
     * Clear active memory & storage user scope upon logout
     */
    clearCurrentUserData() {
        this.currentUserId = null;
    }
};
