#!/bin/bash
PAYLOAD_FILE=$1

if [ -z "$PAYLOAD_FILE" ]; then
  echo "Usage: ./simulate.sh <json_file>"
  exit 1
fi

# Export PATH to ensure npm is found
export PATH=$PATH:/opt/homebrew/bin:/usr/local/bin

# Run ABS CLI via npm run to access local dev environment
npm run abs -- simulate refund.requested -f "$PAYLOAD_FILE"
