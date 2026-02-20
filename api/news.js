
// api/news.js
let cachedSummary = null;
let lastGenerated = null;
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2시간 (밀리초)

export default async function handler(req, res) {
  const now = Date.now();

  // 캐시가 있고, 2시간 이내이면 캐시 반환
  if (cachedSummary && lastGenerated && now - lastGenerated < CACHE_DURATION) {
    return res.status(200).json({ summary: cachedSummary, generatedAt: lastGenerated });
  }

  // 새로 생성 (여기서 실제 요약 로직 넣기 – 지금은 임시)
  const summary = `
최신 뉴스섬머리 (${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} 기준)

1. 국제정세: [실시간 요약 들어갈 자리]
2. 미국 주식시장: S&P 500 최근 동향...
3. 헬스/신장암: Merck 신약 업데이트...
4. AI 에이전트: Claude 최신 버전...
5. 화제 작품: 박스오피스 1위 영화...

(실제로는 Grok API나 웹 검색으로 채움)
  `;

  cachedSummary = summary;
  lastGenerated = now;

  res.status(200).json({ summary, generatedAt: now });
}
