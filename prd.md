# Gym Training Schedule App - Product Requirements Document

## 1. Product Overview

### 1.1 Purpose

A Next.js application that automatically scrapes, parses, and displays daily training schedules from Hardy Wyższa Forma gym's blog, providing users with an easy-to-read interface for current and historical training plans.

### 1.2 User Problem

- Gym members need to check the blog daily for training schedules
- Blog format is not optimized for quick daily reference
- No easy way to access historical schedules
- Navigation through blog posts is cumbersome

### 1.3 Solution

Automated system that:

- Checks gym blog daily for new schedules
- Extracts and structures training data
- Presents clean, mobile-friendly interface
- Provides instant access to today's plan
- Archives historical data for reference

## 2. User Flows

### 2.1 Primary User Flow: View Today's Schedule

1. User opens app (homepage)
2. System displays current date and day name in Polish
3. System shows all training sessions available today
4. For each session, user sees:
   - Training type name
   - List of exercises
   - Training method
   - Duration
5. If no training today: "Brak treningów na dziś"

**Success Criteria**: User finds today's schedule in < 3 seconds

### 2.2 Secondary User Flow: Browse Other Days

1. User on homepage sees day navigation (previous/next buttons or week calendar)
2. User selects different day
3. System loads that day's schedule
4. Display updates with selected day's training sessions
5. User can navigate backward/forward through days

**Success Criteria**: User can check any day's schedule within 10 seconds

### 2.3 Secondary User Flow: View Historical Schedules

1. User clicks "Historia" link/button
2. System displays list of past weeks (most recent first)
3. User sees week ranges (e.g., "20/10-26/10")
4. User clicks on a week
5. System displays full week view with all days and sessions
6. User can navigate between weeks

**Success Criteria**: User can find last month's schedule within 15 seconds

### 2.4 System Flow: Daily Schedule Update (Automated)

**Trigger**: Vercel Cron job runs daily at 6:00 AM UTC (8:00 AM Poland time)

**Process**:

1. System accesses blog category page: `blog/categories/plan-treningowy`
2. System extracts links to blog posts (expects 2: current week + next week)
3. For each discovered link:
   - Fetch full blog post content using Firecrawl
   - Extract markdown content
   - Send markdown to LLM with parsing prompt
   - LLM returns structured JSON
   - Validate JSON structure
4. For each parsed schedule:
   - Check if week already exists in database
   - If new: Store in Vercel KV with metadata (source URL, scrape timestamp)
   - If duplicate: Skip
   - Update "latest week" pointer
5. Log operation results (success/failure, URLs processed, errors)

**Success Criteria**:

- Process completes in < 2 minutes
- 95%+ success rate
- No duplicate data stored

## 3. Data Flows

### 3.1 Data Source Flow

```
Gym Blog (plan-treningowy category)
    ↓
Firecrawl API (scrape category page)
    ↓
Extract 2 most recent blog post URLs
    ↓
Firecrawl API (scrape each post for markdown)
    ↓
Markdown Content
```

### 3.2 Data Processing Flow

```
Raw Markdown
    ↓
LLM via Vercel AI SDK (with parsing prompt)
    ↓
Structured JSON (WeekSchedule object)
    ↓
Validation (check required fields, date formats)
    ↓
Duplicate Detection (check if week exists)
    ↓
Storage (Vercel KV)
```

### 3.3 Data Retrieval Flow

**For Today's Schedule**:

```
User Request
    ↓
API: Get current date
    ↓
API: Find matching week in KV
    ↓
API: Filter to today's day
    ↓
Return DaySchedule object
    ↓
Frontend: Display training sessions
```

**For Historical Data**:

```
User Request
    ↓
API: Query all weeks from KV (sorted by date)
    ↓
Return list of WeekSchedule objects
    ↓
Frontend: Display week list
    ↓
User selects week
    ↓
Frontend: Display full week details
```

### 3.4 Database Structure Flow

**Storage Keys**:

- `schedules:{week}` → Full week schedule object
- `schedules:list` → Sorted set of all week identifiers (with timestamps)
- `schedules:latest` → Pointer to most recent week
- `logs:scraping:{date}` → Daily scraping logs

**Data Relationships**:

```
Week Schedule (1)
    ↓ contains
Days (7)
    ↓ contains
Training Sessions (1-4 per day)
    ↓ contains
Exercise List + Metadata
```

## 4. Data Models

### 4.1 Core Data Structure

**WeekSchedule**

- `week`: String (DD/MM-DD/MM format)
- `sourceUrl`: String (original blog post URL)
- `scrapedAt`: ISO timestamp
- `days`: Array of DaySchedule objects

