export type PrototypeMetric = {
  id: string;
  name: string;
  owner: string;
  category: string;
  format: "number" | "percent";
  description: string;
  query: string;
};

export type PrototypeEntity = {
  name: string;
  unit: string;
  group: string;
  values: Record<string, number[]>;
};

export type PrototypeFilterGroup = {
  id: string;
  label: string;
  values: string[];
  selected: string[];
};

export const periods = ["26.01", "26.02", "26.03", "26.04", "26.05", "26.06"];

export const metrics: PrototypeMetric[] = [
  {
    id: "total_match_cnt",
    name: "전체 매치 수",
    owner: "운영",
    category: "공급",
    format: "number",
    description: "공개 혹은 취소 상태를 포함한 전체 매치 수입니다.",
    query: "select month, count(*) from matches group by month"
  },
  {
    id: "progress_match_rate",
    name: "진행률",
    owner: "매칭",
    category: "전환",
    format: "percent",
    description: "전체 매치 중 정상 진행된 매치의 비율입니다.",
    query: "safe_divide(progress_match_cnt, total_match_cnt)"
  },
  {
    id: "matching_rate",
    name: "매칭률",
    owner: "매칭",
    category: "전환",
    format: "percent",
    description: "오픈된 매치 중 충분한 인원이 모인 비율입니다.",
    query: "safe_divide(matched_match_cnt, open_match_cnt)"
  },
  {
    id: "match_loss_rate",
    name: "로스율",
    owner: "PX",
    category: "품질",
    format: "percent",
    description: "세팅 이후 숨김 또는 취소로 이어진 매치 비율입니다.",
    query: "safe_divide(loss_match_cnt, setting_match_cnt)"
  },
  {
    id: "apply_cnt_per_active_user",
    name: "활성 유저당 신청",
    owner: "PX",
    category: "수요",
    format: "number",
    description: "활성 사용자 1명당 평균 신청 횟수입니다.",
    query: "safe_divide(apply_cnt, active_user_cnt)"
  },
  {
    id: "contribution_margin_rate",
    name: "공헌이익률",
    owner: "운영",
    category: "수익성",
    format: "percent",
    description: "매출에서 주요 변동비를 제외한 공헌이익 비율입니다.",
    query: "safe_divide(contribution_margin, sales)"
  }
];

export const entities: PrototypeEntity[] = [
  {
    name: "강남구",
    unit: "지역",
    group: "서울",
    values: {
      total_match_cnt: [312, 338, 349, 381, 402, 421],
      progress_match_rate: [0.78, 0.81, 0.82, 0.8, 0.84, 0.86],
      matching_rate: [0.72, 0.74, 0.75, 0.78, 0.8, 0.82],
      match_loss_rate: [0.11, 0.1, 0.09, 0.1, 0.08, 0.07],
      apply_cnt_per_active_user: [1.8, 1.9, 2.0, 2.1, 2.1, 2.3],
      contribution_margin_rate: [0.18, 0.19, 0.2, 0.2, 0.22, 0.23]
    }
  },
  {
    name: "고양시",
    unit: "지역",
    group: "경기",
    values: {
      total_match_cnt: [244, 251, 266, 288, 295, 319],
      progress_match_rate: [0.71, 0.72, 0.76, 0.77, 0.75, 0.79],
      matching_rate: [0.66, 0.67, 0.69, 0.73, 0.72, 0.75],
      match_loss_rate: [0.14, 0.13, 0.13, 0.11, 0.12, 0.1],
      apply_cnt_per_active_user: [1.5, 1.6, 1.7, 1.7, 1.8, 1.9],
      contribution_margin_rate: [0.13, 0.15, 0.16, 0.17, 0.16, 0.18]
    }
  },
  {
    name: "수원시",
    unit: "지역",
    group: "경기",
    values: {
      total_match_cnt: [201, 219, 226, 236, 242, 251],
      progress_match_rate: [0.69, 0.7, 0.72, 0.74, 0.74, 0.76],
      matching_rate: [0.61, 0.63, 0.64, 0.66, 0.68, 0.69],
      match_loss_rate: [0.16, 0.15, 0.14, 0.14, 0.13, 0.12],
      apply_cnt_per_active_user: [1.3, 1.4, 1.4, 1.5, 1.6, 1.6],
      contribution_margin_rate: [0.1, 0.11, 0.12, 0.13, 0.14, 0.15]
    }
  },
  {
    name: "계양구",
    unit: "지역",
    group: "인천",
    values: {
      total_match_cnt: [128, 141, 139, 155, 162, 178],
      progress_match_rate: [0.65, 0.68, 0.66, 0.69, 0.71, 0.73],
      matching_rate: [0.58, 0.6, 0.59, 0.62, 0.65, 0.67],
      match_loss_rate: [0.18, 0.17, 0.19, 0.17, 0.15, 0.14],
      apply_cnt_per_active_user: [1.1, 1.2, 1.2, 1.3, 1.4, 1.4],
      contribution_margin_rate: [0.08, 0.09, 0.08, 0.1, 0.11, 0.12]
    }
  }
];

export const filterGroups: PrototypeFilterGroup[] = [
  { id: "year", label: "연", values: ["2026", "2025"], selected: ["2026"] },
  { id: "month", label: "월", values: ["26.06", "26.05", "26.04", "26.03"], selected: ["26.06", "26.05", "26.04"] },
  { id: "area_group", label: "지역그룹", values: ["서울", "경기", "인천"], selected: ["서울", "경기"] },
  { id: "area", label: "지역", values: ["강남구", "고양시", "수원시", "계양구"], selected: ["강남구", "고양시", "수원시"] }
];

export const drilldownOptions = ["구장", "면", "지역 타임", "구장 타임"];
