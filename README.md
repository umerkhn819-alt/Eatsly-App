 🍳 TasteAI: AI-Powered Culinary Companion

**TasteAI** is a production-oriented full-stack ecosystem featuring a cross-platform mobile app, a robust Node.js REST API, and a dedicated administrative dashboard. It leverages AI to provide personalized recipe recommendations and real-time culinary chat.

[![Expo](https://img.shields.io/badge/Mobile-Expo%20(React%20Native)-000020?logo=expo)](https://expo.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%2020+-339933?logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb)](https://www.mongodb.com/)
[![OpenAI](https://img.shields.io/badge/AI-Gemma%204%20/%20GPT--4o-412991?logo=openai)](https://openai.com/)

---

## 📱 Ecosystem Overview

The project is divided into three primary modules:

*   **`server/`**: Express.js API with JWT authentication, MongoDB integration, and AI service layers.
*   **`mobile/`**: Expo (SDK 54) TypeScript application featuring native stack navigation and secure storage.
*   **`admin/`**: React + Vite dashboard for user management and content moderation.

---
<img width="1920" height="1080" alt="1" src="https://github.com/user-attachments/assets/29af4e21-dfdb-4fa6-9d90-a88313cfd905" />


## ✨ Key Features

### 🤖 AI Intelligence
-   **Smart Recommendations**: Generates meal suggestions based on your personal recipe history and custom notes.
-   **Culinary Chat**: A multi-turn AI assistant to help with cooking techniques and ingredient substitutions.
-   **Model Flexibility**: Compatible with OpenAI (GPT-4o) or OpenRouter (Gemma 4).

### 🛠 Mobile Experience
-   **Full CRUD**: Create, edit, and manage recipes with structured ingredient lists and steps.
-   **Social Favorites**: Save recipes to your personal collection with automated cleanup on deletion.
-   **Native Performance**: Built with Expo for a smooth, high-performance UI on both iOS and Android.

### 🛡 Admin & Security
-   **Role-Based Access (RBAC)**: Secure separation between `user` and `admin` roles.
-   **Dashboard**: Real-time metrics for users, recipes, and community engagement.
-   **Secure Auth**: Industry-standard JWT implementation with `expo-secure-store`.

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd server
cp .env.example .env
# Configure your MONGODB_URI and JWT_SECRET in .env
npm install
npm run dev
```
*Tip: Use `npm run dev:memory` for a zero-config ephemeral database.*

### 2. Mobile App
```bash
cd mobile
cp .env.example .env
# Set EXPO_PUBLIC_API_URL to your server IP
npm install
npx expo start
```

### 3. Admin Dashboard
```bash
cd admin
npm install
npm run dev
```

---

## 🏗 Technical Architecture

### API Design
| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | User onboarding |
| `GET` | `/recipes` | Paginated recipe feed with filters |
| `POST` | `/ai/chat` | AI-assisted cooking support |
| `GET` | `/admin/overview` | Admin-only system metrics |

### Environment Configuration
The system is highly configurable via `.env` files across all three modules. Key variables include:
-   `BASE_URL`: Spoonacular food api
-   `ADMIN_BOOTSTRAP`: Automatically creates a superuser on first boot.
-   `CORS_ORIGINS`: Controlled access for the Web and Admin clients.

---

## 🛠 Tech Stack

-   **Frontend**: React Native (Expo), React (Vite), TypeScript.
-   **Backend**: Node.js, Express.js.
-   **Database**: MongoDB (Mongoose ODM).
-   **AI**: Spoonacular Food Api.
-   **Auth**: JSON Web Tokens (JWT), Bcrypt.

---

## 📝 Roadmap & Phases
1.  **Phase 1-2**: Foundation, MongoDB, and JWT Auth.
2.  **Phase 3-5**: Mobile Shell and Recipe/Favorite Logic.
3.  **Phase 6-7**: AI Integration (Recommendations & Chat).
4.  **Phase 8-9**: Admin Infrastructure and React Dashboard.

---
*Created with ❤️ for the future of home cooking.*
