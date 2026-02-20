// api/news.js
// ✅ Gemini 2.0 Flash + Google Search Grounding 완전체
// - 실시간 Google 검색으로 할루시네이션 방지
// - groundingMetadata(출처 링크) 파싱 및 반환
// - 캐시 완전 차단, 에러 핸들링 강화

export default async function handler(req, res) {
  // ── 0. CORS & Method Guard ──────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET 요청만 허용됩니다.' });
  }

  // ── 1. 환경변수 확인 ────────────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[news.js] GEMINI_API_KEY 환경변수 누락');
    return res.status(500).json({ error: 'Gemini API 키가 설정되지 않았습니다.' });
  }

  // ── 2. 한국 시간 ─────────────────────────────────────────────────────────────
  const currentTime = new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // ── 3. 프롬프트 ──────────────────────────────────────────────────────────────
  // Google Search Grounding이 켜진 상태에서 모델이 직접 검색하므로
  // 프롬프트는 "무엇을 검색·요약할지"만 명확히 지시하면 됩니다.
  const prompt = `
현재 한국 시간은 ${currentTime}입니다.
Google Search를 통해 지금 이 순간 기준으로 가장 최신 뉴스를 검색한 뒤,
아래 5개 카테고리별로 요약해 주세요.

[카테고리 및 검색 포커스]
1. 🌐 국제정세 — 최근 48시간 내 분쟁·외교 급변점 (구체적 수치·지명 포함)
2. 📈 미국 주식/경제 — 오늘 기준 주요 지수·금리 동향, Fed 코멘트
3. 💊 헬스/항암신약 — 신장암(RCC) 신규 임상·FDA 승인 우선, 없으면 최신 항암제 뉴스
4. 🤖 IT/AI/에이전트 — 오픈소스 LLM 및 Agentic AI 실제 출시·업데이트 중심
5. 🎬 화제의 영화/소설 — 현재 박스오피스 1위 및 문학계 최신 이슈

[출력 형식 규칙]
- 첫 줄: "📰 최신 뉴스 섬머리 (${currentTime} 기준)"
- 각 카테고리 제목 앞에 위 이모지 사용
- 전문적이지만 딱딱하지 않은 한국어 구어체
- 각 항목은 2~4문장, 전체 600~900자 이내
- 출처 URL은 본문에 넣지 말 것 (API가 별도로 반환함)
`;

  // ── 4. Gemini API 요청 (google_search 툴 활성화) ───────────────────────────
  // ※ gemini-2.0-flash 는 google_search 툴을 지원합니다.
  //   (구형 1.5 계열은 google_search_retrieval 툴을 사용)
  const GEMINI_MODEL = 'gemini-2.0-flash';
  const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    tools: [
      {
        // gemini-2.0-flash 에서 실시간 Google 검색을 활성화하는 툴
        google_search: {},
      },
    ],
    generationConfig: {
      temperature: 0.4,   // 검색 기반이므로 창의성보다 정확성 우선
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  };

  let geminiResponse;
  try {
    geminiResponse = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
  } catch (networkError) {
    console.error('[news.js] Gemini 네트워크 오류:', networkError);
    return res.status(502).json({ error: '외부 API 연결 실패: ' + networkError.message });
  }

  // ── 5. 응답 파싱 ─────────────────────────────────────────────────────────────
  if (!geminiResponse.ok) {
    const errText = await geminiResponse.text();
    console.error(`[news.js] Gemini HTTP ${geminiResponse.status}:`, errText);
    return res.status(502).json({
      error: `Gemini API 오류 (HTTP ${geminiResponse.status})`,
      detail: errText.slice(0, 300), // 민감 정보 노출 방지를 위해 앞 300자만
    });
  }

  let data;
  try {
    data = await geminiResponse.json();
  } catch (parseError) {
    console.error('[news.js] JSON 파싱 실패:', parseError);
    return res.status(502).json({ error: 'Gemini 응답 파싱 실패' });
  }

  // ── 6. 텍스트 추출 ───────────────────────────────────────────────────────────
  const candidate = data.candidates?.[0];
  if (!candidate) {
    console.error('[news.js] 후보 응답 없음:', JSON.stringify(data));
    return res.status(502).json({ error: 'Gemini 응답에 후보가 없습니다.' });
  }

  // 여러 parts가 있을 수 있으므로 text 타입만 합산
  const summary = (candidate.content?.parts ?? [])
    .filter((p) => typeof p.text === 'string')
    .map((p) => p.text)
    .join('')
    .trim();

  if (!summary) {
    console.error('[news.js] 텍스트 추출 실패, 전체 응답:', JSON.stringify(data).slice(0, 500));
    return res.status(502).json({ error: '요약 텍스트를 추출할 수 없습니다.' });
  }

  // ── 7. groundingMetadata 파싱 (출처 링크) ───────────────────────────────────
  // groundingMetadata 구조:
  //   candidate.groundingMetadata.groundingChunks[].web.{ uri, title }
  //   candidate.groundingMetadata.webSearchQueries[]
  const groundingMeta = candidate.groundingMetadata ?? {};

  const sources = (groundingMeta.groundingChunks ?? [])
    .map((chunk) => chunk.web)
    .filter(Boolean)
    .map(({ uri, title }) => ({ url: uri, title: title ?? uri }))
    // 중복 URL 제거
    .filter((src, idx, arr) => arr.findIndex((s) => s.url === src.url) === idx)
    .slice(0, 10); // 최대 10개

  const searchQueries = groundingMeta.webSearchQueries ?? [];

  // searchEntryPoint: 구글이 요구하는 "Search Suggestions" HTML
  // (ToS 상 앱에 표시 의무 있음 — 프론트엔드에서 innerHTML로 삽입)
  const searchEntryPointHtml =
    groundingMeta.searchEntryPoint?.renderedContent ?? null;

  // ── 8. 응답 반환 ─────────────────────────────────────────────────────────────
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  return res.status(200).json({
    summary,                  // 본문 요약 텍스트
    sources,                  // [{ url, title }, ...]
    searchQueries,            // Gemini가 실제로 날린 검색어 목록
    searchEntryPointHtml,     // Google ToS 준수용 Search Suggestions HTML (null 가능)
    generatedAt: currentTime, // 생성 시각 (KST)
    model: GEMINI_MODEL,
  });
}
