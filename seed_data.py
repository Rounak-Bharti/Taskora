import sqlite3
import json
from datetime import date, timedelta
from database import get_db, init_db, hash_password

def seed_initial_data():
    init_db()
    conn = get_db()
    cursor = conn.cursor()

    # 1. Seed Achievements
    achievements = [
        ("first_step", "First Step", "Complete your first habit check-in.", "🌱", "habit_completion", 1),
        ("starter_3", "3-Day Starter", "Maintain a 3-day habit streak.", "🔥", "streak", 3),
        ("warrior_7", "7-Day Warrior", "Maintain a 7-day habit streak.", "⚔️", "streak", 7),
        ("consistent_30", "30-Day Consistent", "Reach a 30-day habit streak.", "👑", "streak", 30),
        ("habit_master", "Habit Master", "Log 100 total habit check-ins.", "🏆", "habit_completion", 100),
        ("task_ninja", "Task Ninja", "Complete 25 tasks with high quality ratings.", "🎯", "task_completion", 25)
    ]

    for slug, name, desc, icon, req_type, req_val in achievements:
        cursor.execute("""
            INSERT OR IGNORE INTO achievements (slug, name, description, icon, requirement_type, requirement_value)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (slug, name, desc, icon, req_type, req_val))

    # 2. Seed Default Routine Templates
    templates = [
        ("College Day", "Balanced routine for lectures, study, and fitness", "🎓", [
            ("Wake up & Hydrate", "Health", "06:30", 30, "medium", 1),
            ("Morning Workout", "Fitness", "07:00", 45, "high", 0),
            ("Attend Classes & Lectures", "Learning", "09:00", 180, "high", 0),
            ("Study & Assignment Prep", "Learning", "14:00", 90, "high", 0),
            ("Read 20 Pages", "Personal Growth", "18:00", 30, "medium", 0),
            ("Review Day & Reflection", "Reflection", "21:30", 20, "low", 0)
        ]),
        ("Internship Day", "Structured workflow for professional productivity", "💼", [
            ("Morning Standup & Prep", "Work", "08:30", 30, "high", 0),
            ("Deep Work Session 1", "Work", "09:30", 120, "high", 0),
            ("Lunch & Short Walk", "Health", "12:30", 45, "low", 0),
            ("Deep Work Session 2", "Work", "14:00", 120, "high", 0),
            ("Evening Skill Practice", "Learning", "18:30", 60, "medium", 0)
        ]),
        ("Weekend Routine", "Rest, personal projects, and deep reflection", "🛋️", [
            ("Morning Meditation", "Health", "08:00", 20, "low", 0),
            ("Side Project Coding", "Learning", "10:00", 120, "high", 0),
            ("Outdoor Activity / Gym", "Fitness", "16:00", 60, "medium", 0),
            ("Book Reading & Journaling", "Personal Growth", "20:00", 45, "low", 0)
        ]),
        ("Exam Preparation", "Intense study blocks with high focus", "📚", [
            ("Morning Flashcards & Review", "Learning", "07:00", 60, "high", 0),
            ("Practice Exam Questions", "Learning", "09:30", 150, "high", 0),
            ("Active Recall Study Block", "Learning", "15:00", 120, "high", 0),
            ("Formula Review & Sleep Early", "Health", "21:00", 45, "medium", 0)
        ])
    ]

    for t_name, t_desc, t_icon, items in templates:
        cursor.execute("SELECT id FROM routine_templates WHERE name = ? AND is_default = 1", (t_name,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO routine_templates (name, description, icon, is_default)
                VALUES (?, ?, ?, 1)
            """, (t_name, t_desc, t_icon))
            template_id = cursor.lastrowid

            for title, cat, time_str, dur, priority, wake_challenge in items:
                cursor.execute("""
                    INSERT INTO routine_template_items (template_id, title, category, due_time, estimated_duration, priority, wake_up_challenge)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (template_id, title, cat, time_str, dur, priority, wake_challenge))

    # 3. Seed Demo Leaderboard Users
    demo_users = [
        ("Sophia Chen", "sophia@taskora.io", "pass123", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", 1450, 24, "Productivity Guru 🚀"),
        ("Marcus Vance", "marcus@taskora.io", "pass123", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", 1280, 19, "Fitness & Discipline 🏋️‍♂️"),
        ("Elena Rostova", "elena@taskora.io", "pass123", "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150", 940, 14, "Reading & Mindful Living 📚")
    ]

    for name, email, password, avatar, score_base, streak, bio in demo_users:
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        if not cursor.fetchone():
            cursor.execute(
                "INSERT INTO users (name, email, password_hash, avatar, bio) VALUES (?, ?, ?, ?, ?)",
                (name, email, hash_password(password), avatar, bio)
            )
            u_id = cursor.lastrowid
            cursor.execute("INSERT INTO user_settings (user_id, leaderboard_visible) VALUES (?, 1)", (u_id,))

    conn.commit()
    conn.close()
    print("Seed data initialized successfully with Routine Templates and Achievements.")

if __name__ == "__main__":
    seed_initial_data()
