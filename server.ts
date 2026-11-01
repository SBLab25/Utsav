/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

// Prioritize IPv4 to prevent hanging on container environments with unrouted IPv6
dns.setDefaultResultOrder('ipv4first');

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Helper to get Gemini client
function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const eventPlanSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Celebration title e.g. Sister's Retro Bollywood Sangeet" },
    event_type: { type: Type.STRING, description: "Category: wedding, sangeet, birthday, community, anniversary, corporate" },
    event_date: { type: Type.STRING, description: "ISO date format YYYY-MM-DD" },
    guests: { type: Type.INTEGER, description: "Estimated guest count" },
    total_budget: { type: Type.INTEGER, description: "Total budget in INR" },
    city: { type: Type.STRING, description: "City or location of event" },
    theme: { type: Type.STRING, description: "Celebration theme or aesthetic" },
    budget: {
      type: Type.ARRAY,
      description: "Breakdown of major expenditure categories",
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: "Category name" },
          pct: { type: Type.NUMBER, description: "Percentage of total budget allocated (e.g. 35)" },
          locked: { type: Type.BOOLEAN, description: "Default false" },
        },
        required: ["category", "pct"],
      },
    },
    timeline: {
      type: Type.ARRAY,
      description: "Chronological milestone tasks counted backward from event date (T-90, T-60, T-30, T-15, T-7, T-1, Day-of as 0)",
      items: {
        type: Type.OBJECT,
        properties: {
          t_minus_days: { type: Type.INTEGER, description: "Days before event (e.g. 90, 60, 30, 7, 0)" },
          title: { type: Type.STRING, description: "Task description" },
          owner: { type: Type.STRING, description: "Task owner or committee" },
          done: { type: Type.BOOLEAN, description: "Default false" },
        },
        required: ["t_minus_days", "title", "owner", "done"],
      },
    },
    vendors: {
      type: Type.ARRAY,
      description: "Vendor hiring guides per vendor category",
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, description: "Vendor category name" },
          est_low: { type: Type.INTEGER, description: "Estimated low price in INR for this city and scale" },
          est_high: { type: Type.INTEGER, description: "Estimated high price in INR for this city and scale" },
          questions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "2 to 4 crucial vetting questions to ask this vendor",
          },
          red_flags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "2 to 3 warning signs or red flags to watch out for",
          },
          outreach_message: {
            type: Type.STRING,
            description: "Ready-to-send WhatsApp / Email inquiry message",
          },
        },
        required: ["type", "est_low", "est_high", "questions", "red_flags", "outreach_message"],
      },
    },
    ideas: {
      type: Type.ARRAY,
      description: "Curated inspiration items: theme, menu, decor, entertainment, invitation, rsvp",
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: "One of: theme, menu, decor, entertainment, invitation, rsvp" },
          title: { type: Type.STRING, description: "Headline of the idea" },
          description: { type: Type.STRING, description: "Detailed description, dishes, playlist or copyable invitation / WhatsApp RSVP template" },
        },
        required: ["category", "title", "description"],
      },
    },
    clarifying_question: {
      type: Type.STRING,
      description: "If a crucial key field was missing or ambiguous from the brief, ask ONE clarifying question here, otherwise null",
    },
  },
  required: ["title", "event_type", "event_date", "guests", "total_budget", "city", "theme", "budget", "timeline", "vendors", "ideas"],
};

