/**
 * Statistics Module - Computes Analytics, Streaks, Heatmap, and Visualizations
 */

const StatisticsManager = {
    selectedMonthKey: null, // "YYYY-MM"

    /**
     * Helper to get formatted date string YYYY-MM-DD from Date object
     */
    getFormattedDate(dateObj) {
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    },

    /**
     * Helper to get current YYYY-MM month key
     */
    getCurrentMonthKey(todayStr) {
        return todayStr ? todayStr.substring(0, 7) : this.getFormattedDate(new Date()).substring(0, 7);
    },

    // ==========================================
    // DATA CALCULATION FUNCTIONS (PURE & REUSABLE)
    // ==========================================

    /**
     * 1. Calculate overall completion percentage
     */
    calculateOverallCompletion() {
        const records = Storage.getDailyRecords();
        if (records.length === 0) return 0;

        const completed = records.filter(r => r.status === 'completed').length;
        const total = records.length;

        return total > 0 ? Math.round((completed / total) * 100) : 0;
    },

    /**
     * 2. Calculate Today's Statistics
     */
    calculateTodayStats(todayStr) {
        return HistoryManager.getDaySummary(todayStr);
    },

    /**
     * 3. Calculate Weekly Statistics (Last 7 Days)
     */
    calculateWeeklyStats(todayStr) {
        const weeklyData = [];
        const baseDate = new Date(todayStr + 'T00:00:00');
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 6; i >= 0; i--) {
            const d = new Date(baseDate);
            d.setDate(d.getDate() - i);

            const dateStr = this.getFormattedDate(d);
            const dayName = dayNames[d.getDay()];
            const summary = HistoryManager.getDaySummary(dateStr);

            weeklyData.push({
                dayName,
                dateStr,
                total: summary.total,
                completed: summary.completed,
                percentage: summary.percentage,
                formattedDate: App.formatFullDate(dateStr)
            });
        }

        return weeklyData;
    },

    /**
     * 4. Calculate Current Streak
     * Successful day: total > 0 AND completed > 0
     * Break day: total > 0 AND completed === 0
     * Ignore day: total === 0
     */
    calculateCurrentStreak(todayStr) {
        const tasks = Storage.getTasks();
        if (tasks.length === 0) return 0;

        let streak = 0;
        let checkDate = new Date(todayStr + 'T00:00:00');

        for (let i = 0; i < 365; i++) {
            const dateStr = this.getFormattedDate(checkDate);
            const summary = HistoryManager.getDaySummary(dateStr);

            if (i === 0) {
                // Today's date check
                if (summary.total > 0 && summary.completed > 0) {
                    streak++;
                } else if (summary.total > 0 && summary.completed === 0) {
                    // Today not completed yet, check if yesterday was completed
                }
            } else {
                // Past days check
                if (summary.total > 0) {
                    if (summary.completed > 0) {
                        streak++;
                    } else {
                        // Total tasks existed but 0 completed -> BREAK STREAK!
                        break;
                    }
                }
            }

            checkDate.setDate(checkDate.getDate() - 1);
        }

        return streak;
    },

    /**
     * 5. Calculate Best Streak (longest consecutive successful day streak in history)
     */
    calculateBestStreak() {
        const records = Storage.getDailyRecords();
        if (records.length === 0) return 0;

        const datesSet = new Set(records.map(r => r.date));
        const sortedDates = Array.from(datesSet).sort();

        let bestStreak = 0;
        let tempStreak = 0;

        sortedDates.forEach(dateStr => {
            const summary = HistoryManager.getDaySummary(dateStr);

            if (summary.total > 0) {
                if (summary.completed > 0) {
                    tempStreak++;
                    if (tempStreak > bestStreak) {
                        bestStreak = tempStreak;
                    }
                } else {
                    tempStreak = 0;
                }
            }
        });

        // Ensure current streak is compared with best streak
        const current = this.calculateCurrentStreak(App.todayDateStr);
        return Math.max(bestStreak, current);
    },

    /**
     * 6. Calculate Tracked Days count (unique dates with tasks)
     */
    calculateTrackedDays(todayStr) {
        const records = Storage.getDailyRecords();
        const dates = new Set();
        records.forEach(r => {
            if (r.date <= todayStr) {
                dates.add(r.date);
            }
        });
        return dates.size;
    },

    /**
     * 7. Calculate Task Performance for each active task
     */
    calculateTaskPerformance(todayStr) {
        const tasks = Storage.getTasks().filter(t => t.active);
        const records = Storage.getDailyRecords();

        return tasks.map(task => {
            // Find all dates from task.createdAt to todayStr
            let trackedDaysCount = 0;
            let completedDaysCount = 0;

            const start = new Date(task.createdAt + 'T00:00:00');
            const end = new Date(todayStr + 'T00:00:00');

            if (start <= end) {
                let curr = new Date(start);
                while (curr <= end) {
                    const dateStr = this.getFormattedDate(curr);
                    trackedDaysCount++;

                    const rec = records.find(r => r.taskId === task.id && r.date === dateStr);
                    if (rec && rec.status === 'completed') {
                        completedDaysCount++;
                    }

                    curr.setDate(curr.getDate() + 1);
                }
            }

            const percentage = trackedDaysCount > 0 
                ? Math.round((completedDaysCount / trackedDaysCount) * 100) 
                : 0;

            return {
                id: task.id,
                title: task.title,
                description: task.description,
                createdAt: task.createdAt,
                trackedDays: trackedDaysCount,
                completedDays: completedDaysCount,
                percentage
            };
        }).sort((a, b) => b.percentage - a.percentage);
    },

    /**
     * 8. Identify Best Performing Task
     */
    getBestTask(todayStr) {
        const performance = this.calculateTaskPerformance(todayStr);
        return performance.length > 0 ? performance[0] : null;
    },

    /**
     * 9. Identify Lowest Performing Task (Needs Attention)
     */
    getLowestTask(todayStr) {
        const performance = this.calculateTaskPerformance(todayStr);
        return performance.length > 0 ? performance[performance.length - 1] : null;
    },

    /**
     * 10. Get Most Productive Day
     */
    getMostProductiveDay(todayStr) {
        const records = Storage.getDailyRecords();
        const datesSet = new Set(records.map(r => r.date));
        const pastDates = Array.from(datesSet).filter(d => d <= todayStr).sort().reverse();

        if (pastDates.length === 0) return null;

        let bestDay = null;
        let maxPct = -1;

        pastDates.forEach(dateStr => {
            const summary = HistoryManager.getDaySummary(dateStr);
            if (summary.total > 0 && summary.percentage > maxPct) {
                maxPct = summary.percentage;
                bestDay = {
                    dateStr,
                    formattedDate: App.formatFullDate(dateStr),
                    percentage: summary.percentage,
                    completed: summary.completed,
                    total: summary.total
                };
            }
        });

        return bestDay;
    },

    /**
     * 11. Get Least Productive Day
     */
    getLeastProductiveDay(todayStr) {
        const records = Storage.getDailyRecords();
        const datesSet = new Set(records.map(r => r.date));
        const pastDates = Array.from(datesSet).filter(d => d <= todayStr).sort().reverse();

        if (pastDates.length === 0) return null;

        let worstDay = null;
        let minPct = 101;

        pastDates.forEach(dateStr => {
            const summary = HistoryManager.getDaySummary(dateStr);
            if (summary.total > 0 && summary.percentage < minPct) {
                minPct = summary.percentage;
                worstDay = {
                    dateStr,
                    formattedDate: App.formatFullDate(dateStr),
                    percentage: summary.percentage,
                    completed: summary.completed,
                    total: summary.total
                };
            }
        });

        return worstDay;
    },

    /**
     * 12. Calculate Monthly Statistics for selected month key ("YYYY-MM")
     */
    calculateMonthlyStats(monthKey, todayStr) {
        const [year, month] = monthKey.split('-').map(Number);
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const monthNameYear = `${monthNames[month - 1]} ${year}`;
        const currentMonthKey = this.getCurrentMonthKey(todayStr);

        const isFuture = monthKey > currentMonthKey;

        if (isFuture) {
            return {
                monthKey,
                monthNameYear,
                isFuture: true,
                totalCompleted: 0,
                successfulDays: 0,
                trackedDays: 0,
                percentage: 0
            };
        }

        const daysInMonth = new Date(year, month, 0).getDate();
        let totalCompleted = 0;
        let totalTasksCount = 0;
        let successfulDays = 0;
        let trackedDays = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const dd = String(day).padStart(2, '0');
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${dd}`;

            if (dateStr <= todayStr) {
                const summary = HistoryManager.getDaySummary(dateStr);
                if (summary.total > 0) {
                    trackedDays++;
                    totalCompleted += summary.completed;
                    totalTasksCount += summary.total;
                    if (summary.completed > 0) {
                        successfulDays++;
                    }
                }
            }
        }

        const percentage = totalTasksCount > 0 ? Math.round((totalCompleted / totalTasksCount) * 100) : 0;

        return {
            monthKey,
            monthNameYear,
            isFuture: false,
            totalCompleted,
            totalTasksCount,
            successfulDays,
            trackedDays,
            percentage
        };
    },

    // ==========================================
    // UI RENDERING & EVENT CONTROLLER
    // ==========================================

    /**
     * Render the complete Statistics View Page
     * @param {HTMLElement} container 
     * @param {string} todayStr 
     */
    renderStatisticsPage(container, todayStr) {
        if (!container) return;

        if (!this.selectedMonthKey) {
            this.selectedMonthKey = this.getCurrentMonthKey(todayStr);
        }

        const trackedDaysCount = this.calculateTrackedDays(todayStr);

        // Empty state check (Section 20)
        if (trackedDaysCount === 0) {
            container.innerHTML = `
                <div class="stats-header">
                    <h2>Productivity Analytics</h2>
                    <p class="section-subtitle">Real-time performance metrics and habits breakdown</p>
                </div>
                <div class="empty-state-card">
                    <div class="empty-state-icon">📊</div>
                    <h4>No statistics yet</h4>
                    <p class="empty-text">Complete some tasks to start building your productivity statistics.</p>
                </div>
            `;
            return;
        }

        // Calculations
        const overallPct = this.calculateOverallCompletion();
        const currentStreak = this.calculateCurrentStreak(todayStr);
        const bestStreak = this.calculateBestStreak();
        const records = Storage.getDailyRecords();
        const totalCompletedAllTime = records.filter(r => r.status === 'completed').length;

        const todayStats = this.calculateTodayStats(todayStr);
        const weeklyStats = this.calculateWeeklyStats(todayStr);
        const monthlyStats = this.calculateMonthlyStats(this.selectedMonthKey, todayStr);
        const taskPerf = this.calculateTaskPerformance(todayStr);
        const bestTask = this.getBestTask(todayStr);
        const lowestTask = this.getLowestTask(todayStr);
        const bestDay = this.getMostProductiveDay(todayStr);
        const worstDay = this.getLeastProductiveDay(todayStr);

        // Weekly chart bars HTML
        const weeklyBarsHtml = weeklyStats.map(item => `
            <div class="weekly-bar-col" title="${item.formattedDate}: ${item.percentage}% (${item.completed} of ${item.total} tasks completed)">
                <div class="bar-value-label">${item.percentage}%</div>
                <div class="bar-track">
                    <div class="bar-fill" style="height: ${item.percentage}%;"></div>
                </div>
                <div class="bar-day-label">${item.dayName}</div>
                <div class="bar-sub-label">${item.completed}/${item.total}</div>
            </div>
        `).join('');

        // Monthly Heatmap HTML
        const heatmapHtml = this.renderMonthlyHeatmapHtml(this.selectedMonthKey, todayStr);

        // Task Performance Progress List
        const taskPerfHtml = taskPerf.map(task => `
            <div class="task-perf-row">
                <div class="task-perf-info">
                    <span class="task-perf-title">${App.escapeHtml(task.title)}</span>
                    <span class="task-perf-pct">${task.percentage}%</span>
                </div>
                <div class="task-perf-bar-track">
                    <div class="task-perf-bar-fill" style="width: ${task.percentage}%;"></div>
                </div>
                <div class="task-perf-sub">
                    ${task.completedDays} of ${task.trackedDays} tracked days completed
                </div>
            </div>
        `).join('');

        const html = `
            <div class="stats-header">
                <h2>Productivity Insights</h2>
                <p class="section-subtitle">Real-time breakdown of performance, streaks, and habits</p>
            </div>

            <!-- SECTION 1: TOP 5 SUMMARY KPI CARDS -->
            <div class="stats-cards-grid">
                <div class="stat-card accent-primary">
                    <div class="stat-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    </div>
                    <div class="stat-content">
                        <span class="stat-label">Overall Completion</span>
                        <span class="stat-value">${overallPct}%</span>
                    </div>
                </div>

                <div class="stat-card accent-warning">
                    <div class="stat-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
                    </div>
                    <div class="stat-content">
                        <span class="stat-label">Current Streak</span>
                        <span class="stat-value">${currentStreak} <small>Days</small></span>
                    </div>
                </div>

                <div class="stat-card accent-success">
                    <div class="stat-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                    </div>
                    <div class="stat-content">
                        <span class="stat-label">Best Streak</span>
                        <span class="stat-value">${bestStreak} <small>Days</small></span>
                    </div>
                </div>

                <div class="stat-card accent-info">
                    <div class="stat-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                    </div>
                    <div class="stat-content">
                        <span class="stat-label">Total Completed</span>
                        <span class="stat-value">${totalCompletedAllTime} <small>Tasks</small></span>
                    </div>
                </div>

                <div class="stat-card accent-purple">
                    <div class="stat-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </div>
                    <div class="stat-content">
                        <span class="stat-label">Tracked Days</span>
                        <span class="stat-value">${trackedDaysCount} <small>Days</small></span>
                    </div>
                </div>
            </div>

            <!-- SECTION 2: TODAY'S PROGRESS & WEEKLY BAR CHART -->
            <div class="stats-two-col">
                <!-- Today's Progress Card -->
                <div class="stats-section-card">
                    <div class="card-header-flex">
                        <div>
                            <h3>Today's Progress</h3>
                            <p class="card-subtitle">${App.formatFullDate(todayStr)}</p>
                        </div>
                        <span class="stat-badge-highlight">${todayStats.percentage}%</span>
                    </div>
                    
                    <div class="history-progress-track mb-4">
                        <div class="history-progress-fill" style="width: ${todayStats.percentage}%;"></div>
                    </div>

                    <div class="history-summary-pills">
                        <div class="summary-pill total-pill">
                            <span class="pill-number">${todayStats.total}</span>
                            <span class="pill-label">Total Tasks</span>
                        </div>
                        <div class="summary-pill completed-pill">
                            <span class="pill-number">${todayStats.completed}</span>
                            <span class="pill-label">Completed</span>
                        </div>
                        <div class="summary-pill incomplete-pill">
                            <span class="pill-number">${todayStats.incomplete}</span>
                            <span class="pill-label">Remaining</span>
                        </div>
                    </div>
                </div>

                <!-- Completion Breakdown (Horizontal Stacked Bar) -->
                <div class="stats-section-card">
                    <h3>Completion Breakdown</h3>
                    <p class="card-subtitle">Ratio of completed vs incomplete task records</p>
                    
                    <div class="stacked-bar-container mt-4">
                        <div class="stacked-bar-track">
                            <div class="stacked-bar-fill completed" style="width: ${overallPct}%;"></div>
                            <div class="stacked-bar-fill incomplete" style="width: ${100 - overallPct}%;"></div>
                        </div>
                        <div class="stacked-bar-legend">
                            <span class="legend-item"><span class="legend-dot green"></span> Completed: ${overallPct}%</span>
                            <span class="legend-item"><span class="legend-dot yellow"></span> Incomplete: ${100 - overallPct}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SECTION 3: WEEKLY BAR CHART -->
            <div class="stats-section-card mt-4">
                <div class="card-header-flex">
                    <div>
                        <h3>This Week (Last 7 Days)</h3>
                        <p class="card-subtitle">Daily task completion percentages over the past week</p>
                    </div>
                </div>
                <div class="weekly-chart-container">
                    ${weeklyBarsHtml}
                </div>
            </div>

            <!-- SECTION 4: MONTHLY STATISTICS & PRODUCTIVITY HEATMAP -->
            <div class="stats-section-card mt-4">
                <div class="card-header-flex">
                    <div>
                        <h3>Monthly Overview</h3>
                        <p class="card-subtitle">Monthly summary and daily completion heatmap</p>
                    </div>
                    <div class="calendar-nav-group">
                        <button type="button" class="btn btn-icon" id="stats-prev-month" title="Previous Month">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
                        </button>
                        <span class="calendar-month-year">${monthlyStats.monthNameYear}</span>
                        <button type="button" class="btn btn-icon" id="stats-next-month" title="Next Month">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
                        </button>
                    </div>
                </div>

                ${monthlyStats.isFuture ? `
                    <div class="empty-state-card mt-3">
                        <div class="empty-state-icon">🔮</div>
                        <h4>No statistics available for this month yet.</h4>
                    </div>
                ` : `
                    <div class="history-summary-pills mb-4">
                        <div class="summary-pill total-pill">
                            <span class="pill-number">${monthlyStats.percentage}%</span>
                            <span class="pill-label">Completion Rate</span>
                        </div>
                        <div class="summary-pill completed-pill">
                            <span class="pill-number">${monthlyStats.totalCompleted}</span>
                            <span class="pill-label">Tasks Completed</span>
                        </div>
                        <div class="summary-pill completed-pill">
                            <span class="pill-number">${monthlyStats.successfulDays}</span>
                            <span class="pill-label">Successful Days</span>
                        </div>
                        <div class="summary-pill total-pill">
                            <span class="pill-number">${monthlyStats.trackedDays}</span>
                            <span class="pill-label">Tracked Days</span>
                        </div>
                    </div>

                    <div class="heatmap-section">
                        <h4 class="heatmap-title">Productivity Heatmap</h4>
                        ${heatmapHtml}
                        <div class="heatmap-legend">
                            <span>Less</span>
                            <span class="heatmap-cell heatmap-empty"></span>
                            <span class="heatmap-cell heatmap-low"></span>
                            <span class="heatmap-cell heatmap-med-low"></span>
                            <span class="heatmap-cell heatmap-med-high"></span>
                            <span class="heatmap-cell heatmap-high"></span>
                            <span>More</span>
                        </div>
                    </div>
                `}
            </div>

            <!-- SECTION 5: MOST & LEAST PRODUCTIVE DAYS -->
            <div class="stats-two-col mt-4">
                <div class="stats-section-card">
                    <div class="card-header-flex">
                        <div>
                            <h3>Most Productive Day</h3>
                            <p class="card-subtitle">Highest completion percentage recorded</p>
                        </div>
                        <span class="stat-badge-highlight green">🏆 Best Day</span>
                    </div>
                    ${bestDay ? `
                        <div class="productive-day-body">
                            <h4 class="productive-date">${bestDay.formattedDate}</h4>
                            <div class="productive-pct">${bestDay.percentage}%</div>
                            <p class="productive-sub">${bestDay.completed} of ${bestDay.total} tasks completed</p>
                        </div>
                    ` : '<p class="empty-text">No productivity records available.</p>'}
                </div>

                <div class="stats-section-card">
                    <div class="card-header-flex">
                        <div>
                            <h3>Needs Improvement</h3>
                            <p class="card-subtitle">Lowest completion percentage recorded</p>
                        </div>
                        <span class="stat-badge-highlight warning">⚠️ Attention</span>
                    </div>
                    ${worstDay ? `
                        <div class="productive-day-body">
                            <h4 class="productive-date">${worstDay.formattedDate}</h4>
                            <div class="productive-pct warning">${worstDay.percentage}%</div>
                            <p class="productive-sub">${worstDay.completed} of ${worstDay.total} tasks completed</p>
                        </div>
                    ` : '<p class="empty-text">No productivity records available.</p>'}
                </div>
            </div>

            <!-- SECTION 6: TASK PERFORMANCE & BEST / LOWEST TASKS -->
            <div class="stats-section-card mt-4">
                <div class="card-header-flex">
                    <div>
                        <h3>Task Performance</h3>
                        <p class="card-subtitle">Individual completion rates for active tasks</p>
                    </div>
                </div>

                <div class="stats-two-col mb-4">
                    ${bestTask ? `
                        <div class="task-highlight-card best">
                            <span class="highlight-tag">🏆 Best Performing Task</span>
                            <h4>${App.escapeHtml(bestTask.title)}</h4>
                            <div class="highlight-pct">${bestTask.percentage}% completion</div>
                        </div>
                    ` : ''}

                    ${lowestTask ? `
                        <div class="task-highlight-card lowest">
                            <span class="highlight-tag warning">⚠️ Needs Attention</span>
                            <h4>${App.escapeHtml(lowestTask.title)}</h4>
                            <div class="highlight-pct warning">${lowestTask.percentage}% completion</div>
                        </div>
                    ` : ''}
                </div>

                <div class="task-perf-list">
                    ${taskPerfHtml}
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Bind Month Navigation Events
        document.getElementById('stats-prev-month')?.addEventListener('click', () => {
            this.changeSelectedMonth(-1, todayStr, container);
        });

        document.getElementById('stats-next-month')?.addEventListener('click', () => {
            this.changeSelectedMonth(1, todayStr, container);
        });
    },

    /**
     * Change selected month for statistics view
     */
    changeSelectedMonth(delta, todayStr, container) {
        const [y, m] = this.selectedMonthKey.split('-').map(Number);
        let date = new Date(y, m - 1 + delta, 1);
        const newY = date.getFullYear();
        const newM = String(date.getMonth() + 1).padStart(2, '0');
        this.selectedMonthKey = `${newY}-${newM}`;
        this.renderStatisticsPage(container, todayStr);
    },

    /**
     * Helper to render monthly heatmap grid
     */
    renderMonthlyHeatmapHtml(monthKey, todayStr) {
        const [year, month] = monthKey.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        
        // 0 = Sun, 1 = Mon ...
        const firstDay = new Date(year, month - 1, 1).getDay();
        const leadingEmptySlots = (firstDay === 0) ? 6 : (firstDay - 1); // Mon-indexed offset

        let cellsHtml = '';

        // Empty offset slots
        for (let i = 0; i < leadingEmptySlots; i++) {
            cellsHtml += `<div class="heatmap-cell heatmap-empty offset"></div>`;
        }

        // Days in month
        for (let d = 1; d <= daysInMonth; d++) {
            const dd = String(d).padStart(2, '0');
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${dd}`;
            const summary = HistoryManager.getDaySummary(dateStr);

            let intensityClass = 'heatmap-empty';
            if (dateStr <= todayStr && summary.total > 0) {
                const pct = summary.percentage;
                if (pct === 0) intensityClass = 'heatmap-empty';
                else if (pct <= 25) intensityClass = 'heatmap-low';
                else if (pct <= 50) intensityClass = 'heatmap-med-low';
                else if (pct <= 75) intensityClass = 'heatmap-med-high';
                else intensityClass = 'heatmap-high';
            }

            cellsHtml += `
                <div class="heatmap-cell ${intensityClass}" title="${App.formatFullDate(dateStr)}: ${summary.percentage}% completed (${summary.completed}/${summary.total})">
                    <span class="heatmap-day-num">${d}</span>
                </div>
            `;
        }

        return `
            <div class="heatmap-container">
                <div class="heatmap-weekdays">
                    <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
                </div>
                <div class="heatmap-grid">
                    ${cellsHtml}
                </div>
            </div>
        `;
    }
};
