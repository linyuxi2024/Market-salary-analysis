import { GoogleGenAI } from "@google/genai";
import { CrawledJobData, TargetPosition } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const simulateMarketCrawl = async (
  target: TargetPosition
): Promise<CrawledJobData[]> => {
  
  const prompt = `
    角色: 你是一个用于招聘市场调研系统的真实数据生成器。
    任务: 为目标岗位 "${target.name}" 生成 15-20 条逼真的招聘岗位数据。
    背景: 用户希望模拟从中国主流招聘网站（如BOSS直聘、智联招聘、前程无忧等）"爬取"数据。
    
    使用关键词: ${target.keywords.join(', ')}。
    竞品公司 (包含部分): ${target.competitors.join(', ')}。
    目标城市: 广州, 深圳, 福州, 上海, 杭州。
    
    要求:
    1. 薪资范围要逼真 (例如 10000-30000 元/月，需有波动)。
    2. 每年发放薪资月数要变化 (12, 13, 14, 15, 16 薪)。
    3. 公司名称：需包含提供列表中的竞品公司，以及其他随机生成的通用公司名（如"XX跨境电商有限公司", "XX科技有限公司"）。
    4. 提供简短的 "jobResponsibilitySnippet" (岗位职责摘要，中文，30字以内)。
    5. 提供福利列表 (如 "餐补", "年终奖", "五险一金", "下午茶" 等)。
    6. 提供逼真的招聘详情页链接 "link" (例如 https://www.zhipin.com/job_detail/xxxx.html 或 https://jobs.51job.com/xxx.html，ID随机生成)。
    
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