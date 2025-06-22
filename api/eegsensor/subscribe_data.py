from cortex import Cortex
import time
import threading

class Subscribe():
    def __init__(self, app_client_id, app_client_secret, **kwargs):
        print("Subscribe __init__")
        self.c = Cortex(app_client_id, app_client_secret, debug_mode=True, **kwargs)
        self.c.bind(create_session_done=self.on_create_session_done)
        self.c.bind(new_data_labels=self.on_new_data_labels)
        self.c.bind(new_eeg_data=self.on_new_eeg_data)
        self.c.bind(new_mot_data=self.on_new_mot_data)
        self.c.bind(new_dev_data=self.on_new_dev_data)
        self.c.bind(new_met_data=self.on_new_met_data)
        self.c.bind(new_pow_data=self.on_new_pow_data)
        self.c.bind(inform_error=self.on_inform_error)

        self.streams = []
        self.data_buffer = []  # to store received data
        self.collecting = False

    def start(self, streams, headsetId=''):
        self.streams = streams

        if headsetId != '':
            self.c.set_wanted_headset(headsetId)

        self.c.open()

        # start a timer thread to stop subscription after 15 seconds
        threading.Thread(target=self._stop_after_duration, args=(15,)).start()

    def _stop_after_duration(self, duration):
        print(f"Starting data collection for {duration} seconds...")
        self.collecting = True
        time.sleep(duration)
        self.collecting = False

        print("Stopping subscription...")
        self.unsub(self.streams)
        self.c.close()
        print(f"Collected {len(self.data_buffer)} data points.")

        # you can process self.data_buffer here or print it
        for d in self.data_buffer:
            print(d)

    def sub(self, streams):
        self.c.sub_request(streams)

    def unsub(self, streams):
        self.c.unsub_request(streams)

    # Example: collect EEG and pow data only, you can add others if needed
    def on_new_eeg_data(self, *args, **kwargs):
        data = kwargs.get('data')
        if self.collecting:
            self.data_buffer.append({'stream': 'eeg', 'data': data})

    def on_new_pow_data(self, *args, **kwargs):
        data = kwargs.get('data')
        if self.collecting:
            self.data_buffer.append({'stream': 'pow', 'data': data})

    # Add other handlers as you want to collect data
    def on_new_mot_data(self, *args, **kwargs):
        data = kwargs.get('data')
        if self.collecting:
            self.data_buffer.append({'stream': 'mot', 'data': data})

    def on_create_session_done(self, *args, **kwargs):
        print('Session created, subscribing now...')
        self.sub(self.streams)

    def on_inform_error(self, *args, **kwargs):
        error_data = kwargs.get('error_data')
        print(f"Error: {error_data}")

# Usage
def main():
    your_app_client_id = 'YOUR_CLIENT_ID'
    your_app_client_secret = 'YOUR_CLIENT_SECRET_KEY'

    s = Subscribe(your_app_client_id, your_app_client_secret)
    streams = ['eeg', 'pow', 'mot']
    s.start(streams)

if __name__ == '__main__':
    main()
