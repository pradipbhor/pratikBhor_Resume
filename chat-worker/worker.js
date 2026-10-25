// Cloudflare Worker: proxies portfolio chat questions to OpenAI so the API key never reaches the browser.
// Secrets/vars (set in the Cloudflare dashboard or via wrangler):
//   OPENAI_API_KEY  (secret)  your OpenAI key
//   ALLOWED_ORIGIN  (var)     e.g. https://pratikbhor2004.github.io  — use * only while testing
//   OPENAI_MODEL    (var)     optional, defaults to gpt-4o-mini

const PROFILE = `
Name: Pratik Bhor
Role: Backend Developer (Java, Spring Boot, REST APIs). Open to full-time backend and full-stack developer roles.
Location: Pune, India
Contact: pratikbhor2004@gmail.com · +91 8010576707 · linkedin.com/in/pratik-bhor-9a1a27259 · github.com/Pratikbhor2004

Education:
- B.E. Computer Engineering, Savitribai Phule Pune University (SPPU), Nov 2022 – May 2026, CGPA 8.32/10
- HSC, Bharat Highschool and Junior College, 2022, 68.17%
- SSC, Bharat Highschool and Junior College, 2020, 84.80%

Experience:
- Artificial Intelligence Intern, Edunet Foundation (Microsoft & SAP CSR Initiative), Nov–Dec 2024, remote.
  Built a real-time Face Recognition Attendance Management System with Python, OpenCV, Tkinter, face_recognition and dlib;
  real-time camera UI with color-coded status; timestamped audit logging with Pandas and Firebase.

Projects:
- Resume Analyzer AI Pro (Jul 2026, live at https://resume-analyser-kp0f.onrender.com): React + Spring Boot + MySQL.
  Uses Google Gemini API to score ATS compatibility, extract skills and suggest improvements; Apache PDFBox for PDF parsing;
  job-description matching, missing-skill detection, interview question generation, learning roadmap via REST APIs;
  auth with Spring Security, JWT, Google OAuth2, and Brevo email verification / password reset.
- Airline Management System (Jan 2025): Java Swing desktop app, flight scheduling, bookings, cancellations, auth; JDBC + MySQL.
  Source: https://github.com/Pratikbhor2004/Airline-Management-System
- Tikone Global website (Sept 2025, live at https://tikoneglobal.com): responsive client business site in HTML/CSS/JS with WhatsApp chat integration.

Skills: Java, Python, JavaScript, SQL, HTML, CSS; Spring Boot, REST APIs, Hibernate, JDBC, Spring Security, JWT, OAuth2;
MySQL, Firebase; React.js; Google Gemini API, OpenCV; AWS, Docker, Git, GitHub, Linux; VS Code, Eclipse, MySQL Workbench.

Achievements: 200+ DSA problems solved on LeetCode; 2-star SQL rating on HackerRank.
`;

const SYSTEM_PROMPT = `You are the AI assistant on Pratik Bhor's portfolio website. Visitors are mostly recruiters and hiring managers.
Answer questions about Pratik using ONLY the profile below. Be warm, concise (2–5 sentences), professional, and speak about him in the third person.
If something isn't in the profile (salary, notice period, relocation, personal life, etc.), say you don't have that detail and suggest emailing pratikbhor2004@gmail.com.
Never invent experience, employers, numbers or skills. Politely decline requests unrelated to Pratik or his work.

PROFILE:
${PROFILE}`;

const MAX_MESSAGES = 10;
const MAX_CHARS = 500;

function cors(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(body, status, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(env) },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors(env) });
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, env);

    const origin = request.headers.get('Origin');
    if (env.ALLOWED_ORIGIN && env.ALLOWED_ORIGIN !== '*' && origin !== env.ALLOWED_ORIGIN) {
      return json({ error: 'forbidden' }, 403, env);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'invalid json' }, 400, env);
    }

    // keep only well-formed user/assistant turns, trimmed to protect the token budget
    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-MAX_MESSAGES)
      .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
    if (!messages.length) return json({ error: 'no messages' }, 400, env);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        max_tokens: 300,
        temperature: 0.4,
      }),
    });

    if (!res.ok) return json({ error: 'upstream error' }, 502, env);
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    return json({ reply: reply || "Sorry, I couldn't answer that. Please email pratikbhor2004@gmail.com." }, 200, env);
  },
};
