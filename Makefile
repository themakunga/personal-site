.PHONY: help up detach down logs audio audio-force audio-test

# Host port for the local proxy (default 8081); override with: make up PROXY_PORT=<port>
export PROXY_PORT ?= 8081

COMPOSE := docker compose -f docker-compose.local.yml

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*## "; printf "\nUsage:\n  make <target>\n\nTargets:\n"} /^[a-zA-Z_-]+:.*## / {printf "  %-14s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up: detach ## Build and start the local stack, then follow logs
	$(MAKE) logs

detach: ## Build and start the local stack without following logs
	$(COMPOSE) up --build -d
	@echo "Site: http://localhost:$(PROXY_PORT)"

down: ## Stop the local stack
	$(COMPOSE) down

logs: ## Follow local stack logs
	$(COMPOSE) logs -f

audio: ## Generate audio for changed articles
	$(COMPOSE) build tts
	$(COMPOSE) run --rm tts --once

audio-force: ## Regenerate audio for every enabled article
	$(COMPOSE) build tts
	$(COMPOSE) run --rm tts --force

audio-test: ## Run audio generator tests in Docker
	$(COMPOSE) build tts
	$(COMPOSE) run --rm --entrypoint python3 tts -m unittest scripts/test_generate_audio.py