**DaySchedule**

- `date`: String (DD.MM format)
- `dayName`: String (Polish day name)
- `trainingSessions`: Array of TrainingSession objects

**TrainingSession**

- `type`: String (training type name - NOT an enum, varies per day)
- `exercises`: Array of strings (exercise names in Polish)
- `trainingMethod`: String (e.g., "2 x EMOM", "4 rundy, co 2,5 min wykonaj parę ćwiczeń")
- `mainPartDuration`: String (e.g., "21 min")

### 4.2 Training Types (Examples - Not Exhaustive)

These vary and should not be hardcoded as enums:

- Speed
- Speed Beginners
- HYROX SPEED
- Athletic
- Athletic Beginners
- HYROX ATHLETIC
- FBB
- Calisthenics
- Fast&strong

## 5. UI Requirements

### 5.1 Language

- **All user-facing text**: Polish
- **All code, comments, documentation**: English

### 5.2 Polish UI Text (Required)

- "Dzisiaj" (Today)
- "Plan Treningowy" (Training Schedule)
- "Ćwiczenia" (Exercises)
- "Metoda treningowa" (Training Method)
- "Czas trwania" (Duration)
- "Brak treningów na dziś" (No trainings today)
- "Historia" (History)
- "Tydzień" (Week)
- "Ładowanie..." (Loading)
- "Wystąpił błąd" (An error occurred)

Day names:

- Poniedziałek, Wtorek, Środa, Czwartek, Piątek, Sobota, Niedziela

### 5.3 Visual Requirements

**Homepage**:

- Clean, minimal design
- Large, readable typography
- Current date prominently displayed
- Training sessions in card format
- Clear visual hierarchy (type → exercises → method → duration)
- Mobile-first responsive design

**Training Session Card**:

- Training type as header (bold, larger text)
- Exercise list (bulleted or numbered)
- Training method clearly separated
- Duration badge or label
- Visual distinction between multiple sessions on same day

**Navigation**:

- Simple day selector (previous/next or week calendar)
- "Historia" link/button clearly visible
- Back navigation on history pages

### 5.4 States to Handle

**Loading States**:

- Initial page load
- Switching between days
- Loading historical data

**Empty States**:

- No training scheduled for selected day
- No historical data available
- First time user (no data yet scraped)

**Error States**:

- Failed to load data
- Network error
- Invalid date selected

## 6. LLM Parsing Prompt

This prompt must be used when parsing markdown content via Vercel AI SDK:

```
You are a data extraction specialist. Parse the provided Polish gym training schedule into a structured JSON format.

## Input Format
The input is a weekly training schedule in Polish markdown format containing:
- Week date range (e.g., "Tydzień 20/10-26/10")
- Daily schedules with training sessions
- Each session includes: training type name, exercises, training method, and duration

## Output Requirements

Create a JSON object with this exact structure:

{
  "week": "DD/MM-DD/MM",
  "days": [
    {
      "date": "DD.MM",
      "dayName": "string",
      "trainingSessions": [
        {
          "type": "string",
          "exercises": ["string"],
          "trainingMethod": "string",
          "mainPartDuration": "string (number + unit)"
        }
      ]
    }
  ]
}

## Parsing Rules

1. **Week**: Extract from "Tydzień X" header
2. **Date**: Extract from format "DD.MM Day" (e.g., "20.10 Poniedziałek")
3. **Day Name**: Polish day name (Poniedziałek, Wtorek, Środa, Czwartek, Piątek, Sobota, Niedziela)
4. **Training Type**: Text after ⇒ symbol (e.g., "Speed", "Athletic", "HYROX SPEED")
   - Keep original casing and spacing
   - Do NOT convert to enum - preserve exact text as it varies
   - Training types can include: "Speed", "Speed Beginners", "HYROX SPEED", "Athletic", "Athletic Beginners", "HYROX ATHLETIC", "FBB", "Calisthenics", "Fast&strong"
5. **Exercises**: Parse from "Ćwiczenia:" line
   - Split by commas
   - Trim whitespace
   - Keep original Polish names and abbreviations
6. **Training Method**: Extract from "Metoda treningowa:" line
   - Preserve full text including numbers
   - Examples: "2 x EMOM", "4 rundy, co 2,5 min wykonaj parę ćwiczeń", "WORK + TABATA"
7. **Duration**: Extract from "Czas pracy w części głównej:" or "Czas pracy w części głównej" line
   - Format: "XX min" (preserve as string)

## Special Cases
- Some days have multiple training sessions (different types) - include all
- Training type names may include "Beginners", "HYROX", etc.
- Handle both "głównej:" and "głównej" spellings
- Ignore non-training content (navigation, images, footer text, links)
- If a day has no sessions, include it with empty trainingSessions array

## Example Output
{
  "week": "20/10-26/10",
  "days": [
    {
      "date": "20.10",
      "dayName": "Poniedziałek",
      "trainingSessions": [
        {
          "type": "Speed",
          "exercises": ["cal SKI/bike ERG", "box jump", "DU (skakanka)", "DB's hang muscle clean + push press"],
          "trainingMethod": "2 x EMOM",
          "mainPartDuration": "21 min"
        },
        {
          "type": "HYROX SPEED",
          "exercises": ["ROW", "burpee broad jump", "SKI/bike ERG", "slam ball lift + slam ball lunge"],
          "trainingMethod": "4 rundy, co 1:30",
          "mainPartDuration": "24 min"
        }
      ]
    }
  ]
}

Parse the entire weekly schedule following these rules strictly. Return only valid JSON, no additional text.
```

