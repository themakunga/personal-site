.PHONY: up down logs

COMPOSE := docker compose -f docker-compose.local.yml

up:
	$(COMPOSE) up --build -d
	$(MAKE) logs

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f
