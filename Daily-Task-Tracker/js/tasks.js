/**
 * Tasks Module - Handles Task management, Filtering, Sorting, and Daily Record operations
 */

const TaskManager = {
    /**
     * Create a new permanent task
     * @param {string} title Task Title (required)
     * @param {string} description Task Description (optional)
     * @param {string} dateStr Creation date string YYYY-MM-DD
     * @returns {Object} New task object
     */
    createTask(title, description = '', dateStr) {
        if (!title || !title.trim()) {
            throw new Error('Task title is required');
        }

        const tasks = Storage.getTasks();
        const newTask = {
            id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            title: title.trim(),
            description: description.trim(),
            createdAt: dateStr,
            active: true
        };

        tasks.push(newTask);
        Storage.saveTasks(tasks);

        // Initialize daily record for the creation date
        Storage.saveRecord(newTask.id, dateStr, 'not_completed', '');

        return newTask;
    },

    /**
     * Edit an existing task's title and description
     * @param {string} taskId Task ID
     * @param {string} title Updated Title
     * @param {string} description Updated Description
     * @returns {Object} Updated task object
     */
    editTask(taskId, title, description = '') {
        if (!title || !title.trim()) {
            throw new Error('Task title is required');
        }

        const tasks = Storage.getTasks();
        const taskIndex = tasks.findIndex(t => t.id === taskId);

        if (taskIndex === -1) {
            throw new Error('Task not found');
        }

        tasks[taskIndex].title = title.trim();
        tasks[taskIndex].description = description.trim();

        Storage.saveTasks(tasks);
        return tasks[taskIndex];
    },

    /**
     * Soft delete a task (sets active = false)
     * Historical data remains intact.
     * @param {string} taskId Task ID
     */
    deleteTask(taskId) {
        const tasks = Storage.getTasks();
        const taskIndex = tasks.findIndex(t => t.id === taskId);

        if (taskIndex !== -1) {
            tasks[taskIndex].active = false;
            Storage.saveTasks(tasks);
        }
    },

    /**
     * Toggle daily status of a task for a given date
     * @param {string} taskId Task ID
     * @param {string} dateStr Date YYYY-MM-DD
     * @returns {string} New status ('completed' or 'not_completed')
     */
    toggleStatus(taskId, dateStr) {
        const record = Storage.getRecord(taskId, dateStr);
        const currentStatus = record ? record.status : 'not_completed';
        const newStatus = currentStatus === 'completed' ? 'not_completed' : 'completed';
        const currentNote = record ? record.note : '';

        Storage.saveRecord(taskId, dateStr, newStatus, currentNote);
        return newStatus;
    },

    /**
     * Update daily note for a task on a specific date
     * @param {string} taskId Task ID
     * @param {string} dateStr Date YYYY-MM-DD
     * @param {string} note Note content
     */
    updateNote(taskId, dateStr, note) {
        const record = Storage.getRecord(taskId, dateStr);
        const currentStatus = record ? record.status : 'not_completed';
        Storage.saveRecord(taskId, dateStr, currentStatus, note);
    },

    /**
     * Get active tasks available on a specific date with daily record merged
     * @param {string} dateStr Date YYYY-MM-DD
     * @param {string} searchKeyword Search term
     * @param {string} statusFilter 'all', 'completed', 'incomplete'
     * @param {string} sortBy 'default', 'newest', 'oldest', 'completed_first', 'incomplete_first'
     * @returns {Array} Array of tasks with attached daily record info
     */
    getTasksForDashboard(dateStr, searchKeyword = '', statusFilter = 'all', sortBy = 'default') {
        const tasks = Storage.getTasks();
        const records = Storage.getDailyRecords();

        // Filter: active tasks created on or before dateStr
        let availableTasks = tasks.filter(task => {
            return task.active && task.createdAt <= dateStr;
        });

        // Map daily record onto each task object
        let combined = availableTasks.map(task => {
            const record = records.find(r => r.taskId === task.id && r.date === dateStr);
            return {
                ...task,
                status: record ? record.status : 'not_completed',
                note: record ? record.note : ''
            };
        });

        // Search Filter
        if (searchKeyword && searchKeyword.trim()) {
            const query = searchKeyword.trim().toLowerCase();
            combined = combined.filter(t => 
                t.title.toLowerCase().includes(query) || 
                (t.description && t.description.toLowerCase().includes(query))
            );
        }

        // Status Filter
        if (statusFilter === 'completed') {
            combined = combined.filter(t => t.status === 'completed');
        } else if (statusFilter === 'incomplete') {
            combined = combined.filter(t => t.status === 'not_completed');
        }

        // Sorting
        combined.sort((a, b) => {
            if (sortBy === 'completed_first') {
                if (a.status === b.status) return a.title.localeCompare(b.title);
                return a.status === 'completed' ? -1 : 1;
            } else if (sortBy === 'incomplete_first') {
                if (a.status === b.status) return a.title.localeCompare(b.title);
                return a.status === 'not_completed' ? -1 : 1;
            } else if (sortBy === 'oldest') {
                return a.createdAt.localeCompare(b.createdAt);
            } else if (sortBy === 'newest') {
                return b.createdAt.localeCompare(a.createdAt);
            } else {
                // Default: newest first
                return b.createdAt.localeCompare(a.createdAt);
            }
        });

        return combined;
    },

    /**
     * Calculate progress metrics for a given date
     * @param {string} dateStr Date YYYY-MM-DD
     * @returns {Object} { total, completed, remaining, percentage }
     */
    getProgressForDate(dateStr) {
        const tasks = Storage.getTasks();
        const records = Storage.getDailyRecords();

        const activeTasksOnDate = tasks.filter(t => t.active && t.createdAt <= dateStr);
        const total = activeTasksOnDate.length;

        if (total === 0) {
            return { total: 0, completed: 0, remaining: 0, percentage: 0 };
        }

        let completed = 0;
        activeTasksOnDate.forEach(task => {
            const record = records.find(r => r.taskId === task.id && r.date === dateStr);
            if (record && record.status === 'completed') {
                completed++;
            }
        });

        const remaining = total - completed;
        const percentage = Math.round((completed / total) * 100);

        return { total, completed, remaining, percentage };
    }
};