## 7. API Requirements

### 7.1 Endpoints Needed

**POST /api/scrape**

- Purpose: Cron job trigger
- Security: Requires CRON_SECRET authorization
- Response: Success status, number of schedules processed

**GET /api/schedules/today**

- Purpose: Get current day's schedule
- Response: Single DaySchedule object or null

**GET /api/schedules**

- Purpose: Get all schedules or specific week
- Query params: Optional `week` parameter
- Response: Array of WeekSchedule objects

**GET /api/schedules/[date]**

- Purpose: Get specific day's schedule
- Params: Date in DD.MM format
- Response: Single DaySchedule object or null

### 7.2 API Response Requirements

- Always return proper HTTP status codes
- Include error messages in Polish for user-facing errors
- Use consistent JSON structure
- Handle missing data gracefully (return null, not 404)

## 8. Technical Stack Requirements

### 8.1 Required Technologies

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Vercel KV (Redis)
- **Scraping**: Firecrawl API
- **AI Processing**: Vercel AI SDK
- **Deployment**: Vercel
- **Cron**: Vercel Cron

### 8.2 Environment Variables Needed

- `FIRECRAWL_API_KEY`
- Vercel KV credentials (auto-provided by Vercel)
- LLM API credentials (via Vercel AI SDK)
- `CRON_SECRET` (for securing cron endpoint)
- `BLOG_CATEGORY_URL` (gym blog category URL)

### 8.3 Cron Configuration

- Run daily at 6:00 AM UTC (8:00 AM Poland time)
- Target endpoint: `/api/scrape`
- Must be configured in `vercel.json`

## 9. Functional Requirements

### 9.1 Must Have (MVP)

- [x] Daily automated scraping at 6 AM
- [x] Parse markdown using LLM with provided prompt
- [x] Store schedules in Vercel KV
- [x] Display today's schedule on homepage
- [x] Show all training sessions with details
- [x] Navigate between days
- [x] View historical schedules
- [x] Polish language UI
- [x] Mobile responsive design
- [x] Handle empty/error states
- [x] Prevent duplicate schedule storage

### 9.2 Should Have

- Loading states with visual feedback
- Error logging for scraping failures
- Retry logic for failed operations
- Cache today's schedule (short TTL)
- Week-view calendar for navigation

### 9.3 Nice to Have (Future)

- Search functionality
- Filter by training type
- Export schedule to calendar
- Share specific day/week
- Offline support (PWA)
- Push notifications for new schedules

## 10. Non-Functional Requirements

### 10.1 Performance

- Homepage loads in < 2 seconds
- API responses in < 500ms
- Daily scraping completes in < 2 minutes
- Support 100+ concurrent users

### 10.2 Reliability

- 99% uptime for frontend
- 95%+ success rate for daily scraping
- Graceful degradation when scraping fails
- No data loss

### 10.3 Security

- Secure cron endpoint with secret
- Validate all external data (markdown content)
- No sensitive user data stored
- HTTPS only

### 10.4 Usability

- Intuitive navigation
- Clear visual hierarchy
- Accessible on mobile devices
- No registration required
- Fast load times

## 11. Edge Cases & Error Handling

### 11.1 Scraping Edge Cases

- Blog structure changes → Log error, alert for manual review
- Category page has no posts → Log, skip processing
- Blog post has malformed content → Skip, log error
- Network timeout → Retry up to 3 times
- Rate limiting from Firecrawl → Respect limits, queue requests

### 11.2 Parsing Edge Cases

- LLM returns invalid JSON → Retry once, log error
- Missing required fields → Skip schedule, log warning
- Inconsistent date formats → Try multiple parse strategies
- Unknown training types → Accept as-is (not enum)
- Extra days (8th day) → Include in data, don't filter

