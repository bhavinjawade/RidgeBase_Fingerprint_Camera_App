import eventlet
import socketio
import base64
import random

sio = socketio.Server(cors_allowed_origins="*")
app = socketio.WSGIApp(sio)

@sio.event
def connect(sid, environ):
    print('connect ', sid)

@sio.event
def my_message(sid, data):
    print('message ', data)

@sio.event
def send_image(sid, data):
    print("Fingerprint Image recieved")
    with open(data["username"] + "_image_fingerprint" + ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(8)) + ".png", "wb") as fh:
        photo = data["photo"]
        fh.write(base64.decodebytes(str.encode(photo)))
        sio.emit("imageReceived", "OK")

@sio.event
def send_video(sid, data):
    print("Fingerprint Video recieved")
    with open(data["username"] + "_video_fingerprint" + ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(8)) + ".mp4", "wb") as fh:
        video = data["video"]
        fh.write(base64.decodebytes(str.encode(video)))
        sio.emit("videoReceived", "OK")

@sio.event
def disconnect(sid):
    print('disconnect ', sid)

if __name__ == '__main__':
    eventlet.wsgi.server(eventlet.listen(('', 3000)), app,  log_output=False)