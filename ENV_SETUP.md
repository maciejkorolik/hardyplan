# Environment Variables Setup

Create a `.env` file in the root directory with the following variables:

```bash
# Firecrawl API Configuration
FIRECRAWL_API_KEY=your_firecrawl_api_key_here

# Google AI (Gemini) Configuration
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key_here

# Upstash Redis Configuration
# Get these from Upstash console: https://console.upstash.com
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token_here

# Cron Job Security
CRON_SECRET=your_secure_random_secret_here

# Blog Configuration
BLOG_CATEGORY_URL=https://hardywyzszaforma.com/blog/categories/plan-treningowy
```

## Getting API Keys

### Firecrawl API Key

1. Sign up at https://firecrawl.dev
2. Get your API key from the dashboard
3. Add to `.env` as `FIRECRAWL_API_KEY`

### Google AI (Gemini) API Key

1. Go to https://ai.google.dev
2. Create a new API key
3. Add to `.env` as `GOOGLE_GENERATIVE_AI_API_KEY`

### Upstash Redis

1. Go to https://console.upstash.com
2. Create a new Redis database (select region closest to your users)
3. Go to database details
4. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
5. Add to `.env`

**Note**: Vercel now uses Upstash Redis for their KV storage. When deploying to Vercel, you can connect your Upstash database directly or let Vercel create one for you.

### Cron Secret

Generate a secure random string:

```bash
openssl rand -base64 32
```

## Vercel Deployment Setup

The cron job is configured in `vercel.json` to run daily at 6:00 AM UTC (8:00 AM Poland time).

### Environment Variables in Vercel

1. Add all environment variables to your Vercel project settings
2. Make sure `CRON_SECRET` matches your local `.env`
3. Connect Upstash Redis database to your Vercel project (or let Vercel create one)

### Smart Scraping Optimization

The scraper will automatically skip scraping if:

- You already have schedules for the next 14+ days
- Last update was less than 5 days ago

This saves API costs and respects the gym's posting schedule (1 week current + 1 week next).
