import React, { useState } from 'react';
import { DataCollection } from './components/DataCollection';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { CrawledJobData, TargetPosition } from './types';
import { TARGET_POSITIONS } from './constants';
import { BarChart3, Database, LayoutDashboard } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'collection' | 'analysis'>('collection');
  const [crawledData, setCrawledData] = useState<CrawledJobData[]>([]);
  // Manage Target Positions in App state so changes (additions) persist across tabs
  const [targetPositions, setTargetPositions] = useState<TargetPosition[]>(TARGET_POSITIONS);

  const handleDataCollected = (newData: CrawledJobData[]) => {
    // Append new data
    setCrawledData(prev => [...prev, ...newData]);
  };

  const handleAddPosition = (newPosition: TargetPosition) => {
    setTargetPositions(prev => [...prev, newPosition]);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-brand-600 p-2 rounded-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  市场薪酬调研系统
                </h1>
                <p className="text-xs text-slate-500">HR 数据分析与薪酬系统</p>
              </div>
            </div>
            
            <nav className="flex space-x-8 h-full">
              <button
                onClick={() => setActiveTab('collection')}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === 'collection'
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Database className="w-4 h-4 mr-2" />
                数据采集
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === 'analysis'
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                市场分析
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'collection' ? (
          <div className="animate-fade-in">
            <DataCollection 
              targetPositions={targetPositions}
              onDataCollected={handleDataCollected}
              onAddPosition={handleAddPosition}
              existingData={crawledData} 
            />
          </div>
        ) : (
          <div className="animate-fade-in">
             <AnalysisDashboard 
              data={crawledData} 
              targetPositions={targetPositions}
             />
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
          <p>© {new Date().getFullYear()} 薪酬调研系统. 版权所有.</p>
          <p className="mt-1">生成的报告数据为演示模拟数据。</p>
        </div>
      </footer>
    </div>
  );
};

export default App;