#!/bin/bash
cd /home/kavia/workspace/code-generation/open-api-integration-platform-225763-225772/frontend_app
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

