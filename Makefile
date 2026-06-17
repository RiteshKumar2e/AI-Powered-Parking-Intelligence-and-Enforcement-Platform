.PHONY: help install dev-backend dev-frontend seed docker-up docker-down clean

help:
	@echo "ParkIQ - Smart Parking Intelligence Platform"
	@echo ""
	@echo "Commands:"
	@echo "  make install       Install all dependencies"
	@echo "  make seed          Seed the database with demo data"
	@echo "  make dev-backend   Start backend dev server"
	@echo "  make dev-frontend  Start frontend dev server"
	@echo "  make docker-up     Start with Docker Compose"
	@echo "  make docker-down   Stop Docker containers"
	@echo "  make clean         Remove generated files"

install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

seed:
	cd backend && python -m app.scripts.seed

dev-backend:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd frontend && npm run dev

dev:
	@echo "Start backend: make dev-backend"
	@echo "Start frontend: make dev-frontend"

docker-up:
	docker-compose up --build -d
	@echo "Backend: http://localhost:8000/api/docs"
	@echo "Frontend: http://localhost:3000"

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

clean:
	rm -f backend/parking_enforcement.db
	rm -rf backend/storage
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
