# Backend Memory Crash Debugging Guide

## Current Symptoms

1. Backend gets "Killed" by OS (OOM - Out of Memory)
2. No POST request to `/analyses/{id}/rerun` appears in logs before crash
3. Only GET requests to `/analyses` and `/admin/analyses` visible
4. Crash happens during normal polling, not during rerun

## Root Causes Analysis

### Primary Suspect: Memory Leak in GET Requests

The logs show repeated GET requests every 3 seconds:
\`\`\`
GET /analyses?analysis_type=couple&user_id=... (every 3 seconds)
GET /admin/analyses (when admin panel is open)
\`\`\`

**Problem:** These endpoints may be loading ALL analyses into memory without cleanup.

### Common Memory Issues in Flask

#### Issue 1: Loading All Documents Without Pagination
\`\`\`python
# BAD - Loads ALL analyses into memory
@app.route('/analyses')
def get_analyses():
    analyses = db.collection('analyses').get()
    return jsonify([a.to_dict() for a in analyses])  # Huge list in memory
\`\`\`

#### Issue 2: Not Releasing References
\`\`\`python
# BAD - Keeps references to all documents
analyses_cache = {}

@app.route('/analyses')
def get_analyses():
    analyses = db.collection('analyses').get()
    for a in analyses:
        analyses_cache[a.id] = a.to_dict()  # Accumulates in memory!
    return jsonify(list(analyses_cache.values()))
\`\`\`

#### Issue 3: Video Data in Memory
\`\`\`python
# BAD - Loads video URLs with large blobs
@app.route('/analyses')
def get_analyses():
    analyses = db.collection('analyses').get()
    results = []
    for a in analyses:
        data = a.to_dict()
        # If video_url points to blob data in Firestore, this loads it all
        results.append(data)
    return jsonify(results)
\`\`\`

## Immediate Fixes Required

### Fix 1: Add Pagination to GET /analyses

\`\`\`python
@app.route('/analyses')
def get_analyses():
    user_id = request.args.get('user_id')
    analysis_type = request.args.get('analysis_type', 'couple')
    limit = int(request.args.get('limit', 50))  # Default 50
    offset = int(request.args.get('offset', 0))

    query = db.collection('analyses')

    if user_id:
        query = query.where('user_id', '==', user_id)
    if analysis_type:
        query = query.where('analysis_type', '==', analysis_type)

    # Order by timestamp and limit
    query = query.order_by('timestamp', direction=firestore.Query.DESCENDING)
    query = query.limit(limit)

    analyses = query.get()

    results = []
    for analysis in analyses:
        data = analysis.to_dict()
        data['id'] = analysis.id
        results.append(data)

    # Explicitly clear references
    del analyses

    return jsonify(results)
\`\`\`

### Fix 2: Add Memory Monitoring

\`\`\`python
import psutil
import gc
import logging

def log_memory():
    process = psutil.Process()
    mem = process.memory_info()
    logging.info(f"Memory: RSS={mem.rss/1024/1024:.1f}MB, VMS={mem.vms/1024/1024:.1f}MB")

@app.before_request
def before_request():
    if random.random() < 0.1:  # Log 10% of requests
        log_memory()

@app.after_request
def after_request(response):
    gc.collect()  # Force garbage collection
    return response
\`\`\`

### Fix 3: Reduce Data in Responses

Only return necessary fields:

\`\`\`python
@app.route('/analyses')
def get_analyses():
    # ... query code ...

    results = []
    for analysis in analyses:
        # Only return essential fields for listing
        results.append({
            'id': analysis.id,
            'timestamp': analysis.get('timestamp'),
            'dance_type': analysis.get('dance_type'),
            'dancers': analysis.get('dancers'),
            'analysis_type': analysis.get('analysis_type'),
            'processed': analysis.get('processed', False),
            'status': analysis.get('status'),
            'total_score': analysis.get('total_score'),
            # DON'T include 'text' (large) or 'video_url' (if it's blob data)
        })

    return jsonify(results)
\`\`\`

### Fix 4: Add Request Limits

\`\`\`python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["200 per hour", "50 per minute"]
)

@app.route('/analyses')
@limiter.limit("30 per minute")  # Max 30 requests per minute
def get_analyses():
    # ... endpoint code ...
\`\`\`

## Frontend Optimizations (Already Applied)

### Reduce Polling Frequency

Current: Every 3 seconds
Recommended: Progressive backoff

\`\`\`javascript
// In dashboard-content.tsx
const [pollInterval, setPollInterval] = useState(3000)

useEffect(() => {
  fetchAnalyses()

  const interval = setInterval(() => {
    fetchAnalyses()

    // Increase interval over time (progressive backoff)
    setPollInterval(prev => Math.min(prev + 1000, 10000)) // Max 10s
  }, pollInterval)

  return () => clearInterval(interval)
}, [pollInterval])

// Reset to 3s when user interacts
const handleSubmit = async () => {
  setPollInterval(3000)
  // ... submit code ...
}
\`\`\`

## Diagnostic Steps

### Step 1: Check Current Memory Usage

\`\`\`bash
# On your server, run:
ps aux | grep python
# or
top -p $(pgrep -f flokraft)

# Watch memory in real-time
watch -n 1 'ps aux | grep python | grep -v grep'
\`\`\`

### Step 2: Add Memory Profiling

\`\`\`bash
# Install memory profiler
pip install memory_profiler

# Add to your backend
from memory_profiler import profile

@profile
@app.route('/analyses')
def get_analyses():
    # ... code ...

# Run with:
python -m memory_profiler flokraft.py
\`\`\`

### Step 3: Check Firestore Query Size

Add this to your GET /analyses endpoint:

\`\`\`python
import sys

@app.route('/analyses')
def get_analyses():
    analyses = query.get()

    # Log size
    size = sys.getsizeof(analyses)
    count = len(analyses)
    logging.warning(f"Analyses query returned {count} docs, size: {size/1024:.1f}KB")

    # If too large, alert
    if count > 100:
        logging.error(f"Too many analyses returned: {count}. Consider pagination!")

    # ... rest of code ...
\`\`\`

## Testing After Fixes

### Test 1: Single Request Memory
\`\`\`bash
# Before request
ps aux | grep python

# Make request
curl "http://localhost:5555/analyses?user_id=xxx"

# After request
ps aux | grep python

# Memory should return to baseline
\`\`\`

### Test 2: Sustained Load
\`\`\`bash
# Run 100 requests
for i in {1..100}; do
  curl "http://localhost:5555/analyses?user_id=xxx" > /dev/null
  sleep 0.1
done

# Check if server is still running
ps aux | grep python
\`\`\`

### Test 3: Monitor During Rerun

\`\`\`bash
# Terminal 1: Monitor memory
watch -n 1 'ps aux | grep python'

# Terminal 2: Check logs
tail -f logs/flokraft.log

# Terminal 3: Trigger rerun
curl -X POST "http://localhost:5555/analyses/{id}/rerun" \
  -H "Authorization: Bearer {token}"
\`\`\`

## Emergency Workarounds

### Workaround 1: Restart on Crash (systemd)

\`\`\`bash
# Create /etc/systemd/system/flokraft.service
[Unit]
Description=Flokraft Backend
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/flokraft
ExecStart=/usr/bin/python3 flokraft.py
Restart=always
RestartSec=3
StandardOutput=append:/var/log/flokraft/output.log
StandardError=append:/var/log/flokraft/error.log

[Install]
WantedBy=multi-user.target

# Enable
sudo systemctl enable flokraft
sudo systemctl start flokraft
\`\`\`

### Workaround 2: Memory Limit + Restart

\`\`\`bash
# Add to service file
MemoryMax=2G
MemoryHigh=1.8G
\`\`\`

### Workaround 3: Use Gunicorn with Workers

\`\`\`bash
pip install gunicorn

# Run with multiple workers (each gets own memory)
gunicorn -w 4 -b 0.0.0.0:5555 flokraft:app \
  --timeout 120 \
  --max-requests 1000 \
  --max-requests-jitter 100

# max-requests causes workers to restart after N requests
# This prevents memory accumulation
\`\`\`

## Expected Behavior After Fixes

1. ✅ GET /analyses returns quickly (< 100ms)
2. ✅ Memory usage stays stable (< 500MB for Flask app)
3. ✅ POST /analyses/{id}/rerun returns within 1 second
4. ✅ Server doesn't crash during normal operation
5. ✅ Background processing completes without killing server

## Next Steps

1. **Immediate**: Add memory logging and pagination
2. **Short-term**: Implement threading for rerun (see BACKEND_FIX_RERUN.md)
3. **Long-term**: Move to Celery + Redis for background tasks
4. **Production**: Use Gunicorn with worker restart limits
