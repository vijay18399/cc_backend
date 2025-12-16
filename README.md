# College Connect Backend

The backend service for the College Connect platform, providing a robust API for both web and mobile clients. Built with Node.js and Express, it manages authentication, data persistence, and AI-driven features.

## 🚀 Key Features

*   **Authentication & Security**:
    *   JWT-based secure authentication.
    *   Role-Based Access Control (RBAC) handling Students, Alumni, Faculty, Admins, and Super Admins.
*   **AI-Powered Search (RAG)**:
    *   Integrates **Google Gemini** for semantic search capabilities.
    *   Allows natural language queries to find users based on skills, roles, and more.
*   **Data Management**:
    *   **Sequelize ORM** for efficient database interactions (defaulting to SQLite for dev).
    *   Automated seeding scripts for companies, skills, and dummy data.
*   **Core Modules**:
    *   **User Management**: Profiles, resumes (PDF parsing), and portfolio tracking.
    *   **Feed System**: Posts, likes, and social interactions.
    *   **Support System**: Ticketing system for user inquiries and help.
    *   **Admin/Super Admin**: Dedicated routes for system-wide management and analytics data.

## 🛠️ Tech Stack

*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **Database**: SQLite (Development) / Sequelize ORM
*   **AI Integration**: @google/genai (Gemini)
*   **Utilities**: PDF Parse, Multer (File Upload), Swagger UI (Docs).

## ⚡ How to Run

1.  **Navigate to the backend directory**:
    ```bash
    cd backend
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    *   Ensure you have a `.env` file configured with necessary keys (DB path, JWT Secret, Gemini API Key).

4.  **Start the Server**:
    *   **Development** (with hot-reload):
        ```bash
        npm run dev
        ```
    *   **Production**:
        ```bash
        npm start
        ```

5.  **API Documentation**:
    *   Once running, visit `/api-docs` (if Swagger is enabled) or check `src/routes` for endpoint details.
