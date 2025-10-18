/**
 * Development static boards for quick flows
 */

// 5x5 board with words matching choseong pair ㄱㅅ
// Each word is unique and commonly used to minimize validation issues
export const KS_DEV_BOARD: string[][] = [
  ['가수', '가슴', '가사', '가설', '공사'],
  ['가속', '가시', '가식', '가상', '가스'],
  ['개선', '계산', '경사', '개설', '계속'],
  ['고속', '고생', '고소', '국수', '국산'],
  ['군사', '검사', '건설', '금속', '기사'],
];

export const KS_DEV_BOARD_2: string[][] = [
  ['감사', '가수', '감속', '감시', '가시'],
  ['간식', '간섭', '간선', '간사', '강습'],
  ['강산', '계산', '개선', '개시', '계승'],
  ['고성', '고시', '곡선', '고속', '공사'],
  ['과속', '과세', '검사', '건설', '국산'],
];

export const KS_DEV_BOARD_3: string[][] = [
  ['기술', '기소', '가수', '기선', '가시'],
  ['각서', '각설', '각성', '고속', '국산'],
  ['개선', '결손', '결심', '계산', '공사'],
  ['경성', '경시', '경선', '경서', '경솔'],
  ['건설', '검사', '건식', '검소', '검수'],
];

export const KS_DEV_BOARD_4: string[][] = [
  ['개선', '계산', '계수', '계승', '계선'],
  ['고수', '고산', '고상', '고속', '고시'],
  ['과실', '과시', '과소', '과수', '과속'],
  ['국사', '검사', '건설', '국세', '국산'],
  ['가수', '가시', '공사', '군수', '군사'],
];

export const KS_DEV_BOARDS: string[][][] = [
  KS_DEV_BOARD,
  KS_DEV_BOARD_2,
  KS_DEV_BOARD_3,
  KS_DEV_BOARD_4,
];
