# RetailFlow — Unified Shop Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-Latest-blue.svg)](https://react.dev/)
[![Flutter](https://img.shields.io/badge/Flutter-Latest-blue.svg)](https://flutter.dev/)

RetailFlow is a **full-stack, cross-platform shop management system** that digitizes retail operations by replacing manual ledgers with a unified, intelligent dashboard. Built with **Node.js + Express + MongoDB** (backend), **React + Vite** (web frontend), and **Flutter** (mobile), it empowers shop owners to manage inventory, orders, finances, and employees—all from one seamless platform.

---

## 🎯 Key Features

### 📊 Dashboard
- Real-time revenue & profit visualization with area charts
- Low-stock alerts for quick action
- Recent orders overview
- KPI metrics at a glance

### 📦 Inventory Management
- Product catalog with SKU tracking
- Real-time stock status (Sufficient / Short Stock / Out of Stock)
- Low-stock threshold alerts
- Stock history and movement tracking

### 🛒 Order Processing
- Intuitive order creation interface
- Automatic inventory deduction with atomic transactions
- Order status tracking
- Order history and analytics

### 💰 Financial Analytics
- Daily sales tracking
- Monthly profit reports
- Revenue trends with visual charts
- Financial insights & reporting

### 👥 Employee Management
- Staff directory and profiles
- Daily attendance tracking
- Employee performance insights
- Shift management

### 🔐 Authentication & Security
- JWT-based authentication
- Secure owner signup/login
- Role-based access control
- Password hashing with bcrypt

---

## 🏗️ Architecture & Tech Stack

### Backend
- **Runtime**: Node.js v18+
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcrypt password hashing
- **API**: RESTful API (versioned /api/v1/)

### Web Frontend
- **Framework**: React 18+
- **Build Tool**: Vite (lightning-fast bundling)
- **HTTP Client**: Axios with JWT interceptors
- **State Management**: React Context API
- **Styling**: CSS

### Mobile App
- **Framework**: Flutter
- **Platforms**: iOS & Android
- **Navigation**: Flutter Navigator
- **State Management**: Provider/BLoC pattern

---

## 📁 Project Structure

```
RetailFlow/
├── backend/
│   ├── config/              # Database & environment configuration
│   ├── controllers/         # Business logic layer
│   │   ├── auth.js         # Authentication logic
│   │   ├── products.js     # Inventory operations
│   │   ├── orders.js       # Order processing
│   │   ├── sales.js        # Financial analytics
│   │   └── employees.js    # Staff management
│   ├── middleware/          # Custom middleware
│   │   ├── auth.js         # JWT verification
│   │   └── errorHandler.js # Global error handling
│   ├── models/              # Mongoose schemas
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Order.js
│   │   ├── Sale.js
│   │   ├── Employee.js
│   │   └── Attendance.js
│   ├── routes/              # API route definitions
│   │   ├── auth.js
│   │   ├── products.js
│   │   ├── orders.js
│   │   ├── sales.js
│   │   └── employees.js
│   ├── utils/               # Helper utilities
│   │   └── ErrorResponse.js
│   ├── server.js            # Express app entry point
│   └── .env.example         # Environment variables template
│
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios instance & API calls
│   │   ├── components/      # Reusable React components
│   │   │   ├── Sidebar.jsx
│   │   │   └── Layout.jsx
│   │   ├── context/         # React Context providers
│   │   │   └── AuthContext.jsx
│   │   ├── pages/           # Page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Inventory.jsx
│   │   │   ├── Orders.jsx
│   │   │   ├── Finance.jsx
│   │   │   └── Employees.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
│
└── flutter_app/             # Mobile app
    ├── lib/
    │   ├── screens/         # App screens
    │   ├── services/        # API communication
    │   └── main.dart
    └── pubspec.yaml
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18 or higher
- **MongoDB** (running locally or on MongoDB Atlas)
- **Flutter** SDK (for mobile development)
- **npm** or **yarn** package manager

### 1️⃣ Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file from template
cp .env.example .env

# Update .env with your MongoDB connection string and other config
# Example:
# MONGODB_URI=mongodb://localhost:27017/retailflow
# JWT_SECRET=your-secret-key
# PORT=5000

# Start the development server
npm run dev
```

Backend runs at: `http://localhost:5000`

### 2️⃣ Frontend (Web) Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Update .env with backend API URL
# Example:
# VITE_API_URL=http://localhost:5000

# Start the development server
npm run dev
```

Frontend runs at: `http://localhost:5173`

### 3️⃣ Mobile App Setup (Optional)

```bash
# Navigate to flutter app directory
cd flutter_app

# Get dependencies
flutter pub get

# Run on connected device or emulator
flutter run
```

---

## 📡 API Endpoints (v1)

| Resource   | Base Path               | Methods              |
|-----------|------------------------|----------------------|
| Auth      | `/api/v1/auth`          | POST (signup, login) |
| Products  | `/api/v1/products`      | GET, POST, PUT, DELETE |
| Orders    | `/api/v1/orders`        | GET, POST, PUT, DELETE |
| Sales     | `/api/v1/sales`         | GET (analytics)     |
| Employees | `/api/v1/employees`     | GET, POST, PUT, DELETE |
| Attendance| `/api/v1/attendance`    | GET, POST           |
| Health    | `/api/v1/health`        | GET (status check)  |

**Authentication**: All protected routes require `Authorization: Bearer <JWT_TOKEN>` header.

### Example Request

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@shop.com","password":"password123"}'
```

---

## 🔧 Environment Variables

### Backend (.env)
```
MONGODB_URI=mongodb://localhost:27017/retailflow
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000
```

---

## 📦 Dependencies Summary

**Backend**:
- Express.js (server framework)
- MongoDB & Mongoose (database & ODM)
- bcryptjs (password hashing)
- jsonwebtoken (JWT authentication)
- cors (cross-origin requests)
- dotenv (environment variables)

**Frontend**:
- React 18+ (UI framework)
- Vite (build tool)
- Axios (HTTP client)
- React Router (navigation)
- Chart.js or Recharts (data visualization)

**Mobile**:
- Flutter SDK
- Dart language
- http (API calls)

---

## 🔄 Development Workflow

1. **Create a feature branch**: `git checkout -b feature/your-feature`
2. **Make changes** in backend, frontend, or both
3. **Test locally** (use Postman for API testing, browser dev tools for frontend)
4. **Commit changes**: `git commit -m "feat: add your feature"`
5. **Push and create a PR**: `git push origin feature/your-feature`

---

## 🧪 Testing (Optional)

### Manual Testing
- Use **Postman** or **Thunder Client** to test API endpoints
- Use **React DevTools** for frontend debugging
- Use **MongoDB Compass** for database inspection

### Automated Testing (To be implemented)
```bash
# Backend tests
npm test --prefix backend

# Frontend tests
npm test --prefix frontend
```

---

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod` (macOS/Linux) or `net start MongoDB` (Windows)
- Check connection string in `.env`
- Verify MongoDB is accessible on the correct port (default: 27017)

### CORS Errors
- Ensure `CORS_ORIGIN` in backend `.env` matches your frontend URL
- Check that frontend `.env` has correct `VITE_API_URL`

### Port Already in Use
```bash
# Kill process using port 5000 (macOS/Linux)
lsof -ti:5000 | xargs kill -9

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

---

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Flutter Documentation](https://flutter.dev/docs)
- [Vite Documentation](https://vitejs.dev/)

---

## 📝 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please follow the development workflow and ensure your code is well-tested before submitting a pull request.

---

## 📧 Support

For issues, questions, or feature requests, please open a [GitHub Issue](https://github.com/NamanKhanduja/RetailFlow/issues).

---

**Built with ❤️ by [Naman Khanduja](https://github.com/NamanKhanduja)**
