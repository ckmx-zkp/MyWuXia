from pathlib import Path
import subprocess
import sys

path = Path(sys.argv[1] if len(sys.argv) > 1 else "/etc/nginx/conf.d/jianghu.conf")
text = path.read_text()
if "location /api/" in text:
    sys.exit(0)
block = """    location /api/ {
        proxy_pass http://127.0.0.1:8083;
        proxy_http_version 1.1;
        proxy_read_timeout 45s;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
    }

"""
needle = "    location /"
if needle not in text:
    raise SystemExit("nginx conf has no location / to insert /api/")
path.write_text(text.replace(needle, block + needle, 1))
subprocess.check_call(["nginx", "-t"])
subprocess.check_call(["nginx", "-s", "reload"])
