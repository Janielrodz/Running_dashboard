# Build Guide — Personal Running Dashboard with AI Analysis

A step-by-step companion to the project spec. Follow phases in order. Commands assume
Ubuntu on the Oracle Cloud VM and a Mac/Linux/WSL terminal locally — adjust if your
local machine is plain Windows.

---

## Phase 0 — Repo Strategy (the "do I clone GarminDB?" question)

**Short answer: no, don't clone it into your project.** Three reasons:

1. **It's a published Python package.** `garmindb` is on PyPI (confirmed: version 3.8.0 as
   of this writing). You install it on the VM with `pipx install garmindb` — no source
   needed.
2. **It's GPLv2-licensed.** Running it as a separate, standalone tool that produces a
   SQLite file as output (which your own app then just *reads*) keeps your dashboard
   code cleanly separate from it — you're not linking against or embedding its source.
   That's the simplest way to stay clear of any copyleft questions. (Not a lawyer —
   just flagging the practical reasoning.)
3. **Your dashboard is its own project**, with its own git repo, built from scratch
   with Claude Code. GarminDB is a dependency that runs alongside it, not a part of it.

**Where the GarminDB source IS useful:** as *reference*, so Claude Code knows the exact
SQLite table/column names to query (`ActivityLaps`, `ActivityRecords`, etc.) instead of
guessing. Keep a local read-only copy for that purpose (e.g. point Claude Code at
`github.com/tcgoetz/GarminDB` or hand it the schema files), but don't commit it into
your own repo or vendor it in.

**Net result:** two separate things live on the VM —
`garmindb` (installed via pipx, runs via cron) and **your dashboard repo** (cloned from
your own GitHub, deployed separately).

---

## Phase 1 — Oracle Cloud VM

