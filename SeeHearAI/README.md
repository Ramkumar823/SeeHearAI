# SeeHear AI
**See the World. Hear What Matters.**

A beginner-friendly local Flask prototype that uses a browser camera, Python, and YOLO to detect common objects and announce them using browser speech synthesis. Includes large touch controls, English/Tamil interface choice and announcements, optional browser voice commands, bounding boxes, and duplicate announcement suppression.

## Important safety note
This is an experimental assistive tool. Object detections may be inaccurate or delayed. It cannot guarantee safe navigation and must not replace a white cane, guide dog, or established mobility aids. Do not use this prototype as the sole means of navigation.

## Requirements
- Windows 10/11
- Python 3.11 (64-bit recommended)
- A webcam or phone camera
- Internet for the initial Python package and YOLO model download
- A modern browser such as current Chrome or Edge

## Install and run (Windows PowerShell)
1. Extract `SeeHearAI.zip`.
2. Open the extracted `SeeHearAI` folder in VS Code.
3. Open Terminal → New Terminal. Confirm the terminal is inside the project folder.
4. Create a virtual environment:
   ```powershell
   py -3.11 -m venv .venv
   ```
5. Activate it:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```
   If PowerShell blocks activation, run this once in that terminal and retry:
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   .\.venv\Scripts\Activate.ps1
   ```
6. Upgrade pip and install packages:
   ```powershell
   python -m pip install --upgrade pip
   pip install -r requirements.txt
   ```
7. Start the app:
   ```powershell
   python app.py
   ```
8. Open **http://127.0.0.1:5000** in Chrome or Edge.
9. Press **START CAMERA**, then allow camera permission. The first detection may take longer because the `yolov8n.pt` model is downloaded and initialized. Keep the terminal open while using the app.

## How to use
- Press **START CAMERA** to activate the camera and detection.
- Press **STOP CAMERA** to stop the camera.
- Select English or Tamil for spoken announcements. Tamil speech depends on whether your browser/device has a Tamil speech voice installed.
- Use **Repeat Last Message**, **Stop Speaking**, **Sound**, and **Help** as needed.
- Press **Voice Commands** and allow microphone access if supported. Voice recognition support varies by browser/device; touch controls always remain available.

## Test
Run unit tests:
```powershell
pytest -q
```
These tests cover basic detector input validation and duplicate suppression. Browser camera, speech, microphone, and real-time performance require manual testing on the target device.

## Using an Android phone
Camera permissions on websites generally require HTTPS, except trusted localhost contexts. The simplest first test is to run the app on your Windows PC and use its webcam.

To test from a phone, deploy behind HTTPS or use a secure development tunnel you trust. Do not expose Flask's development server directly to the public internet. `127.0.0.1` only accepts connections from the same computer; changing it to `0.0.0.0` alone does not make phone camera access secure.

## Troubleshooting
- **`py` is not recognized:** install Python 3.11 and enable the Python launcher/PATH, then reopen the terminal.
- **Activation blocked:** use the process-scoped execution policy command above.
- **YOLO model download fails:** check internet access, retry `python app.py`, and check that security software/firewall is not blocking Python. The model is cached after successful download.
- **Camera permission denied:** use `http://127.0.0.1:5000`, open browser site permissions, and allow camera access.
- **No camera found / black preview:** close other apps using the camera, check Windows camera privacy settings, and reload.
- **No Tamil voice:** install/enable a Tamil text-to-speech voice in the operating system if available. The app cannot guarantee a Tamil voice on every device.
- **Voice commands unavailable:** use the touch controls. Web Speech API support differs between browsers.
- **Slow detection:** close other CPU-heavy apps. This prototype uses CPU inference and deliberately limits frame resolution and frequency.

## Project structure
```text
SeeHearAI/
├── app.py
├── config.py
├── requirements.txt
├── README.md
├── backend/
│   ├── __init__.py
│   ├── detector.py
│   └── announcement_manager.py
├── templates/
│   └── index.html
├── static/
│   ├── css/style.css
│   └── js/app.js
└── tests/
    ├── test_detector.py
    └── test_announcement_manager.py
```

## Technical notes
- The browser captures frames; Python performs YOLO inference locally.
- The pretrained model supports a fixed set of common classes, not every possible object.
- Standard object detection does not reliably estimate object distance or guarantee obstacle detection.
- Frames are processed in memory and are not saved by this application.
- Initial installation/model downloads require internet. After dependencies and model weights are cached, inference can run offline.
- The included Flask server is intended for local development, not production deployment.
