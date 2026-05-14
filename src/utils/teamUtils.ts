export const getTeamLogoUrl = (teamId: number) => {
  return `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
};

const teamTranslations: Record<number, string> = {
  108: '洛杉磯天使',
  109: '亞利桑那響尾蛇',
  110: '巴爾的摩金鶯',
  111: '波士頓紅襪',
  112: '芝加哥小熊',
  113: '辛辛那提紅人',
  114: '克里夫蘭守護者',
  115: '科羅拉多洛磯',
  116: '底特律老虎',
  117: '休士頓太空人',
  118: '堪薩斯市皇家',
  119: '洛杉磯道奇',
  120: '華盛頓國民',
  121: '紐約大都會',
  133: '奧克蘭運動家',
  134: '匹茲堡海盜',
  135: '聖地牙哥教士',
  136: '西雅圖水手',
  137: '舊金山巨人',
  138: '聖路易紅雀',
  139: '坦帕灣光芒',
  140: '德州遊騎兵',
  141: '多倫多藍鳥',
  142: '明尼蘇達雙城',
  143: '費城費城人',
  144: '亞特蘭大勇士',
  145: '芝加哥白襪',
  146: '邁阿密馬林魚',
  147: '紐約洋基',
  158: '密爾瓦基釀酒人',
};

export const getChineseTeamName = (teamId: number, englishName: string) => {
  const chineseName = teamTranslations[teamId];
  if (chineseName) {
    return chineseName;
  }
  return englishName;
};
