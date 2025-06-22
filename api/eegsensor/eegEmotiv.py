# eegsensor.py stay in eegsensor folder to connect with cortex
import random
import threading
import time
import socket
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import websocket
from .cortex import Cortex


router = APIRouter()

# Global variables
lock = threading.Lock()
band_power_data = {}
eeg_subscriber = None

# Band labels and descriptions
band_labels = {
    'theta': 'Drowsiness, meditation',
    'alpha': 'Relaxation, creativity',
    'lowbeta': 'Focus, alertness',
    'highbeta': 'Anxiety, engagement', 
    'gamma': 'Information processing'
}

# EEG Subscriber class
class EEGSubscribe:
    def __init__(self, client_id: str, client_secret: str):
        self.cortex = Cortex(client_id, client_secret, debug_mode=True)
        self.latest_pow_data = None
        self.lock = threading.Lock()
        self.subscribed = False
        self.connected = False
        self.session_created = False
        self.is_collecting = False
        self.connection_thread = None
        
        # Bind Cortex events
        self.cortex.bind(new_pow_data=self.on_new_pow_data)
        self.cortex.bind(create_session_done=self.on_create_session_done)
        self.cortex.bind(inform_error=self.on_inform_error)

    def on_new_pow_data(self, *args, **kwargs):
        """Handle new band power data from Cortex"""
        if not self.is_collecting:
            return
            
        data = kwargs.get('data')
        if data:
            with self.lock:
                self.latest_pow_data = data
                print(f"New EEG data received: {data}")

    def on_create_session_done(self, *args, **kwargs):
        """Handle session creation completion"""
        print("Session created successfully")
        self.session_created = True

    def on_inform_error(self, *args, **kwargs):
        """Handle Cortex errors"""
        error_data = kwargs.get('error_data')
        print(f"Cortex error: {error_data}")
        self.connected = False

    def _connect_worker(self):
        """Worker method to handle connection in separate thread"""
        try:
            print("Opening Cortex WebSocket...")
            self.cortex.open()
            time.sleep(2)  # Give more time for connection
            
            if self.cortex.ws and self.cortex.ws.sock and self.cortex.ws.sock.connected:
                print("WebSocket connected, querying headsets...")
                headsets = self.cortex.query_headset()
                if headsets:
                    self.connected = True
                    print("Headset found:", headsets)
                    headset_id = headsets[0]['id']
                    self.cortex.create_session(activate=True, headset_id=headset_id)
                    print("Session creation initiated")
                else:
                    self.connected = False
                    print("No headset found")
            else:
                self.connected = False
                print("WebSocket not connected")
                
        except websocket._exceptions.WebSocketConnectionClosedException:
            print("WebSocket closed unexpectedly")
            self.connected = False
        except Exception as e:
            print(f"Connection failed: {e}")
            self.connected = False

    def connect(self):
        """Start connection in background thread"""
        if self.connection_thread and self.connection_thread.is_alive():
            print("Connection already in progress")
            return
            
        self.connection_thread = threading.Thread(target=self._connect_worker, daemon=True)
        self.connection_thread.start()

    def start_data_collection(self):
        """Start collecting EEG data"""
        if not self.connected:
            raise Exception("Device not connected")
            
        if not self.session_created:
            raise Exception("Session not created")
            
        self.is_collecting = True
        if not self.subscribed:
            try:
                self.cortex.sub_request(['pow'])
                self.subscribed = True
                print("Started EEG data collection")
            except Exception as e:
                self.is_collecting = False
                raise Exception(f"Failed to start data collection: {e}")

    def stop_data_collection(self):
        """Stop collecting EEG data"""
        self.is_collecting = False
        if self.subscribed:
            try:
                self.cortex.unsub_request(['pow'])
                self.subscribed = False
                print("Stopped EEG data collection")
            except Exception as e:
                print(f"Failed to stop data collection: {e}")

    def disconnect(self):
        """Disconnect from Emotiv device"""
        try:
            self.is_collecting = False
            if self.subscribed:
                self.cortex.unsub_request(['pow'])
                self.subscribed = False
            if self.session_created:
                self.cortex.close_session()
                self.session_created = False
            if self.cortex.ws:
                self.cortex.close()
            self.connected = False
            print("Disconnected from Emotiv device")
        except Exception as e:
            print(f"Disconnect error: {e}")

    def get_band_power(self):
        """Get latest band power data"""
        with self.lock:
            return self.latest_pow_data

def update_band_power():
    """Background thread to generate simulated data"""
    global band_power_data, eeg_subscriber
    while True:
        with lock:
            if not eeg_subscriber or not eeg_subscriber.connected or not eeg_subscriber.is_collecting:
                # Generate simulated data when not connected or not collecting
                band_power_data.clear()
                for band in band_labels:
                    band_power_data[band] = round(random.uniform(5, 40), 2)
        time.sleep(1)

# Start background thread
threading.Thread(target=update_band_power, daemon=True).start()

# Initialize EEG subscriber
eeg_subscriber = EEGSubscribe(
    client_id="YOUR_CLIENT_ID",
    client_secret="YOUR_CLIENT_SECRET_KEY"
)

# API Endpoints
@router.post("/connect")
async def connect_device():
    """Connect to EEG device"""
    threading.Thread(target=eeg_subscriber.connect, daemon=True).start()
    return {"status": "connection started"}

@router.get("/bandpower")
def get_bandpower():
    """Get band power data"""
    with lock:
        total = sum(band_power_data.values())
        response = []
        for band, value in band_power_data.items():
            percentage = round((value / total) * 100, 2) if total > 0 else 0
            response.append({
                "band": band,
                "percentage": percentage,
                "description": band_labels[band]
            })
        return response

@router.post("/start-collection")
async def start_data_collection():
    """Start EEG data collection"""
    global eeg_subscriber
    
    try:
        if eeg_subscriber and eeg_subscriber.connected:
            eeg_subscriber.start_data_collection()
            return {"status": "success", "message": "Data collection started"}
        else:
            return {"status": "error", "message": "EEG device not connected"}
    except Exception as e:
        return {"status": "error", "message": f"Failed to start collection: {str(e)}"}

@router.post("/stop-collection")
async def stop_data_collection():
    """Stop EEG data collection"""
    global eeg_subscriber
    
    try:
        if eeg_subscriber:
            eeg_subscriber.stop_data_collection()
            return {"status": "success", "message": "Data collection stopped"}
        else:
            return {"status": "error", "message": "EEG subscriber not initialized"}
    except Exception as e:
        return {"status": "error", "message": f"Failed to stop collection: {str(e)}"}

@router.get("/status")
async def get_eeg_status():
    """Get current EEG connection status"""
    global eeg_subscriber
    
    if eeg_subscriber:
        return {
            "connected": eeg_subscriber.connected,
            "subscribed": eeg_subscriber.subscribed,
            "collecting": eeg_subscriber.is_collecting,
            "session_created": eeg_subscriber.session_created
        }
    else:
        return {
            "connected": False,
            "subscribed": False,
            "collecting": False,
            "session_created": False
        }

@router.get("/disconnect")
async def disconnect_eeg_device():
    """Disconnect from EEG device"""
    global eeg_subscriber
    
    try:
        if eeg_subscriber:
            eeg_subscriber.disconnect()
        return {"status": "disconnected", "message": "EEG device disconnected"}
    except Exception as e:
        return {"status": "error", "message": f"Failed to disconnect: {str(e)}"}
