# InterviewForge AI

InterviewForge AI is a resume analysis and personalized mock-interview platform with a Spring Boot backend and React/Vite frontend.

## Repository layout

```text
interviewforge-ai/
├── interviewforge-frontend/
├── interviewforge-backend/
├── .gitignore
└── README.md
```

## Backend

Requirements: Java 21 and PostgreSQL with the required PGVector extension.

Configure the required environment variables before starting the application:

- `DATABASE_URL` - PostgreSQL JDBC URL
- `DATABASE_USERNAME` - database user
- `DATABASE_PASSWORD` - database password
- `JWT_SECRET` - random signing secret of at least 32 characters
- `GOOGLE_GENAI_API_KEY` - Google GenAI key when Gemini is enabled
- `GROQ_API_KEY` - optional Groq key
- `OPENROUTER_API_KEY` - optional OpenRouter key
- `CORS_ALLOWED_ORIGINS` - comma-separated allowed frontend origins

Use [application.example.properties](./interviewforge-backend/src/main/resources/application.example.properties) as a safe configuration reference. Never commit the local `application.properties` file or credentials.

From `interviewforge-backend/`:

```powershell
.\mvnw.cmd test
.\mvnw.cmd package
.\mvnw.cmd spring-boot:run
```

The backend test profile uses an isolated in-memory H2 database and does not require local PostgreSQL or external AI credentials.

## Frontend

Requirements: Node.js and npm.

From `interviewforge-frontend/`:

```powershell
npm install
npm run dev
npm run build
npm run lint
npm audit
```

Set `VITE_API_BASE_URL` in a local `.env` file when the backend is not running at `http://localhost:8080`. Use [.env.example](./interviewforge-frontend/.env.example) as the template. Vite variables are public and must not contain private credentials.

## Production notes

The backend requires PostgreSQL/PGVector and configured AI-provider credentials. Redis or other external services should be configured through deployment environment variables when enabled by the application. Use a managed secret store in deployed environments, rotate any previously exposed credentials, and do not commit generated build output or local configuration.
