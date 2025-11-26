import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { TargetPosition, CrawledJobData } from '../types';
import { simulateMarketCrawl } from '../services/geminiService';
import { Loader2, Search, Database, CheckCircle, AlertCircle, Plus, X, ExternalLink, Upload, PlayCircle, Filter } from 'lucide-react';

interface DataCollectionProps {
  targetPositions: TargetPosition[];
  onDataCollected: (data: CrawledJobData[]) => void;
  onAddPosition: (position: TargetPosition) => void;
  existingData: CrawledJobData[];
}

export const DataCollection: React.FC<DataCollectionProps> = ({ 
  targetPositions, 
  onDataCollected, 
  onAddPosition,
  existingData 
}) => {
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [previewFilterId, setPreviewFilterId] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [newPosName, setNewPosName] = useState('');
  const [newPosRespon, setNewPosRespon] = useState('');
  const [newPosKeywords, setNewPosKeywords] = useState('');
  const [newPosCompetitors, setNewPosCompetitors] = useState('');

  // Get IDs of positions that actually have data
  const collectedPositionIds = useMemo(() => {
    return new Set(existingData.map(d => d.targetPositionId));
  }, [existingData]);

  const handleCrawl = async (target: TargetPosition) => {
    setLoadingMap(prev => ({ ...prev, [target.id]: true }));
    setErrorMap(prev => ({ ...prev, [target.id]: '' }));

    try {
      const newData = await simulateMarketCrawl(target);
      onDataCollected(newData);
    } catch (err) {
      setErrorMap(prev => ({ ...prev, [target.id]: '模拟爬取失败，请检查 API Key。' }));
    } finally {
      setLoadingMap(prev => ({ ...prev, [target.id]: false }));
    }
  };

  const handleBatchCrawl = async () => {
    if (targetPositions.length === 0) return;
    
    setIsBatchProcessing(true);
    // Execute sequentially to avoid rate limiting and ensure stability
    for (const pos of targetPositions) {
        // We call handleCrawl directly. Since state updates are async, 
        // the visual loading indicator for each row will trigger correctly.
        // We await the completion of one before starting the next.
        await handleCrawl(pos);
        // Small delay to be gentle on the API
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    setIsBatchProcessing(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        let addedCount = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jsonData.forEach((row: any) => {
             // Try to match column names flexibly
             const name = row['岗位名称'] || row['岗位'] || row['Position'] || row['name'];
             const resp = row['岗位职责'] || row['职责'] || row['Responsibilities'] || row['responsibilities'];
             
             if (name && resp) {
                 const keywordStr = row['关键词'] || row['搜索关键词'] || row['Keywords'] || row['keywords'] || '';
                 const competitorStr = row['竞品公司'] || row['竞品'] || row['Competitors'] || row['competitors'] || '';

                 const keywords = String(keywordStr).split(/[,，、\s]+/).filter(k => k.trim() !== '');
                 const competitors = String(competitorStr).split(/[,，、\s]+/).filter(k => k.trim() !== '');
                 
                 onAddPosition({
                     id: `imported-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                     category: '导入',
                     name: String(name).trim(),
                     responsibilities: String(resp).trim(),
                     keywords: keywords,
                     competitors: competitors
                 });
                 addedCount++;
             }
        });
        
        if (addedCount > 0) {
            alert(`成功导入 ${addedCount} 个岗位！`);
        } else {
            alert('未能在文件中找到有效数据。请确保表头包含：岗位名称、岗位职责、关键词、竞品公司。');
        }

    } catch (err) {
        console.error("Excel import error:", err);
        alert('文件解析失败，请确保上传的是有效的 Excel (.xlsx, .xls) 文件。');
    } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPosName || !newPosRespon) return;

    const newPosition: TargetPosition = {
      id: Date.now().toString(),
      category: '自定义', // Hidden but required by type
      name: newPosName,
      responsibilities: newPosRespon,
      keywords: newPosKeywords.split(/[,，、\s]+/).filter(k => k.trim() !== ''),
      competitors: newPosCompetitors.split(/[,，、\s]+/).filter(k => k.trim() !== '')
    };

    onAddPosition(newPosition);
    
    // Reset and close
    setNewPosName('');
    setNewPosRespon('');
    setNewPosKeywords('');
    setNewPosCompetitors('');
    setShowAddForm(false);
  };

  const getCountForTarget = (targetId: string) => {
    return existingData.filter(d => d.targetPositionId === targetId).length;
  };

  const filteredPreviewData = existingData.filter(d => {
      if (previewFilterId === 'all') return true;
      return d.targetPositionId === previewFilterId;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <div>
             <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Database className="w-5 h-5 text-brand-600" />
              目标岗位与数据采集
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              管理目标岗位并采集市场数据。支持手动添加或 Excel 批量导入。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".xlsx, .xls" 
                className="hidden" 
            />
            <button 
                onClick={handleImportClick}
                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
                <Upload className="w-4 h-4" />
                Excel 批量导入
            </button>
            <button 
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 bg-white border border-brand-200 text-brand-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加岗位
            </button>
            <button 
              onClick={handleBatchCrawl}
              disabled={isBatchProcessing || targetPositions.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white ${
                  isBatchProcessing || targetPositions.length === 0
                  ? 'bg-brand-400 cursor-not-allowed'
                  : 'bg-brand-600 hover:bg-brand-700 shadow-sm hover:shadow-md'
              }`}
            >
              {isBatchProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    正在批量采集...
                  </>
              ) : (
                  <>
                    <PlayCircle className="w-4 h-4" />
                    一键采集所有
                  </>
              )}
            </button>
          </div>
        </div>

        {/* Add Position Modal/Form Overlay */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-slate-800">添加新的目标岗位</h3>
                <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">岗位名称 *</label>
                  <input 
                    required
                    type="text" 
                    value={newPosName}
                    onChange={e => setNewPosName(e.target.value)}
                    placeholder="例如: 跨境电商运营"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">岗位职责 *</label>
                  <textarea 
                    required
                    value={newPosRespon}
                    onChange={e => setNewPosRespon(e.target.value)}
                    rows={3}
                    placeholder="简要描述该岗位的核心职责..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">搜索关键词 (推荐写多个，用逗号或空格分隔)</label>
                  <input 
                    type="text" 
                    value={newPosKeywords}
                    onChange={e => setNewPosKeywords(e.target.value)}
                    placeholder="例如: 运营, 亚马逊, 英语流利"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">竞品公司 (推荐写多个，用逗号或空格分隔)</label>
                  <input 
                    type="text" 
                    value={newPosCompetitors}
                    onChange={e => setNewPosCompetitors(e.target.value)}
                    placeholder="例如: SHEIN, 安克, 棒谷"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
                  >
                    取消
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-brand-600 text-white hover:bg-brand-700 rounded-lg text-sm font-medium"
                  >
                    确认添加
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                <th className="px-4 py-3">目标岗位</th>
                <th className="px-4 py-3">职责摘要</th>
                <th className="px-4 py-3">搜索关键词</th>
                <th className="px-4 py-3">主要竞品</th>
                <th className="px-4 py-3 text-center">数据量</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {targetPositions.map(pos => {
                const count = getCountForTarget(pos.id);
                const isLoading = loadingMap[pos.id];
                const hasError = !!errorMap[pos.id];

                return (
                  <tr key={pos.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 font-semibold text-slate-800">{pos.name}</td>
                    <td className="px-4 py-4 text-gray-500 max-w-xs truncate" title={pos.responsibilities}>
                      {pos.responsibilities}
                    </td>
                    <td className="px-4 py-4 text-gray-500 max-w-xs truncate" title={pos.keywords.join(', ')}>
                      {pos.keywords.slice(0, 3).join(', ')}{pos.keywords.length > 3 && '...'}
                    </td>
                    <td className="px-4 py-4 text-gray-500 max-w-xs truncate" title={pos.competitors.join(', ')}>
                      {pos.competitors.slice(0, 3).join(', ')}{pos.competitors.length > 3 && '...'}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${count > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {count} 条
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => handleCrawl(pos)}
                        disabled={isLoading || isBatchProcessing}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                          isLoading || isBatchProcessing
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm hover:shadow-md'
                        }`}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            采集...
                          </>
                        ) : (
                          <>
                            <Search className="w-3 h-3" />
                            {count > 0 ? '更新数据' : '开始采集'}
                          </>
                        )}
                      </button>
                      {hasError && <div className="text-red-500 text-xs mt-1 flex justify-end items-center gap-1"><AlertCircle className="w-3 h-3"/> 失败</div>}
                    </td>
                  </tr>
                );
              })}
              {targetPositions.length === 0 && (
                  <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                          暂无目标岗位，请添加岗位或导入 Excel 表格。
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {existingData.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                原始数据预览
               </h3>
               
               <div className="flex items-center gap-2">
                   <Filter className="w-4 h-4 text-gray-400" />
                   <select
                        value={previewFilterId}
                        onChange={(e) => setPreviewFilterId(e.target.value)}
                        className="text-sm border-gray-200 border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-brand-500 outline-none text-gray-600 bg-gray-50 hover:bg-white transition-colors"
                   >
                       <option value="all">显示所有岗位数据</option>
                       {targetPositions
                          .filter(pos => collectedPositionIds.has(pos.id)) // Only show positions with data
                          .map(pos => (
                           <option key={pos.id} value={pos.id}>{pos.name}</option>
                       ))}
                   </select>
               </div>
            </div>

           <div className="overflow-x-auto max-h-96 border border-gray-100 rounded-lg">
            <table className="min-w-max w-full text-left text-sm whitespace-nowrap">
               <thead className="sticky top-0 bg-white z-10 shadow-sm">
                 <tr className="border-b border-gray-200 text-gray-500">
                   <th className="px-4 py-2 w-20">来源</th>
                   <th className="px-4 py-2">目标岗位</th>
                   <th className="px-4 py-2">招聘标题</th>
                   <th className="px-4 py-2">职责摘要</th>
                   <th className="px-4 py-2">公司名称</th>
                   <th className="px-4 py-2 w-16">地点</th>
                   <th className="px-4 py-2">月薪 (RMB)</th>
                   <th className="px-4 py-2 w-12 text-center">月数</th>
                   <th className="px-4 py-2">福利</th>
                   <th className="px-4 py-2 w-16 text-center">链接</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {filteredPreviewData.map((job) => (
                   <tr key={job.id} className="hover:bg-slate-50">
                     <td className="px-4 py-2 text-gray-400 text-xs">{job.source}</td>
                     <td className="px-4 py-2 font-medium text-slate-700">
                       {targetPositions.find(t => t.id === job.targetPositionId)?.name || '未知'}
                     </td>
                     <td className="px-4 py-2 text-slate-600 max-w-xs truncate" title={job.externalJobTitle}>{job.externalJobTitle}</td>
                     <td className="px-4 py-2 text-slate-500 text-xs max-w-sm truncate" title={job.jobResponsibilitySnippet}>
                        {job.jobResponsibilitySnippet}
                     </td>
                     <td className="px-4 py-2 text-slate-600">
                        {job.companyName}
                        {job.isCompetitor && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1.5 rounded">竞品</span>}
                     </td>
                     <td className="px-4 py-2 text-slate-500">{job.location}</td>
                     <td className="px-4 py-2 font-mono text-slate-700">
                        {job.minMonthlySalary.toLocaleString()} - {job.maxMonthlySalary.toLocaleString()}
                     </td>
                     <td className="px-4 py-2 text-center">{job.monthsPerYear}</td>
                     <td className="px-4 py-2 text-gray-400 text-xs truncate max-w-xs" title={job.benefits.join(', ')}>
                        {job.benefits.join(', ')}
                     </td>
                     <td className="px-4 py-2 text-center">
                        {job.link ? (
                            <a 
                                href={job.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-brand-600 hover:text-brand-800 flex justify-center"
                                title="查看原始招聘页面"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        ) : (
                            <span className="text-gray-300">-</span>
                        )}
                     </td>
                   </tr>
                 ))}
                 {filteredPreviewData.length === 0 && (
                     <tr>
                         <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                             该筛选条件下暂无数据。
                         </td>
                     </tr>
                 )}
               </tbody>
            </table>
           </div>
        </div>
      )}
    </div>
  );
};