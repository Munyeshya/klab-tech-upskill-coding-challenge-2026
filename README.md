# TaskFlow

A full-stack task management application built for the kLab Tech Upskill
Program challenge. Users can create an account, sign in securely, and manage a
private collection of prioritized tasks.

## Technology

- React 19 and Vite
- Django 5.2 LTS and Django REST Framework
- Simple JWT authentication
- MySQL 8.0

## Features

- Register, sign in, refresh sessions, and sign out
- User-isolated task data
- Create, view, edit, complete, reopen, and delete tasks
- Filter tasks by pending or completed status
- Search task titles and descriptions
- Browse tasks with server-side pagination
- Responsive interface and server-side validation
- Automated authentication and API tests

## Run locally

Create a MySQL database:

```sql
CREATE DATABASE task_manager
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
```

Configure and start the backend from the repository root:

```powershell
backend\.venv\Scripts\Activate.ps1
Copy-Item backend\.env.example backend\.env
# Update backend/.env with your MySQL credentials.
python backend\manage.py migrate
python backend\manage.py runserver
```

In a second terminal, start the frontend:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Verification

```powershell
python backend\manage.py test accounts tasks --settings=config.settings_test
cd frontend
npm run lint
npm run build
```

See [backend/README.md](backend/README.md) for the full API reference.
