"""
MT5 -> Scanner bridge.

Fetches recent OHLCV candles for each configured pair/timeframe from a
running MetaTrader 5 terminal and pushes them to the backend's
/api/scanner/ingest endpoint. Intended to run on the same Windows machine
as your Aethelgard MT5 bridge — this can literally run alongside it.

Setup:
    pip install MetaTrader5 requests python-dotenv

Run once manually to confirm it works, then schedule it (Windows Task
Scheduler, or a simple `while True` + sleep loop run via NSSM/pm2-windows,
same pattern as your other always-on scripts).
"""

import os
import time
from datetime import datetime, timezone

import MetaTrader5 as mt5
import requests
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8787")
SCANNER_INGEST_KEY = os.getenv("SCANNER_INGEST_KEY")

if not SCANNER_INGEST_KEY:
    raise SystemExit("SCANNER_INGEST_KEY is not set. Add it to your .env file.")

# Map our timeframe labels to MT5 constants
TIMEFRAME_MAP = {
    "D1": mt5.TIMEFRAME_D1,
    "H4": mt5.TIMEFRAME_H4,
    "H1": mt5.TIMEFRAME_H1,
    "M15": mt5.TIMEFRAME_M15,
    "M5": mt5.TIMEFRAME_M5,
}

# Edit this to match the pairs/timeframes configured in Settings -> Scanner
PAIRS = ["XAUUSD", "EURUSD", "GBPUSD", "US30", "NAS100"]
TIMEFRAMES = ["D1", "H4", "M15"]
CANDLES_PER_PUSH = 150
POLL_SECONDS = 60 * 5  # push every 5 minutes; the backend scans every 15


def candles_to_payload(rates):
    return [
        {
            "time": datetime.fromtimestamp(int(r["time"]), tz=timezone.utc).isoformat(),
            "open": float(r["open"]),
            "high": float(r["high"]),
            "low": float(r["low"]),
            "close": float(r["close"]),
            "volume": float(r["tick_volume"]),
        }
        for r in rates
    ]


def push_candles(pair, timeframe, candles):
    resp = requests.post(
        f"{BACKEND_URL}/api/scanner/ingest",
        json={"pair": pair, "timeframe": timeframe, "candles": candles},
        headers={"X-Scanner-Key": SCANNER_INGEST_KEY},
        timeout=20,
    )
    resp.raise_for_status()
    return resp.json()


def run_once():
    if not mt5.initialize():
        print("MT5 initialize() failed:", mt5.last_error())
        return

    try:
        for pair in PAIRS:
            for tf_label in TIMEFRAMES:
                tf = TIMEFRAME_MAP[tf_label]
                rates = mt5.copy_rates_from_pos(pair, tf, 0, CANDLES_PER_PUSH)
                if rates is None or len(rates) == 0:
                    print(f"No data for {pair} {tf_label}: {mt5.last_error()}")
                    continue

                payload = candles_to_payload(rates)
                try:
                    result = push_candles(pair, tf_label, payload)
                    print(f"{pair} {tf_label}: ingested {result.get('ingested')} candles")
                except requests.RequestException as e:
                    print(f"Push failed for {pair} {tf_label}: {e}")
    finally:
        mt5.shutdown()


if __name__ == "__main__":
    print(f"Starting MT5 -> scanner bridge. Pushing to {BACKEND_URL} every {POLL_SECONDS}s.")
    while True:
        run_once()
        time.sleep(POLL_SECONDS)
