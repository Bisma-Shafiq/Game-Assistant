# Terminal 1 — Backend
cd backend
pip install -r ../requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install && npm run dev