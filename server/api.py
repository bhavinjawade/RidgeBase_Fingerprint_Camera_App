from tornado import websocket, web, ioloop
import json
import random
import string
import base64
import bcrypt
import pymongo


cl = []
base_address = "/home/bhavinja/Documents/ContactlessFingerprint_Data/"
mapping = {}

with open("mapping.csv") as file:
    lines = file.readlines()
    for line in lines:
        mapping[line.split(",")[0]] = line.split(",")[1] 

class SocketHandler(websocket.WebSocketHandler):
    def check_origin(self, origin):
        return True

    def open(self):
        cl.append(self)
        print("Connected Created")
        result = {
            "message": "Connected",
            "type": "connection"
        }
        self.write_message(json.dumps(result))

    def on_message(self, message):
        print("Message Received", type(message))
        data = json.loads(message)
        personid = str(int(data["personid"]))
        fileid = mapping[personid]

        if(data["type"] == "Picture_Left"):
            with open(base_address + '/images/' + data["sessionid"] + "_" +fileid + "_" + data["setting"]  + "_LEFT_image_fingerprint" + ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(8)) + ".png", "wb") as fh:
                photo = data["photo"]
                fh.write(base64.decodebytes(str.encode(photo)))
                result = {
                    "message": "Message Received",
                    "type": "Picture_Left"
                }
                self.write_message(json.dumps(result))

        if(data["type"] == "Picture_Right"):
            with open(base_address + '/images/' + data["sessionid"] + "_" +fileid + "_" + data["setting"]  +  "_RIGHT_image_fingerprint" + ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(8)) + ".png", "wb") as fh:
                photo = data["photo"]
                fh.write(base64.decodebytes(str.encode(photo)))
                result = {
                    "message": "Message Received",
                    "type": "Picture_Right"
                }
                self.write_message(json.dumps(result))
    def on_close(self):
        print("Connection Closed")

class ApiHandler(web.RequestHandler):
    @web.asynchronous
    def get(self, *args):
        self.finish()
        id = self.get_argument("id")
        value = self.get_argument("value")
        data = {"id": id, "value" : value}
        data = json.dumps(data)
        for c in cl:
            c.write_message(data)

    @web.asynchronous
    def post(self):
        data = json.loads(self.request.body)
        print(data.keys())
        personid = str(int(data["personid"]))
        fileid = mapping[personid]

        if(data["type"] == "Authenticate"):
            result = {
                    "message": "Authentication Unsuccessful",
                    "status_code": 400,
                    "type": "Authenticate"
                    }
            sessionid = data["sessionid"]
            personid =fileid
            user = None
            result = {
                        "message": "Authentication Successful",
                        "status_code": 200,
                        "type": "Authenticate"
                        }
            

        if(data["type"] == "Video_Left"):
            with open(base_address + '/videos/' + data["sessionid"] + "_" +fileid + "_" + data["setting"]  + "_LEFT_video_fingerprint" + ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(8)) + ".mp4", "wb") as fh:
                photo = data["photo"]
                fh.write(base64.decodebytes(str.encode(photo)))
                result = {
                    "message": "Message Received",
                    "type": "Video_Left"
                }
                print(result)

        if(data["type"] == "Video_Right"):
            with open(base_address + '/videos/' + data["sessionid"] + "_" +fileid + "_" + data["setting"]  + "_RIGHT_video_fingerprint" + ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(8)) + ".mp4", "wb") as fh:
                photo = data["photo"]
                fh.write(base64.decodebytes(str.encode(photo)))
                result = {
                    "message": "Message Received",
                    "type": "Video_Right"
                }
                print(result)
        self.set_header("Content-Type", 'application/json')
        self.write(json.dumps(result))
        self.finish() 


app = web.Application([
    (r'/ws', SocketHandler),
    (r'/api', ApiHandler)
])

if __name__ == '__main__':
    app.listen(8888)
    print("Server on:", 8888, " :Started")
    ioloop.IOLoop.instance().start()