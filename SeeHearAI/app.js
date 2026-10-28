(() => {
  const video = document.getElementById("video");
  const canvas = document.getElementById("overlay");
  const ctx = canvas.getContext("2d");
  const cameraButton = document.getElementById("cameraButton");
  const statusText = document.getElementById("statusText");
  const statusDot = document.getElementById("statusDot");
  const placeholder = document.getElementById("cameraPlaceholder");
  const objectsText = document.getElementById("objectsText");
  const language = document.getElementById("language");
  const soundButton = document.getElementById("soundButton");
  let stream = null, active = false, busy = false, timer = null;
  let soundsOn = true, lastMessage = "", lastSpoken = "", recognition = null;
  let currentDetections = [];

  const taLabels = {
    person:"நபர்", bicycle:"மிதிவண்டி", car:"கார்", motorcycle:"மோட்டார் சைக்கிள்",
    bus:"பேருந்து", train:"ரயில்", truck:"சரக்கு வாகனம்", boat:"படகு",
    "traffic light":"போக்குவரத்து விளக்கு", "fire hydrant":"தீ அணைப்பான்",
    "stop sign":"நிறுத்தக் குறியீடு", bench:"நாற்காலி", bird:"பறவை", cat:"பூனை",
    dog:"நாய்", horse:"குதிரை", sheep:"செம்மறி ஆடு", cow:"பசு", elephant:"யானை",
    bear:"கரடி", zebra:"வரிக்குதிரை", giraffe:"ஒட்டகச்சிவிங்கி", backpack:"முதுகுப்பை",
    umbrella:"குடை", handbag:"கைப்பை", tie:"டை", suitcase:"சூட்கேஸ்",
    bottle:"பாட்டில்", cup:"கோப்பை", fork:"முள் கரண்டி", knife:"கத்தி",
    spoon:"கரண்டி", bowl:"கிண்ணம்", banana:"வாழைப்பழம்", apple:"ஆப்பிள்",
    sandwich:"சாண்ட்விச்", orange:"ஆரஞ்சுப் பழம்", broccoli:"ப்ரோக்கோலி",
    carrot:"கேரட்", pizza:"பீட்சா", donut:"டோனட்", cake:"கேக்", chair:"நாற்காலி",
    couch:"சோபா", "potted plant":"தொட்டிச் செடி", bed:"படுக்கை", "dining table":"சாப்பாட்டு மேசை",
    toilet:"கழிப்பறை", tv:"தொலைக்காட்சி", laptop:"மடிக்கணினி", mouse:"கணினி மவுஸ்",
    remote:"ரிமோட்", keyboard:"விசைப்பலகை", "cell phone":"கைப்பேசி", phone:"கைப்பேசி",
    microwave:"மைக்ரோவேவ்", oven:"அடுப்பு", toaster:"டோஸ்டர்", sink:"கழுவும் தொட்டி",
    refrigerator:"குளிர்சாதனப் பெட்டி", book:"புத்தகம்", clock:"கடிகாரம்",
    vase:"பூந்தொட்டி", scissors:"கத்தரிக்கோல்", "teddy bear":"பொம்மைக் கரடி",
    "hair drier":"முடி உலர்த்தி", toothbrush:"பல் துலக்கி"
  };
  const translate = label => language.value === "ta" ? (taLabels[label.toLowerCase()] || label) : label;
  function speak(message) {
    lastMessage = message;
    if (!("speechSynthesis" in window)) { setStatus("Speech synthesis is unavailable in this browser."); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = language.value === "ta" ? "ta-IN" : "en-US";
    utterance.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    if (language.value === "ta") {
      const tamilVoice = voices.find(v => v.lang.toLowerCase().startsWith("ta"));
      if (tamilVoice) utterance.voice = tamilVoice;
    }
    lastSpoken = message;
    window.speechSynthesis.speak(utterance);
  }
  function setStatus(message, isActive=active) {
    statusText.textContent = message;
    statusDot.classList.toggle("active", isActive);
  }
  function cue(frequency=700, duration=0.09) {
    if (!soundsOn) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const audio = new AudioCtx(), osc = audio.createOscillator(), gain = audio.createGain();
      osc.frequency.value = frequency; gain.gain.value = 0.06;
      osc.connect(gain); gain.connect(audio.destination); osc.start();
      osc.stop(audio.currentTime + duration);
      osc.onended = () => audio.close();
    } catch (_) {}
  }
  function drawBoxes(detections) {
    const w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = Math.max(2, w / 320);
    ctx.font = `${Math.max(14, w / 38)}px Arial`;
    detections.forEach(d => {
      const [x1,y1,x2,y2] = d.box;
      ctx.strokeStyle = "#ffd447"; ctx.fillStyle = "#ffd447";
      ctx.strokeRect(x1,y1,x2-x1,y2-y1);
      const label = `${translate(d.label)} ${Math.round(d.confidence*100)}%`;
      const tw = ctx.measureText(label).width;
      ctx.fillRect(x1, Math.max(0,y1-26), tw+10, 26);
      ctx.fillStyle = "#151515"; ctx.fillText(label, x1+5, Math.max(18,y1-7));
    });
  }
  async function processFrame() {
    if (!active || busy || video.readyState < 2) return;
    busy = true;
    try {
      const temp = document.createElement("canvas");
      const scale = Math.min(1, 640 / video.videoWidth);
      temp.width = Math.round(video.videoWidth * scale);
      temp.height = Math.round(video.videoHeight * scale);
      temp.getContext("2d").drawImage(video, 0, 0, temp.width, temp.height);
      const blob = await new Promise(resolve => temp.toBlob(resolve, "image/jpeg", 0.75));
      if (!blob || !active) return;
      const form = new FormData(); form.append("image", blob, "frame.jpg");
      const response = await fetch("/api/detect", {method:"POST", body:form});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Detection request failed");
      currentDetections = data.detections || [];
      drawBoxes(currentDetections);
      const labels = [...new Set(currentDetections.map(d => d.label))];
      objectsText.textContent = labels.length ? labels.map(translate).join(", ") : "No objects detected in this frame.";
      if (data.new_objects && data.new_objects.length) {
        const names = data.new_objects.map(translate);
        const message = language.value === "ta"
          ? `${names.join(", ")} காணப்படுகிறது.`
          : `${names.join(" and ")} detected.`;
        cue(850, 0.07); speak(message);
      }
      setStatus("Camera is active. Detecting objects.");
    } catch (error) {
      setStatus(`Detection issue: ${error.message}`);
    } finally {
      busy = false;
    }
  }
  async function startCamera() {
    if (active) return;
    cue(520);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("Camera access is unavailable. Use a modern browser and localhost or HTTPS.", false);
      speak("Camera access is unavailable in this browser."); return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}, width:{ideal:640}, height:{ideal:480}}, audio:false});
      video.srcObject = stream; await video.play();
      active = true; placeholder.hidden = true;
      cameraButton.textContent = "STOP CAMERA"; cameraButton.classList.add("stop");
      setStatus("Camera is active. Detecting objects.", true);
      cue(900); speak(language.value === "ta" ? "கேமரா தொடங்கப்பட்டது. பொருட்களை கண்டறிகிறது." : "Camera started. Detecting objects.");
      timer = setInterval(processFrame, 650);
      processFrame();
    } catch (error) {
      stopCamera(false);
      const message = error.name === "NotAllowedError"
        ? "Camera permission denied. Allow camera access in your browser settings."
        : "Could not start camera. Check that it is connected and not being used by another app.";
      setStatus(message, false); speak(message);
    }
  }
  function stopCamera(announce=true) {
    active = false;
    if (timer) clearInterval(timer); timer = null;
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null; video.srcObject = null; ctx.clearRect(0,0,canvas.width,canvas.height);
    placeholder.hidden = false; cameraButton.textContent = "START CAMERA"; cameraButton.classList.remove("stop");
    busy = false; currentDetections = []; objectsText.textContent = "No objects detected yet.";
    setStatus("Camera is off. Ready when you are.", false);
    if (announce) { cue(420); speak(language.value === "ta" ? "கேமரா நிறுத்தப்பட்டது." : "Camera stopped."); }
  }
  cameraButton.addEventListener("click", () => active ? stopCamera() : startCamera());
  document.getElementById("repeatButton").addEventListener("click", () => lastMessage ? speak(lastMessage) : speak(language.value==="ta" ? "மீண்டும் கூறுவதற்கு செய்தி இல்லை." : "There is no message to repeat yet."));
  document.getElementById("stopSpeakingButton").addEventListener("click", () => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); cue(350); });
  soundButton.addEventListener("click", () => { soundsOn = !soundsOn; soundButton.textContent = soundsOn ? "🔔 Sound: On" : "🔕 Sound: Off"; soundButton.setAttribute("aria-pressed", String(soundsOn)); if(soundsOn) cue(); });
  language.addEventListener("change", () => speak(language.value==="ta" ? "மொழி தமிழ் ஆக மாற்றப்பட்டது." : "Language changed to English."));
  document.getElementById("helpButton").addEventListener("click", () => speak(language.value==="ta" ? "கேமராவை தொடங்க பெரிய பொத்தானை அழுத்தவும். நிறுத்த அதே பொத்தானை அழுத்தவும். பொருட்கள் குரலில் அறிவிக்கப்படும்." : "Press Start Camera to begin. Press the same button to stop. Detected objects will be announced aloud."));
  document.getElementById("voiceButton").addEventListener("click", () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { speak("Voice recognition is not supported in this browser. Please use the large touch buttons."); return; }
    try {
      if (recognition) { recognition.stop(); recognition = null; }
      recognition = new SR(); recognition.lang = language.value==="ta" ? "ta-IN" : "en-US";
      recognition.continuous = false; recognition.interimResults = false;
      setStatus("Listening for a voice command. Speak now.", active); cue(760);
      recognition.onresult = event => {
        const command = event.results[0][0].transcript.toLowerCase();
        setStatus(`Command heard: ${command}`, active);
        if (/start|தொடங்கு|ஆரம்பி/.test(command)) startCamera();
        else if (/stop camera|camera off|நிறுத்து|கேமரா நிறுத்து/.test(command)) stopCamera();
        else if (/what do you see|என்ன தெரிகிறது/.test(command)) {
          const names = [...new Set(currentDetections.map(d=>translate(d.label)))];
          speak(names.length ? names.join(", ") : (language.value==="ta" ? "தற்போது பொருட்கள் கண்டறியப்படவில்லை." : "No objects detected right now."));
        } else if (/repeat|மீண்டும்/.test(command)) lastMessage ? speak(lastMessage) : speak("No message to repeat.");
        else if (/stop speaking|பேச்சை நிறுத்து/.test(command)) window.speechSynthesis.cancel();
        else if (/switch to tamil|தமிழ்/.test(command)) { language.value="ta"; speak("மொழி தமிழ் ஆக மாற்றப்பட்டது."); }
        else if (/switch to english|ஆங்கிலம்/.test(command)) { language.value="en"; speak("Language changed to English."); }
        else if (/help|உதவி/.test(command)) document.getElementById("helpButton").click();
        else speak(language.value==="ta" ? "கட்டளை புரியவில்லை. பொத்தான்களைப் பயன்படுத்தவும்." : "Command not recognized. Please use the touch buttons.");
      };
      recognition.onerror = event => setStatus(`Voice recognition issue: ${event.error}. Use touch controls if needed.`, active);
      recognition.onend = () => { if (active) setStatus("Camera is active. Detecting objects.", true); };
      recognition.start();
    } catch (_) { speak("Could not start voice recognition. Please use the touch buttons."); }
  });
  window.addEventListener("beforeunload", () => { if (stream) stream.getTracks().forEach(t=>t.stop()); });
  if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
})();
