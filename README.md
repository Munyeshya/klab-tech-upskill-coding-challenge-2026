# Intego Task Manager

![Intego logo](frontend/public/intego-logo.png)

**Intego** is Kinyarwanda for “goal” or “objective.” It is a full-stack task
management application created for the kLab Tech Upskill Program coding
challenge. Users can create an account and manage a private task list through a
responsive React interface backed by a Django REST API and MySQL.

## Challenge requirements and implementation

| Requirement | How it was implemented |
|---|---|
| View all tasks | Authenticated, paginated task list and `GET /tasks` |
| Create a task | Add Task modal and `POST /tasks` |
| View one task | `GET /tasks/<id>` |
| Edit a task | Edit modal with `PUT` and `PATCH /tasks/<id>` support |
| Delete a task | Confirmed deletion and `DELETE /tasks/<id>` |
| Pending or completed status | Status toggle using `PATCH /tasks/<id>` |
| Filter by status | All, Pending, and Completed filters using `?status=` |
| Required task fields | `id`, `title`, `description`, `status`, `priority`, and `createdAt` |
| REST backend | Django REST Framework serializers and generic API views |
| Database storage | MySQL with Django migrations |
| React frontend | Responsive Vite-powered React application |

## Additional features

- JWT registration, login, access-token refresh, and authenticated profile
- User-specific data isolation: users can access only their own tasks
- Live debounced search across task titles and descriptions
- Server-side pagination with six tasks per page
- JavaScript form validation and server-side validation
- Toast feedback for authentication and task actions
- Dashboard, task-list, and settings views
- Responsive sidebar and user dropdown
- Django admin task management
- Automated authentication and task API tests
- Original Intego branding and Jost typography

## Technology

### Frontend

- React 19
- Vite 8
- JavaScript, HTML, and CSS
- Oxlint

### Backend

- Python 3.14
- Django 5.2 LTS
- Django REST Framework
- Simple JWT
- django-cors-headers

### Database

- MySQL 8.0
- `mysqlclient` database driver

Django 5.2 LTS was selected because it supports the project's Python version
and MySQL 8.0 installation.

## Project structure

```text
Klab/
├── backend/
│   ├── accounts/          # Registration, JWT URLs, profile, and tests
│   ├── config/            # Django settings and root URL configuration
│   ├── tasks/             # Task model, API, pagination, migrations, and tests
│   ├── .env.example
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── public/            # Intego logo and public assets
│   ├── src/               # React application and styles
│   ├── .env.example
│   └── package.json
└── README.md
```

## Prerequisites

Install the following before starting:

- Python 3.14 or another version supported by Django 5.2
- Node.js and npm
- MySQL 8.0 or later
- Git

## Installation and local setup

### 1. Clone the repository

```powershell
git clone <your-repository-url>
cd Klab
```

### 2. Create and activate the Python virtual environment

Windows PowerShell:

```powershell
python -m venv backend\.venv
backend\.venv\Scripts\Activate.ps1
```

macOS or Linux:

```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
```

Install backend dependencies:

```powershell
python -m pip install --upgrade pip
pip install -r backend\requirements.txt
```

On macOS or Linux, use `backend/requirements.txt` in the final command.

### 3. Create the MySQL database

Open MySQL and run:

```sql
CREATE DATABASE task_manager
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
```

You may use a dedicated MySQL user instead of `root`. That user must have
permission to read and write the `task_manager` database.

### 4. Configure backend environment variables

Create the local environment file:

```powershell
Copy-Item backend\.env.example backend\.env
```

macOS or Linux:

```bash
cp backend/.env.example backend/.env
```

Update `backend/.env`:

```dotenv
DJANGO_SECRET_KEY=replace-with-a-long-random-secret
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

MYSQL_DATABASE=task_manager
MYSQL_USER=root
MYSQL_PASSWORD=your-mysql-password
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306

CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Never commit `backend/.env`. It is excluded by `.gitignore`.

### 5. Apply database migrations

With the virtual environment active:

```powershell
python backend\manage.py migrate
```

Optional: create a Django administrator:

```powershell
python backend\manage.py createsuperuser
```

### 6. Install the frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
```

The default frontend environment is:

```dotenv
VITE_API_URL=http://127.0.0.1:8000
```

Return to the repository root with `cd ..`.

## Running the application

Start the Django API from the repository root:

```powershell
backend\.venv\Scripts\Activate.ps1
python backend\manage.py runserver
```

The API runs at `http://127.0.0.1:8000` and Django admin is available at
`http://127.0.0.1:8000/admin/`.

In a second terminal, start React:

```powershell
cd frontend
npm run dev
```

Open `http://localhost:5173` in a browser. Register an account, sign in, and
begin creating tasks.

## API reference

### Authentication

| Method | Endpoint | Purpose | Authentication |
|---|---|---|---|
| `POST` | `/auth/register` | Register an account | Public |
| `POST` | `/auth/token` | Obtain access and refresh JWTs | Public |
| `POST` | `/auth/token/refresh` | Refresh an access JWT | Public |
| `GET` | `/auth/me` | Return the current user | Bearer JWT |

### Tasks

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/tasks` | List the authenticated user's tasks |
| `GET` | `/tasks/<id>` | Retrieve one owned task |
| `POST` | `/tasks` | Create a task |
| `PUT` | `/tasks/<id>` | Replace a task |
| `PATCH` | `/tasks/<id>` | Partially update a task or its status |
| `DELETE` | `/tasks/<id>` | Delete a task |

Task endpoints require this header:

```http
Authorization: Bearer <access-token>
```

Supported list parameters can be combined:

```text
/tasks?search=report&status=pending&page=2
```

- `search` searches task titles and descriptions.
- `status` accepts `pending` or `completed`.
- `page` selects a six-item result page.
- `page_size` may override the page size up to 50.

Paginated responses contain `count`, `next`, `previous`, and `results`.

Example task request:

```json
{
  "title": "Build the frontend",
  "description": "Connect React to the task API.",
  "status": "pending",
  "priority": "high"
}
```

Valid priorities are `low`, `medium`, and `high`. The server generates `id`
and `createdAt`.

## Testing and verification

Run all backend tests from the repository root with the virtual environment
active:

```powershell
python backend\manage.py test accounts tasks --settings=config.settings_test
```

Tests use an isolated in-memory SQLite database and do not modify MySQL.

Check the frontend:

```powershell
cd frontend
npm run lint
npm run build
```

The current test suite covers registration, JWT login and refresh, protected
routes, CRUD operations, validation, ownership isolation, search, filtering,
and pagination.

## Important technical decisions

- **Django 5.2 LTS** provides compatibility with MySQL 8.0 and Python 3.14.
- **JWT authentication** keeps the API stateless and works cleanly with React.
- **Owner-filtered querysets** prevent users from reading or modifying another
  user's tasks.
- **Server-side search and pagination** keep list requests efficient as data
  grows.
- **Environment variables** keep database credentials and Django secrets out
  of source control.
- **Separate test settings** make the automated suite repeatable without
  changing development data.

## Deployment

Before production deployment:

1. Set `DJANGO_DEBUG=False`.
2. Generate a secure `DJANGO_SECRET_KEY`.
3. Configure the deployed domains in `DJANGO_ALLOWED_HOSTS` and
   `CORS_ALLOWED_ORIGINS`.
4. Set `VITE_API_URL` to the deployed HTTPS API URL before building React.
5. Run migrations on the production database.
6. Serve Django with a production application server and serve the generated
   `frontend/dist` files through a static host.

### Backend on Render

The production API is available at:

```text
https://intego-api.onrender.com
```

### Frontend on Cloudflare Workers

Connect this GitHub repository to Cloudflare Workers Builds and use these settings:

```text
Production branch: main
Root directory: frontend
Build command: npm run build
Deploy command: npx wrangler deploy
```

The committed `frontend/wrangler.jsonc` publishes the `dist` directory and
provides the SPA navigation fallback. The committed `frontend/.env.production`
points production builds to the Render API. Alternatively, configure this
Cloudflare build variable:

```dotenv
VITE_API_URL=https://intego-api.onrender.com
```

After Cloudflare creates the site, copy its production URL (for example,
`https://intego.example.workers.dev`) and set the following variable on the
Render web service, using the real URL without a trailing slash:

```dotenv
CORS_ALLOWED_ORIGINS=https://intego.example.workers.dev
```

Redeploy the Render service after changing the variable. This allows the browser
frontend to call the API while keeping cross-origin access restricted to the
deployed site.

Live frontend: _Add the Cloudflare Workers URL here after the first deployment._