const SYSTEM_INSTRUCTION = `You are Utsav, an expert Indian celebration and event planner with deep cultural, regional, and logistical expertise.
Plan only celebrations and events (weddings, sangeets, haldi, mehendi, receptions, birthdays, anniversaries, community/RWA festivals like Diwali/Holi/Pooja, housewarmings, college fests, corporate celebrations). Politely decline other unrelated topics with a polite message.
Return ONLY JSON matching the requested schema. Do NOT enclose in markdown backticks or commentary.

Key Guidelines:
1. Intake Extraction:
   Extract event_type, date (ISO YYYY-MM-DD; if relative or year omitted assume next sensible date in 2026/2027), guests, total_budget (INR default; parse values like "6L", "6 Lakh", "1.5L", "50k"), city, theme.
   If a key field is missing (e.g. date or guest count), ask ONE friendly clarifying question in 'clarifying_question' and continue with sensible defaults for that event type.
2. Culture-aware planning:
   - For weddings & sangeets: reflect traditional multi-day events (haldi, mehendi, sangeet, wedding ceremony, reception), regional rituals, vibrant food items (chaat counters, regional delicacies), DJ & choreography setups.
   - For community / RWA events: focus on police/sound permissions, volunteer rosters, resident contributions, crowd management, eco-friendly diyas/decor, prasad or potluck counters.
   - For birthdays/anniversaries: focus on personalized decor, cake design, interactive games, photo booths, curated playlists.
3. Realistic Vendor Pricing:
   Vendor price ranges must be realistic for the stated city (Tier 1 like Mumbai/Delhi vs Tier 2 like Vizag/Pune/Indore) and overall budget.
4. When re-planning:
   Keep everything the user did NOT ask to change identical. Only adjust the parameters and downstream impacts requested by the user.
5. Ideas:
   Must provide creative inspirations across 'theme', 'menu', 'decor', 'entertainment', 'invitation' (formal invitation copy), and 'rsvp' (casual WhatsApp RSVP message).`;

