/**
 * History Module - Dynamic Calendar, Indicators, Historical Summary & Data Evaluation
 */

const HistoryManager = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(), // 0 - 11
    selectedDate: null,
    todayStr: null,

    /**
     * Initialize History Module
     * @param {string} todayDateStr YYYY-MM-DD
     */
    init(todayDateStr) {
        this.todayStr = todayDateStr;
        this.selectedDate = todayDateStr;
        const [y, m] = todayDateStr.split('-').map(Number);
        this.currentYear = y;
        this.currentMonth = m - 1;
    },

    /**
     * Change calendar month
     * Handles year rollover (Dec -> Jan and Jan -> Dec)
     * @param {number} delta -1 for previous month, +1 for next month
     */
    changeMonth(delta) {
        this.currentMonth += delta;
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear -= 1;
        } else if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear += 1;
        }
    },

    /**
     * Jump directly to today's month and select today's date
     */
    jumpToToday() {
        if (!this.todayStr) {
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            this.todayStr = `${yyyy}-${mm}-${dd}`;
        }
        this.selectedDate = this.todayStr;
        const [y, m] = this.todayStr.split('-').map(Number);
        this.currentYear = y;
        this.currentMonth = m - 1;
    },

    /**
     * Set selected date string YYYY-MM-DD
     */
    selectHistoryDate(dateStr) {
        this.selectedDate = dateStr;
    },

    /**
     * Get tasks available on a specific date (Rule 8 & 9 & 10)
     * Includes both active and soft-deleted tasks created on or before dateStr
     * @param {string} dateStr YYYY-MM-DD
     * @returns {Array} Array of task objects
     */
    getTasksAvailableOnDate(dateStr) {
        const tasks = Storage.getTasks();
        return tasks.filter(task => task.createdAt <= dateStr);
    },

    /**
     * Get daily records recorded for a specific date
     * @param {string} dateStr YYYY-MM-DD
     * @returns {Array} Array of record objects
     */
    getRecordsForDate(dateStr) {
        const records = Storage.getDailyRecords();
        return records.filter(record => record.date === dateStr);
    },

    /**
     * Check if history/tasks exist for a date
     * @param {string} dateStr YYYY-MM-DD
     * @returns {boolean}
     */
    hasHistoryForDate(dateStr) {
        const tasks = this.getTasksAvailableOnDate(dateStr);
        return tasks.length > 0;
    },

    /**
     * Calculate day summary statistics and indicator color
     * @param {string} dateStr YYYY-MM-DD
     * @returns {Object} Summary data object
     */
    getDaySummary(dateStr) {
        const availableTasks = this.getTasksAvailableOnDate(dateStr);
        const dayRecords = this.getRecordsForDate(dateStr);

        const total = availableTasks.length;

        let completed = 0;
        const detailedTasks = availableTasks.map(task => {
            const record = dayRecords.find(r => r.taskId === task.id);
            const status = record ? record.status : 'not_completed';
            const note = record ? record.note : '';

            if (status === 'completed') {
                completed++;
            }

            return {
                ...task,
                status,
                note
            };
        });

        const incomplete = total - completed;
        // Avoid NaN or Infinity by checking total > 0
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Determine indicator color dot:
        // Green: completed all tasks (100% and total > 0)
        // Yellow: partially completed (completed > 0 and completed < total)
        // Red: tasks exist but 0 completed
        // Gray/None: no tasks available
        let indicatorColor = 'none';
        if (total > 0) {
            if (completed === total) {
                indicatorColor = 'green';
            } else if (completed > 0) {
                indicatorColor = 'yellow';
            } else {
                indicatorColor = 'red';
            }
        }

        const isFuture = Boolean(this.todayStr && dateStr > this.todayStr);

        return {
            dateStr,
            tasks: detailedTasks,
            total,
            completed,
            incomplete,
            percentage,
            indicatorColor,
            isFuture,
            hasData: total > 0
        };
    },

    /**
     * Render the complete Calendar component
     * @param {HTMLElement} calendarContainer 
     * @param {string} todayStr 
     * @param {Function} onSelectDate 
     */
    renderCalendar(calendarContainer, todayStr, onSelectDate) {
        this.todayStr = todayStr;

        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        let html = `
            <div class="calendar-header">
                <div class="calendar-nav-group">
                    <button type="button" class="btn btn-icon" id="cal-prev-month" title="Previous Month" aria-label="Previous Month">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    <div class="calendar-month-year">${monthNames[this.currentMonth]} ${this.currentYear}</div>
                    <button type="button" class="btn btn-icon" id="cal-next-month" title="Next Month" aria-label="Next Month">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                </div>
                <button type="button" class="btn btn-sm btn-secondary" id="cal-today-btn">Today</button>
            </div>
            <div class="calendar-weekdays">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
            </div>
            <div class="calendar-days" id="calendar-days-grid">
                ${this.renderCalendarDays(todayStr)}
            </div>
            
            <div class="calendar-legend">
                <span class="legend-item"><span class="indicator-dot dot-green"></span> 100% Done</span>
                <span class="legend-item"><span class="indicator-dot dot-yellow"></span> Partial</span>
                <span class="legend-item"><span class="indicator-dot dot-red"></span> 0% Done</span>
            </div>
        `;

        calendarContainer.innerHTML = html;

        // Bind Navigation buttons
        document.getElementById('cal-prev-month')?.addEventListener('click', () => {
            this.changeMonth(-1);
            this.renderCalendar(calendarContainer, todayStr, onSelectDate);
        });

        document.getElementById('cal-next-month')?.addEventListener('click', () => {
            this.changeMonth(1);
            this.renderCalendar(calendarContainer, todayStr, onSelectDate);
        });

        // Bind Today button
        document.getElementById('cal-today-btn')?.addEventListener('click', () => {
            this.jumpToToday();
            this.renderCalendar(calendarContainer, todayStr, onSelectDate);
            if (onSelectDate) onSelectDate(this.selectedDate);
        });

        // Bind Date Click listeners
        const dayEls = calendarContainer.querySelectorAll('.calendar-day[data-date]');
        dayEls.forEach(el => {
            el.addEventListener('click', () => {
                const clickedDate = el.getAttribute('data-date');
                this.selectHistoryDate(clickedDate);
                this.renderCalendar(calendarContainer, todayStr, onSelectDate);
                if (onSelectDate) onSelectDate(clickedDate);
            });
        });
    },

    /**
     * Render the grid cells of days for the current month
     * @param {string} todayStr 
     * @returns {string} HTML string of calendar day cells
     */
    renderCalendarDays(todayStr) {
        const firstDayOfMonth = new Date(this.currentYear, this.currentMonth, 1);
        const lastDayOfMonth = new Date(this.currentYear, this.currentMonth + 1, 0);
        
        const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
        const daysInMonth = lastDayOfMonth.getDate();

        const prevMonthLastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();

        let html = '';

        // Helper to format date YYYY-MM-DD
        const formatDateStr = (y, m, d) => {
            const mm = String(m + 1).padStart(2, '0');
            const dd = String(d).padStart(2, '0');
            return `${y}-${mm}-${dd}`;
        };

        // 1. Fill previous month trailing days
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const dayNum = prevMonthLastDay - i;
            html += `<div class="calendar-day other-month"><span class="day-number">${dayNum}</span></div>`;
        }

        // 2. Fill current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = formatDateStr(this.currentYear, this.currentMonth, day);
            const isToday = (dateKey === todayStr);
            const isSelected = (dateKey === this.selectedDate);
            const isFuture = (dateKey > todayStr);

            const summary = this.getDaySummary(dateKey);

            let classes = ['calendar-day'];
            if (isToday) classes.push('today');
            if (isSelected) classes.push('selected');
            if (isFuture) classes.push('future-date');

            let indicatorHtml = '';
            if (!isFuture && summary.indicatorColor !== 'none') {
                indicatorHtml = `<span class="indicator-dot dot-${summary.indicatorColor}"></span>`;
            }

            html += `
                <div class="${classes.join(' ')}" data-date="${dateKey}" tabindex="0" title="${dateKey}${isToday ? ' (Today)' : ''}">
                    <span class="day-number">${day}</span>
                    ${isToday ? '<span class="today-label">TODAY</span>' : ''}
                    ${indicatorHtml}
                </div>
            `;
        }

        // 3. Fill next month leading days
        const totalSlots = startingDayOfWeek + daysInMonth;
        const nextMonthSlots = (totalSlots % 7 === 0) ? 0 : (7 - (totalSlots % 7));
        for (let day = 1; day <= nextMonthSlots; day++) {
            html += `<div class="calendar-day other-month"><span class="day-number">${day}</span></div>`;
        }

        return html;
    },

    /**
     * Render detailed task history for a selected date
     * @param {HTMLElement} container 
     * @param {string} dateStr YYYY-MM-DD
     * @param {string} todayStr YYYY-MM-DD
     */
    renderHistoryForDate(container, dateStr, todayStr) {
        if (!container) return;

        const summary = this.getDaySummary(dateStr);
        const formattedDate = App.formatFullDate(dateStr);

        // Case A: Future Date (Requirement 13)
        if (summary.isFuture) {
            container.innerHTML = `
                <div class="history-date-header">
                    <h3>${formattedDate}</h3>
                    <span class="status-badge pending">Future Date</span>
                </div>
                <div class="empty-state-card">
                    <div class="empty-state-icon">🔮</div>
                    <h4>Future Date</h4>
                    <p class="empty-text">There is no history available for this date yet.</p>
                </div>
            `;
            return;
        }

        // Case B: Past/Present Date with No Task Records (Requirement 11)
        if (!summary.hasData) {
            container.innerHTML = `
                <div class="history-date-header">
                    <h3>${formattedDate}</h3>
                    <span class="status-badge pending">No Tracking</span>
                </div>
                <div class="empty-state-card">
                    <div class="empty-state-icon">📋</div>
                    <h4>No tracking data for this day</h4>
                    <p class="empty-text">There are no recorded task activities for ${formattedDate}.</p>
                </div>
            `;
            return;
        }

        // Case C: Date with Task Records
        let tasksListHtml = summary.tasks.map(task => {
            const isCompleted = task.status === 'completed';
            return `
                <div class="history-task-card ${isCompleted ? 'completed' : 'incomplete'}">
                    <div class="history-card-header">
                        <div class="history-card-title-group">
                            <span class="history-icon-badge ${isCompleted ? 'check' : 'circle'}">
                                ${isCompleted ? '✓' : '○'}
                            </span>
                            <div>
                                <h4 class="history-card-title">${App.escapeHtml(task.title)}</h4>
                                ${task.description ? `<p class="history-card-desc">${App.escapeHtml(task.description)}</p>` : ''}
                            </div>
                        </div>
                        <span class="status-badge ${isCompleted ? 'completed' : 'pending'}">
                            ${isCompleted ? 'Completed' : 'Not Completed'}
                        </span>
                    </div>

                    <div class="history-note-section">
                        <span class="history-note-label">Note:</span>
                        <p class="history-note-text ${task.note ? '' : 'empty'}">
                            ${task.note ? App.escapeHtml(task.note) : 'No note recorded for this day.'}
                        </p>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="history-date-header">
                <div>
                    <h3>${formattedDate}</h3>
                    <p class="history-date-sub">Daily Completion Summary</p>
                </div>
                <div class="history-percentage-badge">${summary.percentage}%</div>
            </div>

            <!-- Daily Progress Bar -->
            <div class="history-progress-wrapper">
                <div class="history-progress-label">
                    <span>Daily Progress</span>
                    <strong>${summary.percentage}%</strong>
                </div>
                <div class="history-progress-track">
                    <div class="history-progress-fill" style="width: ${summary.percentage}%;"></div>
                </div>
            </div>

            <!-- Summary Counter Cards -->
            <div class="history-summary-pills">
                <div class="summary-pill completed-pill">
                    <span class="pill-number">${summary.completed}</span>
                    <span class="pill-label">Completed</span>
                </div>
                <div class="summary-pill incomplete-pill">
                    <span class="pill-number">${summary.incomplete}</span>
                    <span class="pill-label">Incomplete</span>
                </div>
                <div class="summary-pill total-pill">
                    <span class="pill-number">${summary.total}</span>
                    <span class="pill-label">Total Tasks</span>
                </div>
            </div>

            <!-- Tasks List -->
            <div class="history-tasks-list">
                ${tasksListHtml}
            </div>
        `;
    }
};
