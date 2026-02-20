// api/news.js
let cachedSummary = null;
let lastGenerated = null;
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2시간 (밀리초)

export default async function handler(req, res) {
  const now = Date.now();

  // 캐시가 유효하면 바로 반환
  if (cachedSummary && lastGenerated && now - lastGenerated < CACHE_DURATION) {
    return res.status(200).json({ 
      summary: cachedSummary, 
      generatedAt: new Date(lastGenerated).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    });
  }

  // Gemini API 키 확인
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API 키가 설정되지 않았습니다.' });
  }

  try {
    // Gemini API 호출 (gemini-1.5-flash 추천 – 빠르고 저렴)
    const prompt = `
당신은 뉴스 전문 요약가입니다. 아래 관심사에 맞춰 최신 뉴스를 5개 카테고리로 요약해주세요.
카테고리:
1. 국제정세
2. 미국 주식시장 및 경제
3. 헬스/항암신약 (특히 신장암 관련)
4. IT/AI/에이전트 분야
5. 화제의 영화/소설 (매출·평론 기반 진짜 히트작만)

요약 형식:
- 각 카테고리별 2~4줄 요약
- 날짜 기준 명시 (오늘 기준)
- 출처나 링크는 생략하고 핵심만
- 한국어로 자연스럽게 작성
- 전체 길이 400~800자 이내

최신 뉴스 기반으로 작성하세요.
    `;

   const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    }),
  }
);
    if (!response.ok) {
      throw new Error(`Gemini API 오류: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '요약 생성 실패';

    const summary = `
최신 뉴스섬머리 (${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} 기준)

${generatedText}
    `;

    cachedSummary = summary;
    lastGenerated = now;

    res.status(200).json({ summary, generatedAt: now });
  } catch (error) {
    console.error('Gemini 오류:', error);
    res.status(500).json({ error: '뉴스 요약 생성 중 오류 발생' });
  }
}
