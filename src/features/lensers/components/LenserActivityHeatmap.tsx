import React from 'react';
import { Card } from '../../../components/Card';
import { LenserActivityPoint } from '../../../types/lenser.types';

interface LenserActivityHeatmapProps {
  data: LenserActivityPoint[];
}

export const LenserActivityHeatmap: React.FC<LenserActivityHeatmapProps> = ({ data }) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Helpers for color
  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-100';
    if (count <= 2) return 'bg-yellow-100';
    if (count <= 5) return 'bg-yellow-300';
    return 'bg-yellow-400';
  };

  // Organize data into grid of weeks/days (simplified visualization logic)
  // For a perfect calendar we need complex date math.
  // We will simply render the last ~50 weeks (columns) x 7 days (rows)
  
  // Group by week index relative to start
  const rows = [0, 1, 2, 3, 4, 5, 6]; // Sun - Sat
  const totalWeeks = 52;
  
  // We need to map linear date array to grid
  // Assuming 'data' is sorted DESC or we sort it
  // Let's just visualize the last 364 days
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-364);

  return (
    <Card className="p-6 mb-8 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-900">Lenser Activity</h3>
        <div className="text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1 flex items-center gap-2">
           2024 <span className="text-xs">▼</span>
        </div>
      </div>
      
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[700px]">
            {/* Month Labels */}
            <div className="flex text-xs text-gray-400 mb-2 pl-8">
                {months.map(m => (
                    <span key={m} className="flex-1">{m}</span>
                ))}
            </div>

            <div className="flex gap-2">
                {/* Day Labels */}
                <div className="flex flex-col justify-between text-[10px] text-gray-400 py-1 h-[100px] w-6">
                    <span>Mon</span>
                    <span>Wed</span>
                    <span>Fri</span>
                </div>

                {/* Grid */}
                <div className="flex-1 flex gap-1 h-[100px] flex-wrap flex-col content-start">
                    {sortedData.map((point, idx) => (
                        <div 
                            key={point.date}
                            className={`w-3 h-3 rounded-sm ${getColor(point.count)}`}
                            title={`${point.date}: ${point.count} contributions`}
                        ></div>
                    ))}
                </div>
            </div>
            
            <div className="flex justify-end items-center gap-2 mt-2 text-xs text-gray-500">
                <span>Less</span>
                <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
                <div className="w-3 h-3 bg-yellow-100 rounded-sm"></div>
                <div className="w-3 h-3 bg-yellow-300 rounded-sm"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-sm"></div>
                <span>More</span>
            </div>
        </div>
      </div>
    </Card>
  );
};
