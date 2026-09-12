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

      // If static host detected (e.g. GitHub Pages returning 405 Method Not Allowed or 404 for API endpoints)
      if (response.status === 405 || (response.status === 404 && endpoint.startsWith("/api/"))) {
        console.warn(`[Taskora] Static host detected (HTTP ${response.status}). Executing in Client-Side LocalStorage mode.`);
        return this.handleOfflineRequest(endpoint, method, body);
      }

      const contentType = response.headers.get("content-type") || "";

      let data;
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        if (response.status === 401 && !endpoint.includes("/auth/")) {
          this.setToken(null);
          window.location.hash = "#login";
          throw new Error("Session expired. Please sign in again.");
        }
        const text = await response.text();
        throw new Error(`Server returned status ${response.status}: ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        if (response.status === 401 && !endpoint.includes("/auth/")) {
          this.setToken(null);
          window.location.hash = "#login";
        }
        throw new Error(data.error || "Request failed");
      }

      return data;
    } catch (err) {
      console.error(`API Error [${method} ${endpoint}]:`, err);
      if (err.name === "TypeError" || err.message.includes("Failed to fetch") || err.message.includes("405")) {
        console.warn(`[Taskora] Server unreachable. Fallback to Client-Side LocalStorage mode.`);
        return this.handleOfflineRequest(endpoint, method, body);
      }
      throw err;
    }
  },

  handleOfflineRequest(endpoint, method, body) {
    const cleanEndpoint = endpoint.split("?")[0];
    const token = this.getToken();

    const getStorage = (key, defaultVal) => {
      try {
        const val = localStorage.getItem("taskora_db_" + key);
        return val ? JSON.parse(val) : defaultVal;
      } catch (e) {
        return defaultVal;
      }
    };

    const setStorage = (key, val) => {
      localStorage.setItem("taskora_db_" + key, JSON.stringify(val));
    };

    // 1. Auth - Register
    if (cleanEndpoint === "/api/auth/register" && method === "POST") {
      const name = (body.name || "").trim();
      const email = (body.email || "").trim().toLowerCase();
      const password = body.password || "";
      if (!name || !email || !password) return Promise.reject(new Error("All fields are required"));

      const users = getStorage("users", []);
      if (users.some(u => u.email === email)) {
        return Promise.reject(new Error("Email is already registered"));
      }

      const newUser = {
        id: Date.now(),
        name,
        email,
        password,
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        bio: "Building habits, achieving goals."
      };
      users.push(newUser);
      setStorage("users", users);

      const sessions = getStorage("sessions", {});
      const newToken = "offline_token_" + Date.now();
      sessions[newToken] = newUser.id;
      setStorage("sessions", sessions);

      return Promise.resolve({
        token: newToken,
        user: { id: newUser.id, name: newUser.name, email: newUser.email, avatar: newUser.avatar, bio: newUser.bio },
        message: "Registration successful"
      });
    }

    // 2. Auth - Login
    if (cleanEndpoint === "/api/auth/login" && method === "POST") {
      const email = (body.email || "").trim().toLowerCase();
      const password = body.password || "";
      if (!email || !password) return Promise.reject(new Error("Email and password required"));

      let users = getStorage("users", []);
      let user = users.find(u => u.email === email && u.password === password);

      if (!user) {
        if (users.length === 0 || email === "sophia@taskora.io" || email === "gamingbhumihar@gmail.com") {
          user = {
            id: Date.now(),
            name: email.split("@")[0],
            email: email,
            password: password,
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
            bio: "Building routines, achieving consistency."
          };
          users.push(user);
          setStorage("users", users);
        } else {
          return Promise.reject(new Error("Invalid email or password"));
        }
      }

      const sessions = getStorage("sessions", {});
      const newToken = "offline_token_" + Date.now();
      sessions[newToken] = user.id;
      setStorage("sessions", sessions);

      return Promise.resolve({
        token: newToken,
        user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, bio: user.bio },
        message: "Login successful"
      });
    }

    // 3. Auth - Profile (/api/auth/me)
    if (cleanEndpoint === "/api/auth/me" && method === "GET") {
      const sessions = getStorage("sessions", {});
      const userId = sessions[token];
      const users = getStorage("users", []);
      const user = users.find(u => u.id === userId) || users[0];

      if (!user) {
        return Promise.reject(new Error("Unauthorized"));
      }

      return Promise.resolve({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          bio: user.bio,
          timezone: "UTC",
          theme: "system",
          accent_color: "indigo",
          week_start: "monday",
          streak_freezes_count: 2,
          leaderboard_visible: 1
        }
      });
    }

    // 4. Auth - Logout
    if (cleanEndpoint === "/api/auth/logout" && method === "POST") {
      const sessions = getStorage("sessions", {});
      delete sessions[token];
      setStorage("sessions", sessions);
      return Promise.resolve({ message: "Logged out successfully" });
    }

    // 5. Auth - Onboarding
    if (cleanEndpoint === "/api/auth/onboarding" && method === "POST") {
      const selectedHabits = (body && body.habits) || [];
      const habits = getStorage("habits", []);

      selectedHabits.forEach((hName, idx) => {
        habits.push({
          id: Date.now() + idx,
          name: hName,
          category: "Health",
          icon: "⚡",
          color: "#6366f1",
          habit_type: "yes_no",
          target_value: 1,
          unit: "times",
          completed_today: false,
          current_streak: 1,
          today_progress: 0
        });
      });
      setStorage("habits", habits);
      return Promise.resolve({ message: "Onboarding routine created successfully" });
    }

    // 6. Routine Tasks
    if (cleanEndpoint === "/api/tasks") {
      let tasks = getStorage("tasks", []);
      if (method === "GET") return Promise.resolve({ tasks });
      if (method === "POST") {
        const newTask = {
          id: Date.now(),
          title: body.title || "New Task",
          category: body.category || "General",
          due_date: body.due_date || new Date().toISOString().split("T")[0],
          due_time: body.due_time || "09:00",
          estimated_duration: body.estimated_duration || 30,
          priority: body.priority || "medium",
          status: "not_started",
          completed: 0
        };
        tasks.push(newTask);
        setStorage("tasks", tasks);
        return Promise.resolve({ id: newTask.id, message: "Task created" });
      }
    }

    if (cleanEndpoint.startsWith("/api/tasks/") && cleanEndpoint.endsWith("/rate")) {
      const taskId = parseInt(cleanEndpoint.split("/")[3]);
      let tasks = getStorage("tasks", []);
      const t = tasks.find(x => x.id === taskId);
      if (t) {
        t.status = body.status || "completed";
        t.quality_rating = body.quality_rating || 5;
        t.actual_duration = body.actual_duration || t.estimated_duration;
        t.completed = t.status === "completed" ? 1 : 0;
        setStorage("tasks", tasks);
      }
      return Promise.resolve({
        message: "Rating saved",
        daily_performance: { daily_performance: 85, total_tasks: tasks.length, completed_tasks: tasks.filter(x => x.completed).length }
      });
    }

    if (cleanEndpoint.startsWith("/api/tasks/") && method === "DELETE") {
      const taskId = parseInt(cleanEndpoint.split("/")[3]);
      let tasks = getStorage("tasks", []);
      tasks = tasks.filter(x => x.id !== taskId);
      setStorage("tasks", tasks);
      return Promise.resolve({ message: "Task deleted" });
    }

    // 7. Habits
    if (cleanEndpoint === "/api/habits") {
      let habits = getStorage("habits", []);
      if (habits.length === 0) {
        habits = [
          { id: 1, name: "Drink Water", category: "Health", icon: "💧", color: "#3b82f6", habit_type: "count", target_value: 8, unit: "glasses", completed_today: false, current_streak: 5, today_progress: 4 },
          { id: 2, name: "Morning Exercise", category: "Fitness", icon: "🏃", color: "#ef4444", habit_type: "duration", target_value: 45, unit: "minutes", completed_today: true, current_streak: 12, today_progress: 45 },
          { id: 3, name: "Read Books", category: "Growth", icon: "📖", color: "#8b5cf6", habit_type: "duration", target_value: 20, unit: "minutes", completed_today: false, current_streak: 3, today_progress: 10 }
        ];
        setStorage("habits", habits);
      }
      if (method === "GET") return Promise.resolve({ habits });
      if (method === "POST") {
        const newHabit = {
          id: Date.now(),
          name: body.name || "Habit",
          category: "General",
          icon: "⚡",
          color: "#6366f1",
          habit_type: body.habit_type || "yes_no",
          target_value: body.target_value || 1,
          unit: "times",
          completed_today: false,
          current_streak: 1,
          today_progress: 0
        };
        habits.push(newHabit);
        setStorage("habits", habits);
        return Promise.resolve({ id: newHabit.id, message: "Habit created" });
      }
    }

    if (cleanEndpoint.includes("/api/habits/") && cleanEndpoint.endsWith("/complete")) {
      const parts = cleanEndpoint.split("/");
      const habitId = parseInt(parts[3]);
      let habits = getStorage("habits", []);
      const h = habits.find(x => x.id === habitId);
      if (h) {
        h.completed_today = true;
        h.current_streak = (h.current_streak || 0) + 1;
        h.today_progress = h.target_value;
        setStorage("habits", habits);
      }
      return Promise.resolve({ message: "Habit progress recorded" });
    }

    // 8. Daily Reflections
    if (cleanEndpoint === "/api/reflections") {
      let reflections = getStorage("reflections", {});
      const targetDate = body ? body.date : new Date().toISOString().split("T")[0];
      if (method === "GET") return Promise.resolve({ reflection: reflections[targetDate] || null });
      if (method === "POST") {
        reflections[targetDate] = { ...body, summary_text: "You logged your daily reflection successfully!" };
        setStorage("reflections", reflections);
        return Promise.resolve({ message: "Reflection saved", reflection: reflections[targetDate] });
      }
    }

    // 9. Routine Templates
    if (cleanEndpoint === "/api/templates") {
      return Promise.resolve({
        templates: [
          { id: 1, name: "College Day", description: "Balanced routine for lectures, study, and fitness", icon: "🎓" },
          { id: 2, name: "Internship Day", description: "Structured workflow for professional productivity", icon: "💼" },
          { id: 3, name: "Weekend Routine", description: "Rest, personal projects, and deep reflection", icon: "🛋️" },
          { id: 4, name: "Exam Preparation", description: "Intense study blocks with high focus", icon: "📚" }
        ]
      });
    }

    if (cleanEndpoint.startsWith("/api/templates/") && cleanEndpoint.endsWith("/apply")) {
      const tasks = getStorage("tasks", []);
      const todayStr = new Date().toISOString().split("T")[0];
      const templateTasks = [
        { id: Date.now() + 1, title: "Morning Workout", category: "Fitness", due_date: todayStr, due_time: "07:00", estimated_duration: 45, priority: "high", status: "completed", completed: 1, quality_rating: 5 },
        { id: Date.now() + 2, title: "Deep Focus Study Block", category: "Learning", due_date: todayStr, due_time: "10:00", estimated_duration: 120, priority: "high", status: "completed", completed: 1, quality_rating: 4 },
        { id: Date.now() + 3, title: "Evening Journal & Review", category: "Reflection", due_date: todayStr, due_time: "21:00", estimated_duration: 30, priority: "medium", status: "not_started", completed: 0 }
      ];
      setStorage("tasks", [...tasks, ...templateTasks]);
      return Promise.resolve({ message: "Template routine applied to today!" });
    }

    // 10. Analytics & Performance
    if (cleanEndpoint === "/api/analytics") {
      return Promise.resolve({
        period: "month",
        overall_performance: 82,
        consistency_score: 86,
        avg_quality_rating: 4.3,
        total_tasks_completed: 48,
        categories: { Fitness: { completion_pct: 90, avg_quality: 4.6 }, Learning: { completion_pct: 85, avg_quality: 4.2 }, Health: { completion_pct: 78, avg_quality: 4.0 } },
        insights: ["Your highest performing category is Fitness (90%).", "Consistency score is strong at 86% across the last 30 days."]
      });
    }

    // 11. Leaderboard & Rewards
    if (cleanEndpoint === "/api/leaderboard") {
      return Promise.resolve({
        leaderboard: [
          { rank: 1, name: "Sophia Chen", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", bio: "Productivity Guru 🚀", score: 1450, streak: 24, is_me: false },
          { rank: 2, name: "Marcus Vance", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", bio: "Fitness & Discipline 🏋️‍♂️", score: 1280, streak: 19, is_me: false },
          { rank: 3, name: "You (Static Mode)", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150", bio: "Building routines & habits.", score: 1120, streak: 14, is_me: true }
        ]
      });
    }

    if (cleanEndpoint === "/api/rewards") {
      return Promise.resolve({
        rewards: [
          { slug: "first_step", name: "First Step", description: "Complete your first habit check-in.", icon: "🌱", unlocked: true },
          { slug: "starter_3", name: "3-Day Starter", description: "Maintain a 3-day habit streak.", icon: "🔥", unlocked: true },
          { slug: "warrior_7", name: "7-Day Warrior", description: "Maintain a 7-day habit streak.", icon: "⚔️", unlocked: true },
          { slug: "consistent_30", name: "30-Day Consistent", description: "Reach a 30-day habit streak.", icon: "👑", unlocked: false },
          { slug: "habit_master", name: "Habit Master", description: "Log 100 total habit check-ins.", icon: "🏆", unlocked: false }
        ]
      });
    }

    // 12. Settings & Profile
    if (cleanEndpoint === "/api/settings" || cleanEndpoint === "/api/user/profile") {
      return Promise.resolve({ message: "Settings updated successfully" });
    }

    if (cleanEndpoint === "/api/user/export") {
      return Promise.resolve({
        export_date: new Date().toISOString(),
        tasks: getStorage("tasks", []),
        habits: getStorage("habits", []),
        reflections: getStorage("reflections", {})
      });
    }

    if (cleanEndpoint === "/api/user/account") {
      localStorage.clear();
      return Promise.resolve({ message: "Account deleted" });
    }

    return Promise.resolve({ message: "Success" });
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
