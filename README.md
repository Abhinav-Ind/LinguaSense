# LinguaSense — Speak, Summarize, and Simplify with AI

A runnable full-stack starter implementation based on the provided project specification:
- Flask REST API + SQLite database
- Groq API with a configurable model (the example defaults to `openai/gpt-oss-120b`)
- User registration/login using hashed passwords and JWT
- Persona selection saved per user
- Writing refinement, paraphrasing, tone and clarity improvements
- General, bullet-point, and key-sentence summaries, including `.txt`, text-based `.pdf`, and `.docx` document upload
- Context-aware translation for Indian and selected global languages
- Browser speech-to-text, followed by AI refinement or translation
- Per-user history, item deletion, and clear-history action
- Responsive HTML/CSS/JavaScript dashboard

## Project structure

```text
LinguaSense/
├── backend/
│   ├── .venv/
│   ├── .env
│   └── app.py
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── run.bat
└── README.md
```

## Requirements

- Python 3.10+
- A Groq API key
- A modern browser. Chrome is recommended for browser speech recognition.

## 1. Configure the backend

Open a terminal in the `backend` folder:

```bash
python -m venv .venv
```

Windows PowerShell:
```powershell
.venv\Scripts\Activate.ps1
```

macOS/Linux:
```bash
source .venv/bin/activate
```

Install packages:
```bash
pip install -r requirements.txt
```

Edit `.env` and set your Groq key and unique secret values:

```env
GROQ_API_KEY=your_real_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
FLASK_SECRET_KEY=replace_with_a_long_random_secret
JWT_SECRET_KEY=replace_with_a_different_long_random_secret
DATABASE_URL=sqlite:///linguasense.db
FRONTEND_ORIGIN=http://127.0.0.1:5500
FLASK_DEBUG=0
PORT=5000
```

Start Flask:
```bash
python app.py
```

Health check: `http://127.0.0.1:5000/api/health`

The SQLite database is created automatically when the backend starts.

## 2. Run the frontend

Keep the backend terminal running. Open a second terminal in `frontend` and run:

```bash
python -m http.server 5500
```

Open `http://127.0.0.1:5500`.

Create an account from the dashboard. Once logged in, select a persona and try the writing assistant, summarization, translation, voice studio, and history pages.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API and Groq configuration status |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| GET | `/api/personas` | Available personas |
| PUT | `/api/persona` | Save selected persona |
| POST | `/api/refine` | Refine writing |
| POST | `/api/summarize` | Summarize pasted source text |
| POST | `/api/summarize-file` | Extract and summarize a `.txt`, text-based `.pdf`, or `.docx` upload (multipart form; authenticated; 5 MB maximum) |
| POST | `/api/translate` | Translate text |
| POST | `/api/voice/process` | Process recognized speech |
| GET | `/api/history` | List current user's history |
| DELETE | `/api/history/<id>` | Delete one history item |
| DELETE | `/api/history` | Clear history |

Authenticated endpoints require `Authorization: Bearer <token>`.

## Important implementation notes

- **Voice input:** The browser's Web Speech API performs speech recognition. Browser and language support varies; this starter uses English (India) recognition by default. It does not upload raw audio or provide server-side speech recognition.
- **Model availability:** The configured model name follows the requested project brief. If Groq changes model availability or your account cannot access it, set `GROQ_MODEL` to a currently available compatible model in `.env`.
- **Deployment:** This is a local development starter, not a production-hardened service. Before public deployment, add rate limiting, HTTPS, stronger secret management, CSRF/security headers as appropriate, database migrations, logging/monitoring, backups, and a production WSGI server. Restrict CORS to the real frontend origin. Never run Flask debug mode publicly.
- **Privacy:** History contains the text and AI output you submit. Use the history controls to delete records. Review your institution's privacy requirements before storing sensitive content.
- **AI quality:** Translation and generated text can contain errors. Review critical, legal, medical, academic, and professional content before use.
- **Document upload:** Text files, text-based PDFs, and DOCX documents are supported up to 5 MB. Scanned/image-only PDFs are not OCR-processed. Password-protected PDFs are not supported. Extracted content is truncated at 50,000 characters before summarization.
- **Google Gen AI / Computer Vision:** They appear in the skills list but are not required by the architecture shown; this implementation uses Groq + Llama for language tasks and does not implement computer vision.

## Troubleshooting

- **API offline:** Start `python app.py` in `backend`.
- **Add Groq key:** Ensure `.env` exists in `backend`, contains a valid key, and restart Flask.
- **CORS error:** Confirm the frontend is served at `http://127.0.0.1:5500` and `FRONTEND_ORIGIN` matches it.
- **Speech not working:** Use a supported browser, allow microphone permission, and use localhost/HTTPS.
- **Model/API error:** Read the backend terminal log and check the model setting and Groq account access.
