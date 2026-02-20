
export default async function handler(req, res) {
  // 임시 요약 텍스트 (네 관심사 기반으로 작성)
  const summary = `
오늘 (2026.02.20) NANA LAB 개인화 뉴스섬머리

1. 국제정세
   - 중동 긴장 고조: 이란 핵시설 관련 미-이스라엘 협의 지속 중.
   - 트럼프 행정부 가자 재건 10억 달러 발표, 그러나 민간인 우려 여전.

2. 미국 주식시장
   - S&P 500 소폭 하락 (-0.3%), 유가 상승 영향으로 에너지 섹터 강세.
   - 성장주 약세 지속, AI 관련 매각 압력 논란.

3. 헬스/항암신약 (신장암 중심)
   - Merck WELIREG + KEYTRUDA 조합, 무질병 생존율 개선 데이터 발표.
   - Cabozantinib FDA 추가 승인, 신장암 환자 옵션 확대.

4. AI/에이전트
   - Anthropic Claude 4.6 출시, 다중 에이전트 팀 기능 강화.
   - OpenAI 기업 에이전트 플랫폼 확대, Snowflake와 200M 협력.

5. 화제 영화/소설
   - Wuthering Heights 리메이크, 글로벌 박스오피스 1위 ($94M).
   - Project Hail Mary 영화화 기대감 고조 (Andy Weir 원작).

(이 부분을 나중에 실시간 데이터로 바꿀 수 있어!)
  `;

  res.status(200).json({ summary });
}
