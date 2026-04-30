// Google Sheets 스타일 색상 팔레트 (10 hue × 4 shade)
// Row 순서: 연한 4 (가장 옅음) → 연한 3 → 연한 2 → 계열 (가장 진함)
// Column 순서: 빨강, 주황, 노랑, 초록, 청록, 파랑, 남색, 보라, 자홍, 분홍

export const HEATMAP_PALETTE_COLUMNS = 10;

export const METRIC_HEAT_COLORS: ReadonlyArray<readonly [number, number, number]> = [
  // — 연한 4 (lightest pastel) —
  [244, 204, 204], // 빨강 #F4CCCC
  [252, 229, 205], // 주황 #FCE5CD
  [255, 242, 204], // 노랑 #FFF2CC
  [217, 234, 211], // 초록 #D9EAD3
  [208, 228, 247], // 청록 #D0E4F7
  [201, 218, 248], // 파랑 #C9DAF8
  [207, 226, 243], // 남색 #CFE2F3
  [217, 210, 233], // 보라 #D9D2E9
  [234, 209, 220], // 자홍 #EAD1DC
  [252, 228, 236], // 분홍 #FCE4EC

  // — 연한 3 —
  [234, 153, 153], // 빨강 #EA9999
  [249, 203, 156], // 주황 #F9CB9C
  [255, 229, 153], // 노랑 #FFE599
  [182, 215, 168], // 초록 #B6D7A8
  [162, 196, 201], // 청록 #A2C4C9
  [164, 194, 244], // 파랑 #A4C2F4
  [159, 197, 232], // 남색 #9FC5E8
  [180, 167, 214], // 보라 #B4A7D6
  [213, 166, 189], // 자홍 #D5A6BD
  [244, 143, 177], // 분홍 #F48FB1

  // — 연한 2 —
  [224, 102, 102], // 빨강 #E06666
  [246, 178, 107], // 주황 #F6B26B
  [255, 217, 102], // 노랑 #FFD966
  [147, 196, 125], // 초록 #93C47D
  [118, 165, 175], // 청록 #76A5AF
  [109, 158, 235], // 파랑 #6D9EEB
  [111, 168, 220], // 남색 #6FA8DC
  [142, 124, 195], // 보라 #8E7CC3
  [194, 123, 160], // 자홍 #C27BA0
  [240, 98, 146],  // 분홍 #F06292

  // — 계열 (deepest) —
  [204, 0, 0],     // 빨강 계열 #CC0000
  [230, 145, 56],  // 주황 계열 #E69138
  [241, 194, 50],  // 노랑 계열 #F1C232
  [106, 168, 79],  // 초록 계열 #6AA84F
  [69, 129, 142],  // 청록 계열 #45818E
  [60, 120, 216],  // 파랑 계열 #3C78D8
  [61, 133, 200],  // 남색 계열 #3D85C8
  [103, 78, 167],  // 보라 계열 #674EA7
  [166, 77, 121],  // 자홍 계열 #A64D79
  [233, 30, 99],   // 분홍 계열 #E91E63
];

// 각 metric에 처음 할당되는 기본 색상 인덱스 (파랑 계열, row 4 col 6)
export const DEFAULT_HEATMAP_COLOR_INDEX = 35;

export const getMetricHeatColor = (
  metricIndex: number,
  min: number,
  max: number,
  value: number
): string => {
  const [r, g, b] = METRIC_HEAT_COLORS[metricIndex % METRIC_HEAT_COLORS.length];
  if (min === max) return `rgba(${r}, ${g}, ${b}, 0.35)`;
  const ratio = (value - min) / (max - min);
  const intensity = 0.05 + ratio * 0.65;
  return `rgba(${r}, ${g}, ${b}, ${intensity})`;
};
