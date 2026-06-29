import os
import sqlite3
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

load_dotenv()

BASE_DIR = Path(os.getenv("GARMIN_DB_DIR", "~/HealthData/DBs")).expanduser()
ACTIVITIES_DB = BASE_DIR / "garmin_activities.db"
MONITORING_DB = BASE_DIR / "garmin_monitoring.db"
SUMMARY_DB = BASE_DIR / "garmin_summary.db"
GARMIN_DB = BASE_DIR / "garmin.db"
SUMMARY2_DB = BASE_DIR / "summary.db"


app = FastAPI(title="Running Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


def get_db(path: Path):
    uri = f"file:{path}?mode=ro"
    conn = sqlite3.connect(uri, uri=True, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn
    
    


def meters_to_miles(m) -> Optional[float]:
    # Distance is already stored in miles in running_activities_view
    if m is None:
        return None
    return round(m, 2)


def pace_from_mps(speed_mph) -> Optional[str]:
    # avg_speed in running_activities_view is in mph, not m/s
    if not speed_mph:
        return None
    pace_sec = (60 / speed_mph) * 60  # seconds per mile
    mins = int(pace_sec // 60)
    secs = int(pace_sec % 60)
    return f"{mins}:{secs:02d}"


def pace_seconds_from_mps(speed_mph) -> Optional[int]:
    # avg_speed in running_activities_view is in mph
    if not speed_mph:
        return None
    return int((60 / speed_mph) * 60)


def time_str_to_seconds(t) -> int:
    """Parse HH:MM:SS or MM:SS string to total seconds."""
    if not t:
        return 0
    parts = str(t).split(":")
    parts = [int(float(p)) for p in parts]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    return int(parts[0])


def seconds_to_hms(total: int) -> str:
    h = total // 3600
    m = (total % 3600) // 60
    s = total % 60
    return f"{h}:{m:02d}:{s:02d}"


def seconds_to_pace(total: int) -> str:
    m = total // 60
    s = total % 60
    return f"{m}:{s:02d}"


def seconds_to_hours_min(seconds):
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    return f"{hours}h {minutes}m"


SUBTYPE_MAP = {
    "outdoor": "generic",
    "track": "track",
    "treadmill": "treadmill",
}


@app.get("/api/runs")
def list_runs(type: Optional[str] = None):
    conn = get_db(path=ACTIVITIES_DB)
    try:
        query = """
            SELECT activity_id, name, sub_sport, start_time, distance,
                   elapsed_time, avg_speed, avg_hr, max_hr, calories,
                   vo2_max, training_effect
            FROM running_activities_view
        """
        params = []
        if type and type in SUBTYPE_MAP:
            query += " WHERE sub_sport = ?"
            params.append(SUBTYPE_MAP[type])
        query += " ORDER BY start_time DESC"

        rows = conn.execute(query, params).fetchall()
        result = []
        for r in rows:
            result.append({
                "activity_id": r["activity_id"],
                "name": r["name"],
                "sub_sport": r["sub_sport"],
                "start_time": r["start_time"],
                "distance_miles": meters_to_miles(r["distance"]),
                "elapsed_time": r["elapsed_time"],
                "avg_pace": pace_from_mps(r["avg_speed"]),
                "avg_hr": r["avg_hr"],
                "max_hr": r["max_hr"],
                "calories": r["calories"],
                "vo2_max": r["vo2_max"],
                "training_effect": r["training_effect"],
            })
        return result
    finally:
        conn.close()


@app.get("/api/runs/{activity_id}")
def get_run(activity_id: str):
    conn = get_db(path=ACTIVITIES_DB)
    try:
        row = conn.execute(
            """
            SELECT activity_id, name, sub_sport, start_time, stop_time,
                   elapsed_time, distance, avg_speed, avg_hr, max_hr,
                   calories, avg_steps_per_min, vo2_max,
                   training_effect, anaerobic_training_effect,
                   heart_rate_zone_one_time, heart_rate_zone_two_time,
                   heart_rate_zone_three_time, heart_rate_zone_four_time,
                   heart_rate_zone_five_time, avg_vertical_oscillation,
                   avg_ground_contact_time, avg_vertical_ratio,
                   avg_step_length
            FROM running_activities_view
            WHERE activity_id = ?
            """,
            (activity_id,),
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Run not found")

        laps = conn.execute(
            """
            SELECT lap, elapsed_time, distance, avg_speed, avg_hr, max_hr,
                   avg_cadence, hrz_1_time, hrz_2_time, hrz_3_time,
                   hrz_4_time, hrz_5_time
            FROM activity_laps
            WHERE activity_id = ?
            ORDER BY lap
            """,
            (activity_id,),
        ).fetchall()

        lap_list = []
        for lap in laps:
            lap_list.append({
                "lap": lap["lap"],
                "elapsed_time": lap["elapsed_time"],
                "distance_miles": meters_to_miles(lap["distance"]),
                "pace": pace_from_mps(lap["avg_speed"]),
                "pace_seconds": pace_seconds_from_mps(lap["avg_speed"]),
                "avg_hr": lap["avg_hr"],
                "max_hr": lap["max_hr"],
                "avg_cadence": lap["avg_cadence"],
                "hrz_1_time": lap["hrz_1_time"],
                "hrz_2_time": lap["hrz_2_time"],
                "hrz_3_time": lap["hrz_3_time"],
                "hrz_4_time": lap["hrz_4_time"],
                "hrz_5_time": lap["hrz_5_time"],
            })

        return {
            "activity_id": row["activity_id"],
            "name": row["name"],
            "sub_sport": row["sub_sport"],
            "start_time": row["start_time"],
            "stop_time": row["stop_time"],
            "elapsed_time": row["elapsed_time"],
            "distance_miles": meters_to_miles(row["distance"]),
            "avg_pace": pace_from_mps(row["avg_speed"]),
            "avg_hr": row["avg_hr"],
            "max_hr": row["max_hr"],
            "calories": row["calories"],
            "avg_steps_per_min": row["avg_steps_per_min"],
            "vo2_max": row["vo2_max"],
            "training_effect": row["training_effect"],
            "anaerobic_training_effect": row["anaerobic_training_effect"],
            "hrz_1_time": row["heart_rate_zone_one_time"],
            "hrz_2_time": row["heart_rate_zone_two_time"],
            "hrz_3_time": row["heart_rate_zone_three_time"],
            "hrz_4_time": row["heart_rate_zone_four_time"],
            "hrz_5_time": row["heart_rate_zone_five_time"],
            "avg_vertical_oscillation": row["avg_vertical_oscillation"],
            "avg_ground_contact_time": row["avg_ground_contact_time"],
            "avg_vertical_ratio": row["avg_vertical_ratio"],
            "avg_step_length": row["avg_step_length"],
            "laps": lap_list,
        }
    finally:
        conn.close()


@app.get("/api/stats/summary")
def stats_summary():
    conn = get_db(path=ACTIVITIES_DB)
    conn_summary = get_db(path=SUMMARY_DB)
    try:
        agg = conn.execute(
            """
            SELECT COUNT(*) as total_runs,
                   SUM(distance) as total_distance,
                   AVG(avg_speed) as mean_speed,
                   MAX(avg_speed) as best_speed
            FROM running_activities_view
            WHERE avg_speed IS NOT NULL AND avg_speed > 0
            """
        ).fetchone()

        total_elapsed_row = conn.execute(
            "SELECT elapsed_time FROM running_activities_view WHERE elapsed_time IS NOT NULL"
        ).fetchall()
        total_seconds = sum(time_str_to_seconds(r["elapsed_time"]) for r in total_elapsed_row)

        vo2_row = conn.execute(
            """
            SELECT vo2_max FROM running_activities_view
            WHERE vo2_max IS NOT NULL
            ORDER BY start_time DESC 
            LIMIT 1
            """
        ).fetchone()

        weekly_calories = conn_summary.execute(
            """
            SELECT first_day,
            activities_calories
            FROM weeks_summary
            WHERE activities_calories IS NOT NULL
            AND activities_calories != ''
            ORDER BY first_day DESC
           """
        ).fetchall()

        z2_weekly = conn.execute(
            """
            SELECT date(start_time, 'weekday 0', '-6 days') as week_start,
            heart_rate_zone_two_time
            FROM running_activities_view
            WHERE heart_rate_zone_two_time IS NOT NULL
            ORDER BY start_time DESC
            """
        ).fetchall()

        z2_by_week = {}
        for row in z2_weekly:
            week = row["week_start"]
            seconds = time_str_to_seconds(row["heart_rate_zone_two_time"])
            if week in z2_by_week:
                z2_by_week[week] += seconds
            else:
                z2_by_week[week] = seconds

        z2_weekly_list = [
        {
            "week_start": week,
            "z2_time": seconds_to_hours_min(seconds)
        }
        for week, seconds in z2_by_week.items()
        ]

        #seconds_in_z2 = sum(time_str_to_seconds(s["heart_rate_zone_two_time"]) for s in z2_weekly)
        


        history = conn.execute(
            """
            SELECT DATE(start_time) as date, avg_speed
            FROM running_activities_view
            WHERE avg_speed IS NOT NULL AND avg_speed > 0
            ORDER BY start_time ASC
            """
        ).fetchall()

        pace_history = [
            {
                "date": r["date"],
                "avg_pace_seconds": pace_seconds_from_mps(r["avg_speed"]),
            }
            for r in history
        ]

        return {
            "total_runs": agg["total_runs"],
            "total_miles": meters_to_miles(agg["total_distance"]),
            "total_time": seconds_to_hms(total_seconds),
            "avg_pace": pace_from_mps(agg["mean_speed"]),
            "best_pace": pace_from_mps(agg["best_speed"]),
            "current_vo2_max": vo2_row["vo2_max"] if vo2_row else None,
            "weekly_calories": [
                {
                    "first_day": row["first_day"],
                    "activities_calories": row["activities_calories"]
                }
                for row in weekly_calories
            ],
            "z2_weekly": z2_weekly_list,
            "pace_history": pace_history,
        }
    finally:
        conn.close()
        conn_summary.close()


@app.get("/api/stats/volume")
def stats_volume():
    conn = get_db(path=ACTIVITIES_DB)
    try:
        rows = conn.execute(
            """
            SELECT date(start_time, 'weekday 0', '-6 days') as week_start,
                   strftime('%Y-%m', start_time) as month,
                   distance, elapsed_time
            FROM running_activities_view
            WHERE start_time IS NOT NULL
            ORDER BY start_time ASC
            """
        ).fetchall()

        weekly: dict = {}
        monthly: dict = {}
        for r in rows:
            w, mo = r["week_start"], r["month"]
            dist = r["distance"] or 0.0
            secs = time_str_to_seconds(r["elapsed_time"])
            weekly.setdefault(w, {"miles": 0.0, "time_seconds": 0})
            weekly[w]["miles"] += dist
            weekly[w]["time_seconds"] += secs
            monthly.setdefault(mo, {"miles": 0.0, "time_seconds": 0})
            monthly[mo]["miles"] += dist
            monthly[mo]["time_seconds"] += secs

        return {
            "weekly": [
                {"period": k, "miles": round(v["miles"], 1), "time_seconds": v["time_seconds"]}
                for k, v in weekly.items()
            ],
            "monthly": [
                {"period": k, "miles": round(v["miles"], 1), "time_seconds": v["time_seconds"]}
                for k, v in monthly.items()
            ],
        }
    finally:
        conn.close()


# Mount static files last so API routes take precedence
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
