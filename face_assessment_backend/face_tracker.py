import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import os
import urllib.request

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "face_landmarker.task")
if os.path.exists(MODEL_PATH) and os.path.getsize(MODEL_PATH) < 1000000:
    os.remove(MODEL_PATH) # remove corrupted

if not os.path.exists(MODEL_PATH):
    print("Downloading Face Landmarker model...")
    urllib.request.urlretrieve("https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task", MODEL_PATH)
    print("Download complete.")

base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
options = vision.FaceLandmarkerOptions(
    base_options=base_options,
    output_face_blendshapes=False,
    output_facial_transformation_matrixes=True,
    num_faces=1)

detector = vision.FaceLandmarker.create_from_options(options)

def get_head_pose(image):
    # Convert the color space from BGR to RGB
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
    
    # Process the image and find faces
    detection_result = detector.detect(mp_image)
    
    if not detection_result.face_landmarks:
        return "Not Detected", False
    
    face_landmarks = detection_result.face_landmarks[0]
    
    img_h, img_w, img_c = image.shape
    face_3d = []
    face_2d = []

    # 33 = left eye corner, 263 = right eye corner
    # 1 = nose tip, 61 = left mouth, 291 = right mouth, 199 = chin
    landmark_indices = [33, 263, 1, 61, 291, 199]
    for idx in landmark_indices:
        lm = face_landmarks[idx]
        x, y = int(lm.x * img_w), int(lm.y * img_h)
        face_2d.append([x, y])
        face_3d.append([x, y, lm.z]) 
        
    face_2d = np.array(face_2d, dtype=np.float64)
    face_3d = np.array(face_3d, dtype=np.float64)

    # Compute camera matrix
    focal_length = 1 * img_w
    cam_matrix = np.array([ [focal_length, 0, img_h / 2],
                            [0, focal_length, img_w / 2],
                            [0, 0, 1]])

    dist_matrix = np.zeros((4, 1), dtype=np.float64)

    # Solve PnP
    success, rot_vec, trans_vec = cv2.solvePnP(face_3d, face_2d, cam_matrix, dist_matrix)
    
    # Rotational matrix and angles
    rmat, jac = cv2.Rodrigues(rot_vec)
    angles, mtxR, mtxQ, Qx, Qy, Qz = cv2.RQDecomp3x3(rmat)
    
    # Calculate angles in degrees
    x = angles[0] * 360 # Pitch
    y = angles[1] * 360 # Yaw
    z = angles[2] * 360 # Roll
    
    direction = "center"
    
    # Tuning these thresholds is important
    if y < -12:
        direction = "left"
    elif y > 12:
        direction = "right"
    elif x < -10:
        direction = "down"
    elif x > 15:
        direction = "up"
        
    # Check if the nose is well-centered in the frame before starting
    nose_x = face_landmarks[1].x
    nose_y = face_landmarks[1].y
    
    # e.g., nose must be in the middle 40% of the screen
    is_centered = 0.30 < nose_x < 0.70 and 0.30 < nose_y < 0.70
    
    return direction, is_centered
