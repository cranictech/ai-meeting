.PHONY: setup dev build test clean

setup:
	npm install
	docker-compose up -d
	@echo "Waiting for PostgreSQL..."
	@sleep 3
	@echo "Setup complete!"

dev:
	npm run dev

build:
	npm run build

test:
	npm run test

db-reset:
	docker-compose down -v
	docker-compose up -d
	@sleep 3
	docker exec -i $$(docker-compose ps -q postgres) psql -U postgres -d meeting_ai < packages/database/schema.sql

clean:
	rm -rf node_modules
	rm -rf apps/*/node_modules
	rm -rf packages/*/node_modules
	rm -rf apps/*/.next
	rm -rf apps/*/dist
	docker-compose down -v
