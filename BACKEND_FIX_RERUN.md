# Backend Fix Required: Rerun Analysis Memory Issue

## Problem
When the `/analyses/{id}/rerun` endpoint is called, the backend process gets killed by the OS with the message "Killed". This indicates an Out Of Memory (OOM) error.

## Root Cause
The rerun endpoint is processing videos **synchronously**, which:
1. Blocks the Flask server thread
2. Loads the entire video into memory
3. Performs AI analysis (Gemini API calls) synchronously
4. Exhausts available memory, causing the OS to kill the process

## Current Backend Implementation (Problematic)
\`\`\`python
@app.route('/analyses/<analysis_id>/rerun', methods=['POST'])
def rerun_analysis(analysis_id):
    user_id = AuthManager.get_user_id_from_token()

    # Get analysis
    analysis = db.collection('analyses').document(analysis_id).get()

    # Download video (BLOCKING - loads into memory)
    video_path = download_video(analysis.video_url)

    # Process video (BLOCKING - heavy computation)
    result = process_video_with_gemini(video_path)

    # Update analysis
    db.collection('analyses').document(analysis_id).update({
        'text': result,
        'processed': True
    })

    return jsonify({"success": True})
\`\`\`

## Solution: Asynchronous Processing

### Option 1: Threading (Quick Fix)
\`\`\`python
import threading
from flask import jsonify

@app.route('/analyses/<analysis_id>/rerun', methods=['POST'])
def rerun_analysis(analysis_id):
    user_id = AuthManager.get_user_id_from_token()

    # Verify analysis exists and user has permission
    analysis_ref = db.collection('analyses').document(analysis_id)
    analysis = analysis_ref.get()

    if not analysis.exists:
        return jsonify({"error": "Analysis not found"}), 404

    analysis_data = analysis.to_dict()

    # Check ownership or admin
    if analysis_data.get('user_id') != user_id and user_id not in ADMIN_UIDS:
        return jsonify({"error": "Permission denied"}), 403

    # Mark as processing immediately
    analysis_ref.update({
        'processed': False,
        'status': 'processing',
        'rerun_requested_at': firestore.SERVER_TIMESTAMP
    })

    # Start processing in background thread
    thread = threading.Thread(
        target=process_analysis_async,
        args=(analysis_id, analysis_data)
    )
    thread.daemon = True
    thread.start()

    # Return immediately
    return jsonify({
        "success": True,
        "message": "Analysis rerun started",
        "analysis_id": analysis_id
    }), 200

def process_analysis_async(analysis_id, analysis_data):
    """Background function to process video analysis"""
    try:
        logger.info(f"Starting rerun for analysis {analysis_id}")

        # Get video URL
        video_url = analysis_data.get('video_url')
        if not video_url:
            raise ValueError("No video URL found")

        # Download video to temp file
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp_file:
            video_path = tmp_file.name
            download_video_to_file(video_url, video_path)

        try:
            # Process with Gemini
            result = process_video_with_gemini(
                video_path,
                analysis_data.get('dance_type'),
                analysis_data.get('dancers'),
                analysis_data.get('analysis_type', 'couple')
            )

            # Update Firestore with results
            db.collection('analyses').document(analysis_id).update({
                'text': result.get('analysis_text'),
                'total_score': result.get('total_score'),
                'scores': result.get('scores'),
                'processed': True,
                'status': 'completed',
                'processed_at': firestore.SERVER_TIMESTAMP
            })

            logger.info(f"Successfully completed rerun for analysis {analysis_id}")

        finally:
            # Clean up temp file
            import os
            if os.path.exists(video_path):
                os.remove(video_path)

    except Exception as e:
        logger.error(f"Error during rerun for analysis {analysis_id}: {str(e)}")

        # Update status to failed
        db.collection('analyses').document(analysis_id).update({
            'processed': False,
            'status': f'failed: {str(e)}',
            'error': str(e),
            'failed_at': firestore.SERVER_TIMESTAMP
        })
\`\`\`

### Option 2: Celery Task Queue (Production Ready)
If you're experiencing frequent crashes, consider using Celery:

\`\`\`python
# Install: pip install celery redis
# Start Redis: docker run -d -p 6379:6379 redis

from celery import Celery

celery = Celery('flokraft', broker='redis://localhost:6379/0')

@celery.task
def process_analysis_task(analysis_id, analysis_data):
    """Celery task to process video analysis"""
    # Same implementation as process_analysis_async above
    pass

@app.route('/analyses/<analysis_id>/rerun', methods=['POST'])
def rerun_analysis(analysis_id):
    user_id = AuthManager.get_user_id_from_token()

    # ... validation code ...

    # Mark as processing
    analysis_ref.update({
        'processed': False,
        'status': 'processing'
    })

    # Queue the task
    process_analysis_task.delay(analysis_id, analysis_data)

    return jsonify({"success": True}), 200
\`\`\`

### Option 3: Cloud Functions (Serverless)
For Google Cloud Platform:
\`\`\`python
# Trigger a Cloud Function or Cloud Run job
import requests

@app.route('/analyses/<analysis_id>/rerun', methods=['POST'])
def rerun_analysis(analysis_id):
    # ... validation ...

    # Trigger Cloud Function
    cloud_function_url = "https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/process-analysis"

    requests.post(cloud_function_url, json={
        'analysis_id': analysis_id,
        'analysis_data': analysis_data
    }, timeout=5)  # Don't wait for response

    return jsonify({"success": True}), 200
\`\`\`

## Memory Optimization Tips

### 1. Stream Video Processing
Instead of loading entire video into memory:
\`\`\`python
def process_video_in_chunks(video_path):
    """Process video in smaller chunks"""
    import cv2

    cap = cv2.VideoCapture(video_path)
    fps = int(cap.get(cv2.CAP_PROP_FPS))

    # Process every Nth frame instead of all frames
    frame_interval = fps * 2  # Process 1 frame every 2 seconds

    frame_count = 0
    frames_to_analyze = []

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if frame_count % frame_interval == 0:
            frames_to_analyze.append(frame)

        frame_count += 1

        # Limit memory by processing in batches
        if len(frames_to_analyze) >= 10:
            # Send batch to Gemini
            analyze_frame_batch(frames_to_analyze)
            frames_to_analyze = []

    cap.release()
\`\`\`

### 2. Clean Up Resources
\`\`\`python
import gc
import tempfile
import os

def process_analysis_async(analysis_id, analysis_data):
    video_path = None
    try:
        # Download video
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp:
            video_path = tmp.name
            download_video(video_url, video_path)

        # Process
        result = process_video(video_path)

        # Update database
        update_analysis(analysis_id, result)

    finally:
        # Force cleanup
        if video_path and os.path.exists(video_path):
            os.remove(video_path)
        gc.collect()  # Force garbage collection
\`\`\`

### 3. Add Memory Limits
\`\`\`python
import resource

# Limit memory usage (e.g., 2GB)
resource.setrlimit(
    resource.RLIMIT_AS,
    (2 * 1024 * 1024 * 1024, 2 * 1024 * 1024 * 1024)
)
\`\`\`

## Immediate Action Required

1. **Implement Option 1 (Threading)** - This is the quickest fix
2. **Add logging** to track memory usage
3. **Monitor** the background process
4. **Consider Option 2 (Celery)** for production stability

## Testing
After implementing the fix:
\`\`\`bash
# Test the endpoint returns quickly
curl -X POST "http://localhost:5555/analyses/{id}/rerun" \
  -H "Authorization: Bearer {token}"

# Should return within 1 second with 200 OK
# Analysis should complete in background over next few minutes
\`\`\`

## Frontend Changes (Already Applied)
The frontend now includes:
- ✅ 10-second timeout on rerun requests
- ✅ Graceful handling of timeout (assumes background processing)
- ✅ Better error messages when backend crashes
- ✅ Continues polling for updates after rerun

## Monitoring
Add logging to track:
\`\`\`python
import psutil
import logging

def log_memory_usage():
    process = psutil.Process()
    memory_info = process.memory_info()
    logger.info(f"Memory usage: {memory_info.rss / 1024 / 1024:.2f} MB")

# Call before and after video processing
log_memory_usage()
process_video(video_path)
log_memory_usage()
\`\`\`
