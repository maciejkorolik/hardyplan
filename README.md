# Co dziś w Hardym? 💪

A web app that automatically scrapes and displays daily training schedules from [Hardy Wyższa Forma](https://www.hardywyzszaforma.pl/) gym in Wrocław, Poland.

## What it does

Instead of checking the gym's blog every day, this app:

- 🤖 Automatically scrapes new training schedules daily at 8 AM
- 🧠 Uses AI to parse and structure the workout data
- 📱 Shows a clean, mobile-friendly view of today's training plan
- 📅 Lets you browse schedules from other days
- 💾 Stores historical data so you can check past workouts

## Tech Stack

- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **AI**: Vercel AI SDK + Google Gemini for schedule parsing
- **Scraping**: Firecrawl API
- **Database**: Upstash Redis (Vercel KV)
- **Hosting**: Vercel (with cron jobs)

## Setup

1. Clone the repo:

```bash
git clone https://github.com/yourusername/hardyplan.git
cd hardyplan
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables (create `.env.local`):

```bash
# Firecrawl API
FIRECRAWL_API_KEY=your_key_here

# Google AI (Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here

# Upstash Redis (from Vercel KV)
KV_REST_API_URL=your_url_here
KV_REST_API_TOKEN=your_token_here

# Blog source
BLOG_CATEGORY_URL=https://www.hardywyzszaforma.pl/blog/categories/plan-treningowy

# Cron security
CRON_SECRET=your_random_secret

# App URL (production only)
NEXT_PUBLIC_URL=https://hardyplan.pl
```

4. Run locally:

```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000)

6. _(Optional)_ Populate initial data by triggering the scrape endpoint:

```bash
# Replace YOUR_CRON_SECRET with the value from your .env file
curl -X POST http://localhost:3000/api/scrape \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

The cron job will automatically run daily at 8 AM to fetch new schedules.

## Deployment

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/hardyplan)

Make sure to:

1. Add all environment variables in Vercel dashboard
2. Connect an Upstash Redis database (Vercel KV)
3. The cron job will run automatically

## Contributing

This is a personal project, but contributions are welcome! Feel free to:

- 🐛 Report bugs
- 💡 Suggest features
- 🔧 Submit pull requests

## License

MIT

## Disclaimer

This app is not affiliated with Hardy Wyższa Forma gym. It's an unofficial tool created by a gym member to make accessing training schedules easier.

---

Made with ❤️ by [Maciej Korolik](https://www.maciejkorolik.com)
