- sudo apt update
- sudo apinstall -y ./google-chrome-stable_current_amd64.deb
- google-chrome --no-sandbox

Remove LOCK file in Chrome:
- find ~/.chrome-webtop/.config/google-chrome/ -name "Singleton*" -delete