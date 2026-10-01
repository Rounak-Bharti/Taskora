/**
 * Statistics Module - Computes Analytics, Streaks, and Visualizations
 */

const StatisticsManager = {
    /**
     * Compute overall completion, streaks, and total counts
     * @returns {Object} Metric stats object
     */
    getOverallStats() {
        const tasks = Storage.getTasks();
        const records = Storage.getDailyRecords();

        if (records.length === 0) {
            return {
                overallPercentage: 0,
                currentStreak: 0,
                bestStreak: 0,
                totalCompleted: 0,
                totalTrackedDays: 0
            };
        }

        // Total completed tasks count across all records
        const completedRecords = records.filter(r => r.status === 'completed');
        const totalCompleted = completedRecords.length;

        // Unique tracked dates
        const trackedDatesSet = new Set(records.map(r => r.date));
        const totalTrackedDays = trackedDatesSet.size;

        // Overall completion rate
        const totalRecordsCount = records.length;
        const overallPercentage = totalRecordsCount > 0 
            ? Math.round((totalCompleted / totalRecordsCount) * 100) 
            : 0;

        // Streak Calculation
        const sortedDates = Array.from(trackedDatesSet).sort();
        
        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;

        // Map dates to daily completion success (at least 1 task completed)
        const dateCompletionMap = {};
        sortedDates.forEach(dateStr => {
            const dayRecords = records.filter(r => r.date === dateStr);
            const dayCompletedCount = dayRecords.filter(r => r.status === 'completed').length;
            dateCompletionMap[dateStr] = dayCompletedCount > 0;
        });

        // Compute streak logic with consecutive dates
        for (let i = 0; i < sortedDates.length; i++) {
            const dateStr = sortedDates[i];
            if (dateCompletionMap[dateStr]) {
                tempStreak++;
                if (tempStreak > bestStreak) {
                    bestStreak = tempStreak;
                }
            } else {
                tempStreak = 0;
            }
        }

        // Current Streak calculation based on recent dates up to today
        const todayStr = this.getFormattedDate(new Date());
        let checkDate = new Date();

        // Check if today or yesterday has a completed task
        let streakCount = 0;
        for (let i = 0; i < 365; i++) { // lookback up to a year
            const dStr = this.getFormattedDate(checkDate);
            if (dateCompletionMap[dStr]) {
                streakCount++;
            } else if (i === 0) {
                // If today hasn't been completed yet, check yesterday before breaking
                // Do not break on today if yesterday was completed
            } else {
                break;
            }
            checkDate.setDate(checkDate.getDate() - 1);
        }

        currentStreak = streakCount;
        if (currentStreak > bestStreak) {
            bestStreak = currentStreak;
        }

        return {
            overallPercentage,
            currentStreak,
            bestStreak,
            totalCompleted,
            totalTrackedDays
        };
    },

    /**
     * Get statistics for the last 7 days
     * @param {string} todayDateStr Today's date YYYY-MM-DD
     * @returns {Array} Array of 7 day stat objects [{ dayName, dateStr, total, completed, percentage }]
     */
    getWeeklyStats(todayDateStr) {
        const weeklyData = [];
        const baseDate = new Date(todayDateStr + 'T00:00:00');

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 6; i >= 0; i--) {
            const d = new Date(baseDate);
            d.setDate(d.getDate() - i);

            const dateStr = this.getFormattedDate(d);
            const dayName = dayNames[d.getDay()];

            const history = HistoryManager.getHistoryForDate(dateStr);

            weeklyData.push({
                dayName,
                dateStr,
                total: history.total,
                completed: history.completed,
                percentage: history.percentage
            });
        }

        return weeklyData;
    },

    /**
     * Helper to format Date object to YYYY-MM-DD
     */
    getFormattedDate(dateObj) {
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    },

    /**
     * Render Statistics page view into container element
     * @param {HTMLElement} container 
     * @param {string} todayStr 
     */
    renderStatisticsPage(container, todayStr) {
        const overall = this.getOverallStats();
        const weekly = this.getWeeklyStats(todayStr);

        let weeklyBarsHtml = weekly.map(item => `
            <div class="weekly-bar-col">
                <div class="bar-value-label">${item.percentage}%</div>
                <div class="bar-track">
                    <div class="bar-fill" style="height: ${item.percentage}%;"></div>
                </div>
                <div class="bar-day-label">${item.dayName}</div>
                <div class="bar-sub-label">${item.completed}/${item.total}</div>
            </div>
        `).join('');

        const html = `
            <div class="stats-header">
                <h2>Productivity Insights</h2>
                <p class="section-subtitle">Comprehensive breakdown of your task completion & streaks</p>
            </div>

            <!-- KPI Metric Cards Grid -->
            <div class="stats-cards-grid">
                <div class="stat-card accent-primary">
                    <div class="stat-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    </div>
                    <div class="stat-content">
                        <span class="stat-label">Overall Completion</span>
                        <span class="stat-value">${overall.overallPercentage}%</span>
                    </div>
                </div>

                <div class="stat-card accent-warning">
                    <div class="stat-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
                    </div>
                    <div class="stat-content">
                        <span class="stat-label">Current Streak</span>
                        <span class="stat-value">${overall.currentStreak} <small>Days</small></span>
                    </div>
                </div>

                <div class="stat-card accent-success">
                    <div class="stat-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                    </div>
                    <div class="stat-content">
                        <span class="stat-label">Best Streak</span>
                        <span class="stat-value">${overall.bestStreak} <small>Days</small></span>
                    </div>
                </div>

                <div class="stat-card accent-info">
                    <div class="stat-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                    </div>
                    <div class="stat-content">
                        <span class="stat-label">Total Completed</span>
                        <span class="stat-value">${overall.totalCompleted} <small>Tasks</small></span>
                    </div>
                </div>
            </div>

            <!-- Weekly Performance Bar Chart -->
            <div class="stats-section-card">
                <div class="card-header-flex">
                    <div>
                        <h3>Weekly Activity (Last 7 Days)</h3>
                        <p class="card-subtitle">Daily completion rates across the past week</p>
                    </div>
                </div>
                <div class="weekly-chart-container">
                    ${weeklyBarsHtml}
                </div>
            </div>
        `;

        container.innerHTML = html;
    }
};
