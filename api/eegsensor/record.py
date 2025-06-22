from cortex import Cortex
import time
import os
import uuid
import threading

class Record:
    def __init__(self, client_id, client_secret):
        self.client_id = client_id
        self.client_secret = client_secret
        self.cortex = Cortex(client_id, client_secret, debug_mode=False)

        # Bind events
        self.cortex.bind(create_session_done=self.on_create_session_done)
        self.cortex.bind(create_record_done=self.on_create_record_done)
        self.cortex.bind(stop_record_done=self.on_stop_record_done)
        self.cortex.bind(warn_record_post_processing_done=self.on_post_process_done)
        self.cortex.bind(export_record_done=self.on_export_done)

        self.export_ready = threading.Event()

    def start_and_wait(self, duration_s=15):
        """
        Starts EEG recording and waits until export is ready.
        Returns the path to the exported CSV.
        """
        self.record_title = f"record_{uuid.uuid4().hex[:6]}"
        self.record_description = "EEG band power recording"
        self.duration_s = duration_s

        # Export config
        self.export_folder = "data"
        self.export_data_types = ["BP"]
        self.export_format = "CSV"
        self.export_version = "V2"

        os.makedirs(self.export_folder, exist_ok=True)
        self.export_ready.clear()

        print("🚀 Starting EEG session...")
        self.cortex.open()

        print("🔄 Waiting for recording/export to complete...")
        self.export_ready.wait(timeout=duration_s + 30)  # Give time for export

        print("📁 Scanning for exported CSV files...")
        csv_files = [f for f in os.listdir(self.export_folder) if f.endswith(".csv")]
        if not csv_files:
            print("❌ No CSV files found after export attempt.")
            return None

        latest_file = max(csv_files, key=lambda f: os.path.getctime(os.path.join(self.export_folder, f)))
        latest_path = os.path.join(self.export_folder, latest_file)
        print("✅ Exported CSV path:", latest_path)
        return latest_path

    # ----- Callbacks -----
    def on_create_session_done(self, *args, **kwargs):
        print("📡 Session created. Starting recording...")
        self.cortex.create_record(self.record_title, description=self.record_description)

    def on_create_record_done(self, *args, **kwargs):
        print("📝 Recording started.")
        threading.Thread(target=self._recording_timer).start()

    def _recording_timer(self):
        print(f"⏺️ Recording for {self.duration_s} seconds...")
        time.sleep(self.duration_s)
        print("⏹️ Stopping recording now...")
        self.cortex.stop_record()

    def on_stop_record_done(self, *args, **kwargs):
        print("🧠 EEG recording stopped. Starting export...")
        print("➡️ Stop record callback data:", kwargs)
        self.record_id = kwargs.get("data", {}).get("uuid")

        if self.record_id:
            print("📤 Exporting record ID:", self.record_id)
            self.cortex.export_record(
                folder=self.export_folder,
                stream_types=self.export_data_types,
                format=self.export_format,
                record_ids=[self.record_id],
                version=self.export_version
            )
        else:
            print("❌ No record ID received. Export skipped.")

    def on_post_process_done(self, *args, **kwargs):
        pass  # Optional: add debug print here if needed

    def on_export_done(self, *args, **kwargs):
        print("✅ Export complete. Closing Cortex...")
        self.cortex.close()
        self.export_ready.set()
