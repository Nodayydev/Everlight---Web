#!/bin/bash
set -e

echo "📦 Installing dependencies..."
npm install

echo "🚀 Starting Everlight server..."
node server.js
