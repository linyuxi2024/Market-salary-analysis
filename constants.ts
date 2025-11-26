import { TargetPosition } from './types';

// Based on Image 1
export const TARGET_POSITIONS: TargetPosition[] = [
  {
    id: '1',
    category: '广分',
    name: '跨境供应商开发/跟单',
    responsibilities: '负责各类供应商的开发、收集、评估等工作及新品推荐；评估供应商的综合水平，与供应商进行比价、议价谈判；负责半成品/配件库存采购与各类日常采购订单跟进。',
    keywords: ['买手', '电商采购', '商品开发', '跨境供应商开发', '跟单'],
    competitors: ['迈远', '罗拉', '零次方', 'SHEIN', '客印']
  },
  {
    id: '2',
    category: '广分',
    name: '海外供应商开发',
    responsibilities: '海外供应商开发项目协作；与海外供应商沟通确保项目顺利推进；在美国和欧洲区域供应商开发、评估和甄选，协助合作，确保价格、服务、质量和交付满足项目要求。',
    keywords: ['海外采购', '海外买手', '海外供应商开发'],
    competitors: ['迈远', '罗拉', '零次方', 'SHEIN', '客印']
  },
  {
    id: '3',
    category: '广分',
    name: 'QA',
    responsibilities: '制定各品类产品的标准文件；负责样品和包装的确认和管理，确保样品安全和功能结构零风险；大货品质QA和新品首单质量跟踪，及时发现大货品质缺陷。',
    keywords: ['质量工程师', 'QA工程师', '品控工程师'],
    competitors: ['迈远', '罗拉', '零次方', 'SHEIN', '客印']
  },
  {
    id: '4',
    category: '小语种',
    name: '独立站运营',
    responsibilities: '负责欧洲市场的独立站业务，维护客户、帮助网站商品进行本土化优化；负责独立站的网站运营和商品运营相关的文案校对工作；研究欧洲市场的趋势和行业竞争对手情况。',
    keywords: ['独立站', '独立站运营', 'shopify', '跨境电商独立站', '自建站运营'],
    competitors: ['棒谷', '细刻', '德潮', '迈远', '赫特']
  }
];

export const LOCATIONS = ['广州', '深圳', '福州', '上海', '杭州'];

export const ALL_COMPETITORS = Array.from(new Set(TARGET_POSITIONS.flatMap(p => p.competitors)));