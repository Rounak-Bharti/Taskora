/* Taskora — Daily Routine & Self-Improvement Engine */
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});

const App = {
  currentUser: null,
  userSettings: {},
  currentChart: null,

  async init() {
    this.bindGlobalEvents();
    this.initTheme();
    await this.checkAuthStatus();
    window.addEventListener("hashchange", () => this.handleRoute());
    this.handleRoute();
  },

  initTheme() {
    const savedTheme = localStorage.getItem("taskora_theme") || "system";
    this.applyTheme(savedTheme);
  },

  applyTheme(theme) {
    localStorage.setItem("taskora_theme", theme);
    const body = document.body;
    if (theme === "dark") {
      body.classList.add("dark-mode");
      document.getElementById("theme-icon").textContent = "☀️";
    } else if (theme === "light") {
      body.classList.remove("dark-mode");
      document.getElementById("theme-icon").textContent = "🌙";
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        body.classList.add("dark-mode");
        document.getElementById("theme-icon").textContent = "☀️";
      } else {
        body.classList.remove("dark-mode");
        document.getElementById("theme-icon").textContent = "🌙";
      }
    }
  },

  bindGlobalEvents() {
    document.getElementById("theme-toggle-btn").addEventListener("click", () => {
      const isDark = document.body.classList.contains("dark-mode");
      this.applyTheme(isDark ? "light" : "dark");
    });

    const formulaBtn = document.getElementById("formula-info-btn");
    if (formulaBtn) {
      formulaBtn.addEventListener("click", () => this.openFormulaModal());
    }

    const mobileBtn = document.getElementById("mobile-menu-btn");
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");
    const closeBtn = document.getElementById("close-sidebar-btn");

    const toggleSidebar = (show) => {
      if (!sidebar) return;
      const isOpen = show !== undefined ? show : !sidebar.classList.contains("open");
      if (isOpen) {
        sidebar.classList.add("open");
        if (backdrop) backdrop.classList.add("active");
      } else {
        sidebar.classList.remove("open");
        if (backdrop) backdrop.classList.remove("active");
      }
    };

    if (mobileBtn) {
      mobileBtn.addEventListener("click", () => toggleSidebar());
    }
    if (closeBtn) {
      closeBtn.addEventListener("click", () => toggleSidebar(false));
    }
    if (backdrop) {
      backdrop.addEventListener("click", () => toggleSidebar(false));
    }

    document.querySelectorAll(".sidebar-nav .nav-item").forEach(item => {
      item.addEventListener("click", () => {
        if (window.innerWidth <= 768) {
          toggleSidebar(false);
        }
      });
    });

    document.getElementById("logout-btn").addEventListener("click", async () => {
      await API.logout();
      this.currentUser = null;
      window.location.hash = "#login";
      this.showToast("Logged out successfully");
    });

    document.getElementById("test-alarm-btn").addEventListener("click", () => {
      this.triggerWakeupAlarm();
    });
  },

  async checkAuthStatus() {
    const token = API.getToken();
    if (token) {
      try {
        const res = await API.getMe();
        this.currentUser = res.user;
        this.updateUserUI();
      } catch (err) {
        this.currentUser = null;
      }
    }
  },

  updateUserUI() {
    if (this.currentUser) {
      document.getElementById("user-name-display").textContent = this.currentUser.name;
      if (this.currentUser.avatar) {
        document.getElementById("user-avatar-img").src = this.currentUser.avatar;
      }
    }
  },

  async handleRoute() {
    const hash = window.location.hash || "#dashboard";
    const route = hash.split("?")[0];

    document.getElementById("landing-page").style.display = "none";
    document.getElementById("auth-page").style.display = "none";
    document.getElementById("onboarding-page").style.display = "none";
    document.getElementById("app-layout").style.display = "none";

    if (route === "#landing") {
      document.getElementById("landing-page").style.display = "block";
      return;
    }

    if (route === "#login" || route === "#register") {
      this.renderAuthPage(route);
      document.getElementById("auth-page").style.display = "flex";
      return;
    }

    if (!this.currentUser) {
      window.location.hash = "#landing";
      return;
    }

    if (route === "#onboarding") {
      this.renderOnboarding();
      document.getElementById("onboarding-page").style.display = "block";
      return;
    }

    document.getElementById("app-layout").style.display = "flex";
    this.updateActiveNav(route.replace("#", ""));

    const container = document.getElementById("page-container");
    container.innerHTML = `<div style="text-align: center; padding: 4rem;"><div class="logo-icon" style="margin: 0 auto 1rem; animation: pulse-ring 1s infinite;">T</div><p>Loading Taskora Dashboard...</p></div>`;

    try {
      if (route === "#dashboard") {
        await this.renderDashboard(container);
      } else if (route === "#routine") {
        await this.renderRoutinePage(container);
      } else if (route === "#reflection") {
        await this.renderReflectionPage(container);
      } else if (route === "#calendar") {
        await this.renderCalendarPage(container);
      } else if (route === "#analytics") {
        await this.renderAnalyticsPage(container);
      } else if (route === "#habits") {
        await this.renderHabitsPage(container);
      } else if (route === "#rewards") {
        await this.renderRewardsPage(container);
      } else if (route === "#leaderboard") {
        await this.renderLeaderboardPage(container);
      } else if (route === "#settings") {
        await this.renderSettingsPage(container);
      } else {
        await this.renderDashboard(container);
      }
    } catch (err) {
      container.innerHTML = `<div class="card" style="text-align: center; color: var(--danger);"><h3>Error loading page</h3><p>${err.message}</p></div>`;
    }
  },

  updateActiveNav(pageName) {
    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.remove("active");
      if (item.getAttribute("data-page") === pageName) {
        item.classList.add("active");
      }
    });
  },

  // --- AUTH & ONBOARDING ---
  renderAuthPage(route) {
    const form = document.getElementById("auth-form");
    const title = document.getElementById("auth-title");
    const subtitle = document.getElementById("auth-subtitle");

    if (route === "#login") {
      title.textContent = "Welcome Back";
      subtitle.textContent = "Sign in to Taskora";
      form.innerHTML = `
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" id="auth-email" placeholder="name@domain.com" required>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="auth-password" placeholder="••••••••" required>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Sign In</button>
        <p style="text-align: center; margin-top: 1.5rem; font-size: 0.9rem; color: var(--text-secondary);">
          Don't have an account? <a href="#register">Create one</a>
        </p>
      `;
      form.onsubmit = async (e) => {
        e.preventDefault();
        try {
          const res = await API.login(document.getElementById("auth-email").value, document.getElementById("auth-password").value);
          API.setToken(res.token);
          this.currentUser = res.user;
          this.updateUserUI();
          window.location.hash = "#dashboard";
          this.showToast("Welcome back, " + res.user.name + "!");
        } catch (err) {
          this.showToast(err.message, "danger");
        }
      };
    } else {
      title.textContent = "Create an Account";
      subtitle.textContent = "Start tracking daily routines and quality ratings";
      form.innerHTML = `
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="auth-name" placeholder="Rounak Kumar" required>
        </div>
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" id="auth-email" placeholder="name@domain.com" required>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="auth-password" placeholder="At least 6 characters" minlength="6" required>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Create Account</button>
        <p style="text-align: center; margin-top: 1.5rem; font-size: 0.9rem; color: var(--text-secondary);">
          Already have an account? <a href="#login">Sign In</a>
        </p>
      `;
      form.onsubmit = async (e) => {
        e.preventDefault();
        try {
          const res = await API.register(document.getElementById("auth-name").value, document.getElementById("auth-email").value, document.getElementById("auth-password").value);
          API.setToken(res.token);
          this.currentUser = res.user;
          this.updateUserUI();
          window.location.hash = "#onboarding";
        } catch (err) {
          this.showToast(err.message, "danger");
        }
      };
    }
  },

  renderOnboarding() {
    const container = document.getElementById("onboarding-step-content");
    container.innerHTML = `
      <div style="text-align: center; margin-bottom: 2rem;">
        <span style="font-size: 2.5rem;">🌱</span>
        <h2 style="font-size: 1.75rem; font-weight: 800; margin-top: 0.5rem;">Build Better Routines, Track Quality</h2>
        <p style="color: var(--text-secondary);">Select the routine habits you want to track daily:</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;" id="goal-options">
        <label class="card" style="cursor: pointer; display: flex; align-items: center; gap: 0.75rem;">
          <input type="checkbox" value="Exercise" checked> 🏃 Morning Exercise
        </label>
        <label class="card" style="cursor: pointer; display: flex; align-items: center; gap: 0.75rem;">
          <input type="checkbox" value="Read for 20 minutes" checked> 📖 Read Books
        </label>
        <label class="card" style="cursor: pointer; display: flex; align-items: center; gap: 0.75rem;">
          <input type="checkbox" value="Study for 1 hour" checked> 💻 Deep Study / Work
        </label>
        <label class="card" style="cursor: pointer; display: flex; align-items: center; gap: 0.75rem;">
          <input type="checkbox" value="Drink water" checked> 💧 Hydration Target
        </label>
      </div>

      <button id="finish-onboarding-btn" class="btn btn-primary" style="width: 100%;">Complete Setup & Open Dashboard</button>
    `;

    document.getElementById("finish-onboarding-btn").addEventListener("click", async () => {
      const selected = Array.from(document.querySelectorAll("#goal-options input:checked")).map(el => el.value);
      await API.onboarding(["productivity"], selected, { weekStart: "monday", reminderTime: "08:00" });
      window.location.hash = "#dashboard";
    });
  },

  // --- DASHBOARD PAGE ---
  async renderDashboard(container) {
    const todayStr = new Date().toISOString().split('T')[0];
    const perfData = await API.getDailyPerformance(todayStr);
    const tasksRes = await API.getTasks(todayStr, "today");
    const analyticsRes = await API.getAnalytics("7days");

    const tasks = tasksRes.tasks || [];
    const score = perfData.daily_performance || 0;
    const completedCnt = perfData.completed_count || 0;
    const totalCnt = perfData.total_applicable || 0;
    const avgQuality = perfData.average_quality || 0;

    const hour = new Date().getHours();
    let greeting = "Good morning";
    if (hour >= 12 && hour < 17) greeting = "Good afternoon";
    else if (hour >= 17) greeting = "Good evening";

    let motivationalMsg = "Great consistency today! Keep going.";
    if (score >= 80) motivationalMsg = "Outstanding performance today! Your routine quality is excellent.";
    else if (score >= 60) motivationalMsg = "Solid progress today! You completed most of your planned activities.";
    else if (score > 0) motivationalMsg = "Room for improvement today. Rate your evening routine tasks.";

    // SVG dashoffset logic (perimeter = 2 * PI * 50 = 314)
    const dashOffset = 314 - (314 * score / 100);

    container.innerHTML = `
      <div class="welcome-banner">
        <h1>${greeting}, ${this.currentUser ? this.currentUser.name : 'User'} 👋</h1>
        <p>${motivationalMsg}</p>
      </div>

      <!-- Main Daily Performance Score Ring Card -->
      <div class="perf-ring-card">
        <div class="perf-ring-left">
          <svg class="perf-circle-svg" viewBox="0 0 120 120">
            <circle class="perf-circle-bg" cx="60" cy="60" r="50"></circle>
            <circle class="perf-circle-val" cx="60" cy="60" r="50" style="stroke-dashoffset: ${dashOffset};"></circle>
          </svg>
          <div>
            <div class="perf-score-text">${score}%</div>
            <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-primary);">Today's Performance</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">Calculated from routine completion & 1-5★ quality ratings</div>
          </div>
        </div>
        <div style="display: flex; gap: 1.5rem; text-align: center;">
          <div>
            <div style="font-size: 1.5rem; font-weight: 800;">${completedCnt} / ${totalCnt}</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">Activities Done</div>
          </div>
          <div>
            <div style="font-size: 1.5rem; font-weight: 800; color: #f59e0b;">⭐ ${avgQuality}</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">Avg Task Quality</div>
          </div>
          <div>
            <button class="btn btn-secondary btn-sm" onclick="App.openFormulaModal()">How is this calculated?</button>
          </div>
        </div>
      </div>

      <div class="metrics-grid">
        <div class="card metric-card">
          <div class="metric-icon">📊</div>
          <div><div class="metric-val">${analyticsRes.average_performance}%</div><div class="metric-lbl">7-Day Performance Avg</div></div>
        </div>
        <div class="card metric-card">
          <div class="metric-icon">🏆</div>
          <div><div class="metric-val">${analyticsRes.best_day ? analyticsRes.best_day.score + '%' : 'N/A'}</div><div class="metric-lbl">Best Day Score</div></div>
        </div>
        <div class="card metric-card">
          <div class="metric-icon">🔥</div>
          <div><div class="metric-val">7 Days</div><div class="metric-lbl">Current Streak</div></div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
            <h2 class="section-title" style="margin-bottom: 0;">Today's Routine Preview</h2>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-secondary btn-sm" onclick="App.openApplyTemplateModal()">📋 Apply Template</button>
              <a href="#routine" class="btn btn-primary btn-sm">View Full Routine →</a>
            </div>
          </div>

          <div id="dashboard-routine-container">
            ${tasks.length === 0 ? `
              <div class="card" style="text-align: center; padding: 2.5rem;">
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">No routine activities added for today yet.</p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                  <button class="btn btn-primary btn-sm" onclick="App.openAddTaskModal()">+ Add Activity</button>
                  <button class="btn btn-secondary btn-sm" onclick="App.openApplyTemplateModal()">📋 Apply Template</button>
                </div>
              </div>
            ` : tasks.map(t => `
              <div class="routine-item">
                <div>
                  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                    <span style="font-weight: 700; font-size: 1rem;">${t.title}</span>
                    <span class="status-pill status-${t.status}">${t.status.replace('_', ' ')}</span>
                  </div>
                  <div style="font-size: 0.8rem; color: var(--text-secondary);">
                    ${t.category} • Scheduled ${t.due_time} (${t.estimated_duration} mins)
                    ${t.quality_rating ? ` • <span style="color:#f59e0b;">⭐ ${t.quality_rating}/5</span>` : ''}
                  </div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="App.openRatingModal(${t.id}, '${t.title}', '${t.status}')">
                  ${t.quality_rating ? 'Edit Rating' : 'Rate / Complete'}
                </button>
              </div>
            `).join('')}
          </div>

          <div class="card" style="margin-top: 2rem;">
            <h3 class="section-title">7-Day Daily Performance Trend</h3>
            <canvas id="dashboard-chart" height="180"></canvas>
          </div>
        </div>

        <div>
          <h2 class="section-title">Quick Actions</h2>
          <div class="card" style="display: flex; flex-direction: column; gap: 0.85rem; margin-bottom: 2rem;">
            <button class="btn btn-primary" onclick="App.openAddTaskModal()">+ Add Routine Activity</button>
            <button class="btn btn-secondary" onclick="App.openApplyTemplateModal()">📋 Apply Routine Template</button>
            <a href="#reflection" class="btn btn-secondary" style="text-align: center;">📝 Complete Daily Reflection</a>
            <a href="#calendar" class="btn btn-secondary" style="text-align: center;">📅 Calendar & Compare Days</a>
          </div>
        </div>
      </div>
    `;

    this.renderTrendChart((analyticsRes.daily_trend || []).map(d => d.day), (analyticsRes.daily_trend || []).map(d => d.performance));
  },

  renderTrendChart(labels, dataPoints) {
    const ctx = document.getElementById("dashboard-chart");
    if (!ctx) return;
    if (this.currentChart) this.currentChart.destroy();

    this.currentChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Daily Performance %',
          data: dataPoints,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.15)',
          fill: true,
          tension: 0.3,
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        scales: { y: { min: 0, max: 100, ticks: { callback: v => v + '%' } } }
      }
    });
  },

  // --- TODAY'S ROUTINE PAGE ---
  async renderRoutinePage(container) {
    const todayStr = new Date().toISOString().split('T')[0];
    const res = await API.getTasks(todayStr, "today");
    const tasks = res.tasks || [];

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem;">
        <div>
          <h1 style="font-size: 1.75rem; font-weight: 800;">Today's Planned Routine</h1>
          <p style="color: var(--text-secondary);">Track completed activities and rate performance quality (1-5 stars)</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn btn-secondary" onclick="App.openApplyTemplateModal()">📋 Apply Template</button>
          <button class="btn btn-primary" onclick="App.openAddTaskModal()">+ Add Activity</button>
        </div>
      </div>

      <div class="card">
        ${tasks.length === 0 ? `
          <div style="text-align: center; padding: 3rem;">
            <p style="color: var(--text-secondary); margin-bottom: 1rem;">No routine activities scheduled for today.</p>
            <button class="btn btn-primary" onclick="App.openAddTaskModal()">Create Activity</button>
          </div>
        ` : tasks.map(t => `
          <div class="routine-item">
            <div>
              <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.35rem;">
                <span style="font-weight: 800; font-size: 1.05rem;">${t.due_time} — ${t.title}</span>
                <span class="status-pill status-${t.status}">${t.status.replace('_', ' ')}</span>
                ${t.wake_up_challenge ? '<span class="badge" style="background:var(--danger-light); color:var(--danger);">⏰ Math Challenge</span>' : ''}
              </div>
              <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.35rem;">
                Category: <strong>${t.category}</strong> • Duration: ${t.actual_duration || t.estimated_duration} mins • Priority: ${t.priority}
              </p>
              ${t.note ? `<p style="font-size: 0.8rem; color: var(--text-muted); italic;">Note: "${t.note}"</p>` : ''}
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <button class="btn btn-primary btn-sm" onclick="App.openRatingModal(${t.id}, '${t.title}', '${t.status}')">
                ⭐ ${t.quality_rating ? t.quality_rating + '/5 Rating' : 'Rate Quality'}
              </button>
              <button class="btn btn-secondary btn-sm" onclick="App.deleteRoutineTask(${t.id})">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  // --- TASK QUALITY RATING MODAL ---
  openRatingModal(id, title, currentStatus) {
    let selectedRating = 4;
    let selectedDifficulty = 'medium';

    this.showModal(`
      <div class="modal-header">
        <h2 class="modal-title">Rate Performance Quality</h2>
        <span class="close-btn" onclick="App.closeModal()">×</span>
      </div>
      <div class="rating-dialog">
        <p style="font-weight: 700; font-size: 1.1rem; margin-bottom: 0.5rem;">${title}</p>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1.25rem;">How well did you complete this task today?</p>

        <div class="form-group">
          <label>Activity Status</label>
          <select id="rate-status">
            <option value="completed" ${currentStatus === 'completed' ? 'selected' : ''}>Completed (100% completion value)</option>
            <option value="partially_completed" ${currentStatus === 'partially_completed' ? 'selected' : ''}>Partially Completed (50% value)</option>
            <option value="skipped" ${currentStatus === 'skipped' ? 'selected' : ''}>Skipped (0% value)</option>
            <option value="missed" ${currentStatus === 'missed' ? 'selected' : ''}>Missed (0% value)</option>
            <option value="not_applicable" ${currentStatus === 'not_applicable' ? 'selected' : ''}>Not Applicable (Excluded)</option>
          </select>
        </div>

        <div class="form-group">
          <label>Quality Rating (1 to 5 Stars)</label>
          <div class="star-rating" id="star-picker">
            <span data-star="1">★</span>
            <span data-star="2">★</span>
            <span data-star="3">★</span>
            <span data-star="4" class="selected">★</span>
            <span data-star="5" class="selected">★</span>
          </div>
        </div>

        <div class="form-group">
          <label>Difficulty Level</label>
          <div class="difficulty-selector">
            <button type="button" class="difficulty-btn" data-diff="easy">Easy</button>
            <button type="button" class="difficulty-btn selected" data-diff="medium">Medium</button>
            <button type="button" class="difficulty-btn" data-diff="hard">Hard</button>
          </div>
        </div>

        <div class="form-group">
          <label>Actual Duration (Minutes)</label>
          <input type="number" id="rate-duration" value="45" min="1">
        </div>

        <div class="form-group">
          <label>Short Reflection Note</label>
          <input type="text" id="rate-note" placeholder="e.g. Understood main concepts, completed 3 exercises.">
        </div>

        <button id="save-rating-btn" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Save Performance Rating</button>
      </div>
    `);

    // Star Picker Interaction
    const stars = document.querySelectorAll("#star-picker span");
    stars.forEach(s => {
      s.addEventListener("click", () => {
        selectedRating = parseInt(s.getAttribute("data-star"));
        stars.forEach((st, idx) => {
          if (idx < selectedRating) st.classList.add("selected");
          else st.classList.remove("selected");
        });
      });
    });

    // Difficulty buttons
    const diffBtns = document.querySelectorAll(".difficulty-btn");
    diffBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        diffBtns.forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedDifficulty = btn.getAttribute("data-diff");
      });
    });

    document.getElementById("save-rating-btn").addEventListener("click", async () => {
      try {
        const status = document.getElementById("rate-status").value;
        const duration = parseInt(document.getElementById("rate-duration").value) || 30;
        const note = document.getElementById("rate-note").value;

        await API.rateTask(id, {
          status: status,
          quality_rating: selectedRating,
          actual_duration: duration,
          difficulty: selectedDifficulty,
          note: note
        });

        this.closeModal();
        this.handleRoute();
        this.showToast("Task performance & quality rating saved!");
      } catch (err) {
        this.showToast(err.message, "danger");
      }
    });
  },

  // --- DAILY REFLECTION PAGE ---
  async renderReflectionPage(container) {
    const todayStr = new Date().toISOString().split('T')[0];
    const res = await API.getReflection(todayStr);
    const ref = res.reflection || {};

    container.innerHTML = `
      <div style="margin-bottom: 2rem;">
        <h1 style="font-size: 1.75rem; font-weight: 800;">Evening Daily Reflection</h1>
        <p style="color: var(--text-secondary);">Reflect on your achievements, energy, mood, and areas for improvement</p>
      </div>

      <div class="card" style="max-width: 750px;">
        <form id="reflection-form">
          <div class="form-group">
            <label>1. What went well today?</label>
            <textarea id="ref-went-well" rows="2" placeholder="Completed my morning study block with deep focus...">${ref.went_well || ''}</textarea>
          </div>

          <div class="form-group">
            <label>2. What did I fail to complete?</label>
            <textarea id="ref-failed" rows="2" placeholder="Missed the evening workout session...">${ref.failed_tasks || ''}</textarea>
          </div>

          <div class="form-group">
            <label>3. Why did I miss those tasks?</label>
            <textarea id="ref-why" rows="2" placeholder="Overworked in the afternoon and felt fatigued...">${ref.why_missed || ''}</textarea>
          </div>

          <div class="form-group">
            <label>4. What should I improve tomorrow?</label>
            <textarea id="ref-improve" rows="2" placeholder="Take a short break between study sessions...">${ref.improve_tomorrow || ''}</textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>5. Energy Level today (1 to 5)</label>
              <select id="ref-energy">
                <option value="1" ${ref.energy === 1 ? 'selected' : ''}>⚡ 1 — Low Energy</option>
                <option value="2" ${ref.energy === 2 ? 'selected' : ''}>⚡ 2 — Moderate</option>
                <option value="3" ${ref.energy === 3 ? 'selected' : ''}>⚡ 3 — Normal</option>
                <option value="4" ${ref.energy === 4 || !ref.energy ? 'selected' : ''}>⚡ 4 — High Energy</option>
                <option value="5" ${ref.energy === 5 ? 'selected' : ''}>⚡ 5 — Peak Energy</option>
              </select>
            </div>
            <div class="form-group">
              <label>6. Mood Level today (1 to 5)</label>
              <select id="ref-mood">
                <option value="1" ${ref.mood === 1 ? 'selected' : ''}>😊 1 — Stressed</option>
                <option value="2" ${ref.mood === 2 ? 'selected' : ''}>😊 2 — Tired</option>
                <option value="3" ${ref.mood === 3 ? 'selected' : ''}>😊 3 — Neutral</option>
                <option value="4" ${ref.mood === 4 || !ref.mood ? 'selected' : ''}>😊 4 — Happy</option>
                <option value="5" ${ref.mood === 5 ? 'selected' : ''}>😊 5 — Inspired</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>7. What is one thing I am proud of today?</label>
            <input type="text" id="ref-proud" value="${ref.proud_of || ''}" placeholder="Maintained focus during JS practice.">
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Save Daily Reflection</button>
        </form>

        ${ref.summary_text ? `
          <div class="reflection-summary-box">
            <div style="font-size: 0.85rem; color: var(--accent-primary); text-transform: uppercase; font-weight: 800; margin-bottom: 0.35rem;">Automated Performance Insight</div>
            "${ref.summary_text}"
          </div>
        ` : ''}
      </div>
    `;

    document.getElementById("reflection-form").onsubmit = async (e) => {
      e.preventDefault();
      try {
        const res = await API.saveReflection({
          date: todayStr,
          went_well: document.getElementById("ref-went-well").value,
          failed_tasks: document.getElementById("ref-failed").value,
          why_missed: document.getElementById("ref-why").value,
          improve_tomorrow: document.getElementById("ref-improve").value,
          energy: parseInt(document.getElementById("ref-energy").value),
          mood: parseInt(document.getElementById("ref-mood").value),
          proud_of: document.getElementById("ref-proud").value
        });
        this.showToast("Reflection saved! Auto-summary generated.", "success");
        this.handleRoute();
      } catch (err) {
        this.showToast(err.message, "danger");
      }
    };
  },

  // --- CALENDAR & COMPARE DAYS PAGE ---
  async renderCalendarPage(container) {
    const todayStr = new Date().toISOString().split('T')[0];
    const calRes = await API.getCalendar("2026-09-01", "2026-09-30");
    const dailyScores = calRes.daily_scores || {};

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem;">
        <div>
          <h1 style="font-size: 1.75rem; font-weight: 800;">Calendar & History</h1>
          <p style="color: var(--text-secondary);">Select any date to inspect performance logs or compare two dates side-by-side</p>
        </div>
        <button class="btn btn-secondary" onclick="App.openCompareDaysModal()">⚖️ Compare Two Days</button>
      </div>

      <div class="card">
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem; text-align: center; font-weight: 700; margin-bottom: 1rem;">
          <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem;">
          ${Array.from({length: 30}).map((_, i) => {
            const dayNum = i + 1;
            const dStr = `2026-09-${dayNum < 10 ? '0' + dayNum : dayNum}`;
            const perf = dailyScores[dStr];
            let bgColor = "var(--bg-surface-elevated)";
            let statusTxt = "No data";

            if (perf) {
              const score = perf.daily_performance;
              if (score >= 80) { bgColor = "rgba(16, 185, 129, 0.2)"; statusTxt = `${score}% (Excellent)`; }
              else if (score >= 60) { bgColor = "rgba(59, 130, 246, 0.2)"; statusTxt = `${score}% (Good)`; }
              else if (score >= 40) { bgColor = "rgba(245, 158, 11, 0.2)"; statusTxt = `${score}% (Average)`; }
              else { bgColor = "rgba(239, 68, 68, 0.2)"; statusTxt = `${score}% (Low)`; }
            }

            return `
              <div onclick="App.inspectDateDetail('${dStr}')" style="min-height: 80px; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: ${bgColor}; cursor: pointer; transition: transform var(--transition-fast);">
                <div style="font-weight: 700; font-size: 0.9rem;">${dayNum}</div>
                <div style="font-size: 0.75rem; margin-top: 0.5rem; font-weight: 600;">${statusTxt}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div id="date-detail-container" style="margin-top: 2rem;"></div>
    `;
  },

  async inspectDateDetail(dStr) {
    const perf = await API.getDailyPerformance(dStr);
    const refRes = await API.getReflection(dStr);
    const ref = refRes.reflection;
    const container = document.getElementById("date-detail-container");

    container.innerHTML = `
      <div class="card">
        <h3 class="section-title">Performance Log for ${dStr} (${perf.daily_performance}% Score)</h3>
        <div style="display: flex; gap: 2rem; margin-bottom: 1.5rem;">
          <div>Completed: <strong>${perf.completed_count} / ${perf.total_applicable}</strong></div>
          <div>Avg Quality Rating: <strong>⭐ ${perf.average_quality}/5</strong></div>
        </div>

        <h4 style="font-weight: 700; margin-bottom: 0.75rem;">Routine Tasks:</h4>
        ${perf.task_scores.length === 0 ? '<p style="color:var(--text-muted);">No tasks logged for this date.</p>' : perf.task_scores.map(t => `
          <div style="display:flex; justify-content:space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
            <span>${t.title} (${t.category})</span>
            <span><span class="status-pill status-${t.status}">${t.status}</span> Score: ${t.score}%</span>
          </div>
        `).join('')}

        ${ref && ref.summary_text ? `
          <div class="reflection-summary-box" style="margin-top: 1.5rem;">
            <strong>Reflection Summary:</strong> "${ref.summary_text}"
          </div>
        ` : ''}
      </div>
    `;
  },

  openCompareDaysModal() {
    this.showModal(`
      <div class="modal-header">
        <h2 class="modal-title">Compare Performance Between Two Days</h2>
        <span class="close-btn" onclick="App.closeModal()">×</span>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Date 1</label>
          <input type="date" id="cmp-date1" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
          <label>Date 2</label>
          <input type="date" id="cmp-date2" value="${new Date(Date.now() - 86400000).toISOString().split('T')[0]}">
        </div>
      </div>
      <button id="run-compare-btn" class="btn btn-primary" style="width: 100%;">Run Day Comparison</button>
      <div id="compare-results" class="compare-grid"></div>
    `);

    document.getElementById("run-compare-btn").onclick = async () => {
      const d1 = document.getElementById("cmp-date1").value;
      const d2 = document.getElementById("cmp-date2").value;
      const res = await API.compareDays(d1, d2);

      const resBox = document.getElementById("compare-results");
      resBox.innerHTML = `
        <div class="compare-card">
          <h4>${d1}</h4>
          <p style="font-size: 1.5rem; font-weight: 800; color: var(--accent-primary);">${res.day1.performance.daily_performance}% Score</p>
          <p>Completed: ${res.day1.performance.completed_count} / ${res.day1.performance.total_applicable}</p>
          <p>Avg Quality: ⭐ ${res.day1.performance.average_quality}/5</p>
        </div>
        <div class="compare-card">
          <h4>${d2}</h4>
          <p style="font-size: 1.5rem; font-weight: 800; color: var(--accent-primary);">${res.day2.performance.daily_performance}% Score</p>
          <p>Completed: ${res.day2.performance.completed_count} / ${res.day2.performance.total_applicable}</p>
          <p>Avg Quality: ⭐ ${res.day2.performance.average_quality}/5</p>
        </div>
      `;
    };
  },

  // --- ANALYTICS PAGE ---
  async renderAnalyticsPage(container) {
    const res = await API.getAnalytics("month");

    container.innerHTML = `
      <div style="margin-bottom: 2rem;">
        <h1 style="font-size: 1.75rem; font-weight: 800;">Performance Analytics</h1>
        <p style="color: var(--text-secondary);">Empirical trend calculations based on completion scores and 1-5★ quality ratings</p>
      </div>

      <div class="metrics-grid">
        <div class="card metric-card">
          <div class="metric-icon">📊</div>
          <div><div class="metric-val">${res.average_performance}%</div><div class="metric-lbl">Monthly Performance Avg</div></div>
        </div>
        <div class="card metric-card">
          <div class="metric-icon">🏆</div>
          <div><div class="metric-val">${res.best_day.score}%</div><div class="metric-lbl">Best Day Score</div></div>
        </div>
        <div class="card metric-card">
          <div class="metric-icon">⚠️</div>
          <div><div class="metric-val">${res.lowest_day.score}%</div><div class="metric-lbl">Lowest Day Score</div></div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="card">
          <h3 class="section-title">Category Performance Breakdown</h3>
          ${(res.category_performance || []).map(c => `
            <div style="margin-bottom: 1rem;">
              <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 0.25rem;">
                <span>${c.category}</span>
                <span>${c.score}%</span>
              </div>
              <div style="background: var(--bg-surface-elevated); height: 10px; border-radius: 5px; overflow: hidden;">
                <div style="background: var(--accent-primary); width: ${c.score}%; height: 100%;"></div>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="card">
          <h3 class="section-title">Data-Driven Insights</h3>
          ${(res.insights || []).map(i => `
            <div style="padding: 0.75rem; background: var(--accent-light); color: var(--accent-text); border-radius: var(--radius-md); margin-bottom: 0.75rem; font-size: 0.9rem; font-weight: 600;">
              💡 ${i}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  // --- HABITS PAGE ---
  async renderHabitsPage(container) {
    const res = await API.getHabits();
    const habits = res.habits || [];

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem;">
        <div>
          <h1 style="font-size: 1.75rem; font-weight: 800;">Habit Tracking</h1>
          <p style="color: var(--text-secondary);">Track daily habit targets, streaks, and target values</p>
        </div>
        <button class="btn btn-primary" onclick="App.openAddHabitModal()">+ Add New Habit</button>
      </div>

      <div class="metrics-grid">
        ${habits.map(h => `
          <div class="card" style="border-top: 4px solid ${h.color}; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                <span style="font-size: 2.2rem;">${h.icon}</span>
                <span class="badge badge-streak">🔥 ${h.current_streak} days</span>
              </div>
              <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.25rem;">${h.name}</h3>
              <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">
                Target: <strong>${h.target_value} ${h.unit}</strong>
              </p>
              ${h.target_value > 1 ? `
                <div style="background: var(--bg-surface-elevated); height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 1rem;">
                  <div style="background: ${h.completed_today ? 'var(--success)' : 'var(--accent-primary)'}; width: ${h.completed_today ? 100 : Math.min(100, (h.today_progress / h.target_value) * 100)}%; height: 100%;"></div>
                </div>
              ` : ''}
            </div>

            <button class="checkin-btn ${h.completed_today ? 'completed' : ''}" onclick="App.toggleHabitCheckin(${h.id}, ${h.completed_today})">
              ${h.completed_today ? '✓ Completed (Streak Active)' : '⚡ Mark Complete'}
            </button>
          </div>
        `).join('')}
      </div>
    `;
  },

  // --- REWARDS PAGE ---
  async renderRewardsPage(container) {
    const res = await API.getRewards();
    const rewards = res.rewards || [];

    container.innerHTML = `
      <div style="margin-bottom: 2rem;">
        <h1 style="font-size: 1.75rem; font-weight: 800;">Achievements & Rewards</h1>
        <p style="color: var(--text-secondary);">Earn badges for high routine performance and streaks</p>
      </div>

      <div class="metrics-grid">
        ${rewards.map(r => `
          <div class="card" style="opacity: ${r.unlocked ? 1 : 0.6}; border-top: 4px solid ${r.unlocked ? '#10b981' : '#94a3b8'};">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">${r.icon}</div>
            <h3 style="font-size: 1.1rem; font-weight: 700;">${r.name}</h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">${r.description}</p>
            <span class="badge" style="background-color: ${r.unlocked ? 'var(--success-light)' : 'var(--bg-surface-elevated)'}; color: ${r.unlocked ? 'var(--success)' : 'var(--text-muted)'};">
              ${r.unlocked ? '✓ Unlocked' : '🔒 Locked'}
            </span>
          </div>
        `).join('')}
      </div>
    `;
  },

  // --- LEADERBOARD PAGE ---
  async renderLeaderboardPage(container) {
    const res = await API.getLeaderboard("overall");
    const leaderboard = res.leaderboard || [];

    container.innerHTML = `
      <div style="margin-bottom: 2rem;">
        <h1 style="font-size: 1.75rem; font-weight: 800;">Community Leaderboard</h1>
        <p style="color: var(--text-secondary);">Rankings based on empirical consistency score and habit streaks</p>
      </div>

      <div class="card">
        ${leaderboard.map(u => `
          <div class="routine-item" style="${u.is_me ? 'border: 2px solid var(--accent-primary); background-color: var(--accent-light);' : ''}">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="font-weight: 800; font-size: 1.2rem; width: 30px;">#${u.rank}</div>
              <img src="${u.avatar}" class="user-avatar" style="width: 44px; height: 44px;">
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 700;">${u.name} ${u.is_me ? ' (You)' : ''}</h3>
                <p style="font-size: 0.85rem; color: var(--text-secondary);">${u.bio}</p>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 800; font-size: 1.25rem; color: var(--accent-primary);">${u.score} pts</div>
              <span class="badge badge-streak">🔥 ${u.streak} day streak</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  // --- SETTINGS PAGE ---
  async renderSettingsPage(container) {
    container.innerHTML = `
      <div style="margin-bottom: 2rem;">
        <h1 style="font-size: 1.75rem; font-weight: 800;">Settings & Data Management</h1>
        <p style="color: var(--text-secondary);">Manage account profile, theme, and JSON data export</p>
      </div>

      <div class="card" style="max-width: 600px; margin-bottom: 2rem;">
        <h3 class="section-title">Profile Info</h3>
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="settings-name" value="${this.currentUser ? this.currentUser.name : ''}">
        </div>
        <div class="form-group">
          <label>Bio</label>
          <input type="text" id="settings-bio" value="${this.currentUser ? (this.currentUser.bio || '') : ''}">
        </div>
        <button class="btn btn-primary" onclick="App.saveProfileSettings()">Save Profile</button>
      </div>

      <div class="card" style="max-width: 600px;">
        <h3 class="section-title" style="color: var(--danger);">Data Export & Danger Zone</h3>
        <div style="display: flex; gap: 1rem;">
          <button class="btn btn-secondary" onclick="App.exportUserData()">Export Data (JSON)</button>
          <button class="btn btn-danger" onclick="App.deleteUserAccount()">Delete Account</button>
        </div>
      </div>
    `;
  },

  // --- MODALS & UTILS ---
  openAddTaskModal() {
    this.showModal(`
      <div class="modal-header">
        <h2 class="modal-title">Add Routine Activity</h2>
        <span class="close-btn" onclick="App.closeModal()">×</span>
      </div>
      <form id="add-task-form">
        <div class="form-group">
          <label>Activity Title</label>
          <input type="text" id="task-title" placeholder="e.g. Study JavaScript" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Category</label>
            <select id="task-category">
              <option value="Health">Health</option>
              <option value="Fitness">Fitness</option>
              <option value="Learning" selected>Learning</option>
              <option value="Work">Work</option>
              <option value="Personal Growth">Personal Growth</option>
            </select>
          </div>
          <div class="form-group">
            <label>Scheduled Time</label>
            <input type="time" id="task-time" value="09:00" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Estimated Duration (mins)</label>
            <input type="number" id="task-duration" value="60" min="5">
          </div>
          <div class="form-group">
            <label>Priority</label>
            <select id="task-priority">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Create Routine Task</button>
      </form>
    `);

    document.getElementById("add-task-form").onsubmit = async (e) => {
      e.preventDefault();
      try {
        await API.createTask({
          title: document.getElementById("task-title").value,
          category: document.getElementById("task-category").value,
          due_time: document.getElementById("task-time").value,
          estimated_duration: parseInt(document.getElementById("task-duration").value) || 30,
          priority: document.getElementById("task-priority").value,
          due_date: new Date().toISOString().split('T')[0]
        });
        this.closeModal();
        this.handleRoute();
        this.showToast("Routine activity created!");
      } catch (err) {
        this.showToast(err.message, "danger");
      }
    };
  },

  async openApplyTemplateModal() {
    const res = await API.getTemplates();
    const templates = res.templates || [];

    this.showModal(`
      <div class="modal-header">
        <h2 class="modal-title">Apply Routine Template</h2>
        <span class="close-btn" onclick="App.closeModal()">×</span>
      </div>
      <p style="color:var(--text-secondary); margin-bottom: 1rem;">Select a pre-designed routine schedule to apply to today:</p>
      ${templates.map(t => `
        <div class="card" style="margin-bottom: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: space-between;" onclick="App.applyTemplateRoutine(${t.id})">
          <div>
            <div style="font-weight: 700; font-size: 1.1rem;">${t.icon} ${t.name}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">${t.description}</div>
          </div>
          <button class="btn btn-primary btn-sm">Apply →</button>
        </div>
      `).join('')}
    `);
  },

  async applyTemplateRoutine(id) {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await API.applyTemplate(id, todayStr);
      this.closeModal();
      this.handleRoute();
      this.showToast(res.message, "success");
    } catch (err) {
      this.showToast(err.message, "danger");
    }
  },

  openFormulaModal() {
    this.showModal(`
      <div class="modal-header">
        <h2 class="modal-title">Daily Performance Calculation Formula</h2>
        <span class="close-btn" onclick="App.closeModal()">×</span>
      </div>
      <div style="line-height: 1.6;">
        <p style="margin-bottom: 1rem;">Taskora evaluates every routine task using both <strong>Completion Status</strong> and <strong>Performance Quality Rating</strong>.</p>

        <h4 style="font-weight: 700; margin-bottom: 0.5rem;">1. Completion Value</h4>
        <ul style="margin-left: 1.5rem; margin-bottom: 1rem;">
          <li>Completed = 100% (1.0)</li>
          <li>Partially Completed = 50% (0.5)</li>
          <li>Skipped / Missed = 0% (0.0)</li>
          <li>Not Applicable = Excluded from divisor</li>
        </ul>

        <h4 style="font-weight: 700; margin-bottom: 0.5rem;">2. Quality Rating Multiplier</h4>
        <ul style="margin-left: 1.5rem; margin-bottom: 1rem;">
          <li>⭐ 1 (Very Poor) = 20% (0.2)</li>
          <li>⭐⭐ 2 (Poor) = 40% (0.4)</li>
          <li>⭐⭐⭐ 3 (Average) = 60% (0.6)</li>
          <li>⭐⭐⭐⭐ 4 (Good) = 80% (0.8)</li>
          <li>⭐⭐⭐⭐⭐ 5 (Excellent) = 100% (1.0)</li>
        </ul>

        <div style="background: var(--bg-surface-elevated); padding: 1rem; border-radius: var(--radius-md); font-weight: 700; text-align: center; color: var(--accent-primary);">
          Task Score = Completion Value × Quality Multiplier<br>
          Daily Performance % = Average of All Task Scores
        </div>
      </div>
    `);
  },

  openAddHabitModal() {
    this.showModal(`
      <div class="modal-header">
        <h2 class="modal-title">Add Habit Tracker</h2>
        <span class="close-btn" onclick="App.closeModal()">×</span>
      </div>
      <form id="add-habit-form">
        <div class="form-group">
          <label>Habit Name</label>
          <input type="text" id="h-name" placeholder="e.g. Drink Water" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Habit Type</label>
            <select id="h-type">
              <option value="yes_no">Yes / No Check-in</option>
              <option value="count" selected>Count-based (e.g. 8 glasses)</option>
              <option value="duration">Duration (e.g. 60 mins)</option>
              <option value="quantity">Quantity (e.g. 10 pages)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Target Value</label>
            <input type="number" id="h-target" value="8" min="1">
          </div>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Create Habit</button>
      </form>
    `);

    document.getElementById("add-habit-form").onsubmit = async (e) => {
      e.preventDefault();
      try {
        await API.createHabit({
          name: document.getElementById("h-name").value,
          habit_type: document.getElementById("h-type").value,
          target_value: parseInt(document.getElementById("h-target").value) || 1
        });
        this.closeModal();
        this.handleRoute();
        this.showToast("Habit created!");
      } catch (err) {
        this.showToast(err.message, "danger");
      }
    };
  },

  async toggleHabitCheckin(id, completed) {
    try {
      await API.completeHabit(id);
      this.showToast("Habit check-in recorded!");
      this.handleRoute();
    } catch (err) {
      this.showToast(err.message, "danger");
    }
  },

  async deleteRoutineTask(id) {
    if (confirm("Delete this routine task?")) {
      await API.deleteTask(id);
      this.handleRoute();
      this.showToast("Task deleted");
    }
  },

  triggerWakeupAlarm() {
    const overlay = document.getElementById("alarm-overlay");
    const inputEl = document.getElementById("math-answer");
    const num1 = Math.floor(Math.random() * 30) + 10;
    const num2 = Math.floor(Math.random() * 30) + 10;
    const expected = num1 + num2;

    document.getElementById("math-problem").textContent = `${num1} + ${num2} = ?`;
    inputEl.value = "";
    overlay.classList.add("active");
    overlay.style.display = "flex";

    if (this.alarmTimer) clearInterval(this.alarmTimer);
    this.alarmTimer = setInterval(() => this.playAlarmTone(), 800);

    const closeAlarm = (msg = null, type = "info") => {
      if (this.alarmTimer) {
        clearInterval(this.alarmTimer);
        this.alarmTimer = null;
      }
      overlay.classList.remove("active");
      overlay.style.display = "none";
      if (msg) this.showToast(msg, type);
    };

    document.getElementById("submit-math-btn").onclick = () => {
      if (parseInt(inputEl.value) === expected) {
        closeAlarm("Alarm dismissed! Good morning! ☀️", "success");
      } else {
        this.showToast("Incorrect answer! Try again.", "danger");
      }
    };

    document.getElementById("snooze-btn").onclick = () => {
      closeAlarm("Alarm snoozed for 5 minutes.", "info");
    };

    const xBtn = document.getElementById("close-alarm-x");
    if (xBtn) {
      xBtn.onclick = () => closeAlarm("Alarm closed.", "info");
    }
  },

  playAlarmTone() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  },

  showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'danger' ? '❌' : '✅'}</span> <div>${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  },

  showModal(htmlContent) {
    const backdrop = document.getElementById("modal-backdrop");
    const dialog = document.getElementById("modal-dialog");
    dialog.innerHTML = htmlContent;
    backdrop.classList.add("active");
  },

  closeModal() {
    document.getElementById("modal-backdrop").classList.remove("active");
  },

  async saveProfileSettings() {
    const name = document.getElementById("settings-name").value;
    const bio = document.getElementById("settings-bio").value;
    await API.updateProfile({ name, bio });
    this.currentUser.name = name;
    this.currentUser.bio = bio;
    this.updateUserUI();
    this.showToast("Profile saved!");
  },

  async exportUserData() {
    const data = await API.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "taskora-export.json";
    a.click();
    this.showToast("Data exported!");
  },

  async deleteUserAccount() {
    if (confirm("Delete account permanently?")) {
      await API.deleteAccount();
      this.currentUser = null;
      window.location.hash = "#landing";
      this.showToast("Account deleted");
    }
  }
};
