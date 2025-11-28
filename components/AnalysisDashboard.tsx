import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { CrawledJobData, TargetPosition, SalaryStats } from '../types';
import { LOCATIONS } from '../constants';
import { computeSalaryStats } from '../utils/calculations';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Filter, MapPin, Building2, Calculator, Search, ChevronDown, Check, X, Download, ListFilter } from 'lucide-react';

interface AnalysisDashboardProps {
  data: CrawledJobData[];
  targetPositions: TargetPosition[];
}

// Filter types
type FilterMode = 'ALL' | 'ONLY_COMPETITORS' | 'CUSTOM';
interface PositionFilter {
  mode: FilterMode;
  selectedCompanies: string[]; // Only used when mode is CUSTOM
}

export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ data, targetPositions }) => {
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // State to track filters for EACH position independently
  const [positionFilters, setPositionFilters] = useState<Record<string, PositionFilter>>({});

  // Helper to get filter state for a position
  const getFilterForPosition = (id: string): PositionFilter => {
    return positionFilters[id] || { mode: 'ALL', selectedCompanies: [] };
  };

  // Helper to update filter state
  const updatePositionFilter = (id: string, newFilter: PositionFilter) => {
    setPositionFilters(prev => ({ ...prev, [id]: newFilter }));
  };

  // Unique position names for search datalist
  const uniquePositionNames = useMemo(() => {
    return Array.from(new Set(targetPositions.map(p => p.name)));
  }, [targetPositions]);

  // Aggregate stats per Target Position with LOCAL filters
  const aggregatedStats = useMemo(() => {
    return targetPositions.map(pos => {
      // 1. Get all raw data for this position
      let posData = data.filter(d => d.targetPositionId === pos.id);

      // 2. Apply Global Location Filter
      if (selectedLocations.length > 0) {
        posData = posData.filter(d => selectedLocations.some(loc => d.location.includes(loc)));
      }

      // 3. Apply Local Competitor Filter
      const filter = getFilterForPosition(pos.id);
      if (filter.mode === 'ONLY_COMPETITORS') {
        posData = posData.filter(d => d.isCompetitor);
      } else if (filter.mode === 'CUSTOM') {
        posData = posData.filter(d => filter.selectedCompanies.includes(d.companyName));
      }
      // If mode is 'ALL', do nothing

      // Calculate stats
      const monthlySalaries = posData.map(d => (d.minMonthlySalary + d.maxMonthlySalary) / 2);
      const yearlySalaries = posData.map(d => ((d.minMonthlySalary + d.maxMonthlySalary) / 2) * d.monthsPerYear);

      return {
        targetPosition: pos,
        monthly: computeSalaryStats(monthlySalaries),
        yearly: computeSalaryStats(yearlySalaries),
        sampleSize: posData.length,
        // We pass the list of ALL available companies for this position (unfiltered by competitor logic) to the UI
        // so the dropdown can show all options even if currently filtered.
        // However, we still respect the global location filter for available companies to be relevant.
        availableCompaniesInLocation: Array.from(new Set(
           data
            .filter(d => d.targetPositionId === pos.id)
            .filter(d => selectedLocations.length === 0 || selectedLocations.some(loc => d.location.includes(loc)))
            .map(d => d.companyName)
        )).sort()
      };
    }).filter(stat => {
        // Global Search Filter
        if (searchQuery && !stat.targetPosition.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        
        // Hide if no data exists globally for this position (to avoid empty cards appearing before data collection)
        // But if data exists but is filtered out by local filter to 0, we SHOULD show the card (as empty) so user can change filter.
        // So we check if *any* data exists for this position ID in the main dataset.
        const hasAnyData = data.some(d => d.targetPositionId === stat.targetPosition.id);
        if (!hasAnyData) return false;

        return true;
    });
  }, [data, targetPositions, selectedLocations, positionFilters, searchQuery]);

  // Valid Data Count (Sum of visible sample sizes)
  const validDataCount = useMemo(() => {
    return aggregatedStats.reduce((acc, curr) => acc + curr.sampleSize, 0);
  }, [aggregatedStats]);

  // Chart Data
  const chartData = aggregatedStats.map(stat => ({
    name: stat.targetPosition.name.length > 8 ? stat.targetPosition.name.slice(0, 6) + '...' : stat.targetPosition.name,
    fullName: stat.targetPosition.name,
    MonthlyP50: stat.monthly.p50,
    YearlyP50: stat.yearly.p50,
  }));

  const formatCurrency = (val: number) => `¥${Math.round(val).toLocaleString()}`;

  const handleExport = () => {
    if (aggregatedStats.length === 0) return;
    const exportData = aggregatedStats.map(stat => ({
      "岗位名称": stat.targetPosition.name,
      "样本量": stat.sampleSize,
      "月薪-低值": stat.monthly.min,
      "月薪-P25": stat.monthly.p25,
      "月薪-中位数": stat.monthly.p50,
      "月薪-P75": stat.monthly.p75,
      "月薪-高值": stat.monthly.max,
      "年薪-低值": stat.yearly.min,
      "年薪-P25": stat.yearly.p25,
      "年薪-中位数": stat.yearly.p50,
      "年薪-P75": stat.yearly.p75,
      "年薪-高值": stat.yearly.max,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "薪酬分析报表");
    XLSX.writeFile(wb, `薪酬调研分析_${new Date().toLocaleDateString()}.xlsx`);
  };

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white rounded-xl border border-gray-100">
        <Calculator className="w-12 h-12 mb-2 opacity-20" />
        <p>暂无数据。请前往“数据采集”页面开始获取数据。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative z-20">
        <div className="flex flex-col xl:flex-row gap-6 items-end xl:items-center justify-between">
          <div className="flex flex-wrap gap-6 items-end w-full">
              {/* Search */}
              <div className="w-full sm:w-auto">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                      <Search className="w-3 h-3" /> 搜索岗位
                  </label>
                  <div className="relative group">
                      <input 
                          list="position-list"
                          type="text"
                          placeholder="输入或选择岗位..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="block w-full sm:w-64 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none transition-shadow"
                      />
                      <datalist id="position-list">
                          {uniquePositionNames.map(name => (
                              <option key={name} value={name} />
                          ))}
                      </datalist>
                      {searchQuery && (
                          <button 
                              onClick={() => setSearchQuery('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                              <X className="w-4 h-4" />
                          </button>
                      )}
                  </div>
              </div>

              {/* Multi-Select Locations */}
              <MultiSelect 
                  label="Base 地点筛选" 
                  icon={<MapPin className="w-3 h-3" />}
                  options={LOCATIONS}
                  selected={selectedLocations}
                  onChange={setSelectedLocations}
                  placeholder="全部地点"
              />
          </div>

          <div className="flex items-center gap-4 w-full xl:w-auto justify-between xl:justify-end mt-4 xl:mt-0 border-t xl:border-t-0 pt-4 xl:pt-0">
             <div className="text-sm text-gray-500 whitespace-nowrap">
                有效数据: <span className="font-bold text-brand-600">{validDataCount}</span> / {data.length}
             </div>
             <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
             >
                <Download className="w-4 h-4" />
                导出报表
             </button>
          </div>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 gap-8">
        {aggregatedStats.length === 0 ? (
            <div className="text-center text-gray-400 py-10 bg-white rounded-xl border border-gray-100 border-dashed">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>没有找到匹配的岗位数据。</p>
            </div>
        ) : (
            aggregatedStats.map((stat) => (
            <div key={stat.targetPosition.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible relative">
                {/* Header Section */}
                <div className="bg-brand-50 px-6 py-4 border-b border-brand-100 rounded-t-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-brand-900">{stat.targetPosition.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stat.sampleSize > 0 ? 'bg-brand-100 text-brand-700' : 'bg-red-100 text-red-700'}`}>
                            样本量: {stat.sampleSize}
                          </span>
                        </div>
                        <div className="text-xs text-brand-600/80 mt-1 max-w-xl truncate">
                           {stat.targetPosition.keywords.join(', ')}
                        </div>
                    </div>
                    
                    {/* Per-Position Competitor Filter */}
                    <div className="w-full md:w-auto relative z-10">
                      <PositionCompetitorFilter 
                        targetPosition={stat.targetPosition}
                        availableCompanies={stat.availableCompaniesInLocation}
                        currentFilter={getFilterForPosition(stat.targetPosition.id)}
                        onFilterChange={(newFilter) => updatePositionFilter(stat.targetPosition.id, newFilter)}
                      />
                    </div>
                </div>

                {/* Body Section */}
                <div className="p-6">
                  {stat.sampleSize === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Filter className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p>当前筛选条件下无有效数据</p>
                      <p className="text-xs mt-1">请尝试调整竞品或地点筛选</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Monthly Stats Table */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-l-4 border-brand-500 pl-3">
                             <h4 className="text-sm font-bold text-gray-700">月薪分析 (RMB)</h4>
                             <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-1 rounded">
                                P50: {formatCurrency(stat.monthly.p50)}
                             </span>
                          </div>
                          <StatsTable stats={stat.monthly} highlightColor="text-brand-600" />
                        </div>

                        {/* Yearly Stats Table */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-l-4 border-green-500 pl-3">
                             <h4 className="text-sm font-bold text-gray-700">年薪分析 (RMB)</h4>
                             <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                                P50: {formatCurrency(stat.yearly.p50)}
                             </span>
                          </div>
                          <StatsTable stats={stat.yearly} highlightColor="text-green-600" />
                        </div>
                    </div>
                  )}
                </div>
            </div>
            ))
        )}
      </div>

      {/* Chart Section */}
      {aggregatedStats.length > 0 && validDataCount > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <BarChart className="w-5 h-5 text-brand-500" />
                薪酬中位数对比 (P50)
            </h3>
            <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis tickFormatter={(val) => `¥${val/1000}k`} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label, payload) => {
                        if (payload && payload.length > 0) {
                            return payload[0].payload.fullName;
                        }
                        return label;
                    }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ padding: 0 }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="MonthlyP50" fill="#0ea5e9" name="月薪中位数" radius={[4, 4, 0, 0]} maxBarSize={60} />
                <Bar dataKey="YearlyP50" fill="#22c55e" name="年薪中位数" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
            </ResponsiveContainer>
            </div>
        </div>
      )}
    </div>
  );
};

// --- Sub Components ---

interface PositionCompetitorFilterProps {
  targetPosition: TargetPosition;
  availableCompanies: string[];
  currentFilter: PositionFilter;
  onFilterChange: (filter: PositionFilter) => void;
}

const PositionCompetitorFilter: React.FC<PositionCompetitorFilterProps> = ({
  targetPosition,
  availableCompanies,
  currentFilter,
  onFilterChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectAll = () => {
    onFilterChange({ mode: 'ALL', selectedCompanies: [] });
    setIsOpen(false);
  };

  const handleSelectCompetitorsOnly = () => {
    onFilterChange({ mode: 'ONLY_COMPETITORS', selectedCompanies: [] });
    setIsOpen(false);
  };

  const toggleCompany = (company: string) => {
    let newSelected = [...currentFilter.selectedCompanies];
    // If switching from a preset mode (All or Only Competitors) to Custom, we start fresh or with the clicked one
    if (currentFilter.mode !== 'CUSTOM') {
      newSelected = [];
    }
    
    if (newSelected.includes(company)) {
      newSelected = newSelected.filter(c => c !== company);
    } else {
      newSelected.push(company);
    }
    
    // If nothing selected in custom mode, revert to ALL? Or allow empty? 
    // Usually empty filter means "show nothing" in custom mode, but let's stick to ALL if empty to be safe
    // But strictly, if I uncheck the last one, I might want to see nothing.
    // Let's keep it as CUSTOM mode even if empty, effectively showing 0 results, 
    // unless user explicitly clicks "All".
    onFilterChange({ mode: 'CUSTOM', selectedCompanies: newSelected });
  };

  const getLabel = () => {
    if (currentFilter.mode === 'ALL') return '全部公司';
    if (currentFilter.mode === 'ONLY_COMPETITORS') return '只看竞品';
    return `已选 ${currentFilter.selectedCompanies.length} 家`;
  };

  // Pre-calculate competitors for red tagging
  const isCompetitor = (name: string) => {
    return targetPosition.competitors.some(c => name.toLowerCase().includes(c.toLowerCase()));
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full md:w-40 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
          currentFilter.mode !== 'ALL' 
            ? 'bg-brand-50 border-brand-200 text-brand-700' 
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
        }`}
      >
        <span className="flex items-center gap-1.5 truncate">
          <ListFilter className="w-3.5 h-3.5" />
          {getLabel()}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 md:left-0 z-50 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-xl max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
           {/* Presets */}
           <div className="p-2 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10 space-y-1">
              <div 
                onClick={handleSelectAll}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer rounded-md text-sm transition-colors ${
                  currentFilter.mode === 'ALL' ? 'bg-brand-50 text-brand-700' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <span>全选</span>
                {currentFilter.mode === 'ALL' && <Check className="w-3.5 h-3.5" />}
              </div>
              <div 
                onClick={handleSelectCompetitorsOnly}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer rounded-md text-sm transition-colors ${
                  currentFilter.mode === 'ONLY_COMPETITORS' ? 'bg-brand-50 text-brand-700' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  只看竞品
                  <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded">Tag</span>
                </span>
                {currentFilter.mode === 'ONLY_COMPETITORS' && <Check className="w-3.5 h-3.5" />}
              </div>
           </div>
           
           {/* Company List */}
           <div className="p-2 space-y-1">
              <div className="text-[10px] text-gray-400 px-2 pb-1 uppercase font-semibold">采集到的公司列表</div>
              {availableCompanies.length === 0 ? (
                <div className="text-gray-400 text-xs text-center py-2">暂无数据</div>
              ) : (
                availableCompanies.map(comp => {
                  const isComp = isCompetitor(comp);
                  const isSelected = currentFilter.mode === 'CUSTOM' && currentFilter.selectedCompanies.includes(comp);
                  
                  return (
                    <div 
                      key={comp}
                      onClick={() => toggleCompany(comp)}
                      className={`flex items-center px-3 py-2 cursor-pointer rounded-md text-sm transition-colors group ${
                        isSelected ? 'bg-brand-50 text-brand-700' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 flex-shrink-0 transition-colors ${
                        isSelected ? 'bg-brand-500 border-brand-500' : 'border-gray-300 bg-white group-hover:border-brand-300'
                      }`}>
                         {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="truncate flex-1">
                        {comp}
                      </span>
                      {isComp && (
                        <span className="flex-shrink-0 ml-2 text-[10px] text-red-500 border border-red-200 px-1 rounded bg-red-50">
                          竞品
                        </span>
                      )}
                    </div>
                  );
                })
              )}
           </div>
        </div>
      )}
    </div>
  );
};

const StatsTable: React.FC<{ stats: SalaryStats, highlightColor: string }> = ({ stats, highlightColor }) => (
  <div className="overflow-hidden rounded-lg border border-gray-200">
    <table className="w-full text-sm text-left">
      <thead className="bg-gray-50 text-gray-500">
        <tr>
          <th className="px-3 py-2 font-medium text-xs uppercase tracking-wider">指标</th>
          <th className="px-3 py-2 font-medium text-right text-xs uppercase tracking-wider">数值</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        <tr><td className="px-3 py-2 text-gray-600">低值 (Min)</td><td className="px-3 py-2 text-right font-mono text-slate-700">{Math.round(stats.min).toLocaleString()}</td></tr>
        <tr><td className="px-3 py-2 text-gray-600">P25 (25分位)</td><td className={`px-3 py-2 text-right font-mono ${highlightColor}`}>{Math.round(stats.p25).toLocaleString()}</td></tr>
        <tr className="bg-slate-50/80"><td className="px-3 py-2 font-semibold text-slate-800">P50 (中位数)</td><td className="px-3 py-2 text-right font-bold text-slate-900 font-mono">{Math.round(stats.p50).toLocaleString()}</td></tr>
        <tr><td className="px-3 py-2 text-gray-600">P75 (75分位)</td><td className={`px-3 py-2 text-right font-mono ${highlightColor}`}>{Math.round(stats.p75).toLocaleString()}</td></tr>
        <tr><td className="px-3 py-2 text-gray-600">高值 (Max)</td><td className="px-3 py-2 text-right font-mono text-slate-700">{Math.round(stats.max).toLocaleString()}</td></tr>
      </tbody>
    </table>
  </div>
);

const MultiSelect: React.FC<{
    label: string;
    icon: React.ReactNode;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder: string;
}> = ({ label, icon, options, selected, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(item => item !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    const handleSelectAll = () => {
        if (selected.length === options.length) {
            onChange([]);
        } else {
            onChange([...options]);
        }
    };

    return (
        <div className="w-full sm:w-auto" ref={containerRef}>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                {icon} {label}
            </label>
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-between w-full sm:w-48 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all hover:bg-gray-100"
                >
                    <span className="truncate block">
                        {selected.length === 0 ? placeholder : `${selected.length} 已选择`}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute z-50 mt-1 w-full sm:w-64 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-2 border-b border-gray-100 sticky top-0 bg-white z-10">
                             <div 
                                onClick={handleSelectAll}
                                className="flex items-center px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer text-xs font-medium text-brand-600"
                             >
                                {selected.length === options.length && options.length > 0 ? '取消全选' : '全选'}
                             </div>
                        </div>
                        <div className="p-1">
                            {options.length === 0 ? (
                                <div className="px-3 py-2 text-gray-400 text-xs text-center">无数据</div>
                            ) : (
                                options.map(option => {
                                    const isSelected = selected.includes(option);
                                    return (
                                        <div 
                                            key={option}
                                            onClick={() => toggleOption(option)}
                                            className={`flex items-center px-3 py-2 cursor-pointer rounded-md text-sm transition-colors ${
                                                isSelected ? 'bg-brand-50 text-brand-700' : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 transition-colors ${
                                                isSelected ? 'bg-brand-500 border-brand-500' : 'border-gray-300 bg-white'
                                            }`}>
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className="truncate">{option}</span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
