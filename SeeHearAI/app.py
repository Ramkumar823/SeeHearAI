from flask import Flask, render_template, request, jsonify
from backend.detector import ObjectDetector
from backend.announcement_manager import AnnouncementManager
from config import HOST, PORT, DEBUG, MAX_FRAME_BYTES

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_FRAME_BYTES
detector = ObjectDetector()
announcer = AnnouncementManager()

@app.get("/")
def index():
    return render_template("index.html")

@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "detector_loaded": detector.loaded})

@app.post("/api/detect")
def detect():
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400
    image_file = request.files["image"]
    frame_bytes = image_file.read()
    if not frame_bytes:
        return jsonify({"error": "Empty image"}), 400
    try:
        detections = detector.detect_bytes(frame_bytes)
        fresh_names = announcer.get_new_objects([d["label"] for d in detections])
        return jsonify({"detections": detections, "new_objects": fresh_names})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        app.logger.exception("Detection failed")
        return jsonify({"error": "Object detection failed. Check the terminal for details."}), 500

if __name__ == "__main__":
    # Debug server is for local development only. Do not expose it to the internet.
    app.run(host=HOST, port=PORT, debug=DEBUG, threaded=True)
