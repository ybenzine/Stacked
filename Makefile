# Stacked -- common development tasks.
#
# Backend: FastAPI app in app/, run with uv.
# Frontend: React + Vite in frontend/, run with npm.

FRONTEND := frontend
UVICORN_HOST ?= 127.0.0.1
UVICORN_PORT ?= 8000

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# --- setup -------------------------------------------------------------------

.PHONY: install
install: .env ## Install backend and frontend dependencies
	uv sync
	cd $(FRONTEND) && npm install

.env: ## Create .env from .env.example if missing
	@test -f .env || (cp .env.example .env && echo "Created .env from .env.example")

# --- run -------------------------------------------------------------------

.PHONY: backend
backend: .env ## Run the FastAPI backend with autoreload (http://127.0.0.1:8000)
	uv run uvicorn app.main:app --reload --host $(UVICORN_HOST) --port $(UVICORN_PORT)

.PHONY: frontend
frontend: ## Run the Vite dev server (http://localhost:5173)
	cd $(FRONTEND) && npm run dev

.PHONY: dev
dev: .env ## Run backend and frontend together
	@$(MAKE) -j2 backend frontend

# --- build / test ----------------------------------------------------------

.PHONY: build
build: ## Type-check and build the frontend for production
	cd $(FRONTEND) && npm run build

.PHONY: test
test: ## Run the backend test suite
	uv run pytest

# --- housekeeping --------------------------------------------------------------

.PHONY: clean
clean: ## Remove build artifacts and caches
	rm -rf $(FRONTEND)/dist $(FRONTEND)/tsconfig.tsbuildinfo
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
	rm -rf .pytest_cache