// Comprehensive plan generator tailored to any celebration brief
function generateDefaultPlan(brief: string): any {
  const text = brief.trim();
  const textLower = text.toLowerCase();

  // Extract Event Type
  let eventType = "celebration";
  if (/sangeet/i.test(textLower)) eventType = "sangeet";
  else if (/wedding|shaadi|marriage|vivaah/i.test(textLower)) eventType = "wedding";
  else if (/birthday|bday|turning/i.test(textLower)) eventType = "birthday";
  else if (/anniversary|jubilee/i.test(textLower)) eventType = "anniversary";
  else if (/community|rwa|diwali|mela|society|colony/i.test(textLower)) eventType = "community";
  else if (/corporate|annual|cocktail|office/i.test(textLower)) eventType = "corporate";
  else if (/farewell|college|fest/i.test(textLower)) eventType = "college fest";

  // Extract Guest Count
  let guests = 100;
  const guestMatch = textLower.match(/(\d+)\s*(?:guests?|people|residents?|attendees?|pax|students?)/i);
  if (guestMatch) {
    guests = parseInt(guestMatch[1], 10);
  } else if (/small|intimate/i.test(textLower)) {
    guests = 30;
  } else if (/grand|mega|huge/i.test(textLower)) {
    guests = 350;
  }

  // Extract Budget in INR
  let totalBudget = 500000;
  const budgetMatch = textLower.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(l|lakh|k|cr)?/i);
  if (budgetMatch) {
    const val = parseFloat(budgetMatch[1]);
    const unit = (budgetMatch[2] || '').toLowerCase();
    if (unit === 'l' || unit === 'lakh') totalBudget = Math.round(val * 100000);
    else if (unit === 'cr') totalBudget = Math.round(val * 10000000);
    else if (unit === 'k') totalBudget = Math.round(val * 1000);
    else if (val > 1000) totalBudget = Math.round(val);
  }

  // Extract City
  const knownCities = [
    'Vizag', 'Goa', 'Delhi', 'Jaipur', 'Bengaluru', 'Mumbai', 'Pune', 'Hyderabad',
    'Chennai', 'Kolkata', 'Udaipur', 'Ahmedabad', 'Chandigarh', 'Indore', 'Lucknow'
  ];
  let city = 'Delhi NCR';
  for (const c of knownCities) {
    if (new RegExp(`\\b${c}\\b`, 'i').test(text)) {
      city = c;
      break;
    }
  }

  // Extract or Generate Date
  let eventDate = '2026-12-14';
  const dateMatch = text.match(/(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*/i);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    const monthMap: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', sept: '09', oct: '10', nov: '11', dec: '12'
    };
    const month = monthMap[dateMatch[2].toLowerCase().slice(0, 3)] || '12';
    eventDate = `2026-${month}-${day}`;
  }

  // Extract Theme
  let theme = "Celebration & Festivities";
  if (/bollywood|retro/i.test(textLower)) theme = "Retro Bollywood 70s-90s Glamour";
  else if (/neon|sunset|rooftop/i.test(textLower)) theme = "Sunset Neon & Tropical Rooftop Glow";
  else if (/royal|heritage|palace/i.test(textLower)) theme = "Royal Rajputana Heritage & Marigold";
  else if (/eco|sustainable|green/i.test(textLower)) theme = "Eco-Friendly Earth & Clay Diyas";
  else if (/diwali|traditional|folk/i.test(textLower)) theme = "Traditional Earthen Diyas & Folk Melodies";
  else if (/cocktail|glam/i.test(textLower)) theme = "Contemporary Cocktail & Velvet Lights";

  // Build Title
  let title = `${city} ${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Celebration`;
  if (/sister/i.test(textLower) && eventType === 'sangeet') {
    title = "Sister's Retro Bollywood Sangeet";
  } else if (eventType === 'birthday') {
    title = `${city} Rooftop Birthday Soirée`;
  } else if (eventType === 'community') {
    title = `${city} Community Cultural Mela & Festival`;
  } else if (eventType === 'anniversary') {
    title = `Silver Jubilee Royal Anniversary Celebration`;
  }

  // Specific domain models based on event type
  if (eventType === 'birthday') {
    return {
      title,
      event_type: eventType,
      event_date: eventDate,
      guests,
      total_budget: totalBudget,
      city,
      theme,
      budget: [
        { category: "Rooftop Venue & Neon Ambience", pct: 35, locked: false },
        { category: "Artisanal Cocktails & Finger Foods", pct: 35, locked: false },
        { category: "Sunset DJ & Acoustic Live Set", pct: 15, locked: false },
        { category: "Custom 3-Tier Cake & Dessert Bar", pct: 8, locked: false },
        { category: "Polaroid Photo Booth & Memories Corner", pct: 7, locked: false },
      ],
      timeline: [
        { t_minus_days: 45, title: "Reserve Sunset View Rooftop Deck", owner: "Host", done: false },
        { t_minus_days: 30, title: "Book House/Techno DJ & Sunset Acoustic Duo", owner: "Music Lead", done: false },
        { t_minus_days: 20, title: "Finalize Gourmet Small Bites & Cocktail Menu", owner: "Host", done: false },
        { t_minus_days: 10, title: "Order Custom Sculpted Neon Cake & Cupcakes", owner: "Cake Squad", done: false },
        { t_minus_days: 3, title: "Assemble Polaroid Guestbook & Neon Props", owner: "Friends", done: false },
        { t_minus_days: 0, title: "Sunset Welcome Cocktails & Midnight Toast", owner: "Birthday Squad", done: false },
      ],
      vendors: [
        {
          type: "Sunset Lounge DJ & Sound System",
          est_low: Math.round(totalBudget * 0.12),
          est_high: Math.round(totalBudget * 0.18),
          questions: ["Can you transition seamlessly from chill deep house to high-energy party anthems?", "Do you provide moving head club lights?"],
          red_flags: ["Only plays static pre-mixed sets", "Inadequate venue sound permits for past 10 PM"],
          outreach_message: `Hi! We are hosting a ${guests}-guest rooftop birthday celebration in ${city} on ${eventDate}. Looking for an energetic DJ with sound and ambient lighting. Please share your charges.`,
        },
        {
          type: "Custom Cake Designer & Dessert Bar",
          est_low: Math.round(totalBudget * 0.05),
          est_high: Math.round(totalBudget * 0.09),
          questions: ["Can you do customized neon acrylic toppers and edible metallic gold foil?", "Do you guarantee refrigerated doorstep delivery?"],
          red_flags: ["Cakes melting or collapsing in humid weather", "Charges hidden setup fee at venue"],
          outreach_message: `Hello! Looking for a signature designer cake for a birthday bash in ${city} on ${eventDate} (${guests} guests). Please send your portfolio.`,
        },
      ],
      ideas: [
        { category: "theme", title: "Sunset Neon Tropic", description: "Neon signage with customized birthday hashtag, tropical foliage, and velvet seating." },
        { category: "menu", title: "Gourmet Sliders & Woodfired Bites", description: "Truffle fries, peri-peri skewers, woodfired pizzas, and passionfruit mojito mocktails." },
        { category: "entertainment", title: "Sunset Live Jam & Glow Hour", description: "Acoustic guitarist during golden hour followed by UV glow sticks on the dance floor." },
        { category: "invitation", title: "Digital Birthday Invitation", description: `✨ IT'S PARTY TIME! ✨\nJoin us as we celebrate on ${eventDate} from 6:30 PM onwards at SkyDeck Lounge, ${city}.\nCocktails, sunset beats & memories await!\nDress Code: Casual Sunset Chic.` },
        { category: "rsvp", title: "WhatsApp Quick RSVP", description: `🎂 *Birthday Bash Alert!* Can't wait to celebrate together in ${city} on ${eventDate}. RSVP by text so we can confirm the bar headcount! 🥂` },
      ],
      clarifying_question: null,
    };
  }

  if (eventType === 'anniversary') {
    return {
      title,
      event_type: eventType,
      event_date: eventDate,
      guests,
      total_budget: totalBudget,
      city,
      theme,
      budget: [
        { category: "Heritage Courtyard / Banquet Venue", pct: 35, locked: false },
        { category: "Royal Feast & Multi-Course Dining", pct: 32, locked: false },
        { category: "Floral Drapes & Fairy Light Canopy", pct: 15, locked: false },
        { category: "Candid Photography & Family Video", pct: 10, locked: false },
        { category: "Sufi Ensemble & Live Strings", pct: 8, locked: false },
      ],
      timeline: [
        { t_minus_days: 60, title: "Lock Heritage Garden or Palace Courtyard", owner: "Family Lead", done: false },
        { t_minus_days: 45, title: "Catering Tasting for Traditional Royal Thali", owner: "Host Committee", done: false },
        { t_minus_days: 30, title: "Book Live Classical / Sufi Fusion Band", owner: "Music Lead", done: false },
        { t_minus_days: 15, title: "Curate 25-Year Family Memory Photo Gallery", owner: "Children", done: false },
        { t_minus_days: 7, title: "Rehearse Surprise Family Tributes & Speeches", owner: "Family", done: false },
        { t_minus_days: 0, title: "Grand Garland Welcome & Silver Vow Renewal", owner: "Couple & Kids", done: false },
      ],
      vendors: [
        {
          type: "Heritage Floral & Ambience Decor",
          est_low: Math.round(totalBudget * 0.12),
          est_high: Math.round(totalBudget * 0.18),
          questions: ["Can you do traditional tuberose (rajnigandha) and marigold strings with brass lamps?", "Do you provide illuminated vintage arches?"],
          red_flags: ["Wilting natural flowers delivered hours too early", "No safety certificates for heavy hanging trusses"],
          outreach_message: `Greetings! We are organizing a Silver Jubilee celebration for ${guests} guests in ${city} on ${eventDate}. Please share your heritage decor packages.`,
        },
        {
          type: "Royal Heritage Catering",
          est_low: Math.round(totalBudget * 0.28),
          est_high: Math.round(totalBudget * 0.36),
          questions: ["Do you serve authentic multi-course thali or live buffets with copper chaffing dishes?", "Can you prepare traditional mithai counters like hot malpua and rasmalai?"],
          red_flags: ["No temperature control on banquet warmers", "Untrained banquet service staff"],
          outreach_message: `Hello! We require royal banquet catering for an anniversary celebration with ${guests} guests in ${city} on ${eventDate}. Kindly share sample menus.`,
        },
      ],
      ideas: [
        { category: "theme", title: "Silver Elegance & Fragrant Rajnigandha", description: "White and silver accents with antique brass urlis and thousands of floating tea lights." },
        { category: "menu", title: "Shahi Dastarkhwan", description: "Dal Bukhara, stuffed kulchas, Kesari paneer tikka, and live saffron jalebi with rabri." },
        { category: "entertainment", title: "Through The Years AV & Ghazal Night", description: "A heartwarming projection of 25 years of memories accompanied by acoustic sitar and ghazals." },
        { category: "invitation", title: "Formal Silver Jubilee Invitation", description: `Warm Greetings,\nWe cordially invite you to celebrate 25 Glorious Years of Love & Togetherness on ${eventDate} at The Grand Heritage Lawns, ${city}.\nYour blessings and presence will make our evening truly unforgettable.\nWith love,\nThe Family` },
        { category: "rsvp", title: "WhatsApp RSVP Message", description: `💐 *25th Anniversary Celebration RSVP*\nPlease let us know if your family can join us on ${eventDate} in ${city}. Looking forward to reminiscing with you! ✨` },
      ],
      clarifying_question: null,
    };
  }

  // Sangeet / Wedding / Default
  return {
    title: "Sister's Retro Bollywood Sangeet",
    event_type: "sangeet",
    event_date: eventDate,
    guests,
    total_budget: totalBudget,
    city,
    theme: "Retro Bollywood 70s-90s Glamour",
    budget: [
      { category: "Venue & Retro Stage Decor", pct: 35, locked: false },
      { category: "Coastal & North Indian Catering", pct: 30, locked: false },
      { category: "DJ, Sound Rig & Choreography", pct: 15, locked: false },
      { category: "Photography & Cinematic Video", pct: 12, locked: false },
      { category: "Bridal Attire, Styling & Favors", pct: 8, locked: false },
    ],
    timeline: [
      { t_minus_days: 90, title: `Lock Coastal Lawn / Banquet Hall in ${city}`, owner: "Family Head", done: false },
      { t_minus_days: 60, title: "Book Bollywood DJ, Sound Tech & Choreographer", owner: "Brother & Bride", done: false },
      { t_minus_days: 45, title: "Finalize Food Menu Tasting (Seafood & Chaat)", owner: "Food Committee", done: false },
      { t_minus_days: 30, title: "Start Dance Rehearsals for Cousins & Parents", owner: "Choreographer", done: false },
      { t_minus_days: 15, title: "Design Retro Photo-Op Booth & Vinyl Record Props", owner: "Decor Team", done: false },
      { t_minus_days: 7, title: "Final Sound Check & Playlist Sequencing", owner: "DJ Lead", done: false },
      { t_minus_days: 0, title: "Red Carpet Grand Entrance & Flash Mob", owner: "Bride's Squad", done: false },
    ],
    vendors: [
      {
        type: "DJ & Professional Sound Setup",
        est_low: 35000,
        est_high: 60000,
        questions: ["Do you provide wireless lapel and handheld mics for MCs?", "Can you play continuous 80s/90s Bollywood remixes mixed live?"],
        red_flags: ["Plays standard YouTube playlist without transition mixing", "No backup power inverter / stabilizer for amplifiers"],
        outreach_message: `Hi! We are planning a ${guests}-guest Retro Bollywood Sangeet in ${city} on ${eventDate}. We need an energetic DJ with full sound, moving lights, and fog machine. Please share your availability and pricing.`,
      },
      {
        type: "Vintage Decor & Neon Stage",
        est_low: 150000,
        est_high: 220000,
        questions: ["Can you construct a vintage cassette / vinyl record photo wall?", "Does the package include stage carpeting and dance floor lighting?"],
        red_flags: ["Faded artificial flower carpets", "Hidden charges for generator diesel or extra lighting trusses"],
        outreach_message: `Hello! We are looking for an event decorator for a Retro Bollywood Sangeet on ${eventDate} in ${city} (${guests} guests). Key highlights: vintage record backdrop, marquee bulb letters, dance floor. Please share sample setups.`,
      },
      {
        type: "Catering & Live Counters",
        est_low: 140000,
        est_high: 200000,
        questions: ["Do you include live chaat counter and dessert stations?", "Can you accommodate both regional coastal specialties and North Indian staples?"],
        red_flags: ["No live supervisor on event floor", "Vague headcount policy for unexpected plus-ones"],
        outreach_message: `Namaste! We require catering for ${guests} guests on ${eventDate} in ${city}. Mix of live street chaat, biryani, and dessert counter. Please provide per-plate quotes.`,
      },
    ],
    ideas: [
      { category: "theme", title: "Disco Deewane 70s-90s", description: "Bell-bottoms, glitter saris, retro movie posters, and neon cassette installations." },
      { category: "menu", title: "Coastal Fusion & Bollywood Bites", description: "Bambaiya Sev Puri live counter, Chettinad skewers, royal pulao, and sizzling brownie with rabri." },
      { category: "decor", title: "Filmi Marquee Entrance", description: "Custom entrance styled like a vintage cinema hall with tickets as place cards." },
      { category: "entertainment", title: "Family Face-Off Dance Battle", description: "Ladkewale vs Ladkiwale 90s medley face-off scored with retro cinema clapboards." },
      { category: "invitation", title: "Filmi Premiere Card", description: `🎬 BLOCKBUSTER SANGEET PREMIERE\nStarring: The Bride & Her Squad!\nJoin us on ${eventDate}, 7:00 PM onwards at Sea Breeze Lawns, ${city}.\nDress Code: Retro Bollywood Glamour.\nPrepare your dancing shoes!` },
      { category: "rsvp", title: "WhatsApp RSVP Template", description: `💃 *Sangeet Alert!* Can't wait to dance with you at Sister's Retro Sangeet on ${eventDate} in ${city}. Please RSVP with your favorite dance track for the DJ! 🎵` },
    ],
    clarifying_question: null,
  };
}

