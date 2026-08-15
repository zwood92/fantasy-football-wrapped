import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { league_id, week } = body;

    if (!league_id || week === undefined || week === null) {
      return new Response(JSON.stringify({ error: "league_id and week are required" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1. Fetch data from Sleeper API in parallel
    const [matchupsRes, usersRes, rostersRes] = await Promise.all([
      fetch(`https://api.sleeper.app/v1/league/${league_id}/matchups/${week}`),
      fetch(`https://api.sleeper.app/v1/league/${league_id}/users`),
      fetch(`https://api.sleeper.app/v1/league/${league_id}/rosters`),
    ]);

    if (!matchupsRes.ok || !usersRes.ok || !rostersRes.ok) {
      throw new Error("Failed to fetch league data from Sleeper API");
    }

    const [matchups, users, rosters] = await Promise.all([
      matchupsRes.json(),
      usersRes.json(),
      rostersRes.json(),
    ]);

    if (!Array.isArray(matchups) || !Array.isArray(users) || !Array.isArray(rosters)) {
      throw new Error("Invalid response format received from Sleeper API");
    }

    // 2. Prepare data for the prompt
    // Map roster ID to team name
    const rosterMap = rosters.reduce((acc: Record<string | number, string>, roster: any) => {
      const user = users.find((u: any) => u.user_id === roster.owner_id);
      const teamName = roster.metadata?.team_name || user?.metadata?.team_name || user?.display_name || `Team ${roster.roster_id}`;
      acc[roster.roster_id] = teamName;
      return acc;
    }, {});

    const matchupSummaries = matchups.reduce((acc: Record<string | number, Array<{ team: string; points: number }>>, match: any) => {
      if (match.matchup_id === undefined || match.matchup_id === null) return acc;
      if (!acc[match.matchup_id]) acc[match.matchup_id] = [];
      acc[match.matchup_id].push({
        team: rosterMap[match.roster_id] || `Team ${match.roster_id}`,
        points: typeof match.points === 'number' ? match.points : 0
      });
      return acc;
    }, {});

    const resultsText = Object.values(matchupSummaries)
      .filter((m) => m.length >= 2)
      .map((m) => `${m[0].team} (${m[0].points} pts) vs ${m[1].team} (${m[1].points} pts)`)
      .join("\n") || "No completed matchup scores recorded for this week.";

    // 3. Call Gemini API for Newsletter (Using the 3 Personas)
    const prompt = `
You are tasked with writing a weekly fantasy football newsletter for a Sleeper league.
Here are the matchup results for Week ${week}:
${resultsText}

Please write this newsletter using THREE distinct personas in three separate sections:
1. "The Guru": An NFL fanatic, highly analytical, breaking down the stats and standard sports commentary.
2. "The Trash-Talker": A B-list celebrity vibes comedian, providing hilariously unfiltered trash talk and sarcasm about the losers.
3. "The Beat Reporter": An in-season beat reporter commenting on breaking news, overreactions, and locker room drama.

Make it highly engaging and entertaining. Format it in Markdown.
`;

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY');
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY not configured");

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      throw new Error(`Gemini API error (${geminiRes.status}): ${errorText}`);
    }

    const geminiData = await geminiRes.json();
    const newsletterContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!newsletterContent) {
      throw new Error("No newsletter content returned by Gemini API");
    }

    // 4. Call ElevenLabs API for Podcast (Mocked placeholder audio URL)
    const audioUrl = "https://example.com/mock-podcast-audio.mp3"; 

    // 5. Save to Supabase DB
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { error: nlError } = await supabase
        .from('newsletters')
        .insert({ league_id: String(league_id), week: Number(week), content: newsletterContent });
      
      if (nlError) console.error("Error saving newsletter:", nlError);

      const { error: pdError } = await supabase
        .from('podcasts')
        .insert({ league_id: String(league_id), week: Number(week), transcript: newsletterContent, audio_url: audioUrl });
      
      if (pdError) console.error("Error saving podcast:", pdError);
    } else {
      console.warn("SUPABASE_URL or service key not configured; skipping database persistence.");
    }

    return new Response(JSON.stringify({ success: true, newsletterContent, audioUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error in generate-weekly-content:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

