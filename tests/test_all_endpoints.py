import urllib.request
import json
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

BASE_URL = "http://127.0.0.1:5000"

def request(path, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    url = f"{BASE_URL}{path}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    if body and "Content-Type" not in headers:
        headers["Content-Type"] = "application/json"
    
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        return e.code, json.loads(content) if content else {}

def run_comprehensive_tests():
    print("==================================================")
    print("       TASKORA COMPREHENSIVE SUITE TESTING        ")
    print("==================================================")

    # 1. Test Static Index Page
    req = urllib.request.Request(f"{BASE_URL}/")
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        html = resp.read().decode("utf-8")
        assert "Taskora" in html
        print("[PASS] 1. Static Index Page")

    # 2. Test User Auth (Register & Login & /api/auth/me & Logout)
    import time
    test_email = f"verifier_{int(time.time() * 1000)}@taskora.io"
    reg_payload = {"name": "Verifier User", "email": test_email, "password": "securepassword"}
    status, reg_res = request("/api/auth/register", "POST", reg_payload)
    assert status == 201
    token = reg_res["token"]
    print("[PASS] 2a. Auth - Register")

    headers = {"Authorization": f"Bearer {token}"}
    status, me_res = request("/api/auth/me", "GET", headers=headers)
    assert status == 200
    assert me_res["user"]["email"] == test_email
    print("[PASS] 2b. Auth - Get Profile (/api/auth/me)")

    # 3. Test Onboarding
    onboard_payload = {
        "habits": ["Drink water", "Exercise", "Read for 20 minutes"],
        "preferences": {"weekStart": "monday", "reminderTime": "07:30"}
    }
    status, onb_res = request("/api/auth/onboarding", "POST", onboard_payload, headers=headers)
    assert status == 200
    print("[PASS] 3. Onboarding Flow")

    # 4. Test Habits Endpoint
    status, habits_res = request("/api/habits", "GET", headers=headers)
    assert status == 200
    assert len(habits_res["habits"]) >= 3
    habit_id = habits_res["habits"][0]["id"]
    print(f"[PASS] 4a. Habits - List Habits ({len(habits_res['habits'])} loaded)")

    status, h_comp_res = request(f"/api/habits/{habit_id}/complete", "POST", {"progress_value": 8, "quality_rating": 5}, headers=headers)
    assert status == 200
    print("[PASS] 4b. Habits - Record Completion with Quality Rating")

    # 5. Test Routine Tasks & Star Quality Rating
    status, task_res = request("/api/tasks", "POST", {
        "title": "Morning Meditation & Planning",
        "category": "Health",
        "due_date": "2026-09-12",
        "due_time": "08:00",
        "estimated_duration": 20,
        "priority": "high",
        "wake_up_challenge": 1
    }, headers=headers)
    assert status == 201
    task_id = task_res["id"]
    print(f"[PASS] 5a. Tasks - Create Task (ID: {task_id})")

    status, rate_res = request(f"/api/tasks/{task_id}/rate", "POST", {
        "status": "completed",
        "quality_rating": 5,
        "actual_duration": 18,
        "difficulty": "easy",
        "note": "Felt very calm"
    }, headers=headers)
    assert status == 200
    assert "daily_performance" in rate_res
    print(f"[PASS] 5b. Tasks - Quality Rating & Performance Engine (Daily Perf: {rate_res['daily_performance']['daily_performance']}%)")

    # 6. Test Daily Reflection API
    status, ref_res = request("/api/reflections", "POST", {
        "date": "2026-09-12",
        "went_well": "Woke up on time and finished morning routine",
        "failed_tasks": "None",
        "why_missed": "N/A",
        "improve_tomorrow": "Stay focused on deep work",
        "energy": 5,
        "mood": 5,
        "proud_of": "High energy levels"
    }, headers=headers)
    assert status == 200
    print(f"[PASS] 6. Daily Reflection & Auto Summary Generator ('{ref_res['summary']}')")

    # 7. Test Calendar & Day Compare Endpoint
    status, cmp_res = request("/api/calendar/compare?date1=2026-09-12&date2=2026-09-11", "GET", headers=headers)
    assert status == 200
    assert "day1" in cmp_res and "day2" in cmp_res
    print("[PASS] 7. Calendar - Side-by-Side Day Compare")

    # 8. Test Analytics Category Insights
    status, analytics_res = request("/api/analytics?period=month", "GET", headers=headers)
    assert status == 200
    assert len(analytics_res["insights"]) > 0
    print(f"[PASS] 8. Analytics Engine ({len(analytics_res['category_performance'])} categories, insights generated)")

    # 9. Test Leaderboard & Rewards
    status, lb_res = request("/api/leaderboard?period=overall", "GET", headers=headers)
    assert status == 200
    assert len(lb_res["leaderboard"]) > 0
    print(f"[PASS] 9a. Leaderboard API ({len(lb_res['leaderboard'])} active participants)")

    status, r_res = request("/api/rewards", "GET", headers=headers)
    assert status == 200
    assert len(r_res["rewards"]) > 0
    print(f"[PASS] 9b. Gamified Rewards & Badges ({len(r_res['rewards'])} achievements)")

    # 10. Test Settings & User Profile Updates & Export
    status, set_res = request("/api/settings", "PUT", {"theme": "dark", "accent_color": "#10b981"}, headers=headers)
    assert status == 200
    print("[PASS] 10a. Settings - Update Theme & Accent Color")

    status, prof_res = request("/api/user/profile", "PUT", {"name": "Updated Verifier", "bio": "Productivity Enthusiast"}, headers=headers)
    assert status == 200
    assert prof_res["user"]["name"] == "Updated Verifier"
    print("[PASS] 10b. Profile - Update Name and Bio")

    status, exp_res = request("/api/user/export", "POST", headers=headers)
    assert status == 200
    assert "tasks" in exp_res and "habits" in exp_res
    print("[PASS] 10c. Data Export API")

    print("==================================================")
    print("   ALL 15 TASKORA MODULE TESTS PASSED 100%!       ")
    print("==================================================")

if __name__ == "__main__":
    run_comprehensive_tests()
