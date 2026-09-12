import sqlite3
import os
import json
import hashlib
from datetime import datetime, date, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "taskora.db")

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        avatar TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        timezone TEXT DEFAULT 'UTC',
        bio TEXT DEFAULT 'Building routines, achieving consistency.',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # User Settings Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_settings (
        user_id INTEGER PRIMARY KEY,
        theme TEXT DEFAULT 'system',
        accent_color TEXT DEFAULT 'indigo',
        week_start TEXT DEFAULT 'monday',
        default_reminder_time TEXT DEFAULT '09:00',
        default_task_priority TEXT DEFAULT 'medium',
        leaderboard_visible INTEGER DEFAULT 1,
        streak_freezes_count INTEGER DEFAULT 2,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # Habits Table (Upgraded with habit_type, target_value, unit)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS habits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        category TEXT DEFAULT 'Productivity',
        icon TEXT DEFAULT '⚡',
        color TEXT DEFAULT '#6366f1',
        frequency TEXT DEFAULT 'daily',
        custom_days TEXT DEFAULT '[]',
        habit_type TEXT DEFAULT 'yes_no',
        target_value INTEGER DEFAULT 1,
        unit TEXT DEFAULT 'times',
        reminder_time TEXT DEFAULT '08:00',
        start_date TEXT DEFAULT CURRENT_DATE,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # Habit Completions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS habit_completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        habit_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        progress_value INTEGER DEFAULT 1,
        quality_rating INTEGER,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(habit_id, date),
        FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # Tasks Table (Upgraded with 6 statuses, quality rating, durations, difficulty, notes)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        due_date TEXT NOT NULL,
        due_time TEXT DEFAULT '18:00',
        estimated_duration INTEGER DEFAULT 30,
        actual_duration INTEGER,
        priority TEXT DEFAULT 'medium',
        category TEXT DEFAULT 'General',
        status TEXT DEFAULT 'not_started',
        quality_rating INTEGER,
        difficulty TEXT DEFAULT 'medium',
        low_performance_reason TEXT DEFAULT '',
        note TEXT DEFAULT '',
        wake_up_challenge INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0,
        completed_at TIMESTAMP,
        recurrence TEXT DEFAULT 'none',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # Column migrations for existing tasks table
    cursor.execute("PRAGMA table_info(tasks);")
    existing_task_cols = set(r['name'] for r in cursor.fetchall())
    new_task_cols = [
        ("estimated_duration", "INTEGER DEFAULT 30"),
        ("actual_duration", "INTEGER"),
        ("status", "TEXT DEFAULT 'not_started'"),
        ("quality_rating", "INTEGER"),
        ("difficulty", "TEXT DEFAULT 'medium'"),
        ("low_performance_reason", "TEXT DEFAULT ''"),
        ("note", "TEXT DEFAULT ''"),
        ("wake_up_challenge", "INTEGER DEFAULT 0")
    ]
    for col_name, col_def in new_task_cols:
        if col_name not in existing_task_cols:
            cursor.execute(f"ALTER TABLE tasks ADD COLUMN {col_name} {col_def};")

    # Column migrations for existing habits table
    cursor.execute("PRAGMA table_info(habits);")
    existing_habit_cols = set(r['name'] for r in cursor.fetchall())
    new_habit_cols = [
        ("habit_type", "TEXT DEFAULT 'yes_no'"),
        ("target_value", "INTEGER DEFAULT 1"),
        ("unit", "TEXT DEFAULT 'times'")
    ]
    for col_name, col_def in new_habit_cols:
        if col_name not in existing_habit_cols:
            cursor.execute(f"ALTER TABLE habits ADD COLUMN {col_name} {col_def};")

    # Column migrations for existing habit_completions table
    cursor.execute("PRAGMA table_info(habit_completions);")
    existing_comp_cols = set(r['name'] for r in cursor.fetchall())
    new_comp_cols = [
        ("progress_value", "INTEGER DEFAULT 1"),
        ("quality_rating", "INTEGER")
    ]
    for col_name, col_def in new_comp_cols:
        if col_name not in existing_comp_cols:
            cursor.execute(f"ALTER TABLE habit_completions ADD COLUMN {col_name} {col_def};")

    # Reminders Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        type TEXT DEFAULT 'general',
        linked_habit_id INTEGER,
        linked_task_id INTEGER,
        time TEXT NOT NULL,
        repeat_schedule TEXT DEFAULT 'daily',
        enabled INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (linked_habit_id) REFERENCES habits(id) ON DELETE SET NULL,
        FOREIGN KEY (linked_task_id) REFERENCES tasks(id) ON DELETE SET NULL
    );
    """)

    # Achievements Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        requirement_type TEXT NOT NULL,
        requirement_value INTEGER NOT NULL
    );
    """)

    # User Achievements Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        achievement_id INTEGER NOT NULL,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, achievement_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
    );
    """)

    # Streak Freezes Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS streak_freezes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        habit_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(habit_id, date),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
    );
    """)

    # Active Sessions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS active_sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # Daily Reflections Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS daily_reflections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        went_well TEXT DEFAULT '',
        failed_tasks TEXT DEFAULT '',
        why_missed TEXT DEFAULT '',
        improve_tomorrow TEXT DEFAULT '',
        energy INTEGER DEFAULT 3,
        mood INTEGER DEFAULT 3,
        proud_of TEXT DEFAULT '',
        summary_text TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # Routine Templates Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS routine_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        icon TEXT DEFAULT '📋',
        is_default INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Routine Template Items Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS routine_template_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        category TEXT DEFAULT 'General',
        due_time TEXT DEFAULT '09:00',
        estimated_duration INTEGER DEFAULT 30,
        priority TEXT DEFAULT 'medium',
        wake_up_challenge INTEGER DEFAULT 0,
        FOREIGN KEY (template_id) REFERENCES routine_templates(id) ON DELETE CASCADE
    );
    """)

    conn.commit()
    conn.close()

def save_session(token, user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO active_sessions (token, user_id) VALUES (?, ?)", (token, user_id))
    conn.commit()
    conn.close()

def get_session_user(token):
    if not token:
        return None
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.id, u.name, u.email, u.avatar, u.bio
        FROM active_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ?
    """, (token,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def delete_session(token):
    if not token:
        return
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM active_sessions WHERE token = ?", (token,))
    conn.commit()
    conn.close()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

# --- DAILY PERFORMANCE SCORING ALGORITHM ---
def calculate_daily_performance(user_id, target_date):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM tasks WHERE user_id = ? AND due_date = ?", (user_id, target_date))
    tasks = [dict(r) for r in cursor.fetchall()]
    conn.close()

    today_str = date.today().strftime('%Y-%m-%d')
    is_past = target_date < today_str

    task_scores = []
    category_totals = {}
    completed_count = 0
    total_applicable = 0
    quality_sum = 0
    quality_count = 0

    for t in tasks:
        st = t.get('status') or ('completed' if t.get('completed') else 'not_started')
        
        # Handle status logic
        if st == 'not_applicable':
            continue

        if st in ('not_started', 'in_progress'):
            if is_past:
                st = 'missed' # Past incomplete tasks count as missed
            else:
                continue # Future/today pending tasks do not penalize daily score yet!

        total_applicable += 1
        cat = t.get('category', 'General')
        if cat not in category_totals:
            category_totals[cat] = {'score_sum': 0, 'count': 0}

        # 1. Completion Value
        if st == 'completed':
            comp_val = 1.0
            completed_count += 1
        elif st == 'partially_completed':
            comp_val = 0.5
        else: # skipped, missed
            comp_val = 0.0

        # 2. Quality Rating Value (1 star = 0.2, 5 stars = 1.0)
        q_rating = t.get('quality_rating')
        if q_rating is not None and q_rating > 0:
            quality_val = q_rating / 5.0
            quality_sum += q_rating
            quality_count += 1
        else:
            # Unrated completed task defaults to 100% quality value unless rating pending
            quality_val = 1.0 if st == 'completed' else 0.0

        # Task Score = Completion Value * Quality Value
        score = round(comp_val * quality_val * 100)
        task_scores.append({
            'id': t['id'],
            'title': t['title'],
            'category': cat,
            'status': st,
            'quality_rating': q_rating,
            'completion_value': comp_val,
            'quality_value': quality_val,
            'score': score
        })

        category_totals[cat]['score_sum'] += score
        category_totals[cat]['count'] += 1

    # Calculate overall Daily Performance %
    if total_applicable == 0:
        daily_perf = 0
    else:
        daily_perf = round(sum(t['score'] for t in task_scores) / total_applicable)

    avg_quality = round(quality_sum / quality_count, 1) if quality_count > 0 else 0.0

    category_scores = {}
    for cat, data in category_totals.items():
        category_scores[cat] = round(data['score_sum'] / data['count']) if data['count'] > 0 else 0

    return {
        'date': target_date,
        'daily_performance': daily_perf,
        'completed_count': completed_count,
        'total_applicable': total_applicable,
        'average_quality': avg_quality,
        'category_scores': category_scores,
        'task_scores': task_scores
    }

def generate_reflection_summary(user_id, target_date, reflection_data):
    stats = calculate_daily_performance(user_id, target_date)
    perf_pct = stats['daily_performance']
    avg_q = stats['average_quality'] or reflection_data.get('energy', 4)

    cat_scores = stats['category_scores']
    strongest_cat = "Learning"
    weakest_cat = "Health"

    if cat_scores:
        sorted_cats = sorted(cat_scores.items(), key=lambda x: x[1], reverse=True)
        strongest_cat = sorted_cats[0][0]
        weakest_cat = sorted_cats[-1][0]

    summary = (
        f"You completed {perf_pct}% of your routine today with an average task quality rating of {avg_q}/5. "
        f"Your strongest area was {strongest_cat}. "
        f"Your biggest opportunity for improvement tomorrow is {weakest_cat}."
    )
    return summary

# Streak calculation logic
def calculate_habit_streaks(habit_id, user_id):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT frequency, custom_days, start_date FROM habits WHERE id = ?", (habit_id,))
    habit = cursor.fetchone()
    if not habit:
        conn.close()
        return {'current_streak': 0, 'longest_streak': 0}

    frequency = habit['frequency']
    custom_days = json.loads(habit['custom_days']) if habit['custom_days'] else []
    start_dt = datetime.strptime(habit['start_date'], '%Y-%m-%d').date() if habit['start_date'] else date.today()

    cursor.execute("SELECT date FROM habit_completions WHERE habit_id = ? ORDER BY date ASC", (habit_id,))
    completed_dates_set = set(row['date'] for row in cursor.fetchall())

    cursor.execute("SELECT date FROM streak_freezes WHERE habit_id = ?", (habit_id,))
    frozen_dates_set = set(row['date'] for row in cursor.fetchall())

    conn.close()

    today = date.today()
    if start_dt > today:
        return {'current_streak': 0, 'longest_streak': 0}

    def is_scheduled(d):
        if d < start_dt or d > today:
            return False
        if frequency == 'daily':
            return True
        elif frequency == 'weekly':
            return True
        elif frequency == 'custom':
            day_names = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
            day_str = day_names[d.weekday()]
            return day_str in custom_days or str(d.weekday()) in custom_days
        return True

    cur_date = start_dt
    current_streak = 0
    longest_streak = 0
    temp_streak = 0

    while cur_date <= today:
        d_str = cur_date.strftime('%Y-%m-%d')
        if is_scheduled(cur_date):
            if d_str in completed_dates_set or d_str in frozen_dates_set:
                temp_streak += 1
                if temp_streak > longest_streak:
                    longest_streak = temp_streak
            else:
                if cur_date == today:
                    pass
                else:
                    temp_streak = 0
        cur_date += timedelta(days=1)

    current_streak = 0
    check_date = today
    while check_date >= start_dt:
        if is_scheduled(check_date):
            d_str = check_date.strftime('%Y-%m-%d')
            if d_str in completed_dates_set or d_str in frozen_dates_set:
                current_streak += 1
            else:
                if check_date == today:
                    pass
                else:
                    break
        check_date -= timedelta(days=1)

    return {'current_streak': current_streak, 'longest_streak': max(longest_streak, current_streak)}

def update_user_achievements(user_id):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as total FROM habit_completions WHERE user_id = ?", (user_id,))
    total_completions = cursor.fetchone()['total']

    cursor.execute("SELECT COUNT(*) as total FROM tasks WHERE user_id = ? AND status = 'completed'", (user_id,))
    total_tasks = cursor.fetchone()['total']

    cursor.execute("SELECT id FROM habits WHERE user_id = ?", (user_id,))
    habits = cursor.fetchall()
    max_streak = 0
    for h in habits:
        streaks = calculate_habit_streaks(h['id'], user_id)
        if streaks['longest_streak'] > max_streak:
            max_streak = streaks['longest_streak']

    cursor.execute("SELECT * FROM achievements")
    all_achievements = cursor.fetchall()

    newly_unlocked = []
    for ach in all_achievements:
        req_type = ach['requirement_type']
        req_val = ach['requirement_value']
        unlocked = False

        if req_type == 'habit_completion' and total_completions >= req_val:
            unlocked = True
        elif req_type == 'task_completion' and total_tasks >= req_val:
            unlocked = True
        elif req_type == 'streak' and max_streak >= req_val:
            unlocked = True

        if unlocked:
            try:
                cursor.execute(
                    "INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)",
                    (user_id, ach['id'])
                )
                newly_unlocked.append(ach['name'])
            except sqlite3.IntegrityError:
                pass

    conn.commit()
    conn.close()
    return newly_unlocked

def calculate_consistency_score(user_id, period='overall'):
    conn = get_db()
    cursor = conn.cursor()

    date_filter = ""
    if period == 'month':
        start_of_month = date.today().replace(day=1).strftime('%Y-%m-%d')
        date_filter = f" AND date >= '{start_of_month}'"
    elif period == 'week':
        start_of_week = (date.today() - timedelta(days=date.today().weekday())).strftime('%Y-%m-%d')
        date_filter = f" AND date >= '{start_of_week}'"

    cursor.execute(f"SELECT COUNT(*) as cnt FROM habit_completions WHERE user_id = ?{date_filter}", (user_id,))
    habit_pts = cursor.fetchone()['cnt'] * 10

    task_date_filter = date_filter.replace("date", "completed_at") if date_filter else ""
    cursor.execute(f"SELECT COUNT(*) as cnt FROM tasks WHERE user_id = ? AND status = 'completed'{task_date_filter}", (user_id,))
    task_pts = cursor.fetchone()['cnt'] * 5

    cursor.execute("SELECT id FROM habits WHERE user_id = ?", (user_id,))
    habits = cursor.fetchall()
    streak_bonus = 0
    max_streak = 0
    for h in habits:
        s = calculate_habit_streaks(h['id'], user_id)
        if s['current_streak'] > max_streak:
            max_streak = s['current_streak']
        streak_bonus += (s['current_streak'] // 7) * 50

    conn.close()
    total_score = habit_pts + task_pts + streak_bonus
    return {
        'score': total_score,
        'max_streak': max_streak,
        'habit_points': habit_pts,
        'task_points': task_pts,
        'streak_bonus': streak_bonus
    }
