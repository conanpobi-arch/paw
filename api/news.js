// api/news.js - 캐시 제거 & 실시간 Gemini 요약
export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API 키가 없습니다.' });
  }

  try {
    const prompt = `
당신은 2026년 현재 뉴스 전문 요약가입니다.
지금 시점(현재 한국 시간)에서 가장 최신 뉴스만 기반으로 아래 5개 카테고리를 요약해주세요.
과거 뉴스(2025년 이전)는 절대 포함시키지 마세요. 2026년 2월 이후 뉴스만 사용하세요.

카테고리:
1. 국제정세
2. 미국 주식시장 및 경제
3. 헬스/항암신약 (특히 신장암 관련)
4. IT/AI/에이전트 분야
5. 화제의 영화/소설 (매출·평론 기반 진짜 히트작만)

요약 형식:
- 각 카테고리별 2~4줄
- 핵심 사실 + 최근 동향 위주
- 한국어로 자연스럽게
- 전체 400~800자 이내
- 출처나 링크는 넣지 말고 내용만

지금 시점에서 가장 최신 정보를 바탕으로 작성하세요.
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
      const errorText = await response.text();
      throw new Error(`Gemini 오류: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '요약 생성 실패';

    const summary = `
최신 뉴스섬머리 (${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} 기준)

${generatedText}
    `;

    res.status(200).json({ summary });
  } catch (error) {
    console.error('Gemini 오류:', error);
    res.status(500).json({ error: '뉴스 요약 생성 중 오류: ' + error.message });
  }
}
