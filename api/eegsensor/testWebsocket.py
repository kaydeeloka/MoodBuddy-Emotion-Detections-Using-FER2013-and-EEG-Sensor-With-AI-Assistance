#Test websocket connection
import websocket
import ssl

try:
    ws = websocket.WebSocket(sslopt={"cert_reqs": ssl.CERT_NONE})
    ws.connect("wss://localhost:6868", timeout=10)
    ws.send('{"id":1,"jsonrpc":"2.0","method":"getCortexInfo"}')
    result = ws.recv()
    print("Connection successful:", result)
    ws.close()
except Exception as e:
    print("Connection failed:", e)
