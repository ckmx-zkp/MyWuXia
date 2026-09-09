from pathlib import Path
import re
import subprocess
import sys

def patch_config(text):
    match = re.search(r"location\s+/api/\s*\{[^{}]*\}", text)
    if match:
        block = match.group()
        if re.search(r"proxy_read_timeout\s+[^;]+;", block):
            block = re.sub(r"proxy_read_timeout\s+[^;]+;", "proxy_read_timeout 75s;", block)
        else:
            block = block.replace("{", "{\n        proxy_read_timeout 75s;", 1)
        return text[:match.start()] + block + text[match.end():]
    block = """    location /api/ {
        proxy_pass http://127.0.0.1:8083;
        proxy_http_version 1.1;
        proxy_read_timeout 75s;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
    }

"""
    needle = "    location /"
    if needle not in text:
        raise ValueError("nginx conf has no location / to insert /api/")
    return text.replace(needle, block + needle, 1)


if __name__ == "__main__":
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "/etc/nginx/conf.d/jianghu.conf")
    original = path.read_text()
    patched = patch_config(original)
    if patched != original:
        path.write_text(patched)
        try:
            subprocess.check_call(["nginx", "-t"])
            subprocess.check_call(["nginx", "-s", "reload"])
        except Exception:
            path.write_text(original)
            raise
