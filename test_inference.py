
import cv2
from cv.pipeline import CVPipeline

pipeline = CVPipeline()
camera = cv2.VideoCapture(0)

try:
    while not pipeline.buffer.is_ready():
        ok, frame = camera.read()

        if not ok:
            print("Could not read webcam frame.")
            break

        result = pipeline.process_frame(frame)

        print(
            f"Face: {result['face_detected']} | "
            f"Frames: {result['frames_collected']}/16"
        )

        cv2.imshow("SUNDAY - Frame Capture", frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    if pipeline.buffer.is_ready():
        ok, frame = camera.read()

        if ok:
            result = pipeline.process_frame(frame)
            print("\nFinal pipeline result:")
            print(result)

finally:
    camera.release()
    cv2.destroyAllWindows()
