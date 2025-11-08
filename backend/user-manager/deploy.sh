#!/bin/bash
cd "$(dirname "$0")"
echo "Actualizando código de Lambda user-manager..."
aws lambda update-function-code \
  --function-name ia-control-user-manager \
  --zip-file fileb://index.mjs \
  --no-cli-pager
echo "✅ Lambda actualizada"
