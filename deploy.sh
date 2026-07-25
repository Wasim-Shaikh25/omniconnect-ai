#!/usr/bin/env bash
set -e

TARGET=${TARGET:-fly}
APP_NAME=${APP_NAME:-omniconnect-ai}

echo "🚀 OmniConnect AI deployment"
echo "Target: $TARGET"
echo "App name: $APP_NAME"
echo ""

echo "Installing dependencies..."
npm ci

echo "Generating Prisma client..."
npx prisma generate

echo "Building Next.js app..."
npm run build

case "$TARGET" in
  fly)
    if ! command -v flyctl &> /dev/null; then
      echo "❌ flyctl is not installed. Install it from https://fly.io/docs/hands-on/install-flyctl/"
      exit 1
    fi

    if [ ! -f "fly.toml" ]; then
      echo "❌ fly.toml not found. Run 'fly launch' or copy fly.toml.example."
      exit 1
    fi

    echo "Deploying to Fly.io..."
    flyctl deploy --app "$APP_NAME"
    ;;

  vercel)
    if ! command -v npx &> /dev/null; then
      echo "❌ npx is not available."
      exit 1
    fi

    if [ -n "$VERCEL_TOKEN" ]; then
      echo "Deploying to Vercel (with token)..."
      npx vercel --prod --token "$VERCEL_TOKEN"
    else
      echo "Deploying to Vercel..."
      npx vercel --prod
    fi
    ;;

  docker)
    if ! command -v docker &> /dev/null; then
      echo "❌ Docker is not installed."
      exit 1
    fi

    echo "Building Docker image..."
    docker build -t "$APP_NAME" .
    echo ""
    echo "Run with:"
    echo "  docker run -p 3000:3000 --env-file .env.production $APP_NAME"
    ;;

  *)
    echo "❌ Unknown TARGET: $TARGET"
    echo "Usage: TARGET=fly|vercel|docker ./deploy.sh"
    exit 1
    ;;
esac

echo "✅ Done"
