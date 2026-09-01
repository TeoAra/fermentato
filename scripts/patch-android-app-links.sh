#!/usr/bin/env bash
set -euo pipefail

MANIFEST="${1:-android/app/src/main/AndroidManifest.xml}"
HOST="${2:-fermenta.to}"

if [[ ! -f "$MANIFEST" ]]; then
  echo "ERRORE: AndroidManifest non trovato: $MANIFEST" >&2
  exit 1
fi

python3 - "$MANIFEST" "$HOST" <<'PY'
import re
import sys

path, host = sys.argv[1], sys.argv[2]
text = open(path, encoding="utf-8").read()

activity_pattern = re.compile(
    r'(?P<open><activity\b(?:(?!</activity>).)*?(?:\.MainActivity|MainActivity)(?:(?!</activity>).)*?>)'
    r'(?P<body>.*?)'
    r'(?P<close></activity>)',
    re.DOTALL,
)
match = activity_pattern.search(text)
if not match:
    raise SystemExit("ERRORE: MainActivity non trovata nel manifest")

marker = "FERMENTA_APP_LINKS"
body = match.group("body")
if marker not in body:
    indent_match = re.search(r'\n([ \t]*)</activity>', match.group(0))
    indent = indent_match.group(1) if indent_match else "        "
    child = indent + "    "
    filters = f'''
{child}<!-- {marker}: verified HTTPS links -->
{child}<intent-filter android:autoVerify="true">
{child}    <action android:name="android.intent.action.VIEW" />
{child}    <category android:name="android.intent.category.DEFAULT" />
{child}    <category android:name="android.intent.category.BROWSABLE" />
{child}    <data android:scheme="https" android:host="{host}" />
{child}</intent-filter>
{child}<!-- {marker}: custom-scheme fallback -->
{child}<intent-filter>
{child}    <action android:name="android.intent.action.VIEW" />
{child}    <category android:name="android.intent.category.DEFAULT" />
{child}    <category android:name="android.intent.category.BROWSABLE" />
{child}    <data android:scheme="fermentato" />
{child}</intent-filter>
{indent}'''
    replacement = match.group("open") + body.rstrip() + filters + match.group("close")
    text = text[:match.start()] + replacement + text[match.end():]
    open(path, "w", encoding="utf-8").write(text)

checks = [
    marker,
    'android:autoVerify="true"',
    'android:scheme="https"',
    f'android:host="{host}"',
    'android:scheme="fermentato"',
]
updated = open(path, encoding="utf-8").read()
missing = [value for value in checks if value not in updated]
if missing:
    raise SystemExit("ERRORE: verifica App Links fallita: " + ", ".join(missing))

print(f"App Links Android verificati nel manifest per https://{host}")
PY