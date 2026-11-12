.PHONY: help up detach deploy prod prod-down pull volumes down logs audio audio-force audio-test

# Host port for the local proxy (default 8081); override with: make up PROXY_PORT=<port>
export PROXY_PORT ?= 8081

COMPOSE := docker compose -f docker-compose.local.yml
PROD_COMPOSE := docker compose -p personal-site-prod -f docker-compose.yml
export SITE_IMAGE_TAG ?= sha-$(shell git rev-parse HEAD)
export PODMAN_COMPOSE_WARNING_LOGS := false

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*## "; printf "\nUsage:\n  make <target>\n\nTargets:\n"} /^[a-zA-Z_-]+:.*## / {printf "  %-14s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up: detach ## Build and start the local stack, then follow logs
	$(MAKE) logs

detach: volumes ## Build and start the local stack without following logs
	$(COMPOSE) up --build -d
	@echo "Site: http://localhost:$(PROXY_PORT)"

deploy: ## Pull site + content, then publish using prebuilt images
	git pull --ff-only
	git -C ../personal-content pull --ff-only
	$(MAKE) prod SITE_IMAGE_TAG=sha-$$(git rev-parse HEAD)

prod: pull ## Generate audio and pages, publish, then start production without builds
	$(PROD_COMPOSE) run --rm --no-deps tts --once
	$(PROD_COMPOSE) run --rm --no-deps renderer
	$(PROD_COMPOSE) up -d --no-build --pull never web api cloudflared

pull: volumes ## Download missing production/tool images for this site revision
	$(PROD_COMPOSE) pull --policy missing web api renderer tts cloudflared

volumes: ## Ensure shared caches exist without changing existing volumes
	@docker volume inspect personal-site_web_image_cache >/dev/null 2>&1 || docker volume create personal-site_web_image_cache >/dev/null
	@docker volume inspect personal-site_tts_audio_cache >/dev/null 2>&1 || docker volume create personal-site_tts_audio_cache >/dev/null
	@docker volume inspect personal-site_tts_voice_models >/dev/null 2>&1 || docker volume create personal-site_tts_voice_models >/dev/null

prod-down: ## Stop production
	$(PROD_COMPOSE) down

down: ## Stop the local stack
	$(COMPOSE) down

logs: ## Follow local stack logs
	$(COMPOSE) logs -f

audio: volumes ## Generate audio for changed articles
	$(PROD_COMPOSE) pull --policy missing tts
	$(PROD_COMPOSE) run --rm --no-deps tts --once

audio-force: volumes ## Regenerate audio for every enabled article
	$(PROD_COMPOSE) pull --policy missing tts
	$(PROD_COMPOSE) run --rm --no-deps tts --force

audio-test: volumes ## Run audio generator and delivery tests in Docker
	$(COMPOSE) build tts
	$(COMPOSE) run --rm --entrypoint python3 tts -m unittest scripts/test_generate_audio.py scripts/test_check_article_audio.py