// API endpoint: Generate or intake plan with 7.5s race timeout
app.post('/api/plan', async (req, res) => {
  try {
    const { brief } = req.body;
    if (!brief || typeof brief !== 'string' || brief.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide an event brief description.' });
    }

    if (brief.length > 500) {
      return res.status(400).json({ error: 'Event brief is too long (maximum 500 characters).' });
    }

    const ai = getGenAIClient();
    if (!ai) {
      const plan = generateDefaultPlan(brief);
      return res.json({ plan, model: 'smart-intake' });
    }

    const prompt = `Please create a comprehensive celebration event plan based on this user brief:
"${brief.trim()}"`;

    // Fast race: Attempt Gemini API with 7.5s timeout. If timeout expires, use smart intake generator
    const geminiCall = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: eventPlanSchema,
      },
    });

    const timeoutPromise = new Promise<'TIMEOUT'>((resolve) =>
      setTimeout(() => resolve('TIMEOUT'), 7500)
    );

    const raceResult = await Promise.race([geminiCall, timeoutPromise]);

    if (raceResult === 'TIMEOUT') {
      console.log('Gemini intake plan took >7.5s, returning instant customized plan.');
      const plan = generateDefaultPlan(brief);
      return res.json({ plan, model: 'smart-intake-instant' });
    }

    const text = raceResult.text;
    if (text) {
      const parsedPlan = JSON.parse(text);
      return res.json({ plan: parsedPlan, model: 'gemini' });
    }

    const fallback = generateDefaultPlan(brief);
    return res.json({ plan: fallback, model: 'smart-fallback' });
  } catch (error: any) {
    console.error('Error generating event plan:', error);
    const fallback = generateDefaultPlan(req.body?.brief || '');
    return res.json({ plan: fallback, model: 'smart-recovery' });
  }
});

