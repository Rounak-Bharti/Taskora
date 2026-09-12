import os
import json
import secrets
from datetime import datetime, date, timedelta
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from database import (
    get_db, init_db, hash_password, verify_password,
    calculate_habit_streaks, update_user_achievements,
    calculate_consistency_score, save_session, get_session_user, delete_session,
    calculate_daily_performance, generate_reflection_summary
)
from seed_data import seed_initial_data

app = Flask(__name__, static_folder="static")
CORS(app)
app.config['SECRET_KEY'] = 'taskora-secret-key-prod-2026'

def get_current_user():
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
    token = auth_header.replace("Bearer ", "").strip()
    return get_session_user(token)

def login_required(f):
    def wrapper(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        return f(user, *args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

# Initialize Database and Seed Data
with app.app_context():
    seed_initial_data()

# Error Handlers
@app.errorhandler(404)
def not_found_error(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "API endpoint not found"}), 404
    return send_from_directory(".", "index.html")

@app.errorhandler(500)
def internal_error(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Internal server error"}), 500
    return send_from_directory(".", "index.html")

# Static Page Routes
@app.route("/")
def index():
    return send_from_directory(".", "index.html")

@app.route("/<path:path>")
def static_proxy(path):
    if path.startswith("api/"):
        return jsonify({"error": "API endpoint not found"}), 404
    if os.path.exists(path):
        return send_from_directory(".", path)
    if os.path.exists(os.path.join("static", path)):
        return send_from_directory("static", path)
    return send_from_directory(".", "index.html")

# --- AUTH API ---
@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    
    if not name or not email or not password:
        return jsonify({"error": "All fields are required"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    if cursor.fetchone():
        conn.close()
        return jsonify({"error": "Email is already registered"}), 400

    cursor.execute(
        "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
        (name, email, hash_password(password))
    )
    user_id = cursor.lastrowid
    cursor.execute("INSERT INTO user_settings (user_id) VALUES (?)", (user_id,))
    conn.commit()

    cursor.execute("SELECT id, name, email, avatar, bio FROM users WHERE id = ?", (user_id,))
    user = dict(cursor.fetchone())
    conn.close()

    token = secrets.token_hex(24)
    save_session(token, user["id"])

    return jsonify({"token": token, "user": user, "message": "Registration successful"}), 201

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    user_row = cursor.fetchone()
    conn.close()

    if not user_row or not verify_password(password, user_row["password_hash"]):
        return jsonify({"error": "Invalid email or password"}), 401

    user = {
        "id": user_row["id"],
        "name": user_row["name"],
        "email": user_row["email"],
        "avatar": user_row["avatar"],
        "bio": user_row["bio"]
    }
    token = secrets.token_hex(24)
    save_session(token, user["id"])

    return jsonify({"token": token, "user": user, "message": "Login successful"}), 200

@app.route("/api/auth/me", methods=["GET"])
@login_required
def get_me(user):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)", (user["id"],))
    conn.commit()
    cursor.execute("""
        SELECT u.id, u.name, u.email, u.avatar, u.bio, u.timezone,
               COALESCE(s.theme, 'system') as theme,
               COALESCE(s.accent_color, 'indigo') as accent_color,
               COALESCE(s.week_start, 'monday') as week_start,
               COALESCE(s.streak_freezes_count, 2) as streak_freezes_count,
               COALESCE(s.leaderboard_visible, 1) as leaderboard_visible
        FROM users u
        LEFT JOIN user_settings s ON u.id = s.user_id
        WHERE u.id = ?
    """, (user["id"],))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": dict(row)})


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    auth_header = request.headers.get("Authorization")
    if auth_header:
        token = auth_header.replace("Bearer ", "").strip()
        delete_session(token)
    return jsonify({"message": "Logged out successfully"})

@app.route("/api/auth/onboarding", methods=["POST"])
@login_required
def onboarding(user):
    data = request.get_json(silent=True) or {}
    selected_habits = data.get("habits", [])
    preferences = data.get("preferences", {})

    conn = get_db()
    cursor = conn.cursor()

    week_start = preferences.get("weekStart", "monday")
    reminder_time = preferences.get("reminderTime", "08:00")
    cursor.execute(
        "UPDATE user_settings SET week_start = ?, default_reminder_time = ? WHERE user_id = ?",
        (week_start, reminder_time, user["id"])
    )

    habit_presets = {
        "Drink water": ("Health", "💧", "#3b82f6", "count", 8, "glasses"),
        "Exercise": ("Fitness", "🏃", "#ef4444", "duration", 45, "minutes"),
        "Read for 20 minutes": ("Personal Growth", "📖", "#8b5cf6", "duration", 20, "minutes"),
        "Study for 1 hour": ("Study", "💻", "#6366f1", "duration", 60, "minutes"),
        "Meditate": ("Health", "🧘", "#10b981", "duration", 15, "minutes"),
        "Sleep on time": ("Sleep", "🌙", "#06b6d4", "yes_no", 1, "times"),
        "Wake up early": ("Productivity", "🌅", "#f59e0b", "yes_no", 1, "times")
    }

    for h_name in selected_habits:
        cat, icon, color, h_type, target_val, unit = habit_presets.get(h_name, ("Productivity", "⚡", "#6366f1", "yes_no", 1, "times"))
        cursor.execute("""
            INSERT INTO habits (user_id, name, description, category, icon, color, frequency, habit_type, target_value, unit, reminder_time, start_date)
            VALUES (?, ?, ?, ?, ?, ?, 'daily', ?, ?, ?, ?, ?)
        """, (user["id"], h_name, f"Onboarding routine for {h_name}", cat, icon, color, h_type, target_val, unit, reminder_time, date.today().strftime('%Y-%m-%d')))

    # Populate initial routine tasks for today from College Day template
    cursor.execute("SELECT id FROM routine_templates WHERE name = 'College Day' AND is_default = 1")
    t_row = cursor.fetchone()
    if t_row:
        template_id = t_row["id"]
        cursor.execute("SELECT * FROM routine_template_items WHERE template_id = ?", (template_id,))
        items = cursor.fetchall()
        today_str = date.today().strftime('%Y-%m-%d')
        for item in items:
            cursor.execute("""
                INSERT INTO tasks (user_id, title, category, due_date, due_time, estimated_duration, priority, wake_up_challenge)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (user["id"], item["title"], item["category"], today_str, item["due_time"], item["estimated_duration"], item["priority"], item["wake_up_challenge"]))

    conn.commit()
    conn.close()

    return jsonify({"message": "Onboarding completed successfully"})

# --- HABITS API ---
@app.route("/api/habits", methods=["GET"])
@login_required
def get_habits(user):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM habits WHERE user_id = ? AND status != 'archived' ORDER BY created_at DESC", (user["id"],))
    rows = cursor.fetchall()
    conn.close()

    today_str = date.today().strftime('%Y-%m-%d')
    habits = []
    for r in rows:
        h = dict(r)
        streaks = calculate_habit_streaks(h["id"], user["id"])
        h["current_streak"] = streaks["current_streak"]
        h["longest_streak"] = streaks["longest_streak"]

        conn_comp = get_db()
        c_cur = conn_comp.cursor()
        c_cur.execute("SELECT id, progress_value, quality_rating FROM habit_completions WHERE habit_id = ? AND date = ?", (h["id"], today_str))
        comp_row = c_cur.fetchone()
        h["completed_today"] = bool(comp_row)
        h["today_progress"] = comp_row["progress_value"] if comp_row else 0
        h["today_quality"] = comp_row["quality_rating"] if comp_row else None
        conn_comp.close()

        habits.append(h)

    return jsonify({"habits": habits})

@app.route("/api/habits", methods=["POST"])
@login_required
def create_habit(user):
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "Habit name is required"}), 400

    description = data.get("description", "").strip()
    category = data.get("category", "Productivity")
    icon = data.get("icon", "⚡")
    color = data.get("color", "#6366f1")
    frequency = data.get("frequency", "daily")
    custom_days = json.dumps(data.get("custom_days", []))
    habit_type = data.get("habit_type", "yes_no")
    target_value = data.get("target_value", 1)
    unit = data.get("unit", "times")
    reminder_time = data.get("reminder_time", "08:00")
    start_date = data.get("start_date", date.today().strftime('%Y-%m-%d'))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO habits (user_id, name, description, category, icon, color, frequency, custom_days, habit_type, target_value, unit, reminder_time, start_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (user["id"], name, description, category, icon, color, frequency, custom_days, habit_type, target_value, unit, reminder_time, start_date))
    habit_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({"id": habit_id, "message": "Habit created successfully"}), 201

@app.route("/api/habits/<int:habit_id>/complete", methods=["POST"])
@login_required
def complete_habit(user, habit_id):
    data = request.get_json(silent=True) or {}
    target_date = data.get("date") or date.today().strftime('%Y-%m-%d')
    progress_val = data.get("progress_value") or 1
    quality = data.get("quality_rating")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM habits WHERE id = ? AND user_id = ?", (habit_id, user["id"]))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"error": "Habit not found"}), 404

    cursor.execute("""
        INSERT INTO habit_completions (habit_id, user_id, date, progress_value, quality_rating)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(habit_id, date) DO UPDATE SET
            progress_value = excluded.progress_value,
            quality_rating = excluded.quality_rating
    """, (habit_id, user["id"], target_date, progress_val, quality))
    conn.commit()
    conn.close()

    streaks = calculate_habit_streaks(habit_id, user["id"])
    unlocked_achievements = update_user_achievements(user["id"])

    return jsonify({
        "message": "Habit check-in recorded",
        "streaks": streaks,
        "newly_unlocked": unlocked_achievements
    })

# --- TASKS & ROUTINE QUALITY RATING API ---
@app.route("/api/tasks", methods=["GET"])
@login_required
def get_tasks(user):
    target_date = request.args.get("date", date.today().strftime('%Y-%m-%d'))
    view = request.args.get("view", "all")

    conn = get_db()
    cursor = conn.cursor()

    if view == "today" or request.args.get("date"):
        cursor.execute("SELECT * FROM tasks WHERE user_id = ? AND due_date = ? ORDER BY due_time ASC", (user["id"], target_date))
    else:
        cursor.execute("SELECT * FROM tasks WHERE user_id = ? ORDER BY due_date ASC, due_time ASC", (user["id"],))

    rows = cursor.fetchall()
    conn.close()
    return jsonify({"tasks": [dict(r) for r in rows]})

@app.route("/api/tasks", methods=["POST"])
@login_required
def create_task(user):
    data = request.get_json(silent=True) or {}
    title = data.get("title", "").strip()
    if not title:
        return jsonify({"error": "Task title is required"}), 400

    description = data.get("description", "").strip()
    due_date = data.get("due_date", date.today().strftime('%Y-%m-%d'))
    due_time = data.get("due_time", "09:00")
    estimated_duration = data.get("estimated_duration", 30)
    priority = data.get("priority", "medium")
    category = data.get("category", "General")
    wake_up_challenge = 1 if data.get("wake_up_challenge") else 0

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO tasks (user_id, title, description, due_date, due_time, estimated_duration, priority, category, wake_up_challenge)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (user["id"], title, description, due_date, due_time, estimated_duration, priority, category, wake_up_challenge))
    task_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({"id": task_id, "message": "Routine task created successfully"}), 201

@app.route("/api/tasks/<int:task_id>/rate", methods=["POST"])
@login_required
def rate_task(user, task_id):
    data = request.get_json(silent=True) or {}
    status = data.get("status", "completed") # completed, partially_completed, skipped, missed, not_applicable
    quality_rating = data.get("quality_rating") # 1 to 5
    actual_duration = data.get("actual_duration")
    difficulty = data.get("difficulty", "medium")
    low_reason = data.get("low_performance_reason", "")
    note = data.get("note", "")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks WHERE id = ? AND user_id = ?", (task_id, user["id"]))
    task = cursor.fetchone()
    if not task:
        conn.close()
        return jsonify({"error": "Task not found"}), 404

    completed_flag = 1 if status in ('completed', 'partially_completed') else 0
    completed_at = datetime.now().isoformat() if completed_flag else None

    cursor.execute("""
        UPDATE tasks SET
            status = ?,
            completed = ?,
            completed_at = ?,
            quality_rating = ?,
            actual_duration = COALESCE(?, actual_duration),
            difficulty = ?,
            low_performance_reason = ?,
            note = ?
        WHERE id = ? AND user_id = ?
    """, (status, completed_flag, completed_at, quality_rating, actual_duration, difficulty, low_reason, note, task_id, user["id"]))

    conn.commit()
    
    # Calculate updated daily performance %
    daily_perf = calculate_daily_performance(user["id"], task["due_date"])
    unlocked = update_user_achievements(user["id"])
    conn.close()

    return jsonify({
        "message": "Task performance recorded",
        "task_id": task_id,
        "daily_performance": daily_perf,
        "newly_unlocked": unlocked
    })

@app.route("/api/tasks/performance", methods=["GET"])
@login_required
def get_daily_performance(user):
    target_date = request.args.get("date", date.today().strftime('%Y-%m-%d'))
    perf_data = calculate_daily_performance(user["id"], target_date)
    return jsonify(perf_data)

@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
@login_required
def delete_task(user, task_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tasks WHERE id = ? AND user_id = ?", (task_id, user["id"]))
    conn.commit()
    conn.close()
    return jsonify({"message": "Task deleted successfully"})

# --- DAILY REFLECTIONS API ---
@app.route("/api/reflections", methods=["GET"])
@login_required
def get_reflection(user):
    target_date = request.args.get("date", date.today().strftime('%Y-%m-%d'))
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM daily_reflections WHERE user_id = ? AND date = ?", (user["id"], target_date))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return jsonify({"reflection": None})
    return jsonify({"reflection": dict(row)})

@app.route("/api/reflections", methods=["POST"])
@login_required
def save_reflection(user):
    data = request.get_json(silent=True) or {}
    target_date = data.get("date", date.today().strftime('%Y-%m-%d'))
    went_well = data.get("went_well", "").strip()
    failed_tasks = data.get("failed_tasks", "").strip()
    why_missed = data.get("why_missed", "").strip()
    improve_tomorrow = data.get("improve_tomorrow", "").strip()
    energy = data.get("energy", 3)
    mood = data.get("mood", 3)
    proud_of = data.get("proud_of", "").strip()

    summary_text = generate_reflection_summary(user["id"], target_date, data)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO daily_reflections (user_id, date, went_well, failed_tasks, why_missed, improve_tomorrow, energy, mood, proud_of, summary_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, date) DO UPDATE SET
            went_well = excluded.went_well,
            failed_tasks = excluded.failed_tasks,
            why_missed = excluded.why_missed,
            improve_tomorrow = excluded.improve_tomorrow,
            energy = excluded.energy,
            mood = excluded.mood,
            proud_of = excluded.proud_of,
            summary_text = excluded.summary_text
    """, (user["id"], target_date, went_well, failed_tasks, why_missed, improve_tomorrow, energy, mood, proud_of, summary_text))

    conn.commit()
    conn.close()

    return jsonify({"message": "Daily reflection saved successfully", "summary": summary_text})

# --- ROUTINE TEMPLATES API ---
@app.route("/api/templates", methods=["GET"])
@login_required
def get_templates(user):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM routine_templates WHERE is_default = 1 OR user_id = ?", (user["id"],))
    templates = [dict(r) for r in cursor.fetchall()]

    for t in templates:
        cursor.execute("SELECT * FROM routine_template_items WHERE template_id = ?", (t["id"],))
        t["items"] = [dict(i) for i in cursor.fetchall()]

    conn.close()
    return jsonify({"templates": templates})

@app.route("/api/templates/<int:template_id>/apply", methods=["POST"])
@login_required
def apply_template(user, template_id):
    data = request.get_json(silent=True) or {}
    target_date = data.get("date", date.today().strftime('%Y-%m-%d'))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM routine_template_items WHERE template_id = ?", (template_id,))
    items = cursor.fetchall()

    created_count = 0
    for i in items:
        cursor.execute("""
            INSERT INTO tasks (user_id, title, category, due_date, due_time, estimated_duration, priority, wake_up_challenge)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (user["id"], i["title"], i["category"], target_date, i["due_time"], i["estimated_duration"], i["priority"], i["wake_up_challenge"]))
        created_count += 1

    conn.commit()
    conn.close()
    return jsonify({"message": f"Applied template routine ({created_count} activities added to {target_date})"})

# --- CALENDAR & COMPARE DAYS API ---
@app.route("/api/calendar/compare", methods=["GET"])
@login_required
def compare_days(user):
    date1 = request.args.get("date1", date.today().strftime('%Y-%m-%d'))
    date2 = request.args.get("date2", (date.today() - timedelta(days=1)).strftime('%Y-%m-%d'))

    perf1 = calculate_daily_performance(user["id"], date1)
    perf2 = calculate_daily_performance(user["id"], date2)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM daily_reflections WHERE user_id = ? AND date = ?", (user["id"], date1))
    ref1_row = cursor.fetchone()
    cursor.execute("SELECT * FROM daily_reflections WHERE user_id = ? AND date = ?", (user["id"], date2))
    ref2_row = cursor.fetchone()
    conn.close()

    return jsonify({
        "day1": {
            "performance": perf1,
            "reflection": dict(ref1_row) if ref1_row else None
        },
        "day2": {
            "performance": perf2,
            "reflection": dict(ref2_row) if ref2_row else None
        }
    })

@app.route("/api/calendar", methods=["GET"])
@login_required
def get_calendar(user):
    start_str = request.args.get("start", date.today().replace(day=1).strftime('%Y-%m-%d'))
    end_str = request.args.get("end", (date.today() + timedelta(days=31)).strftime('%Y-%m-%d'))

    conn = get_db()
    cursor = conn.cursor()

    # Get daily performance scores for each day in date range
    start_dt = datetime.strptime(start_str, '%Y-%m-%d').date()
    end_dt = datetime.strptime(end_str, '%Y-%m-%d').date()

    daily_scores = {}
    curr = start_dt
    while curr <= end_dt:
        d_str = curr.strftime('%Y-%m-%d')
        perf = calculate_daily_performance(user["id"], d_str)
        if perf["total_applicable"] > 0:
            daily_scores[d_str] = perf
        curr += timedelta(days=1)

    conn.close()
    return jsonify({"daily_scores": daily_scores})

# --- ANALYTICS API ---
@app.route("/api/analytics", methods=["GET"])
@login_required
def get_analytics(user):
    period = request.args.get("period", "month")
    today = date.today()

    days_count = 30
    if period == "7days": days_count = 7
    elif period == "3months": days_count = 90

    start_dt = today - timedelta(days=days_count - 1)
    
    daily_trend = []
    total_perf_sum = 0
    valid_days_cnt = 0
    best_day_perf = 0
    best_day_date = None
    lowest_day_perf = 100
    lowest_day_date = None
    category_totals = {}

    curr = start_dt
    while curr <= today:
        d_str = curr.strftime('%Y-%m-%d')
        perf = calculate_daily_performance(user["id"], d_str)
        p_val = perf["daily_performance"]

        if perf["total_applicable"] > 0:
            total_perf_sum += p_val
            valid_days_cnt += 1

            if p_val >= best_day_perf:
                best_day_perf = p_val
                best_day_date = d_str
            if p_val <= lowest_day_perf:
                lowest_day_perf = p_val
                lowest_day_date = d_str

            for cat, c_score in perf["category_scores"].items():
                if cat not in category_totals:
                    category_totals[cat] = {'score_sum': 0, 'cnt': 0}
                category_totals[cat]['score_sum'] += c_score
                category_totals[cat]['cnt'] += 1

        daily_trend.append({
            "date": d_str,
            "day": curr.strftime('%a'),
            "performance": p_val,
            "quality": perf["average_quality"],
            "completed": perf["completed_count"]
        })
        curr += timedelta(days=1)

    avg_performance = round(total_perf_sum / valid_days_cnt) if valid_days_cnt > 0 else 0

    category_performance = []
    for cat, d in category_totals.items():
        category_performance.append({
            "category": cat,
            "score": round(d['score_sum'] / d['cnt']) if d['cnt'] > 0 else 0
        })
    category_performance.sort(key=lambda x: x["score"], reverse=True)

    # Data-driven insights generator
    insights = []
    if category_performance:
        insights.append(f"Your highest performing category is {category_performance[0]['category']} ({category_performance[0]['score']}% score).")
        if len(category_performance) > 1:
            insights.append(f"Your category needing the most focus is {category_performance[-1]['category']} ({category_performance[-1]['score']}% score).")
    if avg_performance >= 75:
        insights.append("Your overall consistency is strong! You maintain high performance across scheduled routines.")
    else:
        insights.append("Focus on rating your task quality consistently and completing morning routines early.")

    return jsonify({
        "average_performance": avg_performance,
        "best_day": {"date": best_day_date, "score": best_day_perf},
        "lowest_day": {"date": lowest_day_date, "score": lowest_day_perf if valid_days_cnt > 0 else 0},
        "daily_trend": daily_trend,
        "category_performance": category_performance,
        "insights": insights
    })

# --- LEADERBOARD & REWARDS API ---
@app.route("/api/leaderboard", methods=["GET"])
@login_required
def get_leaderboard(user):
    period = request.args.get("period", "overall")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.id, u.name, u.email, u.avatar, u.bio, s.leaderboard_visible
        FROM users u JOIN user_settings s ON u.id = s.user_id
        WHERE s.leaderboard_visible = 1
    """)
    all_users = cursor.fetchall()
    conn.close()

    leaderboard = []
    for u in all_users:
        stats = calculate_consistency_score(u["id"], period)
        leaderboard.append({
            "id": u["id"],
            "name": u["name"],
            "avatar": u["avatar"],
            "bio": u["bio"],
            "score": stats["score"],
            "streak": stats["max_streak"],
            "is_me": u["id"] == user["id"]
        })

    leaderboard.sort(key=lambda x: x["score"], reverse=True)
    for idx, entry in enumerate(leaderboard):
        entry["rank"] = idx + 1

    return jsonify({"leaderboard": leaderboard})

@app.route("/api/rewards", methods=["GET"])
@login_required
def get_rewards(user):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM achievements")
    all_achievements = [dict(a) for a in cursor.fetchall()]

    cursor.execute("SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = ?", (user["id"],))
    unlocked_map = {row["achievement_id"]: row["unlocked_at"] for row in cursor.fetchall()}
    conn.close()

    rewards = []
    for a in all_achievements:
        is_unlocked = a["id"] in unlocked_map
        rewards.append({
            "id": a["id"],
            "slug": a["slug"],
            "name": a["name"],
            "description": a["description"],
            "icon": a["icon"],
            "unlocked": is_unlocked,
            "unlocked_at": unlocked_map.get(a["id"])
        })
    return jsonify({"rewards": rewards})

# --- USER SETTINGS & PROFILE API ---
@app.route("/api/settings", methods=["GET"])
@login_required
def get_settings(user):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM user_settings WHERE user_id = ?", (user["id"],))
    settings = dict(cursor.fetchone())
    conn.close()
    return jsonify({"settings": settings})

@app.route("/api/settings", methods=["PUT"])
@login_required
def update_settings(user):
    data = request.get_json(silent=True) or {}
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE user_settings SET
            theme = COALESCE(?, theme),
            accent_color = COALESCE(?, accent_color),
            week_start = COALESCE(?, week_start),
            default_reminder_time = COALESCE(?, default_reminder_time),
            default_task_priority = COALESCE(?, default_task_priority),
            leaderboard_visible = COALESCE(?, leaderboard_visible)
        WHERE user_id = ?
    """, (
        data.get("theme"), data.get("accent_color"), data.get("week_start"),
        data.get("default_reminder_time"), data.get("default_task_priority"),
        data.get("leaderboard_visible"), user["id"]
    ))
    conn.commit()
    conn.close()
    return jsonify({"message": "Settings saved successfully"})

@app.route("/api/user/profile", methods=["PUT"])
@login_required
def update_profile(user):
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    bio = data.get("bio", "").strip()
    avatar = data.get("avatar", "").strip()

    if not name:
        return jsonify({"error": "Name cannot be empty"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE users SET
            name = ?,
            bio = ?,
            avatar = COALESCE(NULLIF(?, ''), avatar)
        WHERE id = ?
    """, (name, bio, avatar, user["id"]))
    conn.commit()

    cursor.execute("SELECT id, name, email, avatar, bio FROM users WHERE id = ?", (user["id"],))
    updated_user = dict(cursor.fetchone())
    conn.close()
    return jsonify({"user": updated_user, "message": "Profile updated"})

@app.route("/api/user/export", methods=["POST"])
@login_required
def export_data(user):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, avatar, bio, created_at FROM users WHERE id = ?", (user["id"],))
    user_data = dict(cursor.fetchone())

    cursor.execute("SELECT * FROM tasks WHERE user_id = ?", (user["id"],))
    tasks = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM habits WHERE user_id = ?", (user["id"],))
    habits = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM daily_reflections WHERE user_id = ?", (user["id"],))
    reflections = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return jsonify({
        "export_date": datetime.now().isoformat(),
        "user": user_data,
        "tasks": tasks,
        "habits": habits,
        "reflections": reflections
    })

@app.route("/api/user/account", methods=["DELETE"])
@login_required
def delete_account(user):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE id = ?", (user["id"],))
    conn.commit()
    conn.close()
    return jsonify({"message": "Account deleted successfully"})

if __name__ == "__main__":
    print("Starting Taskora Server on http://0.0.0.0:5000 (accessible locally & via Wi-Fi)...")
    app.run(host="0.0.0.0", port=5000, debug=True)
