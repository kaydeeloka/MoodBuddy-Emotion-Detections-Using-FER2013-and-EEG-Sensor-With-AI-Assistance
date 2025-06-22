import cv2
import numpy as np
import base64

# exception handler for preprocessing errors
class PreprocessingError(Exception):
    def __init__(self, user_message, developer_message):
        super().__init__(developer_message)
        self.user_message = user_message
        self.developer_message = developer_message
        
generic_user_message = "An error occurred while processing the image. Please try again."

# Preprocess the image by greyscaling, detecting face, cropping to bounding box, and resizing
# Note: do not normalise the pixel values as the first stage of the model does this

def b64_to_numpy(base_64_image: str) -> np.ndarray:
    try:
        # decode the base64 image
        decoded_image = base64.b64decode(base_64_image)
        # convert the image to numpy array
        np_image = np.frombuffer(decoded_image, dtype=np.uint8)
        # decode the numpy array to image formay that opencv can read
        cv2_image = cv2.imdecode(np_image, cv2.IMREAD_COLOR)

        if cv2_image is None:
            raise PreprocessingError(generic_user_message, "Error in decoding base64 image: cv2 image is None")

        return cv2_image
    except Exception as e:
        raise PreprocessingError(generic_user_message, f"Error in decoding base64 image: {e}")

# greyscale the image
def greyscale(image: np.ndarray) -> np.ndarray:
    try:
        return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    except Exception as e:
        raise PreprocessingError(generic_user_message, f"Error in greyscaling image: {e}")

# find the largest face in the image - 
# haarcascadae often mistakenly detects multiple faces - the largest is usually the correct one
def find_largest_face(faces: list) -> tuple:
    largest_face = None
    max_area = 0
    
    for x, y, w, h in faces:
        area = w * h
        if area > max_area:
            max_area = area
            largest_face = (x, y, w, h)
            
    return largest_face

def detect_and_crop_to_face(image: np.ndarray) -> np.ndarray:
    try:
        # load the haarcascade for face detection
        haar_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')    
        
        # check if haarcascade was loaded
        if haar_cascade.empty():
            raise PreprocessingError(generic_user_message, "Failed to load haarcascade")

        
        # detect faces in the image
        face = haar_cascade.detectMultiScale(image, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
        
        # throw error if no face is detected
        if len(face) == 0:
            raise PreprocessingError("No face detected, please ensure you are facing the camera and face is unobstructed", "No face detected")
        
        # get the largest face in case multiple faces are detected
        if len(face) > 1:
            x, y, w, h = find_largest_face(face)
        else:
            x, y, w, h = face[0]

        # crop the image to the detected face
        cropped_face = image[y:y+h, x:x+w]
        
        return cropped_face
    
    except PreprocessingError as e:
        raise e
    except Exception as e:
        raise PreprocessingError(generic_user_message, f"Error in detecting and cropping face: {e}")
    
# resize the image to 48x48 as expected by the model
def resize(image: np.ndarray) -> np.ndarray:
    try:
        return cv2.resize(image, (48, 48), interpolation=cv2.INTER_AREA)
    except Exception as e:
        print("Error in resizing image:", e)
        raise PreprocessingError(generic_user_message, f"Error in resizing image: {e}")
    
# preprocessing pipeline
def preprocess(base64_image: str) -> np.ndarray:
    try: 
        np_image = b64_to_numpy(base64_image)
        greyscale_image = greyscale(np_image)
        cropped_face = detect_and_crop_to_face(greyscale_image)
        resized_image = resize(cropped_face)
        # add the channel dimension to match the model input shape
        preprocessed_image = np.expand_dims(resized_image, axis=-1)
        return preprocessed_image
    except PreprocessingError as e:
        raise e
    except Exception as e:
        raise PreprocessingError(generic_user_message, f"Error in preprocessing image: {e}")