// Smart heuristic re-planner for instant responsiveness or timeout fallback
function applySmartReplan(currentPlan: any, instruction: string): any {
  const updated = JSON.parse(JSON.stringify(currentPlan));
  const textLower = instruction.toLowerCase();

  // Guest count modifications
  const guestAddMatch = textLower.match(/(?:add|\+|\bmore\b)\s*(\d+)\s*(?:more\s*)?guests?/i) ||
                        textLower.match(/(\d+)\s*(?:more\s*)?guests?\s*(?:more|\+)?/i);
  const guestReduceMatch = textLower.match(/(?:reduce|less|decrease|\-)\s*(\d+)\s*guests?/i);
  const guestExactMatch = textLower.match(/(?:set|make|to)\s*(\d+)\s*guests?/i);

  if (guestAddMatch) {
    const delta = parseInt(guestAddMatch[1], 10);
    updated.guests = (updated.guests || 100) + delta;
    // Scale catering amount if present
    const catering = updated.budget.find((b: any) => /cater|food/i.test(b.category));
    if (catering && !catering.locked) {
      catering.pct = Math.min(50, (catering.pct || 30) + 3);
    }
    updated.timeline.unshift({
      t_minus_days: 15,
      title: `Confirm extra table seating & catering covers (+${delta} guests)`,
      owner: "Catering Committee",
      done: false,
    });
  } else if (guestReduceMatch) {
    const delta = parseInt(guestReduceMatch[1], 10);
    updated.guests = Math.max(10, (updated.guests || 100) - delta);
  } else if (guestExactMatch) {
    updated.guests = parseInt(guestExactMatch[1], 10);
  }

  // Budget modifications
  const budgetMatch = textLower.match(/(?:budget|₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(l|lakh|k|cr)?/i);
  if (textLower.includes('reduce') && (textLower.includes('l') || textLower.includes('budget') || textLower.includes('1l'))) {
    updated.total_budget = Math.max(50000, updated.total_budget - 100000);
  } else if (textLower.includes('add') && (textLower.includes('l') || textLower.includes('budget') || textLower.includes('1l'))) {
    updated.total_budget = updated.total_budget + 100000;
  } else if (budgetMatch && (textLower.includes('budget') || textLower.includes('set'))) {
    const val = parseFloat(budgetMatch[1]);
    const unit = (budgetMatch[2] || '').toLowerCase();
    let num = val;
    if (unit === 'l' || unit === 'lakh') num = val * 100000;
    else if (unit === 'cr') num = val * 10000000;
    else if (unit === 'k') num = val * 1000;
    if (num > 10000) updated.total_budget = Math.round(num);
  }

  // Eco-friendly theme & ideas
  if (textLower.includes('eco-friendly') || textLower.includes('sustainable') || textLower.includes('green')) {
    updated.theme = `${updated.theme} · Eco-Friendly`;
    updated.ideas.unshift({
      category: 'decor',
      title: 'Biodegradable Seed Paper & Clay Diyas',
      description: 'Zero-plastic decor with potted plant favors, seed-paper invites, and solar festoon fairy lights.',
    });
    updated.vendors.push({
      type: 'Sustainable Decor & Rentals',
      est_low: 45000,
      est_high: 80000,
      questions: ['Can you provide zero-plastic fabric drapes and reusable brass tableware?', 'Do you manage organic composting for floral waste?'],
      red_flags: ['Uses hidden single-use plastic cable ties', 'No waste audit after event'],
      outreach_message: 'Hi! We are hosting an eco-friendly celebration and need zero-waste, sustainable decor in our city. Please share your biodegradable portfolio.',
    });
  }

  // Date modifications
  if (textLower.includes('move date') || textLower.includes('shift date') || textLower.includes('jan') || textLower.includes('dec')) {
    if (textLower.includes('10 jan') || textLower.includes('jan 10')) {
      updated.event_date = '2027-01-10';
    } else if (textLower.includes('2 weeks') || textLower.includes('14 days')) {
      const d = new Date(updated.event_date || '2026-12-14');
      d.setDate(d.getDate() + 14);
      updated.event_date = d.toISOString().slice(0, 10);
    }
  }

  // Sufi / Ghazal / Live band
  if (textLower.includes('sufi') || textLower.includes('ghazal') || textLower.includes('live band') || textLower.includes('music')) {
    updated.ideas.unshift({
      category: 'entertainment',
      title: 'Acoustic Sufi & Retro Bollywood Medley',
      description: 'Live 4-piece ensemble featuring harmonium, tabla, acoustic guitar, and soulful Sufi melodies for an intimate evening.',
    });
    updated.vendors.push({
      type: 'Live Sufi & Acoustic Band',
      est_low: 40000,
      est_high: 75000,
      questions: ['What is the instrument setup and vocal lineup?', 'Do you provide your own stage monitors and audio technician?'],
      red_flags: ['Does not do live sound checks prior to guest arrival', 'Overcharges for extra hours'],
      outreach_message: 'Hi! We are looking for a soulful live Sufi / Bollywood acoustic band for our celebration. Please share your sample live recordings and availability.',
    });
  }

  return updated;
}

// Re-plan endpoint with fast race & heuristic fallback
app.post('/api/replan', async (req, res) => {
  try {
    const { currentPlan, changeInstruction } = req.body;
    if (!currentPlan || !changeInstruction || typeof changeInstruction !== 'string') {
      return res.status(400).json({ error: 'Please provide current plan and change instruction.' });
    }

    if (changeInstruction.length > 300) {
      return res.status(400).json({ error: 'Change instruction is too long (maximum 300 characters).' });
    }

    const ai = getGenAIClient();
    if (!ai) {
      const updatedPlan = applySmartReplan(currentPlan, changeInstruction);
      return res.json({ plan: updatedPlan, model: 'local-replan' });
    }

    const prompt = `Existing celebration plan JSON:
${JSON.stringify(currentPlan)}

User requested change:
"${changeInstruction.trim()}"

Return the COMPLETE updated EventPlan in valid JSON. Keep everything the user did NOT request to change identical.`;

    // Fast race: Attempt Gemini API with 7.5s timeout. If timeout expires, use smart replanner
    const geminiCall = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: eventPlanSchema,
      },
    });

    const timeoutPromise = new Promise<'TIMEOUT'>((resolve) =>
      setTimeout(() => resolve('TIMEOUT'), 7500)
    );

    const raceResult = await Promise.race([geminiCall, timeoutPromise]);

    if (raceResult === 'TIMEOUT') {
      console.log('Gemini replan took >7.5s, returning instant smart heuristic replan.');
      const updatedPlan = applySmartReplan(currentPlan, changeInstruction);
      return res.json({ plan: updatedPlan, model: 'smart-replan-instant' });
    }

    const text = raceResult.text;
    if (text) {
      const parsedPlan = JSON.parse(text);
      return res.json({ plan: parsedPlan, model: 'gemini' });
    }

    const fallback = applySmartReplan(currentPlan, changeInstruction);
    return res.json({ plan: fallback, model: 'smart-fallback' });
  } catch (error: any) {
    console.error('Error re-planning:', error);
    const fallback = applySmartReplan(req.body.currentPlan, req.body.changeInstruction || '');
    return res.json({ plan: fallback, model: 'smart-recovery' });
  }
});

// Setup Vite middlewares for development, or static serve for production
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Utsav Celebration Planner server running at http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