### 1.1 Create the instance
In the Oracle console (the screen you're already on):
1. Menu → **Compute → Instances → Create Instance**
2. **Image:** Canonical Ubuntu, latest LTS (24.04)
3. **Shape:** click "Change shape" → **Ampere → VM.Standard.A1.Flex** (this is the
   Always Free ARM shape). Set **2 OCPUs / 12 GB RAM** — leaves headroom under the
   4 OCPU / 24 GB free aggregate limit in case you want a second small instance later.
4. **Networking:** keep the default VCN, keep "Assign a public IPv4 address" checked
   (you need it for initial SSH setup; Tailscale takes over after that).
5. **SSH keys:** let Oracle generate a key pair and **download the private key** —
   you'll need it to connect.
6. Create. Wait for the instance state to show **Running**, then copy its public IP.

### 1.2 Connect
```bash
chmod 600 ~/Downloads/ssh-key.key
ssh -i ~/Downloads/ssh-key.key ubuntu@<PUBLIC_IP>
```

> **Known gotcha:** Oracle's Ubuntu images often ship with OS-level `iptables` rules
> that block inbound traffic *in addition to* the cloud-level Security List. If a port
> you opened in the console still doesn't respond, check `sudo iptables -L` on the VM
> itself — this trips up almost everyone the first time.
>
> You likely won't need to touch this at all in this project: SSH (22) is open by
> default, and Tailscale doesn't need any inbound port opened — it punches out, not in.

### 1.3 Base setup
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv pipx git sqlite3 build-essential
pipx ensurepath
# log out and back in (or `source ~/.bashrc`) so pipx's path takes effect
```

### 1.4 Install Tailscale
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```
This prints a login URL — open it on your phone/PC to authorize the VM into your
Tailscale network. From now on, the VM is reachable from your devices at its Tailscale
IP/hostname (e.g. `vm-name.tailnet-name.ts.net`), privately, with no public ports needed
for the app itself.

### 1.5 Install Node.js (for building the React frontend)
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # sanity check
```

---

## Phase 2 — GarminDB: install, configure, first sync

### 2.1 Install
```bash
pipx install garmindb
```

### 2.2 Configure credentials
```bash
mkdir -p ~/.GarminDb
chmod 700 ~/.GarminDb
```
Create `~/.GarminDb/GarminConnectConfig.json` (use `nano` or `vim` directly on the VM —
don't write this file locally and copy it over through git):

```json
{
  "db": { "type": "sqlite" },
  "garmin": { "domain": "garmin.com" },
  "credentials": {
    "user": "your_garmin_email@example.com",
    "secure_password": false,
    "password": "",
    "password_file": "~/.GarminDb/secrets/password.txt"
  },
  "data": {
    "weight_start_date": "01/01/2024",
    "sleep_start_date": "01/01/2024",
    "rhr_start_date": "01/01/2024",
    "hrv_start_date": "01/01/2024",
    "monitoring_start_date": "01/01/2024",
    "download_latest_activities": 25,
    "download_all_activities": 2000
  },
  "directories": { "relative_to_home": true, "base_dir": "HealthData" },
  "enabled_stats": {
    "monitoring": true, "steps": true, "itime": true, "sleep": true,
    "rhr": true, "hrv": true, "weight": true, "activities": true
  },
  "settings": { "metric": false, "default_display_activities": ["walking", "running", "cycling"] }
}
```

Then create the separate password file:
```bash
mkdir -p ~/.GarminDb/secrets
nano ~/.GarminDb/secrets/password.txt   # paste just the password, save
chmod 600 ~/.GarminDb/secrets/password.txt
chmod 600 ~/.GarminDb/GarminConnectConfig.json
```
Adjust `weight_start_date` / `sleep_start_date` / etc. to however far back you want
history pulled — further back means a longer first sync.

### 2.3 First full sync
```bash
garmindb_cli.py --all --download --import --analyze
```
This is the one you run **interactively**, because if your account has MFA enabled
you'll be prompted for the code here. After this succeeds, a session token is cached
and future runs won't normally prompt again.

### 2.4 Verify the detail you actually care about
```bash
sqlite3 ~/HealthData/DBs/garmin_activities.db
sqlite> SELECT * FROM activity_laps WHERE activity_id = (
  SELECT activity_id FROM activities ORDER BY start_time DESC LIMIT 1
);
sqlite> .quit
```
Pick a recent interval/tempo run and confirm you see one row per repetition, with
pace/HR per lap — this is the thing that was missing from Strava. Confirm before moving
on; this is the entire reason for this data-source choice.

### 2.5 Automate it
```bash
crontab -e
```
Add (runs every hour, logs output for debugging):
```
0 * * * * /home/ubuntu/.local/bin/garmindb_cli.py --all --download --import --analyze --latest >> /home/ubuntu/garmindb_cron.log 2>&1
```

---

## Phase 3 — Build the dashboard (Claude Code)

This part happens **locally**, with Claude Code, not on the VM. Standard flow: write
and test code on your machine → push to GitHub → deploy to the VM.

### 3.1 Set up the project repo
```bash
mkdir running-dashboard && cd running-dashboard
git init
gh repo create running-dashboard --private --source=. # or create on github.com manually
```

### 3.2 Give Claude Code the right context
When you start the Claude Code session, hand it:
- The project spec PDF from earlier
- The GarminDB schema reference (point it at the GitHub repo, or paste the relevant
  table definitions) so it queries the real column names instead of guessing
- This build guide, for the deployment conventions (systemd, paths, etc.)

Then build, in order:
1. FastAPI backend — read-only endpoints over the SQLite DB (e.g. `/runs`, `/runs/{id}`)
2. React + Vite frontend — list view, per-run detail view with charts (Recharts)
3. Test locally against a **copy** of the real SQLite file (scp it down, don't develop
   against the live VM database)

### 3.3 Deploy to the VM
```bash
# on the VM
git clone https://github.com/<you>/running-dashboard.git
cd running-dashboard/backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```
Run the API as a `systemd` service so it survives reboots and crashes:
```ini
# /etc/systemd/system/dashboard-api.service
[Unit]
Description=Running Dashboard API
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/running-dashboard/backend
ExecStart=/home/ubuntu/running-dashboard/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl enable --now dashboard-api
```
Build the React app and let FastAPI serve the static files (simplest option for a
personal project — no need for nginx):
```bash
cd ../frontend
npm install && npm run build
# point FastAPI's StaticFiles mount at the build output
```
Access it at `http://<tailscale-hostname>:8000` from your phone/PC, over Tailscale —
no public exposure, no domain, no certificates needed.

---

## Phase 4 — AI analysis layer

### 4.1 Get an Anthropic API key
console.anthropic.com → API Keys → create one. Store it the same way as the Garmin
password — written directly on the VM, never in git:
```bash
mkdir -p ~/.config/dashboard
echo "your-api-key-here" > ~/.config/dashboard/anthropic_key.txt
chmod 600 ~/.config/dashboard/anthropic_key.txt
```

### 4.2 Build and wire in the analysis script
With Claude Code: a script that queries the SQLite DB for the most recent unanalyzed
activity, formats its laps/splits/HR into a prompt, calls the Claude API, and writes
the result back (new table, e.g. `run_analysis`).

Append it to the same cron line so it runs right after each sync:
```
0 * * * * /home/ubuntu/.local/bin/garmindb_cli.py --all --download --import --analyze --latest >> /home/ubuntu/garmindb_cron.log 2>&1 && /home/ubuntu/running-dashboard/venv/bin/python /home/ubuntu/running-dashboard/scripts/analyze_latest.py >> /home/ubuntu/analysis_cron.log 2>&1
```

### 4.3 Test against real data
Run it manually against 2-3 of your actual past runs before trusting the automated
version — this is where you'll spend most of your iteration time (prompt wording, what
context to include), not on the plumbing.

---

## Quick reference: what lives where

| Lives on the VM, never in git | Lives in your GitHub repo |
|---|---|
| `~/.GarminDb/GarminConnectConfig.json` | FastAPI backend source |
| `~/.GarminDb/secrets/password.txt` | React frontend source |
| `~/.config/dashboard/anthropic_key.txt` | systemd unit file (template, no secrets in it) |
| `~/HealthData/DBs/*.db` (the actual data) | this build guide / project spec |
