import { GoogleGenAI } from "@google/genai";
import { CrawledJobData, TargetPosition } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const simulateMarketCrawl = async (
  target: TargetPosition
): Promise<CrawledJobData[]> => {
  
  const prompt = `
    角色: 你是一个高级招聘市场数据爬虫与清洗引擎。
    
    核心任务: 为目标岗位 "${target.name}" 获取并筛选出 15-20 条真实的招聘数据。
    
    【步骤 1：广度搜索】
    模拟在招聘网站使用以下关键词进行广泛搜索，以覆盖不同公司对同一岗位的不同命名：
    - 目标岗位名称: ${target.name}
    - 搜索关键词: ${target.keywords.join(', ')}
    
    【步骤 2：深度职责匹配 (至关重要)】
    搜索到的结果中包含很多噪音（例如关键词匹配但实际工作内容不符）。
    请务必根据以下【目标岗位职责】对搜索结果进行语义比对和清洗：
    "${target.responsibilities}"
    
    判断规则：
    1. 只有当搜索到的外部岗位，其核心职责与上述【目标岗位职责】在功能和性质上高度一致时，才予以保留。
    2. 即使岗位名称不同（如“专员”vs“助理”），只要职责匹配，即视为有效数据。
    3. 如果关键词匹配但职责无关（例如搜“运营”想找“电商运营”，但结果是“新媒体运营”），请坚决剔除。

    【步骤 3：数据提取与打标】
    对于通过步骤 2 筛选后的数据，生成详细信息：
    - 目标城市范围: 广州, 深圳, 福州, 上海, 杭州。
    - 竞品打标: 提供的竞品列表仅用于标记 (isCompetitor=true)，**不要**仅限制在这些公司内搜索，需包含全市场的公司。
    - 竞品列表: ${target.competitors.join(', ')}。
    
    要求生成的数据属性：
    1. 外部招聘标题 (externalJobTitle): 必须是爬取到的真实多样的标题。
    2. 薪资范围: 根据市场行情生成逼真的月薪 (如 10000-30000)，需有波动。
    3. 年薪构成: 每年发薪月数 (12-16薪)。
    4. 公司名称: 包含竞品公司以及其他随机的行业相关公司。
    5. 职责摘要 (jobResponsibilitySnippet): 提取该外部岗位的核心职责 (中文, 30字内)。
    6. 福利 (benefits): 如 "餐补", "年终奖", "五险一金" 等。
    7. 链接 (link): 详情页 URL (格式如 https://www.zhipin.com/job_detail/xxxx.html)。
    
    仅返回符合以下结构的有效 JSON 数组 (不要使用 markdown 代码块):
    [
      {
        "externalJobTitle": "string (外部招聘标题)",
        "companyName": "string (公司名)",
        "location": "string (城市)",
        "minMonthlySalary": number (月薪下限),
        "maxMonthlySalary": number (月薪上限),
        "monthsPerYear": number (年薪月数),
        "jobResponsibilitySnippet": "string (职责摘要)",
        "benefits": ["string"] (福利),
        "source": "string (来源，如 BOSS直聘)",
        "link": "string (URL链接)"
      }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const rawData = JSON.parse(response.text || '[]');
    
    // Map raw data to our internal structure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rawData.map((item: any, index: number) => ({
      id: `${target.id}-crawl-${Date.now()}-${index}`,
      targetPositionId: target.id,
      externalJobTitle: item.externalJobTitle,
      companyName: item.companyName,
      location: item.location,
      minMonthlySalary: item.minMonthlySalary,
      maxMonthlySalary: item.maxMonthlySalary,
      monthsPerYear: item.monthsPerYear,
      jobResponsibilitySnippet: item.jobResponsibilitySnippet,
      benefits: item.benefits || [],
      source: item.source || 'BOSS直聘',
      link: item.link || `https://www.zhipin.com/job_detail/${Math.floor(Math.random() * 1000000)}.html`,
      isCompetitor: target.competitors.some(c => item.companyName.toLowerCase().includes(c.toLowerCase()))
    }));

  } catch (error) {
    console.error("Gemini crawl simulation failed:", error);
    // Fallback Mock data in case of API failure to ensure app doesn't crash during demo
    return [
      {
        id: 'fallback-1',
        targetPositionId: target.id,
        externalJobTitle: target.name,
        companyName: target.competitors[0] || '未知公司',
        location: '广州',
        minMonthlySalary: 15000,
        maxMonthlySalary: 25000,
        monthsPerYear: 13,
        jobResponsibilitySnippet: '负责采购流程管理，供应商开发与维护。',
        benefits: ['五险一金'],
        source: '系统模拟',
        link: 'https://www.example.com/job/123',
        isCompetitor: true
      }
    ];
  }
};