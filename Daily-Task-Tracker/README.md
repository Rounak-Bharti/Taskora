# Daily Task Tracker 📝

A modern, responsive, client-side productivity application built with **HTML5, CSS3, and Vanilla JavaScript**.

Designed with a **permanent task architecture** where tasks persist across days while completion statuses and daily notes are tracked independently for every date.

---

## 🌟 Features

- 📅 **Automatic Date Detection**: Detects local calendar date and resets daily tracking states automatically every new day without deleting past data.
- 🔄 **Permanent Task & Daily Record Architecture**: Tasks exist permanently until soft-deleted. Daily completion status and notes are isolated per date (`YYYY-MM-DD`).
- 📊 **Dynamic Dashboard**: Displays greeting, formatted date, live progress percentage bar, and task counters (Completed, Remaining, Total).
- 🏷️ **Daily Notes**: Write and auto-save custom progress notes for every task on a specific day. Past notes remain preserved in history.
- 📆 **Interactive History & Calendar**: Navigate months, pick any date, and view exact historical task records, completion rates, and historical daily notes.
- ⚡ **Productivity Statistics**: Analytics dashboard with overall completion %, current streak, best streak, total completed task count, and a 7-day weekly activity bar chart.
- 🔍 **Search, Filter & Sort**: Filter tasks by status (*All, Completed, Incomplete*), search by keyword, and sort by date or completion state.
- 🌓 **Dark / Light Theme Toggle**: Seamless theme switching with user preference saved in `LocalStorage`.
- 🔔 **Toast Notifications**: Interactive toast alerts for task creation, updates, completion, daily notes, and soft deletion.
- 📱 **Fully Responsive & Accessible**: Mobile-first grid/flexbox layout, high contrast, clean typography, keyboard navigation, and modal dialogs.

---

## 🛠️ Technologies Used

- **HTML5**: Semantic markup, modal dialog structures, accessible ARIA attributes.
- **CSS3**: Custom CSS variables, Flexbox, Grid layout, dark mode overrides, custom scrollbars, animations.
- **Vanilla JavaScript**: Object-oriented modular JS structure (ES6+), DOM manipulation, event listeners.
- **Browser LocalStorage**: Permanent client-side persistence for tasks, daily records, and user settings.

*(No external frameworks, libraries, or npm packages used).*

---

## 📁 Project Structure

```text
Daily-Task-Tracker/
│
├── index.html           # Main Single Page Application shell
│
├── css/
│   └── style.css        # Responsive styles, CSS variables & theme overrides
│
├── js/
│   ├── storage.js       # LocalStorage data access & persistence engine
│   ├── tasks.js         # Core task management, search, filtering & sorting logic
│   ├── history.js       # Calendar grid rendering & historical record evaluation
│   ├── statistics.js    # Metric calculation, streak evaluation & bar chart engine
│   └── app.js           # UI controller, event handlers, modals & toasts
│
├── images/              # Assets & images
│
└── README.md            # Project documentation & full-stack upgrade blueprint
```

---

## 🚀 How to Run

1. Clone or download the repository to your local computer.
2. Open `Daily-Task-Tracker/index.html` directly in any web browser (Chrome, Firefox, Edge, Safari).
3. Alternatively, serve using any lightweight static server (e.g., Live Server in VS Code, Python `http.server`, or Node `npx serve`).

---

## 💾 LocalStorage & Data Architecture

Data is stored persistently in the browser's `LocalStorage` using three keys:

### 1. Permanent Tasks (`dailyTaskTracker_tasks`)
Stores tasks created by the user. Deleting a task performs a **soft delete** (`active: false`) to preserve historical accuracy.

```json
[
  {
    "id": "task_1727800000000_a1b2",
    "title": "Study Java",
    "description": "Practice core Java OOP concepts and data structures",
    "createdAt": "2026-10-01",
    "active": true
  }
]
```

### 2. Daily Tracking Records (`dailyTaskTracker_dailyRecords`)
Stores date-specific completion status and custom notes:

```json
[
  {
    "id": "rec_1727800000000_c3d4",
    "taskId": "task_1727800000000_a1b2",
    "date": "2026-10-01",
    "status": "completed",
    "note": "Practiced arrays and string manipulation."
  }
]
```

### 3. Settings (`dailyTaskTracker_settings`)
Stores user UI preferences:

```json
{
  "theme": "dark",
  "userName": "Rounak"
}
```

---

## 📐 Business Logic Rules

1. **Rule 1**: A task remains available every day until deleted.
2. **Rule 2**: Daily completion status belongs exclusively to a specific date.
3. **Rule 3**: Daily notes belong exclusively to a specific date.
4. **Rule 4**: Yesterday's data is never overwritten when a new day begins.
5. **Rule 5**: New calendar days start with fresh tracking states for active tasks.
6. **Rule 6**: Historical records remain accessible forever via the History page.
7. **Rule 7**: Deleting a task soft-deletes it (`active: false`) without destroying its past records.
8. **Rule 8**: A task never appears on a historical date prior to its `createdAt` date.
9. **Rule 9**: Refreshing or closing the browser preserves all tasks, daily notes, and settings.
10. **Rule 10**: All dates use local date formatting (`YYYY-MM-DD`) to avoid UTC timezone offset bugs.

---

## 🔮 Future Full-Stack Version

This application has been architected to allow a seamless migration to a full-stack web application.

```text
               ┌─────────────────────────┐
               │    Frontend UI          │
               │ React.js / Next.js      │
               └────────────┬────────────┘
                            │ REST / GraphQL API
               ┌────────────▼────────────┐
               │    Backend Server       │
               │ Node.js + Express.js    │
               └────────────┬────────────┘
                            │ Mongoose ODM
               ┌────────────▼────────────┐
               │    Database             │
               │ MongoDB Atlas           │
               └─────────────────────────┘
```

### Planned Upgrade Features:
- 🔐 **User Authentication**: JWT-based authentication (Sign Up, Login, Password Reset, OAuth with Google).
- ☁️ **Cloud Data Sync**: Cross-device sync connecting mobile and desktop browser sessions.
- 🗄️ **MongoDB Schemas**: Direct translation of JS objects to MongoDB `TaskSchema` and `DailyRecordSchema`.
- 🔔 **Push Notifications**: Daily reminders via Web Push API or email digests.
- 🤝 **Social & Team Tracking**: Share productivity streaks and compare routines with friends.
