from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import base64
from face_tracker import get_head_pose

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            # Clean up the base64 string
            if "," in data:
                data = data.split(",")[1]
                
            img_data = base64.b64decode(data)
            np_arr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if img is not None:
                # Flip the image horizontally to match mirrored frontend
                img = cv2.flip(img, 1)
                direction, is_centered = get_head_pose(img)
                await websocket.send_json({
                    "direction": direction,
                    "centered": is_centered
                })
            else:
                await websocket.send_json({"error": "Invalid image format"})
                
    except WebSocketDisconnect:
        print("Client disconnected normally")
    except Exception as e:
        print(f"Error processing frame: {e}")

# uvicorn main:app --reload --port 8000
