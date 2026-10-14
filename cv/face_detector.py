import cv2
class FaceDetector:
    def __init__(self):
        path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        self.detector = cv2.CascadeClassifier(path)
        if self.detector.empty(): raise RuntimeError("Could not load OpenCV face detector.")
    def detect(self, frame):
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80,80))
        return max(faces, key=lambda b:b[2]*b[3]) if len(faces) else None
    def crop(self, frame, box):
        x,y,w,h=box; H,W=frame.shape[:2]
        return frame[max(0,y):min(H,y+h), max(0,x):min(W,x+w)]
