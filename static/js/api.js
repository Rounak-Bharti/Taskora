/* Taskora API Client */
const API = {
  getToken() {
    return localStorage.getItem("taskora_token") || "";
  },
  
  setToken(token) {
    if (token) {
      localStorage.setItem("taskora_token", token);
    } else {
      localStorage.removeItem("taskora_token");
    }
  },

  async request(endpoint, method = "GET", body = null) {
    const headers = {
      "Content-Type": "application/json"
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const config = {
      method,
      headers
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(endpoint, config);
      const contentType = response.headers.get("content-type") || "";

      let data;
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        if (response.status === 401 && !endpoint.includes("/auth/login")) {
          this.setToken(null);
          window.location.hash = "#login";
          throw new Error("Session expired. Please sign in again.");
        }
        const text = await response.text();
        throw new Error(`Server returned status ${response.status}: ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        if (response.status === 401 && !endpoint.includes("/auth/login")) {
          this.setToken(null);
          window.location.hash = "#login";
        }
        throw new Error(data.error || "Request failed");
      }

      return data;
    } catch (err) {
      console.error(`API Error [${method} ${endpoint}]:`, err);
      throw err;
    }
  },

  // Auth Methods
  register(name, email, password) {
    return this.request("/api/auth/register", "POST", { name, email, password });
  },

  login(email, password) {
    return this.request("/api/auth/login", "POST", { email, password });
  },

  getMe() {
    return this.request("/api/auth/me", "GET");
  },

  logout() {
    return this.request("/api/auth/logout", "POST").finally(() => {
      this.setToken(null);
    });
  },

  onboarding(goals, habits, preferences) {
    return this.request("/api/auth/onboarding", "POST", { goals, habits, preferences });
  },

  // Routine & Tasks Methods
  getTasks(date = null, view = "all") {
    let url = `/api/tasks?view=${view}`;
    if (date) url += `&date=${date}`;
    return this.request(url, "GET");
  },

  createTask(taskData) {
    return this.request("/api/tasks", "POST", taskData);
  },

  rateTask(id, ratingData) {
    return this.request(`/api/tasks/${id}/rate`, "POST", ratingData);
  },

  getDailyPerformance(date = null) {
    let url = "/api/tasks/performance";
    if (date) url += `?date=${date}`;
    return this.request(url, "GET");
  },

  deleteTask(id) {
    return this.request(`/api/tasks/${id}`, "DELETE");
  },

  // Daily Reflections Methods
  getReflection(date = null) {
    let url = "/api/reflections";
    if (date) url += `?date=${date}`;
    return this.request(url, "GET");
  },

  saveReflection(data) {
    return this.request("/api/reflections", "POST", data);
  },

  // Routine Templates
  getTemplates() {
    return this.request("/api/templates", "GET");
  },

  applyTemplate(templateId, date = null) {
    return this.request(`/api/templates/${templateId}/apply`, "POST", { date });
  },

  // Calendar & Compare Days
  getCalendar(start, end) {
    return this.request(`/api/calendar?start=${start}&end=${end}`, "GET");
  },

  compareDays(date1, date2) {
    return this.request(`/api/calendar/compare?date1=${date1}&date2=${date2}`, "GET");
  },

  // Habits Methods
  getHabits() {
    return this.request("/api/habits", "GET");
  },

  createHabit(habitData) {
    return this.request("/api/habits", "POST", habitData);
  },

  completeHabit(id, date = null, progress_value = 1, quality_rating = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.request(`/api/habits/${id}/complete`, "POST", { date: targetDate, progress_value, quality_rating });
  },

  // Analytics & Rewards
  getAnalytics(period = "month") {
    return this.request(`/api/analytics?period=${period}`, "GET");
  },

  getLeaderboard(period = "overall") {
    return this.request(`/api/leaderboard?period=${period}`, "GET");
  },

  getRewards() {
    return this.request("/api/rewards", "GET");
  },

  // Settings & Profile
  getSettings() {
    return this.request("/api/settings", "GET");
  },

  updateSettings(data) {
    return this.request("/api/settings", "PUT", data);
  },

  updateProfile(data) {
    return this.request("/api/user/profile", "PUT", data);
  },

  exportData() {
    return this.request("/api/user/export", "POST");
  },

  deleteAccount() {
    return this.request("/api/user/account", "DELETE");
  }
};
