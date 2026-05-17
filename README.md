# RetailFlow — Retail Management System

A full-stack retail management web application built with **Node.js + Express + MongoDB** (backend) and **React + Vite** (frontend).

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB running locally 

### 1. Start MongoDB
```bash
# Windows (if installed as a service)
net start MongoDB
```

### 2. Start the Backend
```bash
cd backend
npm install        # first time only
npm run dev       
```

### 3. Start the Frontend
```bash
cd frontend
npm install        # first time only
npm run dev        
```


## 📁 Project Structure

```
Shop_management/
├── backend/
│   ├── config/          # MongoDB connection
│   ├── controllers/     # Business logic (auth, products, orders, sales, employees)
│   ├── middleware/       # JWT auth, global error handler
│   ├── models/          # Mongoose schemas (User, Product, Order, Sale, Employee, Attendance)
│   ├── routes/          # REST API routes (versioned /api/v1/)
│   ├── utils/           # ErrorResponse class
│   └── server.js        # Express app entry point
│
└── frontend/
    └── src/
        ├── api/         # Axios instance with JWT interceptor
        ├── components/  # Sidebar, Layout
        ├── context/     # AuthContext (login/register/logout)
        └── pages/       # Dashboard, Inventory, Orders, Finance, Employees
```

---

## 🔌 API Endpoints (v1)

| Resource     | Base Path              |
|-------------|------------------------|
| Auth        | `/api/v1/auth`         |
| Products    | `/api/v1/products`     |
| Orders      | `/api/v1/orders`       |
| Sales       | `/api/v1/sales`        |
| Employees   | `/api/v1/employees`    |
| Health      | `/api/v1/health`       |

All protected routes require: `Authorization: Bearer <token>`

---

## ✅ Features

- 🔐 **Auth** — Owner signup/login with JWT
- 📦 **Inventory** — Product management with real-time stock status (Sufficient / Short Stock / Out of Stock)
- 🛒 **Orders** — Create orders with automatic stock deduction (atomic MongoDB transaction)
- 💰 **Finance** — Daily & monthly sales analytics with bar charts
- 👥 **Employees** — Staff directory + daily attendance tracker
- 📊 **Dashboard** — Revenue/profit area chart, low-stock alerts, recent orders

---