### 11.3 Display Edge Cases

- Future dates (next week schedule) → Show normally
- Past dates (old schedules) → Show in history
- Current day not in schedule → Show "Brak treningów"
- Multiple sessions same type → Display all separately
- Very long exercise lists → Ensure proper wrapping/scrolling

## 12. Success Metrics

### 12.1 Technical Success

- 95%+ scraping success rate
- 98%+ parsing accuracy
- Zero data corruption incidents
- < 500ms average API response time

### 12.2 User Success (Future Analytics)

- Daily active users
- Average session duration
- Bounce rate < 40%
- Return user rate

## 13. Development Phases

### Phase 1: Core Backend (Week 1)

**Goal**: Get data flowing from blog to database

- Set up Next.js project
- Configure Vercel KV
- Integrate Firecrawl API
- Create scraping endpoint
- Implement LLM parsing with Vercel AI SDK
- Store parsed data in KV
- Test with sample blog posts

**Deliverable**: Working scraping pipeline that stores schedules

### Phase 2: API Layer (Week 2)

**Goal**: Expose data through APIs

- Create today's schedule endpoint
- Create all schedules endpoint
- Create specific date endpoint
- Add duplicate detection logic
- Implement error handling
- Add request validation

**Deliverable**: Functional REST API returning schedule data

### Phase 3: Frontend - Today's View (Week 3)

**Goal**: Users can see today's schedule

- Build homepage layout
- Create training session card component
- Display today's schedule
- Add loading states
- Add empty states
- Polish language text
- Mobile responsive design

**Deliverable**: Functional homepage showing today's training

### Phase 4: Frontend - Navigation & History (Week 4)

**Goal**: Users can browse all schedules

- Add day navigation (prev/next)
- Create history page
- Implement week list view
- Add week detail view
- Connect all pages with routing

**Deliverable**: Complete navigation through all schedule data

### Phase 5: Automation & Polish (Week 5)

**Goal**: System runs automatically

- Configure Vercel Cron
- Test cron execution
- Add logging for operations
- Refine error handling
- Performance optimization
- Final UI polish
- Deploy to production

**Deliverable**: Fully automated, production-ready app

## 14. Testing Requirements

### 14.1 What to Test

**Scraping Flow**:

- Category page parsing
- Blog post content extraction
- Handling 0, 1, or 2 blog posts
- Network failures and retries

**Parsing Flow**:

- Valid markdown → correct JSON
- Invalid markdown → graceful failure
- Partial data → proper handling
- Edge case formats

**Storage Flow**:

- New schedule → stored correctly
- Duplicate schedule → not stored
- Data integrity maintained

**API Endpoints**:

- Correct data returned
- Proper error codes
- Query parameters work
- Missing data handled

**Frontend**:

- Today's schedule displays
- Navigation works
- Historical data loads
- Polish text displays correctly
- Mobile responsive
- Loading/error states work

### 14.2 Test Data

Use provided sample markdown (Tydzień 20/10-26/10) for testing parsing logic

## 15. Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured in Vercel
- [ ] Vercel KV database provisioned
- [ ] Firecrawl API key tested
- [ ] Cron job configured in vercel.json
- [ ] Test scraping on production blog
- [ ] Verify LLM parsing accuracy
- [ ] Test all API endpoints
- [ ] Check mobile responsiveness
- [ ] Verify Polish text displays correctly

### Post-Deployment

- [ ] Monitor first cron execution
- [ ] Check logs for errors
- [ ] Verify data in database
- [ ] Test frontend with real data
- [ ] Check performance metrics
- [ ] Set up error alerting (optional)

## 16. Future Enhancements (Post-MVP)

### Phase 2 Features

- User accounts for personalized tracking
- Favorite training types
- Personal workout logs
- Calendar export (iCal)
- Push notifications
- Dark mode

### Phase 3 Features

- Exercise video library
- Training history analytics
- Progress tracking
- Social features (comments, ratings)
- Coach integration
- Custom workout creation

## 17. Maintenance Plan

### Weekly

- Review scraping logs
- Check for any parsing errors
- Monitor API performance

### Monthly

- Clean old schedule data (keep 3 months minimum)
- Review LLM prompt effectiveness
- Check for blog structure changes

### As Needed

- Update scraping logic if blog changes
- Optimize LLM prompt for better accuracy
- Add new training types to documentation
- Performance tuning

---

**Document Version**: 1.0
**Last Updated**: October 18, 2024
**Status**: Ready for Development
**Target Launch**: 5 weeks from start
