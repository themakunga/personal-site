.PHONY: help up down logs audio audio-force audio-test

COMPOSE := docker compose -f docker-compose.local.yml

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*## "; printf "\nUsage:\n  make <target>\n\nTargets:\n"} /^[a-zA-Z_-]+:.*## / {printf "  %-14s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up: ## Build and start the local stack
	$(COMPOSE) up --build -d
	$(MAKE) logs

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
