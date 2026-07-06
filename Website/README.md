# 🏢 Society Management System

A full-stack Society Management System developed using React, Node.js, Express, and MySQL. The application helps housing societies manage residents, flats, maintenance bills, complaints, notices, and staff efficiently.

---

## 🚀 Features

### 👨‍💼 Admin Panel
- Dashboard with statistics
- Resident Management (CRUD)
- Flat Management (CRUD)
- Maintenance Billing & Payment Tracking
- Complaint Management
- Notice Management
- Staff Management
- Reports & Analytics
- Search and Filter Records
- Role-Based Access Control

### 👨‍👩‍👧 Resident Portal
- Personal Dashboard
- View Maintenance Bills
- Raise Complaints
- Track Complaint Status
- View Society Notices
- Profile Management

---

## 🛠️ Tech Stack

### Frontend
- React.js
- Bootstrap 5
- Axios
- React Router DOM

### Backend
- Node.js
- Express.js
- JWT Authentication
- bcrypt Password Hashing

### Database
- MySQL

---

# 📂 Project Structure

```bash
society-management-system/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── .env
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── admin/
│   │   ├── resident/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
│
└── README.md
```

---

# ⚙️ Installation

## 1. Clone Repository

```bash
git clone https://github.com/yourusername/society-management-system.git
cd society-management-system
```

---

## 2. Create Database

```sql
CREATE DATABASE society_management;
```

---

## 3. Backend Setup

```bash
cd backend
npm install
```

Create `.env`

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=society_management
JWT_SECRET=your_secret_key
```

Start Backend

```bash
npm start
```

or

```bash
node server.js
```

Backend runs on:

```bash
http://localhost:5000
```

---

## 4. Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs on:

```bash
http://localhost:3000
```

---

# 🔐 Authentication

- JWT Authentication
- Password Hashing using bcrypt
- Protected Routes
- Role-Based Authorization

---

# 📡 API Endpoints

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register User |
| POST | /api/auth/login | Login User |

## Users

| Method | Endpoint |
|--------|----------|
| GET | /api/users |
| GET | /api/users/:id |
| POST | /api/users |
| PUT | /api/users/:id |
| DELETE | /api/users/:id |

## Flats

| Method | Endpoint |
|--------|----------|
| GET | /api/flats |
| POST | /api/flats |
| PUT | /api/flats/:id |
| DELETE | /api/flats/:id |

## Maintenance

| Method | Endpoint |
|--------|----------|
| GET | /api/maintenance |
| POST | /api/maintenance |
| PUT | /api/maintenance/:id |
| DELETE | /api/maintenance/:id |

## Complaints

| Method | Endpoint |
|--------|----------|
| GET | /api/complaints |
| POST | /api/complaints |
| PUT | /api/complaints/:id |
| DELETE | /api/complaints/:id |

## Notices

| Method | Endpoint |
|--------|----------|
| GET | /api/notices |
| POST | /api/notices |
| DELETE | /api/notices/:id |

## Staff

| Method | Endpoint |
|--------|----------|
| GET | /api/staff |
| POST | /api/staff |
| PUT | /api/staff/:id |
| DELETE | /api/staff/:id |

---

# 🗄️ Database Tables

- users
- flats
- maintenance
- complaints
- notices
- staff

---

# 📊 Database Relationship

```text
Users (1) ------ (Many) Flats
Users (1) ------ (Many) Complaints
Flats (1) ------ (Many) Maintenance
```

---

# 👥 User Roles

## Admin
- Manage Residents
- Manage Flats
- Generate Maintenance Bills
- Manage Complaints
- Publish Notices
- Manage Staff
- View Reports

## Resident
- View Dashboard
- View Maintenance Status
- Raise Complaints
- View Notices

---

# 🖼️ Screenshots

Add screenshots here:

```md
![Dashboard](screenshots/dashboard.png)
![Residents](screenshots/residents.png)
![Maintenance](screenshots/maintenance.png)
```

---

# 🚀 Future Enhancements

- Online Payment Gateway
- Email Notifications
- SMS Notifications
- Visitor Management
- Event Management
- Document Upload
- Mobile Application

---

# 🤝 Contributing

Contributions are welcome.

1. Fork the repository
2. Create your branch
3. Commit changes
4. Push changes
5. Create a Pull Request

---

# 📄 License

This project is developed for educational purposes.

---

# 👩‍💻 Author

**Priyanka Dhawale**

GitHub: https://github.com/yourusername
LinkedIn: https://linkedin.com/in/yourprofile