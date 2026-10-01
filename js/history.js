/**
 * History Module - Handles Calendar view and historical date inspections
 */

const HistoryManager = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(), // 0 - 11
    selectedDate: null,

    init(todayDateStr) {
        this.selectedDate = todayDateStr;
        const [y, m] = todayDateStr.split('-').map(Number);
        this.currentYear = y;
        this.currentMonth = m - 1;
    },

    /**
     * Change calendar month
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
     * Set selected date
     * @param {string} dateStr Date string YYYY-MM-DD
     */
    setSelectedDate(dateStr) {
        this.selectedDate = dateStr;
    },

    /**
     * Render the calendar grid inside container element
     * @param {HTMLElement} calendarContainer 
     * @param {string} todayStr Today's date YYYY-MM-DD
     * @param {Function} onSelectDate Callback when a date cell is clicked
     */
    renderCalendar(calendarContainer, todayStr, onSelectDate) {
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const records = Storage.getDailyRecords();
        const tasks = Storage.getTasks();

        // Calculate dates in month
        const firstDayOfMonth = new Date(this.currentYear, this.currentMonth, 1);
        const lastDayOfMonth = new Date(this.currentYear, this.currentMonth + 1, 0);
        
        const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
        const daysInMonth = lastDayOfMonth.getDate();

        const prevMonthLastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();

        let html = `
            <div class="calendar-header">
                <button type="button" class="btn btn-icon" id="cal-prev-month" aria-label="Previous Month">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <div class="calendar-month-year">${monthNames[this.currentMonth]} ${this.currentYear}</div>
                <button type="button" class="btn btn-icon" id="cal-next-month" aria-label="Next Month">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
                </button>
            </div>
            <div class="calendar-weekdays">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
            </div>
            <div class="calendar-days">
        `;

        // Fill previous month trailing days
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const dayNum = prevMonthLastDay - i;
            html += `<div class="calendar-day other-month">${dayNum}</div>`;
        }

        // Helper to format date YYYY-MM-DD
        const formatDateStr = (y, m, d) => {
            const mm = String(m + 1).padStart(2, '0');
            const dd = String(d).padStart(2, '0');
            return `${y}-${mm}-${dd}`;
        };

        // Fill current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = formatDateStr(this.currentYear, this.currentMonth, day);
            const isToday = (dateKey === todayStr);
            const isSelected = (dateKey === this.selectedDate);

            // Check activity on date Key
            const availableTasks = tasks.filter(t => t.createdAt <= dateKey);
            const dayRecords = records.filter(r => r.date === dateKey && r.status === 'completed');
            
            let classes = ['calendar-day'];
            if (isToday) classes.push('today');
            if (isSelected) classes.push('selected');
            if (dayRecords.length > 0) classes.push('has-activity');

            html += `
                <div class="${classes.join(' ')}" data-date="${dateKey}" tabindex="0">
                    <span class="day-number">${day}</span>
                    ${dayRecords.length > 0 ? '<span class="activity-dot"></span>' : ''}
                </div>
            `;
        }

        // Fill next month leading days
        const totalSlots = startingDayOfWeek + daysInMonth;
        const nextMonthSlots = (totalSlots % 7 === 0) ? 0 : (7 - (totalSlots % 7));
        for (let day = 1; day <= nextMonthSlots; day++) {
            html += `<div class="calendar-day other-month">${day}</div>`;
        }

        html += `</div>`;

        calendarContainer.innerHTML = html;

        // Attach event handlers
        document.getElementById('cal-prev-month')?.addEventListener('click', () => {
            this.changeMonth(-1);
            this.renderCalendar(calendarContainer, todayStr, onSelectDate);
        });

        document.getElementById('cal-next-month')?.addEventListener('click', () => {
            this.changeMonth(1);
            this.renderCalendar(calendarContainer, todayStr, onSelectDate);
        });

        const dayEls = calendarContainer.querySelectorAll('.calendar-day[data-date]');
        dayEls.forEach(el => {
            el.addEventListener('click', () => {
                const clickedDate = el.getAttribute('data-date');
                this.setSelectedDate(clickedDate);
                this.renderCalendar(calendarContainer, todayStr, onSelectDate);
                if (onSelectDate) onSelectDate(clickedDate);
            });
        });
    },

    /**
     * Get tasks & completion history for a specific date
     * Applies Rule 8: Task createdAt <= dateStr
     * @param {string} dateStr YYYY-MM-DD
     * @returns {Object} { dateStr, tasks: [...], total, completed, incomplete, percentage }
     */
    getHistoryForDate(dateStr) {
        const tasks = Storage.getTasks();
        const records = Storage.getDailyRecords();

        // Include tasks created on or before dateStr (Rule 8)
        const relevantTasks = tasks.filter(t => t.createdAt <= dateStr);

        let completed = 0;
        let incomplete = 0;

        const detailedTasks = relevantTasks.map(task => {
            const record = records.find(r => r.taskId === task.id && r.date === dateStr);
            const status = record ? record.status : 'not_completed';
            const note = record ? record.note : '';

            if (status === 'completed') {
                completed++;
            } else {
                incomplete++;
            }

            return {
                ...task,
                status,
                note
            };
        });

        const total = relevantTasks.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
            dateStr,
            tasks: detailedTasks,
            total,
            completed,
            incomplete,
            percentage
        };
    }
};
