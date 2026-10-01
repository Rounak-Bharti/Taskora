/**
 * Tasks Module - Handles Task Creation, Editing, Soft Deletion, Status Toggling, Notes,
 * Advanced Multi-Criteria Filtering, Priority Sorting, and Task History Inspection
 */

const TaskManager = {
    /**
     * Create a new permanent task
     * @param {string} title Task Title (required)
     * @param {string} description Task Description (optional)
     * @param {string} category Task Category (default 'General')
     * @param {string} priority Task Priority ('low' | 'medium' | 'high')
     * @param {string} dateStr Creation date YYYY-MM-DD
     * @returns {Object} New task object
     */
    createTask(title, description = '', category = 'General', priority = 'medium', dateStr) {
        if (!title || !title.trim()) {
            throw new Error('Task title is required');
        }

        const tasks = Storage.getTasks();
        const newTask = {
            id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            title: title.trim(),
            description: description.trim(),
            category: category ? category.trim() : 'General',
            priority: (priority && ['low', 'medium', 'high'].includes(priority.toLowerCase())) ? priority.toLowerCase() : 'medium',
            createdAt: dateStr,
            active: true
        };

        tasks.push(newTask);
        Storage.saveTasks(tasks);

        // Initialize daily record for creation date
        Storage.saveRecord(newTask.id, dateStr, 'not_completed', '');

        return newTask;
    },

    /**
     * Edit an existing task's title, description, category, and priority
     * Preserves task ID, creation date, active state, and historical records (Rule 18)
     */
    editTask(taskId, title, description = '', category = 'General', priority = 'medium') {
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
        tasks[taskIndex].category = category ? category.trim() : 'General';
        tasks[taskIndex].priority = (priority && ['low', 'medium', 'high'].includes(priority.toLowerCase())) ? priority.toLowerCase() : 'medium';

        Storage.saveTasks(tasks);
        return tasks[taskIndex];
    },

    /**
     * Soft delete a task (sets active = false)
     * Historical records remain preserved.
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
     * Toggle daily completion status for a given task and date
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
     * Update daily note for a given task and date
     */
    updateNote(taskId, dateStr, note) {
        const record = Storage.getRecord(taskId, dateStr);
        const currentStatus = record ? record.status : 'not_completed';
        Storage.saveRecord(taskId, dateStr, currentStatus, note);
    },

    // ==========================================
    // MODULAR FILTERING & SORTING PIPELINE
    // ==========================================

    /**
     * Search filter by Keyword matching title, description, or category
     */
    searchTasks(tasks, keyword) {
        if (!keyword || !keyword.trim()) return tasks;
        const q = keyword.trim().toLowerCase();
        return tasks.filter(t => 
            t.title.toLowerCase().includes(q) ||
            (t.description && t.description.toLowerCase().includes(q)) ||
            (t.category && t.category.toLowerCase().includes(q))
        );
    },

    /**
     * Filter by completion status ('all', 'completed', 'incomplete')
     */
    filterByStatus(tasks, statusFilter) {
        if (!statusFilter || statusFilter === 'all') return tasks;
        if (statusFilter === 'completed') {
            return tasks.filter(t => t.status === 'completed');
        }
        if (statusFilter === 'incomplete') {
            return tasks.filter(t => t.status === 'not_completed');
        }
        return tasks;
    },

    /**
     * Filter by priority ('all', 'high', 'medium', 'low')
     */
    filterByPriority(tasks, priorityFilter) {
        if (!priorityFilter || priorityFilter === 'all') return tasks;
        const p = priorityFilter.toLowerCase();
        return tasks.filter(t => t.priority === p);
    },

    /**
     * Filter by Category ('all', 'Study', 'Work', etc.)
     */
    filterByCategory(tasks, categoryFilter) {
        if (!categoryFilter || categoryFilter === 'all') return tasks;
        const c = categoryFilter.toLowerCase();
        return tasks.filter(t => t.category.toLowerCase() === c);
    },

    /**
     * Sort tasks by criterion
     */
    sortTasks(tasks, sortBy) {
        const priorityRank = { high: 3, medium: 2, low: 1 };
        const sorted = [...tasks];

        sorted.sort((a, b) => {
            if (sortBy === 'priority_high') {
                const diff = (priorityRank[b.priority] || 2) - (priorityRank[a.priority] || 2);
                return diff !== 0 ? diff : a.title.localeCompare(b.title);
            }
            if (sortBy === 'priority_low') {
                const diff = (priorityRank[a.priority] || 2) - (priorityRank[b.priority] || 2);
                return diff !== 0 ? diff : a.title.localeCompare(b.title);
            }
            if (sortBy === 'alphabetical') {
                return a.title.localeCompare(b.title);
            }
            if (sortBy === 'completed_first') {
                if (a.status === b.status) return a.title.localeCompare(b.title);
                return a.status === 'completed' ? -1 : 1;
            }
            if (sortBy === 'incomplete_first') {
                if (a.status === b.status) return a.title.localeCompare(b.title);
                return a.status === 'not_completed' ? -1 : 1;
            }
            if (sortBy === 'oldest') {
                return a.createdAt.localeCompare(b.createdAt);
            }
            // Default: Newest first
            return b.createdAt.localeCompare(a.createdAt);
        });

        return sorted;
    },

    /**
     * Get active tasks for dashboard combined with daily records and filtered/sorted
     */
    getFilteredAndSortedTasks(dateStr, searchKeyword = '', statusFilter = 'all', priorityFilter = 'all', categoryFilter = 'all', sortBy = 'default') {
        const tasks = Storage.getTasks();
        const records = Storage.getDailyRecords();

        // 1. Base tasks created on or before dateStr & active
        const availableTasks = tasks.filter(task => task.active && task.createdAt <= dateStr);

        // 2. Attach daily record for dateStr
        let combined = availableTasks.map(task => {
            const record = records.find(r => r.taskId === task.id && r.date === dateStr);
            return {
                ...task,
                status: record ? record.status : 'not_completed',
                note: record ? record.note : ''
            };
        });

        // 3. Sequential Filtering Pipeline (Section 24)
        combined = this.searchTasks(combined, searchKeyword);
        combined = this.filterByStatus(combined, statusFilter);
        combined = this.filterByPriority(combined, priorityFilter);
        combined = this.filterByCategory(combined, categoryFilter);

        // 4. Sorting
        combined = this.sortTasks(combined, sortBy);

        return combined;
    },

    /**
     * Get counts for Status filters for active tasks today
     */
    getStatusCounts(dateStr) {
        const tasks = Storage.getTasks().filter(t => t.active && t.createdAt <= dateStr);
        const records = Storage.getDailyRecords();

        let completed = 0;
        tasks.forEach(t => {
            const r = records.find(rec => rec.taskId === t.id && rec.date === dateStr);
            if (r && r.status === 'completed') completed++;
        });

        return {
            all: tasks.length,
            completed: completed,
            incomplete: tasks.length - completed
        };
    },

    /**
     * Get counts for Priority filters for active tasks today
     */
    getPriorityCounts(dateStr) {
        const tasks = Storage.getTasks().filter(t => t.active && t.createdAt <= dateStr);
        const counts = { high: 0, medium: 0, low: 0 };
        tasks.forEach(t => {
            const p = (t.priority || 'medium').toLowerCase();
            if (counts[p] !== undefined) counts[p]++;
        });
        return counts;
    },

    /**
     * Get counts for Category filters for active tasks today
     */
    getCategorySummary(dateStr) {
        const tasks = Storage.getTasks().filter(t => t.active && t.createdAt <= dateStr);
        const summary = {};
        tasks.forEach(t => {
            const cat = t.category || 'General';
            summary[cat] = (summary[cat] || 0) + 1;
        });
        return summary;
    },

    /**
     * Get single task's complete historical daily records for Task History Modal
     */
    getTaskHistory(taskId) {
        const tasks = Storage.getTasks();
        const task = tasks.find(t => t.id === taskId);
        if (!task) return null;

        const records = Storage.getDailyRecords().filter(r => r.taskId === taskId);
        records.sort((a, b) => b.date.localeCompare(a.date));

        const completedCount = records.filter(r => r.status === 'completed').length;
        const totalRecords = records.length;
        const completionRate = totalRecords > 0 ? Math.round((completedCount / totalRecords) * 100) : 0;

        return {
            task,
            records,
            totalRecords,
            completedCount,
            completionRate
        };
    },

    /**
     * Calculate progress metrics for a given date
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
