import argparse,cv2
from .pipeline import CVPipeline
def main():
    p=argparse.ArgumentParser(); p.add_argument('--source',required=True); a=p.parse_args(); pipe=CVPipeline()
    if a.source.lower().endswith(('.jpg','.jpeg','.png','.webp')):
        frame=cv2.imread(a.source)
        if frame is None: raise RuntimeError(f'Could not read image: {a.source}')
        r=pipe.process_frame(frame); print({k:v for k,v in r.items() if k!='temporal_representation'}); return
    cap=cv2.VideoCapture(a.source)
    if not cap.isOpened(): raise RuntimeError(f'Could not open video: {a.source}')
    n=0
    try:
        while True:
            ok,frame=cap.read()
            if not ok: break
            n+=1; r=pipe.process_frame(frame)
            if n%10==0: print(f"Frame {n}: face={r['face_detected']} frames={r['frames_collected']}/16")
            if r.get('sequence_ready'):
                print('16-frame sequence ready.'); print('Temporal representation:',r['temporal_shape'])
                if 'stress_probability' in r: print('Facial stress indicator:',round(r['stress_probability'],4))
                break
    finally: cap.release()
    print(f'Processed {n} frames.')
if __name__=='__main__': main()
