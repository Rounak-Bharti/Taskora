/**
 * Tasks Module - Handles Task Management, Scheduling, Reminders, Filtering & Date Evaluation
 */

const TaskManager = {
    /**
     * Check if a task is scheduled to appear on a specific calendar date (Section 24)
     * @param {Object} task Task object
     * @param {string} dateStr Calendar date YYYY-MM-DD
     * @returns {boolean}
     */
    isTaskScheduledForDate(task, dateStr) {
        if (!task) return false;

        // If task was soft deleted, it must NOT appear on or after its deletion date
        if (task.deletedAt && dateStr >= task.deletedAt) {
            return false;
        }

        // Legacy inactive check if deletedAt is not explicitly set
        if (!task.active && !task.deletedAt) {
            return false;
        }

        const schedule = task.schedule || { type: 'daily', days: [], startDate: task.createdAt, endDate: null };
        const startDate = schedule.startDate || task.createdAt;

        // 1. Start Date Check: Task must not appear before start date (Section 8)
        if (dateStr < startDate) {
            return false;
        }

        // 2. End Date Check: Task must not appear after end date if specified (Section 9)
        if (schedule.endDate && dateStr > schedule.endDate) {
            return false;
        }

        const type = schedule.type || 'daily';

        // 3. Schedule Type Evaluation (Section 4, 5, 6, 7)
        if (type === 'daily') {
            return true;
        }

        if (type === 'one_time') {
            return dateStr === startDate;
        }

        if (type === 'weekly' || type === 'custom') {
            const [y, m, d] = dateStr.split('-').map(Number);
            const dateObj = new Date(y, m - 1, d);
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayName = dayNames[dateObj.getDay()];

            return Array.isArray(schedule.days) && schedule.days.includes(dayName);
        }

        return true;
    },

    /**
     * Create a new permanent task with schedule and reminder parameters
     */
    createTask(title, description = '', category = 'General', priority = 'medium', scheduleObj = null, reminderObj = null, dateStr) {
        if (!title || !title.trim()) {
            throw new Error('Task title is required');
        }

        const defaultSchedule = {
            type: 'daily',
            days: [],
            startDate: dateStr,
            endDate: null
        };

        const defaultReminder = {
            enabled: false,
            time: '18:00'
        };

        const finalSchedule = scheduleObj ? { ...defaultSchedule, ...scheduleObj } : defaultSchedule;
        const finalReminder = reminderObj ? { ...defaultReminder, ...reminderObj } : defaultReminder;

        // Validations (Section 33)
        if (finalSchedule.endDate && finalSchedule.endDate < finalSchedule.startDate) {
            throw new Error('End date cannot be before the start date.');
        }

        if ((finalSchedule.type === 'weekly' || finalSchedule.type === 'custom') && (!finalSchedule.days || finalSchedule.days.length === 0)) {
            throw new Error('Please select at least one weekday for the schedule.');
        }

        const tasks = Storage.getTasks();
        const newTask = {
            id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            title: title.trim(),
            description: description.trim(),
            category: category ? category.trim() : 'General',
            priority: (priority && ['low', 'medium', 'high'].includes(priority.toLowerCase())) ? priority.toLowerCase() : 'medium',
            createdAt: dateStr,
            active: true,
            schedule: finalSchedule,
            reminder: finalReminder
        };

        tasks.push(newTask);
        Storage.saveTasks(tasks);

        // Initialize daily record for creation date if scheduled today
        if (this.isTaskScheduledForDate(newTask, dateStr)) {
            Storage.saveRecord(newTask.id, dateStr, 'not_completed', '');
        }

        return newTask;
    },

    /**
     * Edit an existing task's title, description, category, priority, schedule, and reminder
     * Preserves task ID, creation date, active state, and historical records (Section 22 & 23)
     */
    editTask(taskId, title, description = '', category = 'General', priority = 'medium', scheduleObj = null, reminderObj = null) {
        if (!title || !title.trim()) {
            throw new Error('Task title is required');
        }

        const tasks = Storage.getTasks();
        const taskIndex = tasks.findIndex(t => t.id === taskId);

        if (taskIndex === -1) {
            throw new Error('Task not found');
        }

        const currentTask = tasks[taskIndex];
        const finalSchedule = scheduleObj ? { ...currentTask.schedule, ...scheduleObj } : currentTask.schedule;
        const finalReminder = reminderObj ? { ...currentTask.reminder, ...reminderObj } : currentTask.reminder;

        // Validations (Section 33)
        if (finalSchedule.endDate && finalSchedule.endDate < finalSchedule.startDate) {
            throw new Error('End date cannot be before the start date.');
        }

        if ((finalSchedule.type === 'weekly' || finalSchedule.type === 'custom') && (!finalSchedule.days || finalSchedule.days.length === 0)) {
            throw new Error('Please select at least one weekday for the schedule.');
        }

        tasks[taskIndex].title = title.trim();
        tasks[taskIndex].description = description.trim();
        tasks[taskIndex].category = category ? category.trim() : 'General';
        tasks[taskIndex].priority = (priority && ['low', 'medium', 'high'].includes(priority.toLowerCase())) ? priority.toLowerCase() : 'medium';
        tasks[taskIndex].schedule = finalSchedule;
        tasks[taskIndex].reminder = finalReminder;

        Storage.saveTasks(tasks);
        return tasks[taskIndex];
    },

    /**
     * Soft delete a task (sets active = false and records deletion date)
     * Preserves historical records from BEFORE deletion date, hides task from deletion date forward
     */
    deleteTask(taskId, dateStr) {
        const tasks = Storage.getTasks();
        const taskIndex = tasks.findIndex(t => t.id === taskId);

        if (taskIndex !== -1) {
            tasks[taskIndex].active = false;
            if (!tasks[taskIndex].deletedAt) {
                tasks[taskIndex].deletedAt = dateStr || new Date().toISOString().split('T')[0];
            }
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
    // REMINDERS & UPCOMING SCHEDULING WIDGETS
    // ==========================================

    /**
     * Get tasks scheduled for today with enabled reminders (Section 18)
     * Sorted chronologically by reminder time
     */
    getTodayReminders(todayStr) {
        const tasks = Storage.getTasks();
        const scheduledToday = tasks.filter(t => t.active && this.isTaskScheduledForDate(t, todayStr));
        const remindersToday = scheduledToday.filter(t => t.reminder && t.reminder.enabled);

        remindersToday.sort((a, b) => (a.reminder.time || '00:00').localeCompare(b.reminder.time || '00:00'));

        return remindersToday;
    },

    /**
     * Get upcoming scheduled tasks for the next 7 days (Section 19)
     */
    getUpcomingTasks(todayStr, limit = 5) {
        const tasks = Storage.getTasks().filter(t => t.active);
        const upcomingList = [];

        const baseDate = new Date(todayStr + 'T00:00:00');

        for (let i = 0; i <= 7; i++) {
            const d = new Date(baseDate);
            d.setDate(d.getDate() + i);

            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;

            let dateLabel = 'Today';
            if (i === 1) dateLabel = 'Tomorrow';
            else if (i > 1) {
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                dateLabel = `${dayNames[d.getDay()]}, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            }

            tasks.forEach(t => {
                if (this.isTaskScheduledForDate(t, dateStr)) {
                    upcomingList.push({
                        task: t,
                        dateStr,
                        dateLabel,
                        reminderTime: t.reminder && t.reminder.enabled ? t.reminder.time : null
                    });
                }
            });

            if (upcomingList.length >= limit * 2) break;
        }

        return upcomingList.slice(0, limit);
    },

    // ==========================================
    // FILTERING & SORTING PIPELINE
    // ==========================================

    searchTasks(tasks, keyword) {
        if (!keyword || !keyword.trim()) return tasks;
        const q = keyword.trim().toLowerCase();
        return tasks.filter(t => 
            t.title.toLowerCase().includes(q) ||
            (t.description && t.description.toLowerCase().includes(q)) ||
            (t.category && t.category.toLowerCase().includes(q))
        );
    },

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

    filterByPriority(tasks, priorityFilter) {
        if (!priorityFilter || priorityFilter === 'all') return tasks;
        const p = priorityFilter.toLowerCase();
        return tasks.filter(t => t.priority === p);
    },

    filterByCategory(tasks, categoryFilter) {
        if (!categoryFilter || categoryFilter === 'all') return tasks;
        const c = categoryFilter.toLowerCase();
        return tasks.filter(t => t.category.toLowerCase() === c);
    },

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
            return b.createdAt.localeCompare(a.createdAt);
        });

        return sorted;
    },

    /**
     * Get active tasks scheduled for dashboard dateStr (Section 25)
     */
    getFilteredAndSortedTasks(dateStr, searchKeyword = '', statusFilter = 'all', priorityFilter = 'all', categoryFilter = 'all', sortBy = 'default') {
        const tasks = Storage.getTasks();
        const records = Storage.getDailyRecords();

        // 1. Filter active tasks SCHEDULED for dateStr
        const availableTasks = tasks.filter(task => task.active && this.isTaskScheduledForDate(task, dateStr));

        // 2. Attach daily record for dateStr
        let combined = availableTasks.map(task => {
            const record = records.find(r => r.taskId === task.id && r.date === dateStr);
            return {
                ...task,
                status: record ? record.status : 'not_completed',
                note: record ? record.note : ''
            };
        });

        // 3. Filtering Pipeline
        combined = this.searchTasks(combined, searchKeyword);
        combined = this.filterByStatus(combined, statusFilter);
        combined = this.filterByPriority(combined, priorityFilter);
        combined = this.filterByCategory(combined, categoryFilter);

        // 4. Sorting
        combined = this.sortTasks(combined, sortBy);

        return combined;
    },

    getStatusCounts(dateStr) {
        const tasks = Storage.getTasks().filter(t => t.active && this.isTaskScheduledForDate(t, dateStr));
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

    getPriorityCounts(dateStr) {
        const tasks = Storage.getTasks().filter(t => t.active && this.isTaskScheduledForDate(t, dateStr));
        const counts = { high: 0, medium: 0, low: 0 };
        tasks.forEach(t => {
            const p = (t.priority || 'medium').toLowerCase();
            if (counts[p] !== undefined) counts[p]++;
        });
        return counts;
    },

    getCategorySummary(dateStr) {
        const tasks = Storage.getTasks().filter(t => t.active && this.isTaskScheduledForDate(t, dateStr));
        const summary = {};
        tasks.forEach(t => {
            const cat = t.category || 'General';
            summary[cat] = (summary[cat] || 0) + 1;
        });
        return summary;
    },

    getTaskHistory(taskId) {
        const tasks = Storage.getTasks();
        const task = tasks.find(t => t.id === taskId);
        if (!task) return null;

        const records = Storage.getDailyRecords().filter(r => {
            if (r.taskId !== taskId) return false;
            if (task.deletedAt && r.date >= task.deletedAt) return false;
            return true;
        });
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
     * Calculate progress metrics for a given date based ONLY on scheduled tasks (Section 26)
     */
    getProgressForDate(dateStr) {
        const tasks = Storage.getTasks();
        const records = Storage.getDailyRecords();

        const activeTasksOnDate = tasks.filter(t => t.active && this.isTaskScheduledForDate(t, dateStr));
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
