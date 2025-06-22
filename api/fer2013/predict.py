import os
import numpy as np
import tensorflow as tf

# Emotion labels (make sure order matches your model)
emotion_labels = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']

# Use:
file_path = "fer2013/model/fer_emotion_model.h5"
print(os.path.exists(file_path))

# Load the model once at module level
model = tf.keras.models.load_model(file_path)

def load_model_and_predict(input_batch: np.ndarray) -> str:
    try:
        # input_batch shape: (1, 48, 48, 1), normalized to [0,1]
        prediction = model.predict(input_batch, verbose=0)
        predicted_label = emotion_labels[np.argmax(prediction)]
        return predicted_label
    except Exception as e:
        print(f"Error during prediction: {e}")
        return "error"
