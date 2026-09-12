import urllib.request
import json
import sys

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

def run_tests():
    print("--- Starting Taskora Upgraded Verification Tests ---")

    # 1. Test Static Index Page
    req = urllib.request.Request(f"{BASE_URL}/")
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        html = resp.read().decode("utf-8")
        assert "Taskora" in html
        print("[OK] Index Page loaded successfully")

    # 2. Test Registration & Login
    reg_payload = {
        "name": "Self Improvement User",
        "email": "selfimprove@taskora.io",
        "password": "password123"
    }
    status, reg_res = request("/api/auth/register", "POST", reg_payload)
    if status == 400 and "already registered" in reg_res.get("error", ""):
        status, login_res = request("/api/auth/login", "POST", {"email": "selfimprove@taskora.io", "password": "password123"})
        assert status == 200
        token = login_res["token"]
        print("[OK] User logged in successfully")
    else:
        assert status == 201
        token = reg_res["token"]
        print("[OK] User registration successful")

    auth_headers = {"Authorization": f"Bearer {token}"}

    # 3. Test Routine Templates Listing & Applying
    status, tmpl_res = request("/api/templates", "GET", headers=auth_headers)
    assert status == 200
    assert len(tmpl_res["templates"]) >= 1
    template_id = tmpl_res["templates"][0]["id"]
    print(f"[OK] Routine templates loaded ({len(tmpl_res['templates'])} templates available)")

    status, apply_res = request(f"/api/templates/{template_id}/apply", "POST", {"date": "2026-09-12"}, auth_headers)
    assert status == 200
    print("[OK] Routine template applied to 2026-09-12 successfully")

    # 4. Test Task Creation & Quality Rating System
    status, task_res = request("/api/tasks", "POST", {
        "title": "Study Deep Learning",
        "category": "Learning",
        "due_date": "2026-09-12",
        "due_time": "10:00",
        "estimated_duration": 60,
        "priority": "high"
    }, auth_headers)
    assert status == 201
    task_id = task_res["id"]
    print(f"[OK] Routine task created (ID: {task_id})")

    # Rate Task Quality: Status = completed, Rating = 4 stars (80%), Actual Duration = 50 mins
    status, rate_res = request(f"/api/tasks/{task_id}/rate", "POST", {
        "status": "completed",
        "quality_rating": 4,
        "actual_duration": 50,
        "difficulty": "medium",
        "note": "Understood neural networks and loss functions"
    }, auth_headers)
    assert status == 200
    assert "daily_performance" in rate_res
    print(f"[OK] Task quality rated 4/5 stars. Daily Performance score calculated: {rate_res['daily_performance']['daily_performance']}%")

    # 5. Test Daily Performance % Calculation Endpoint
    status, perf_res = request("/api/tasks/performance?date=2026-09-12", "GET", headers=auth_headers)
    assert status == 200
    assert perf_res["daily_performance"] >= 0
    print(f"[OK] Daily Performance % endpoint verified (Score: {perf_res['daily_performance']}%, Completed: {perf_res['completed_count']}/{perf_res['total_applicable']})")

    # 6. Test Daily Reflection & Auto-Summary Generator
    status, ref_res = request("/api/reflections", "POST", {
        "date": "2026-09-12",
        "went_well": "Completed morning study block with high focus",
        "failed_tasks": "Skipped evening walk",
        "why_missed": "Felt tired",
        "improve_tomorrow": "Take short breaks",
        "energy": 4,
        "mood": 4,
        "proud_of": "Deep learning progress"
    }, auth_headers)
    assert status == 200
    assert "summary" in ref_res
    print(f"[OK] Daily Reflection saved. Auto-generated Summary: '{ref_res['summary']}'")

    # 7. Test Calendar Compare Days Endpoint
    status, cmp_res = request("/api/calendar/compare?date1=2026-09-12&date2=2026-09-11", "GET", headers=auth_headers)
    assert status == 200
    assert "day1" in cmp_res and "day2" in cmp_res
    print("[OK] Side-by-side Calendar Compare Days endpoint verified")

    # 8. Test Analytics Category Performance
    status, analytics_res = request("/api/analytics?period=month", "GET", headers=auth_headers)
    assert status == 200
    assert "category_performance" in analytics_res
    assert "insights" in analytics_res
    print(f"[OK] Analytics category performance breakdown & insights verified ({len(analytics_res['category_performance'])} categories tracked)")

    print("\n--- ALL TASKORA UPGRADED VERIFICATION TESTS PASSED SUCCESSFULLY! ---")

if __name__ == "__main__":
    run_tests()
