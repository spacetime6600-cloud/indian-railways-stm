PYTHON := python
VENV   := venv
PIP    := $(VENV)/bin/pip

# ── Setup ──────────────────────────────────────────────────────────────────
.PHONY: install
install:
	$(PYTHON) -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt

# ── Data generation ────────────────────────────────────────────────────────
.PHONY: data
data:
	$(PYTHON) -m src.data_generator

# ── Training (individual modules) ──────────────────────────────────────────
.PHONY: train-alert train-maintenance train-delay train-congestion train-all

train-alert:
	$(PYTHON) -m src.alert_prioritization.train

train-maintenance:
	$(PYTHON) -m src.predictive_maintenance.train

train-delay:
	$(PYTHON) -m src.delay_prediction.train

train-congestion:
	$(PYTHON) -m src.congestion_detection.train

train-all: train-alert train-maintenance train-delay train-congestion

# ── API server ─────────────────────────────────────────────────────────────
.PHONY: serve
serve:
	uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

# ── Tests ──────────────────────────────────────────────────────────────────
.PHONY: test test-unit test-property test-integration

test-unit:
	$(PYTHON) -m pytest tests/unit/ -v

test-property:
	$(PYTHON) -m pytest tests/property/ -v

test-integration:
	$(PYTHON) -m pytest tests/integration/ -v

test: test-unit test-property test-integration

# ── Demo curl ──────────────────────────────────────────────────────────────
.PHONY: demo
demo:
	@echo "--- Alert prediction ---"
	curl -s -X POST http://localhost:8000/predict-alert \
	  -H "Content-Type: application/json" \
	  -d '{"alert_type":"signal_failure","delay_impact":8.5,"safety_risk":0.9,"affected_trains":5,"route_busy":1,"peak_hour":1}' | python -m json.tool
	@echo "\n--- Maintenance prediction ---"
	curl -s -X POST http://localhost:8000/predict-maintenance \
	  -H "Content-Type: application/json" \
	  -d '{"temperature":95.0,"vibration":12.0,"usage_hours":30000,"last_service_days":180,"fault_history":5}' | python -m json.tool
	@echo "\n--- Delay prediction ---"
	curl -s -X POST http://localhost:8000/predict-delay \
	  -H "Content-Type: application/json" \
	  -d '{"distance":800,"weather":"storm","congestion_level":"High","previous_delay":25,"train_type":"passenger"}' | python -m json.tool
	@echo "\n--- Congestion prediction ---"
	curl -s -X POST http://localhost:8000/predict-congestion \
	  -H "Content-Type: application/json" \
	  -d '{"train_density":45,"station_load":4800,"time_of_day":"morning","route_type":"urban"}' | python -m json.tool
	@echo "\n--- Operational snapshot (demo) ---"
	curl -s -X POST "http://localhost:8000/demo/operational-snapshot?alert_type=signal_failure&delay_impact=8.5&safety_risk=0.9&affected_trains=5&route_busy=1&peak_hour=1&temperature=95&vibration=12&usage_hours=30000&last_service_days=180&fault_history=5&distance=800&weather=storm&congestion_level=High&previous_delay=25&train_type=passenger&train_density=45&station_load=4800&time_of_day=morning&route_type=urban" | python -m json.tool

# ── Health check ───────────────────────────────────────────────────────────
.PHONY: health
health:
	curl -s http://localhost:8000/health | python -m json.tool
	curl -s http://localhost:8000/ready  | python -m json.tool

# ── Clean ──────────────────────────────────────────────────────────────────
.PHONY: clean
clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete
	rm -rf .pytest_cache .hypothesis
